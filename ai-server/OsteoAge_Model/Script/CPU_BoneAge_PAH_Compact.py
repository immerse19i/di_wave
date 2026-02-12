"""
BoneAge + PAH + 유전/성숙도 보정 통합 모듈 (Refactored Version)

[환경 구성]
가상환경: conda create -n boneage-cpu python=3.10 -y && conda activate boneage-cpu
패키지: pip install -r requirements.txt

[사용 방법]
1. 단독 실행: python CPU_BoneAge_PAH_Compact.py
2. 모듈 import:
   from CPU_BoneAge_PAH_Compact import predict_bone_age
   result = predict_bone_age(image_path, sex, height, age_months, father_height, mother_height)
"""
import os
import json
import math
import numpy as np
import pandas as pd
import cv2
import torch
import torch.nn as nn
from torchvision import transforms
import timm
from statistics import NormalDist

# =============================================================================
# 경로 설정 (상대경로 기반)
# =============================================================================
# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # Script 폴더의 상위 = OsteoAge_Model

# 데이터 경로
DATA_DIR = os.path.join(PROJECT_ROOT, "Data")
LMS_CSV_PATH = os.path.join(DATA_DIR, "LMS.csv")
CRITERIA_JSON_PATH = os.path.join(DATA_DIR, "criteria_C1C2A_20251027_102144.json")

# 모델 경로
MODEL_DIR = os.path.join(PROJECT_ROOT, "Model9_ROI")
MODEL_NAME = "ConvNeXt_Base_BoneAge_FiLM_Late_PROMISING_Stage2_3_Reso_NoTTA_ROI"
MODEL_PATHS = [os.path.join(MODEL_DIR, f"{MODEL_NAME}_fold{i}.pth") for i in range(1, 6)]
WEIGHT_PATH = os.path.join(MODEL_DIR, f"{MODEL_NAME}_ensemble_weights_from_OOF.json")

# Calibration 모델 경로
CALIBRATION_DIR = os.path.join(PROJECT_ROOT, "Calibration_Model")
ISOTONIC_CALIBRATOR_PATH = os.path.join(CALIBRATION_DIR, "isotonic_calibrator.joblib")

# =============================================================================
# 고정 설정 (변경 불필요)
# =============================================================================
BONEAGE_MAX_DEVIATION = 24
ADULT_MONTHS = 216.0
PAH_W_D = 0.4
PAH_ALPHA = 0.1
IMG_SIZE = 448
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 전처리 파이프라인 기본 설정
DEFAULT_PREPROCESS_CONFIG = {
    "do_standardize": True,
    "do_roi": True,
    "use_std1": True,
    "use_roi1": False,
    "use_std2": False,
    "use_roi2": False,
    "use_isotonic_calibration": True
}

# ROI 파라미터
CROP_PCT = 10
PREPROC_MODE, BILAT_D, BILAT_SIGMA_COLOR, BILAT_SIGMA_SPACE = 2, 6, 96, 97
MEDIAN_K, GAUSS_K, CLAHE_CLIP, CLAHE_TILE = 9, 8, 8, 6
THRESH_MODE, BLOCK_SIZE_RAW, C_SHIFTED, GLOBAL_T, INVERT = 1, 40, 109, 123, 1
C_ACTUAL = C_SHIFTED - 100
OPEN_KS, CLOSE_KS, ERODE_KS, DILATE_KS = 5, 59, 0, 61
MORPH_ITER, FILL_HOLES = 1, 0
MIN_AREA_PCT, MAX_AREA_PCT, CENTRAL_WINDOW_PCT = 10, 100, 0
SELECTION_MODE, W_AREA, W_LENGTH, W_SOLIDITY, W_CENTER, CENTRAL_BIAS = 0, 20, 70, 10, 30, 10
APPLY_MASK_INSIDE_CROP, CROP_MARGIN = True, 0

# =============================================================================
# 유틸리티 함수
# =============================================================================
def imread_unicode(path, flags=cv2.IMREAD_GRAYSCALE):
    """유니코드 경로 지원 이미지 로드"""
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), flags)
    if img is None:
        raise FileNotFoundError(f"Failed to load image: {path}")
    return img


def imread_unicode_color(path):
    """유니코드 경로 지원 컬러 이미지 로드"""
    return imread_unicode(path, cv2.IMREAD_COLOR)


def to_uint8(img):
    """이미지를 uint8로 변환"""
    return np.clip(img, 0, 255).astype(np.uint8)


def to_bgr(img):
    """이미지를 BGR 형식으로 변환"""
    if img is None:
        return None
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img


def load_criteria(path):
    """전처리 기준 JSON 로드"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def rotate_bound(gray, angle_deg):
    """이미지 회전"""
    h, w = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w/2, h/2), angle_deg, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def apply_alignment(gray, crit):
    """정렬 및 리사이즈 적용"""
    out = gray
    align = crit.get("align", {})
    if "rotate_deg" in align:
        out = rotate_bound(out, float(align["rotate_deg"]))
    resize = crit.get("resize", {})
    if "short" in resize:
        short = int(resize["short"])
        h, w = out.shape[:2]
        cur_short = min(h, w)
        if cur_short > 0 and short > 0 and cur_short != short:
            scale = short / float(cur_short)
            out = cv2.resize(out, (max(1, int(round(w*scale))), max(1, int(round(h*scale)))), interpolation=cv2.INTER_LINEAR)
    return out


def crop_by_roi(gray, crit):
    """ROI 영역 추출"""
    roi = crit.get("roi", None)
    if roi is None:
        return gray
    h, w = gray.shape[:2]
    rtype = (roi.get("type") or "relative").lower()
    if rtype == "relative":
        x, y = int(round(float(roi["x"])*w)), int(round(float(roi["y"])*h))
        ww, hh = int(round(float(roi["w"])*w)), int(round(float(roi["h"])*h))
    else:
        x, y = int(round(float(roi["x"]))), int(round(float(roi["y"])))
        ww, hh = int(round(float(roi["w"]))), int(round(float(roi["h"])))
    x1, y1 = max(0, min(w, x)), max(0, min(h, y))
    x2, y2 = max(0, min(w, x+ww)), max(0, min(h, y+hh))
    if x2 > x1 and y2 > y1:
        return gray[y1:y2, x1:x2]
    return gray


def apply_intensity_mapping(gray, crit):
    """밝기 매핑 적용"""
    g = gray.astype(np.float32)
    inten = crit.get("intensity", {})
    src_lo = float(inten.get("src_lo", np.percentile(g, 1)))
    src_hi = float(inten.get("src_hi", np.percentile(g, 99)))
    dst_lo = float(inten.get("dst_lo", 0.0))
    dst_hi = float(inten.get("dst_hi", 255.0))
    if src_hi <= src_lo:
        src_hi = src_lo + 1.0
    g = np.clip((g - src_lo) / (src_hi - src_lo), 0.0, 1.0) * (dst_hi - dst_lo) + dst_lo
    gamma = crit.get("gamma", None)
    if gamma:
        g = np.power(np.clip(g/255.0, 0, 1), float(gamma)) * 255.0
    return to_uint8(g)


def standardize_gray_array(gray, criteria):
    """그레이스케일 이미지 표준화"""
    g = apply_alignment(gray, criteria)
    g = crop_by_roi(g, criteria)
    g = apply_intensity_mapping(g, criteria)
    return g


def standardize_bgr(bgr_img, criteria):
    """BGR 이미지 표준화"""
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    g_std = standardize_gray_array(gray, criteria)
    return to_bgr(g_std)


# =============================================================================
# ROI 추출 함수
# =============================================================================
def oddize(x, min_odd=3):
    """홀수로 변환"""
    x = int(max(x, min_odd))
    return x if x % 2 == 1 else x + 1


def contour_center(c):
    """컨투어 중심 계산"""
    M = cv2.moments(c)
    if M["m00"] != 0:
        return np.array([M["m10"]/M["m00"], M["m01"]/M["m00"]], dtype=np.float32)
    return c.reshape(-1, 2).astype(np.float32).mean(axis=0)


def solidity(c):
    """솔리디티 계산"""
    area = cv2.contourArea(c)
    hull_area = max(cv2.contourArea(cv2.convexHull(c)), 1e-6)
    return float(area) / hull_area


def in_central_window(ctr, w, h, pct):
    """중앙 영역 내 여부 확인"""
    if pct <= 0:
        return True
    cx0 = w*(100-pct)/200
    cy0 = h*(100-pct)/200
    return (cx0 <= ctr[0] <= w-cx0) and (cy0 <= ctr[1] <= h-cy0)


def pick_contour(contours, img_w, img_h, min_area, max_area, mode, w_area, w_len, w_sol, w_center, central_bias, central_win_pct):
    """최적 컨투어 선택"""
    cand = []
    for c in contours:
        a = cv2.contourArea(c)
        if min_area <= a <= max_area and in_central_window(contour_center(c), img_w, img_h, central_win_pct):
            cand.append(c)
    if not cand:
        return None
    if mode == 1:
        return cand[int(np.argmax([cv2.contourArea(c) for c in cand]))]
    if mode == 2:
        return cand[int(np.argmax([cv2.arcLength(c, True) for c in cand]))]
    
    areas = np.array([cv2.contourArea(c) for c in cand], dtype=np.float32)
    perims = np.array([cv2.arcLength(c, True) for c in cand], dtype=np.float32)
    solids = np.array([solidity(c) for c in cand], dtype=np.float32)
    ctrs = np.array([contour_center(c) for c in cand], dtype=np.float32)
    diag = np.hypot(img_w, img_h)
    dists = np.hypot(ctrs[:,0]-img_w/2, ctrs[:,1]-img_h/2) / (diag + 1e-6)
    
    if mode == 3:
        return cand[int(np.argmin(dists))]
    if mode == 4:
        return cand[int(np.argmax(solids))]
    
    a_norm = areas / (areas.max() + 1e-6)
    l_norm = perims / (perims.max() + 1e-6)
    score = (w_area*a_norm + w_len*l_norm + w_sol*solids) - (w_center*(central_bias/50.0)*dists)
    return cand[int(np.argmax(score))]


def apply_preproc(gray, pre_mode, bilat_d, sigC, sigS, med_k, gau_k, clahe_clip, clahe_tile):
    """전처리 필터 적용"""
    if pre_mode == 1 and bilat_d > 0:
        return cv2.bilateralFilter(gray, d=int(bilat_d), sigmaColor=int(sigC), sigmaSpace=int(sigS))
    if pre_mode == 2:
        return cv2.medianBlur(gray, oddize(max(1, int(med_k))))
    if pre_mode == 3:
        k = oddize(max(1, int(gau_k)))
        return cv2.GaussianBlur(gray, (k, k), 0)
    if pre_mode == 4:
        clahe = cv2.createCLAHE(clipLimit=max(1.0, float(clahe_clip)), tileGridSize=(max(2, int(clahe_tile)), max(2, int(clahe_tile))))
        return clahe.apply(gray.astype(np.uint8))
    return gray


def apply_threshold(gray, mode, block_size, Cval, invert, global_t):
    """이진화 적용"""
    if mode in (0, 1):
        block = oddize(int(block_size), 3)
        max_odd = (min(gray.shape[:2]) // 2) * 2 - 1
        if max_odd >= 3 and block > max_odd:
            block = oddize(max_odd)
        method = cv2.ADAPTIVE_THRESH_MEAN_C if mode == 0 else cv2.ADAPTIVE_THRESH_GAUSSIAN_C
        thtype = cv2.THRESH_BINARY_INV if invert == 1 else cv2.THRESH_BINARY
        return cv2.adaptiveThreshold(gray, 255, method, thtype, block, int(Cval))
    if mode == 2:
        t = int(np.clip(global_t, 0, 255))
        _, b = cv2.threshold(gray, t, 255, cv2.THRESH_BINARY_INV if invert == 1 else cv2.THRESH_BINARY)
        return b
    flag = (cv2.THRESH_BINARY_INV if invert == 1 else cv2.THRESH_BINARY) | cv2.THRESH_OTSU
    _, b = cv2.threshold(gray, 0, 255, flag)
    return b


def apply_morph(bin_img, open_k, close_k, erode_k, dilate_k, iters, fill_holes):
    """형태학적 연산 적용"""
    out = bin_img.copy()
    def ker(k):
        return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(k), int(k)))
    if open_k > 0:
        for _ in range(max(1, int(iters))):
            out = cv2.morphologyEx(out, cv2.MORPH_OPEN, ker(open_k))
    if close_k > 0:
        for _ in range(max(1, int(iters))):
            out = cv2.morphologyEx(out, cv2.MORPH_CLOSE, ker(close_k))
    if erode_k > 0:
        for _ in range(max(1, int(iters))):
            out = cv2.erode(out, ker(erode_k))
    if dilate_k > 0:
        for _ in range(max(1, int(iters))):
            out = cv2.dilate(out, ker(dilate_k))
    if fill_holes == 1:
        h, w = out.shape[:2]
        flood = out.copy()
        mask = np.zeros((h+2, w+2), np.uint8)
        cv2.floodFill(flood, mask, (0, 0), 255 if out[0, 0] == 0 else 0)
        out = cv2.bitwise_or(out, cv2.bitwise_not(flood))
    return out


def extract_roi_from_image(bgr_img):
    """이미지에서 ROI 추출"""
    if bgr_img is None:
        return None, "read_fail"
    gray_full = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    H, W = gray_full.shape[:2]
    ph, pw = int(H*(CROP_PCT/100.0)), int(W*(CROP_PCT/100.0))
    
    if ph*2 >= H or pw*2 >= W:
        y0, y1, x0, x1 = 0, H, 0, W
        crop_gray = gray_full
        bgr_crop = bgr_img
    else:
        y0, y1 = ph, H-ph
        x0, x1 = pw, W-pw
        crop_gray = gray_full[y0:y1, x0:x1]
        bgr_crop = bgr_img[y0:y1, x0:x1]
    
    crop_gray = cv2.normalize(crop_gray, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    crop_gray = apply_preproc(crop_gray, PREPROC_MODE, BILAT_D, BILAT_SIGMA_COLOR, BILAT_SIGMA_SPACE, MEDIAN_K, GAUSS_K, CLAHE_CLIP, CLAHE_TILE)
    bin_img = apply_threshold(crop_gray, THRESH_MODE, BLOCK_SIZE_RAW, C_ACTUAL, INVERT, GLOBAL_T)
    bin_img = apply_morph(bin_img, OPEN_KS, CLOSE_KS, ERODE_KS, DILATE_KS, MORPH_ITER, FILL_HOLES)
    
    contours, _ = cv2.findContours(bin_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, "no_contour"
    
    h, w = bin_img.shape[:2]
    min_area = (MIN_AREA_PCT/100.0) * (h*w)
    max_area = (MAX_AREA_PCT/100.0) * (h*w)
    best = pick_contour(contours, w, h, min_area, max_area, SELECTION_MODE, W_AREA/100.0, W_LENGTH/100.0, W_SOLIDITY/100.0, W_CENTER/100.0, CENTRAL_BIAS, CENTRAL_WINDOW_PCT)
    
    if best is None:
        return None, "no_valid_contour"
    
    bx, by, bw, bh = cv2.boundingRect(best)
    if CROP_MARGIN > 0:
        bx = max(0, bx - CROP_MARGIN)
        by = max(0, by - CROP_MARGIN)
        bw = min(w - bx, bw + 2*CROP_MARGIN)
        bh = min(h - by, bh + 2*CROP_MARGIN)
    
    crop_roi = bgr_crop[by:by+bh, bx:bx+bw].copy()
    if APPLY_MASK_INSIDE_CROP:
        mask = np.zeros((h, w), np.uint8)
        cv2.drawContours(mask, [best], -1, 255, thickness=cv2.FILLED)
        crop_mask = mask[by:by+bh, bx:bx+bw]
        crop_roi = cv2.bitwise_and(crop_roi, crop_roi, mask=crop_mask)
    return crop_roi, "ok"


# =============================================================================
# 모델 정의 및 추론
# =============================================================================
class ConvNeXtFiLM_Late_MT(nn.Module):
    """ConvNeXt + FiLM 기반 뼈나이 예측 모델"""
    def __init__(self, num_bins=7):
        super().__init__()
        self.backbone = timm.create_model("convnext_base", pretrained=False, num_classes=0, in_chans=3)
        for m in self.backbone.modules():
            if isinstance(m, nn.BatchNorm2d):
                m.eval()
        nf = self.backbone.num_features
        self.sex_emb = nn.Embedding(2, 32)
        self.gamma_fc = nn.Linear(32, nf)
        self.beta_fc = nn.Linear(32, nf)
        self.head_reg = nn.Sequential(nn.LayerNorm(nf), nn.Linear(nf, 256), nn.GELU(), nn.Dropout(0.3), nn.Linear(256, 1))
        self.head_cls = nn.Sequential(nn.LayerNorm(nf), nn.Linear(nf, 256), nn.GELU(), nn.Dropout(0.3), nn.Linear(256, num_bins))
        self.num_bins = num_bins

    def forward(self, img, sex):
        x = self.backbone.forward_features(img)
        x = x.mean(dim=[2, 3])
        s = self.sex_emb(sex)
        gamma = self.gamma_fc(s)
        beta = self.beta_fc(s)
        x = gamma * x + beta
        pred_reg = self.head_reg(x).squeeze(1)
        logits = self.head_cls(x)
        return pred_reg, logits


def infer_cls_bins_from_state_dict(state_dict):
    """모델 가중치에서 분류 헤드 크기 추론"""
    cands = [int(w.shape[0]) for k, w in state_dict.items() if k.startswith("head_cls.") and w.dim() == 2]
    return min(cands) if cands else None


def load_single_model(path, device):
    """단일 모델 로드"""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}")
    sd = torch.load(path, map_location=device)
    k = infer_cls_bins_from_state_dict(sd)
    if k is None:
        model = ConvNeXtFiLM_Late_MT(num_bins=7).to(device)
        filt = {kk: vv for kk, vv in sd.items() if not kk.startswith("head_cls.")}
        model.load_state_dict(filt, strict=False)
    else:
        model = ConvNeXtFiLM_Late_MT(num_bins=k).to(device)
        try:
            model.load_state_dict(sd, strict=True)
        except RuntimeError:
            filt = {kk: vv for kk, vv in sd.items() if not kk.startswith("head_cls.")}
            model.load_state_dict(filt, strict=False)
    model.eval()
    return model


def load_fold_models(device, model_paths):
    """5-Fold 모델 로드"""
    models = []
    ks = []
    for p in model_paths:
        m = load_single_model(p, device)
        models.append(m)
        ks.append(m.num_bins)
    if len(set(ks)) > 1:
        print(f"[WARN] Different head_cls K: {ks}")
    else:
        print(f"[INFO] head_cls K={ks[0]}")
    return models


@torch.no_grad()
def ensemble_predict_single(bgr_img, sex, models, weights, device, img_size=IMG_SIZE):
    """앙상블 예측 수행"""
    rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    tfm = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    x = tfm(rgb).unsqueeze(0).to(device)
    s = torch.tensor([int(sex)], dtype=torch.long, device=device)
    outs = []
    for m in models:
        pr, _ = m(x, s)
        outs.append(pr.float().cpu().numpy())
    outs = np.stack(outs, axis=0)
    pred = float(np.average(outs, axis=0, weights=weights)[0])
    return pred


def clamp_boneage(pred, age_current, max_dev=BONEAGE_MAX_DEVIATION):
    """뼈나이 범위 제한"""
    lo = age_current - max_dev
    hi = age_current + max_dev
    if pred < lo:
        return lo, True, pred
    if pred > hi:
        return hi, True, pred
    return pred, False, pred


# =============================================================================
# LMS 기반 PAH 계산
# =============================================================================
def normalize_sex_value(v):
    """성별 값 정규화"""
    if pd.isna(v):
        return None
    s = str(v).strip().lower()
    if s in ["1", "m", "male", "남", "boy"]:
        return "male"
    if s in ["2", "f", "female", "여", "girl"]:
        return "female"
    return None


def z_from_x(x, L, M, S):
    """키에서 Z-score 계산"""
    if abs(L) < 1e-12:
        return np.log(x/M) / S
    return ((x/M)**L - 1.0) / (L*S)


def x_from_z(z, L, M, S):
    """Z-score에서 키 계산"""
    if abs(L) < 1e-12:
        return M * np.exp(S*z)
    return M * (1.0 + L*S*z)**(1.0/L)


def load_lms_data(csv_path):
    """LMS 데이터 로드"""
    df = pd.read_csv(csv_path)
    df["sex_std"] = df["Sex"].apply(normalize_sex_value)
    return df


def get_lms_interpolators(lms_df, sex):
    """LMS 보간 함수 생성"""
    sex_std = "male" if sex == 1 else "female"
    df = lms_df[lms_df["sex_std"] == sex_std][["Month", "L", "M", "S"]].dropna().sort_values("Month").reset_index(drop=True)
    if df.empty:
        raise ValueError(f"No data for {sex_std}")
    months = df["Month"].values.astype(float)
    Lv = df["L"].values.astype(float)
    Mv = df["M"].values.astype(float)
    Sv = df["S"].values.astype(float)
    
    def interp(t, ys):
        t_clipped = np.clip(t, months.min(), months.max())
        return float(np.interp(t_clipped, months, ys))
    
    return lambda t: interp(t, Lv), lambda t: interp(t, Mv), lambda t: interp(t, Sv)


def calculate_pah_lms(height, boneage_months, sex, lms_df, adult_months=216.0):
    """LMS 기반 PAH 계산"""
    L_fn, M_fn, S_fn = get_lms_interpolators(lms_df, sex)
    L_ba, M_ba, S_ba = L_fn(boneage_months), M_fn(boneage_months), S_fn(boneage_months)
    Z_ba = z_from_x(height, L_ba, M_ba, S_ba)
    percentile_ba = NormalDist().cdf(Z_ba) * 100.0
    L_ad, M_ad, S_ad = L_fn(adult_months), M_fn(adult_months), S_fn(adult_months)
    pah_lms = x_from_z(Z_ba, L_ad, M_ad, S_ad)
    return {
        "Z_score_boneage": Z_ba,
        "percentile_boneage": percentile_ba,
        "PAH_LMS": pah_lms,
        "L_ba": L_ba, "M_ba": M_ba, "S_ba": S_ba,
        "L_ad": L_ad, "M_ad": M_ad, "S_ad": S_ad
    }


def calculate_height_percentile(height, age_months, sex, lms_df):
    """현재 키 백분위 계산"""
    L_fn, M_fn, S_fn = get_lms_interpolators(lms_df, sex)
    L_ca, M_ca, S_ca = L_fn(age_months), M_fn(age_months), S_fn(age_months)
    Z_ca = z_from_x(height, L_ca, M_ca, S_ca)
    percentile_ca = NormalDist().cdf(Z_ca) * 100.0
    return {
        "Z_score_current": Z_ca,
        "percentile_current": percentile_ca
    }


def calculate_pah_final_percentile(pah_final, sex, lms_df, adult_months=216.0):
    """최종 PAH 백분위 계산"""
    L_fn, M_fn, S_fn = get_lms_interpolators(lms_df, sex)
    L_ad, M_ad, S_ad = L_fn(adult_months), M_fn(adult_months), S_fn(adult_months)
    Z_pah = z_from_x(pah_final, L_ad, M_ad, S_ad)
    percentile_pah = NormalDist().cdf(Z_pah) * 100.0
    return {
        "Z_score_pah_final": Z_pah,
        "percentile_pah_final": percentile_pah
    }


def calculate_mph_percentile(mph, sex, lms_df, adult_months=216.0):
    """MPH(유전 기반 예측 키) 백분위 계산"""
    L_fn, M_fn, S_fn = get_lms_interpolators(lms_df, sex)
    L_ad, M_ad, S_ad = L_fn(adult_months), M_fn(adult_months), S_fn(adult_months)
    Z_mph = z_from_x(mph, L_ad, M_ad, S_ad)
    percentile_mph = NormalDist().cdf(Z_mph) * 100.0
    return {
        "Z_score_mph": Z_mph,
        "percentile_mph": percentile_mph
    }


def calculate_pah_lms_percentile(pah_lms, sex, lms_df, adult_months=216.0):
    """PAH_LMS(성장곡선 기반 예측 키) 백분위 계산"""
    L_fn, M_fn, S_fn = get_lms_interpolators(lms_df, sex)
    L_ad, M_ad, S_ad = L_fn(adult_months), M_fn(adult_months), S_fn(adult_months)
    Z_pah_lms = z_from_x(pah_lms, L_ad, M_ad, S_ad)
    percentile_pah_lms = NormalDist().cdf(Z_pah_lms) * 100.0
    return {
        "Z_score_pah_lms": Z_pah_lms,
        "percentile_pah_lms": percentile_pah_lms
    }


def months_to_year_month_str(months):
    """개월을 'YY MM' 형식으로 변환"""
    months_int = int(round(months))
    years = months_int // 12
    remaining_months = months_int % 12
    return f"{years}Y {remaining_months}M"


def calculate_potential_score(age_current_month, boneage_month):
    """성장 잠재력 점수 계산"""
    delta = age_current_month - boneage_month
    delta_clamped = max(-24.0, min(24.0, delta))
    score = ((delta_clamped + 24.0) / 48.0) * 100.0
    if score >= 70:
        interp = "높음"
    elif score >= 55:
        interp = "약간 높음"
    elif score >= 45:
        interp = "평균"
    elif score >= 30:
        interp = "약간 낮음"
    else:
        interp = "낮음"
    return {
        "delta_boneage": delta,
        "delta_boneage_clamped": delta_clamped,
        "potential_score": score,
        "interpretation": interp
    }


# =============================================================================
# PAH 보정 (유전/성숙도)
# =============================================================================
def is_valid_height(h):
    """유효한 키 값 확인"""
    if h is None:
        return False
    if isinstance(h, str):
        return h.upper() not in ["NA", "NAN", "NONE", ""]
    return not pd.isna(h)


def calculate_mph(father, mother, male):
    """MPH(유전 기반 예측 키) 계산"""
    mph_mean = (father + mother) / 2.0
    return mph_mean + 6.5 if male == 1 else mph_mean - 6.5


def calibrate_pah(height, pah_lms, father_height, mother_height, male, age_current_month, boneage_month, w_D=PAH_W_D, alpha=PAH_ALPHA):
    """PAH 보정 (유전/성숙도)"""
    can_use_genetic = is_valid_height(father_height) and is_valid_height(mother_height)
    R_LMS = pah_lms - height
    Gap_year = (boneage_month - age_current_month) / 12.0
    
    result = {
        "R_LMS": R_LMS,
        "MPH": None,
        "D_target": None,
        "Gap_year": Gap_year,
        "R_gen": None,
        "PAH_Genetic": None,
        "ΔGenetic": 0.0,
        "ΔMaturity": None,
        "R_final": None,
        "PAH_Final": None,
        "genetic_available": can_use_genetic
    }
    
    if can_use_genetic:
        MPH = calculate_mph(float(father_height), float(mother_height), male)
        D_target = max(MPH - height, 0.0)
        R_gen = (1.0 - w_D) * R_LMS + w_D * D_target
        result["MPH"] = MPH
        result["D_target"] = D_target
        result["R_gen"] = R_gen
        result["PAH_Genetic"] = height + R_gen
        result["ΔGenetic"] = R_gen - R_LMS
        
        gap_factor = 1.0 - alpha * Gap_year
        R_final = max(R_gen * gap_factor, 0.0)
        result["R_final"] = R_final
        result["ΔMaturity"] = R_final - R_gen
        result["PAH_Final"] = height + R_final
    else:
        gap_factor = 1.0 - alpha * Gap_year
        R_final = max(R_LMS * gap_factor, 0.0)
        result["R_final"] = R_final
        result["ΔMaturity"] = R_final - R_LMS
        result["PAH_Final"] = height + R_final
    
    return result


# =============================================================================
# 모델 캐시 (싱글톤 패턴)
# =============================================================================
_model_cache = {
    "models": None,
    "weights": None,
    "criteria": None,
    "lms_df": None,
    "calibrator": None
}


def load_resources(force_reload=False):
    """
    모델 및 데이터 리소스 로드 (캐싱)
    
    Parameters:
        force_reload: True이면 캐시 무시하고 다시 로드
    
    Returns:
        dict: 로드된 리소스들
    """
    global _model_cache
    
    if not force_reload and _model_cache["models"] is not None:
        return _model_cache
    
    print("[리소스 로드 중...]")
    
    # 모델 로드
    _model_cache["models"] = load_fold_models(DEVICE, MODEL_PATHS)
    
    # 앙상블 가중치 로드
    with open(WEIGHT_PATH, "r") as f:
        weights_data = json.load(f)
    
    # 리스트 형태와 딕셔너리 형태 모두 지원
    if isinstance(weights_data, list):
        _model_cache["weights"] = weights_data
    elif isinstance(weights_data, dict):
        _model_cache["weights"] = [weights_data[f"fold{i}"] for i in range(1, 6)]
    else:
        raise ValueError(f"Unexpected weights format: {type(weights_data)}")
    
    # 전처리 기준 로드
    _model_cache["criteria"] = load_criteria(CRITERIA_JSON_PATH)
    
    # LMS 데이터 로드
    _model_cache["lms_df"] = load_lms_data(LMS_CSV_PATH)
    
    # Isotonic Calibrator 로드 (있는 경우)
    if os.path.exists(ISOTONIC_CALIBRATOR_PATH):
        try:
            from joblib import load as joblib_load
            _model_cache["calibrator"] = joblib_load(ISOTONIC_CALIBRATOR_PATH)
            print(f"[INFO] Isotonic Calibrator 로드됨")
        except Exception as e:
            print(f"[WARN] Isotonic Calibrator 로드 실패: {e}")
            _model_cache["calibrator"] = None
    else:
        print(f"[INFO] Isotonic Calibrator 없음 (경로: {ISOTONIC_CALIBRATOR_PATH})")
        _model_cache["calibrator"] = None
    
    print("[리소스 로드 완료]")
    return _model_cache


# =============================================================================
# 메인 예측 함수 (외부 호출용 API)
# =============================================================================
def predict_bone_age(
    image_path: str,
    sex: int,
    height: float,
    age_months: int,
    father_height: float = None,
    mother_height: float = None,
    preprocess_config: dict = None,
    verbose: bool = True
) -> dict:
    """
    뼈나이 예측 및 성인 예상키(PAH) 계산
    
    Parameters:
        image_path (str): 손 X-ray 이미지 파일 경로
        sex (int): 성별 (1=남자, 0=여자)
        height (float): 현재 키 (cm)
        age_months (int): 현재 나이 (개월)
        father_height (float, optional): 아버지 키 (cm). None이면 유전 보정 미적용
        mother_height (float, optional): 어머니 키 (cm). None이면 유전 보정 미적용
        preprocess_config (dict, optional): 전처리 설정. None이면 기본값 사용
        verbose (bool): 상세 출력 여부
    
    Returns:
        dict: 예측 결과 (16개 필드)
            - PAH_Final: 최종 예측 키 (cm)
            - Current_Age: 현재 나이 (Y년 M개월)
            - BoneAge: 뼈 나이 (Y년 M개월)
            - MPH: 유전적 예측 키 (cm) 또는 None
            - Height_Score: 현재 키 백분위 (%)
            - Potential_Score: 성장 잠재력 점수 (0-100)
            - Current_Height: 현재 키 (cm)
            - Current_Height_Percentile: 현재 키 백분위 (%)
            - Genetic_Predicted_Height: 유전 기반 예측 키 (cm) 또는 None
            - MPH_Percentile: 유전 기반 예측 키 백분위 (%) 또는 None
            - Growth_Curve_Predicted_Height: 성장곡선 기반 예측 키 (cm)
            - LMS_Percentile: 성장곡선 기반 예측 키 백분위 (%)
            - Delta_Genetic: 유전 기반 보정량 (cm)
            - Delta_Maturity: 성숙도 기반 보정량 (cm)
            - Final_Predicted_Height: 최종 예측 키 (cm)
            - PAH_Final_Percentile: 최종 예측 키 백분위 (%)
    
    Example:
        >>> result = predict_bone_age(
        ...     image_path="patient_001.jpg",
        ...     sex=0,
        ...     height=155.0,
        ...     age_months=143,
        ...     father_height=165.0,
        ...     mother_height=156.0
        ... )
        >>> print(result["PAH_Final"])
        158.25
    """
    # 전처리 설정
    config = DEFAULT_PREPROCESS_CONFIG.copy()
    if preprocess_config:
        config.update(preprocess_config)
    
    if verbose:
        print("=" * 60)
        print("BoneAge + PAH 통합 예측 시스템")
        print("=" * 60)
    
    # 리소스 로드
    resources = load_resources()
    models = resources["models"]
    weights = resources["weights"]
    criteria = resources["criteria"]
    lms_df = resources["lms_df"]
    calibrator = resources["calibrator"]
    
    # 이미지 로드 및 전처리
    if verbose:
        print("\n[STEP 1] 모델 로드 및 BoneAge 예측...")
    
    img_cur = imread_unicode_color(image_path)
    
    if config["do_standardize"] and config["use_std1"]:
        img_cur = standardize_bgr(img_cur, criteria)
    if config["do_roi"] and config["use_roi1"]:
        roi_bgr, _ = extract_roi_from_image(img_cur)
        if roi_bgr is not None:
            img_cur = roi_bgr
    if config["do_standardize"] and config["use_std2"]:
        img_cur = standardize_bgr(img_cur, criteria)
    if config["do_roi"] and config["use_roi2"]:
        roi_bgr2, _ = extract_roi_from_image(img_cur)
        if roi_bgr2 is not None:
            img_cur = roi_bgr2
    
    # BoneAge 예측 및 Clamp
    pred_boneage_raw = ensemble_predict_single(img_cur, sex, models, weights, DEVICE)
    pred_boneage_clamped, was_clamped, original_pred = clamp_boneage(pred_boneage_raw, age_months)
    
    if verbose:
        if was_clamped:
            print(f"   ⚠ BoneAge 범위 제한: {original_pred:.2f} → {pred_boneage_clamped:.2f}")
        print(f"   ✓ BoneAge (모델): {pred_boneage_clamped:.2f}M ({pred_boneage_clamped/12:.2f}Y)")
    
    # Isotonic Calibration
    boneage_isotonic_calibrated = None
    isotonic_calibration_applied = False
    
    if config["use_isotonic_calibration"] and calibrator is not None:
        if verbose:
            print("\n[Isotonic Calibration]")
        try:
            boneage_isotonic_calibrated = float(calibrator.predict([pred_boneage_clamped])[0])
            boneage_isotonic_delta = boneage_isotonic_calibrated - pred_boneage_clamped
            isotonic_calibration_applied = True
            if verbose:
                print(f"   ✓ 보정: {pred_boneage_clamped:.2f} → {boneage_isotonic_calibrated:.2f} ({boneage_isotonic_delta:+.2f})")
        except Exception as e:
            if verbose:
                print(f"   ⚠ 실패: {e}")
    
    # 최종 BoneAge 결정
    if isotonic_calibration_applied and boneage_isotonic_calibrated is not None:
        pred_boneage = boneage_isotonic_calibrated
        if verbose:
            print(f"   ★ PAH 계산용 BoneAge: {pred_boneage:.2f}M (Isotonic)")
    else:
        pred_boneage = pred_boneage_clamped
        if verbose:
            print(f"   ★ PAH 계산용 BoneAge: {pred_boneage:.2f}M")
    
    # LMS 기반 PAH
    if verbose:
        print("\n[STEP 2] LMS 기반 PAH 계산...")
    pah_result = calculate_pah_lms(height, pred_boneage, sex, lms_df, ADULT_MONTHS)
    percentile_result = calculate_height_percentile(height, age_months, sex, lms_df)
    if verbose:
        print(f"   ✓ PAH_LMS: {pah_result['PAH_LMS']:.2f}cm, 현재키 Percentile: {percentile_result['percentile_current']:.1f}th")
    
    # PAH 보정
    if verbose:
        print("\n[STEP 3] PAH 보정...")
    calib_result = calibrate_pah(height, pah_result['PAH_LMS'], father_height, mother_height, sex, age_months, pred_boneage)
    if verbose:
        if calib_result['genetic_available']:
            print(f"   ✓ MPH: {calib_result['MPH']:.2f}cm")
        print(f"   ✓ PAH_Final: {calib_result['PAH_Final']:.2f}cm")
    
    # 백분위 계산
    pah_final_percentile_result = calculate_pah_final_percentile(calib_result['PAH_Final'], sex, lms_df, ADULT_MONTHS)
    
    mph_percentile_result = None
    if calib_result['MPH'] is not None:
        mph_percentile_result = calculate_mph_percentile(calib_result['MPH'], sex, lms_df, ADULT_MONTHS)
    
    pah_lms_percentile_result = calculate_pah_lms_percentile(pah_result['PAH_LMS'], sex, lms_df, ADULT_MONTHS)
    
    # PotentialScore
    potential_result = calculate_potential_score(age_months, pred_boneage)
    if verbose:
        print(f"   ✓ PotentialScore: {potential_result['potential_score']:.1f}점 ({potential_result['interpretation']})")
    
    # =============================================================================
    # 최종 JSON 결과 (16개 항목)
    # =============================================================================
    result = {
        "PAH_Final": round(calib_result['PAH_Final'], 2),
        "Current_Age": months_to_year_month_str(age_months),
        "BoneAge": months_to_year_month_str(pred_boneage),
        "MPH": round(calib_result['MPH'], 2) if calib_result['MPH'] is not None else None,
        "Height_Score": round(percentile_result['percentile_current'], 1),
        "Potential_Score": round(potential_result['potential_score'], 1),
        "Current_Height": height,
        "Current_Height_Percentile": round(percentile_result['percentile_current'], 1),
        "Genetic_Predicted_Height": round(calib_result['MPH'], 2) if calib_result['MPH'] is not None else None,
        "MPH_Percentile": round(mph_percentile_result['percentile_mph'], 1) if mph_percentile_result is not None else None,
        "Growth_Curve_Predicted_Height": round(pah_result['PAH_LMS'], 2),
        "LMS_Percentile": round(pah_lms_percentile_result['percentile_pah_lms'], 1),
        "Delta_Genetic": round(calib_result['ΔGenetic'], 2),
        "Delta_Maturity": round(calib_result['ΔMaturity'], 2),
        "Final_Predicted_Height": round(calib_result['PAH_Final'], 2),
        "PAH_Final_Percentile": round(pah_final_percentile_result['percentile_pah_final'], 1),
    }
    
    return result


# =============================================================================
# 단독 실행 시 테스트
# =============================================================================
if __name__ == "__main__":
    # =========================================================================
    # 테스트용 입력값 설정
    # 실제 사용 시 아래 값들을 변경하세요
    # =========================================================================
    TEST_IMAGE_PATH = os.path.join(PROJECT_ROOT, "Total raw image", "Test Image.jpg")
    TEST_SEX = 0              # 1=남자, 0=여자
    TEST_HEIGHT = 155.0       # 현재 키 (cm)
    TEST_AGE_MONTHS = 143     # 현재 나이 (개월) - 11년 11개월
    TEST_FATHER_HEIGHT = 165.0  # 아버지 키 (cm), 없으면 None
    TEST_MOTHER_HEIGHT = 156.0  # 어머니 키 (cm), 없으면 None
    
    # =========================================================================
    # 예측 실행
    # =========================================================================
    result = predict_bone_age(
        image_path=TEST_IMAGE_PATH,
        sex=TEST_SEX,
        height=TEST_HEIGHT,
        age_months=TEST_AGE_MONTHS,
        father_height=TEST_FATHER_HEIGHT,
        mother_height=TEST_MOTHER_HEIGHT,
        verbose=True
    )
    
    # 결과 출력
    print("\n" + "=" * 60)
    print("결과")
    print("=" * 60)
    print(f"  최종 예측 키: {result['PAH_Final']}cm ({result['PAH_Final_Percentile']}th)")
    print(f"  현재 나이: {result['Current_Age']}")
    print(f"  뼈 나이: {result['BoneAge']}")
    print(f"  Potential Score: {result['Potential_Score']}점")
    
    # JSON 저장
    json_output_path = os.path.join(os.path.dirname(TEST_IMAGE_PATH), "prediction_result.json")
    with open(json_output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n📄 JSON 저장: {json_output_path}")
    
    # JSON 출력
    print("\n" + "=" * 60)
    print("JSON 출력")
    print("=" * 60)
    print(json.dumps(result, ensure_ascii=False, indent=2))
