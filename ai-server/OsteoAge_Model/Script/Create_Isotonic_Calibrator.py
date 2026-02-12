# =============================================================================
# Isotonic Calibrator 생성 스크립트
# =============================================================================
# 
# 용도: 엑셀 파일(모델 예측값, 의사 입력값)을 읽어서 Isotonic Calibrator 생성 및 저장
# 
# 사용법:
#   1. 엑셀 파일 준비 (2개 컬럼: model_pred, doctor_input)
#   2. 아래 설정값 수정
#   3. 스크립트 실행
#   4. 생성된 .joblib 파일을 CPU_단일~.py의 ISOTONIC_CALIBRATOR_PATH에 지정
# =============================================================================
# Calibration 최소 샘플 수 기준 (1)

# - 최소: 50개 (EPV 연구 기반)
# - 권장: 100개 이상
# - 이상적: 200개 이상

# 근거:
# 1. Scikit-learn: Isotonic은 ~1000개 이상에서 안정적 (https://scikit-learn.org/stable/modules/calibration.html)
# 2. van Smeden et al. (2019): EPV ≥ 20 권장 (https://pmc.ncbi.nlm.nih.gov/articles/PMC5045274/)
# 3. Ogundimu et al. (2016): EPV ≥ 20 시 bias 제거 (https://pubmed.ncbi.nlm.nih.gov/25817942/)

# * 50개 미만에서는 calibration 수행을 권장하지 않음 (overfitting 위험)
# =============================================================================
# Calibration 최소 샘플 수 기준 (2)
#
# Isotonic Regression은 non-parametric 방법으로, 데이터 포인트마다 
# step function을 생성할 수 있어 적은 데이터에서 overfitting 위험이 높음.
#
# 권장 기준:
# - 최소: 100개
# - 이상적: 1000개 이상
#
# 근거:
# Scikit-learn 공식 문서에 따르면, Isotonic calibration은 
# "greater than ~1000 samples"에서 overfitting을 피할 수 있다고 명시됨.
# https://scikit-learn.org/stable/modules/calibration.html
#
# 원문: "However, it is more prone to overfitting, especially on small datasets. 
#       Overall, 'isotonic' will perform as well as or better than 'sigmoid' 
#       when there is enough data (greater than ~ 1000 samples) to avoid overfitting."
#
# 현실적 제약:
# 병원 운영상 1000개 축적은 시간이 오래 걸리므로, 
# 최소 100개부터 calibration을 시작하되, 데이터가 축적될수록 
# 주기적으로 re-calibration을 수행하는 것을 권장함.
#
# * 100개 미만에서는 calibration 수행을 권장하지 않음 (overfitting 위험)
# =============================================================================
# =============================================================================
# Calibration 샘플 수에 대한 현실적 접근
# =============================================================================
#
# [학술적 근거]
# Scikit-learn 공식 문서: Isotonic은 ~1000개 이상에서 overfitting 방지
# https://scikit-learn.org/stable/modules/calibration.html
#
# [현실적 고려]
# 1. 1000개 축적은 비현실적 (병원당 수년 소요 가능)
# 2. 목적이 "특정 의사/병원에 맞춤"이면 완벽한 일반화 불필요
# 3. 너무 적으면 노이즈에 민감해짐
#
# [실용적 기준]
# - 최소 시작: 30~50개 (단, 불안정할 수 있음을 인지)
# - 안정적 운영: 100개 이상
# - 주기적 re-calibration으로 데이터 축적에 따라 개선
#
# * 이 기준은 학술적으로 검증된 수치가 아닌 실용적 타협안임
# =============================================================================
# =============================================================================

import os
import json
import datetime
import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from joblib import dump

# =============================================================================
# 사용자 설정 (여기만 수정)
# =============================================================================

# 입력 엑셀 파일 경로
# - 컬럼 2개: 왼쪽 = 모델 예측값, 오른쪽 = 의사 입력값
# - 컬럼명은 자유 (첫 번째 컬럼 = 모델, 두 번째 컬럼 = 의사)
INPUT_EXCEL_PATH = r"D:\DiWAVE\OsteoAge_Model\Data\calibration_data.xlsx"

# 출력 Calibrator 저장 경로
OUTPUT_CALIBRATOR_PATH = r"D:\DiWAVE\OsteoAge_Model\Calibration_Model\isotonic_calibrator.joblib"

# 최소 데이터 개수 (이보다 적으면 경고)
MIN_SAMPLES_WARNING = 30  # 30개 미만이면 경고
MIN_SAMPLES_ERROR = 10    # 10개 미만이면 에러

# =============================================================================
# 메인 로직
# =============================================================================

def create_isotonic_calibrator(excel_path: str, save_path: str) -> dict:
    """
    엑셀 파일에서 Isotonic Calibrator 생성 및 저장
    
    Args:
        excel_path: 입력 엑셀 파일 경로
        save_path: calibrator 저장 경로 (.joblib)
    
    Returns:
        dict: 결과 정보
    """
    
    print("=" * 70)
    print("🔧 Isotonic Calibrator 생성")
    print("=" * 70)
    
    # 1. 엑셀 파일 로드
    print(f"\n📂 [STEP 1] 엑셀 파일 로드")
    print(f"   경로: {excel_path}")
    
    if not os.path.exists(excel_path):
        print(f"   ❌ 파일이 존재하지 않습니다!")
        return {"success": False, "error": "파일 없음"}
    
    # 엑셀 또는 CSV 로드
    if excel_path.endswith('.csv'):
        df = pd.read_csv(excel_path, encoding='utf-8-sig')
    else:
        df = pd.read_excel(excel_path)
    
    print(f"   ✓ 로드 완료: {len(df)}행, {len(df.columns)}열")
    print(f"   ✓ 컬럼명: {list(df.columns)}")
    
    # 2. 데이터 추출 (첫 번째 컬럼 = 모델, 두 번째 컬럼 = 의사)
    print(f"\n📊 [STEP 2] 데이터 추출")
    
    if len(df.columns) < 2:
        print(f"   ❌ 컬럼이 2개 이상이어야 합니다!")
        return {"success": False, "error": "컬럼 부족"}
    
    col_model = df.columns[0]   # 첫 번째 컬럼: 모델 예측값
    col_doctor = df.columns[1]  # 두 번째 컬럼: 의사 입력값
    
    print(f"   모델 예측값 컬럼: '{col_model}'")
    print(f"   의사 입력값 컬럼: '{col_doctor}'")
    
    # NaN 제거
    df_clean = df[[col_model, col_doctor]].dropna()
    n_samples = len(df_clean)
    n_dropped = len(df) - n_samples
    
    if n_dropped > 0:
        print(f"   ⚠ NaN 제거: {n_dropped}행 제외됨")
    
    print(f"   ✓ 유효 데이터: {n_samples}개")
    
    # 3. 데이터 개수 검증
    print(f"\n🔍 [STEP 3] 데이터 개수 검증")
    
    if n_samples < MIN_SAMPLES_ERROR:
        print(f"   ❌ 데이터가 너무 적습니다! (최소 {MIN_SAMPLES_ERROR}개 필요)")
        print(f"   현재: {n_samples}개")
        return {"success": False, "error": f"데이터 부족 ({n_samples}개)"}
    
    if n_samples < MIN_SAMPLES_WARNING:
        print(f"   ⚠ 경고: 데이터가 적습니다. 권장 최소 {MIN_SAMPLES_WARNING}개")
        print(f"   현재: {n_samples}개 → 신뢰도가 낮을 수 있음")
    else:
        print(f"   ✓ 데이터 개수 충분: {n_samples}개")
    
    # numpy 배열로 변환
    model_preds = df_clean[col_model].values.astype(np.float64)
    doctor_inputs = df_clean[col_doctor].values.astype(np.float64)
    
    # 4. 데이터 통계
    print(f"\n📈 [STEP 4] 데이터 통계")
    print(f"   모델 예측값 범위: {model_preds.min():.1f} ~ {model_preds.max():.1f} 개월")
    print(f"   의사 입력값 범위: {doctor_inputs.min():.1f} ~ {doctor_inputs.max():.1f} 개월")
    
    diff = doctor_inputs - model_preds
    print(f"   차이 (의사 - 모델): 평균 {diff.mean():+.2f}, 표준편차 {diff.std():.2f} 개월")
    
    mae_before = np.mean(np.abs(diff))
    print(f"   보정 전 MAE: {mae_before:.2f} 개월")
    
    # 5. Isotonic Regression 학습
    print(f"\n🎯 [STEP 5] Isotonic Regression 학습")
    
    calibrator = IsotonicRegression(out_of_bounds='clip')
    calibrator.fit(model_preds, doctor_inputs)
    
    print(f"   ✓ 학습 완료")
    
    # 보정 후 MAE 계산
    calibrated_preds = calibrator.predict(model_preds)
    mae_after = np.mean(np.abs(doctor_inputs - calibrated_preds))
    mae_improvement = mae_before - mae_after
    
    print(f"   ✓ 보정 후 MAE: {mae_after:.2f} 개월")
    print(f"   ✓ MAE 개선: {mae_improvement:+.2f} 개월 ({mae_improvement/mae_before*100:.1f}% 감소)")
    
    # 6. Calibrator 저장
    print(f"\n💾 [STEP 6] Calibrator 저장")
    
    # 저장 디렉토리 생성
    save_dir = os.path.dirname(save_path)
    if save_dir and not os.path.exists(save_dir):
        os.makedirs(save_dir, exist_ok=True)
    
    # joblib으로 저장
    dump(calibrator, save_path)
    print(f"   ✓ 저장 완료: {save_path}")
    
    # 메타데이터 저장
    meta_path = save_path.replace('.joblib', '_meta.json')
    meta = {
        "type": "isotonic_regression",
        "created_at": datetime.datetime.now().isoformat(),
        "source_file": os.path.basename(excel_path),
        "n_samples": int(n_samples),
        "model_pred_range": [float(model_preds.min()), float(model_preds.max())],
        "doctor_input_range": [float(doctor_inputs.min()), float(doctor_inputs.max())],
        "mae_before": float(mae_before),
        "mae_after": float(mae_after),
        "mae_improvement": float(mae_improvement),
        "mae_improvement_pct": float(mae_improvement / mae_before * 100),
    }
    
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    
    print(f"   ✓ 메타데이터 저장: {meta_path}")
    
    # 7. 완료
    print("\n" + "=" * 70)
    print("✅ Calibrator 생성 완료!")
    print("=" * 70)
    print(f"\n   📁 Calibrator 파일: {save_path}")
    print(f"   📊 학습 샘플 수: {n_samples}개")
    print(f"   📉 MAE 개선: {mae_before:.2f} → {mae_after:.2f} 개월")
    print(f"\n   💡 사용법:")
    print(f"      CPU_단일~.py에서:")
    print(f"      USE_ISOTONIC_CALIBRATION = True")
    print(f"      ISOTONIC_CALIBRATOR_PATH = r\"{save_path}\"")
    print("=" * 70)
    
    return {
        "success": True,
        "calibrator_path": save_path,
        "meta_path": meta_path,
        "n_samples": n_samples,
        "mae_before": mae_before,
        "mae_after": mae_after,
        "mae_improvement": mae_improvement,
    }


# =============================================================================
# 테스트용: 샘플 엑셀 파일 생성 (실제 사용 시 주석 처리)
# =============================================================================

def create_sample_excel(output_path: str, n_samples: int = 50):
    """
    테스트용 샘플 엑셀 파일 생성
    """
    np.random.seed(42)
    
    # 모델이 약간 과소예측하는 시나리오
    true_values = np.random.uniform(80, 200, n_samples)
    model_preds = true_values - 5 + np.random.normal(0, 8, n_samples)  # 평균 5개월 과소예측
    
    df = pd.DataFrame({
        'model_pred': model_preds,
        'doctor_input': true_values
    })
    
    df.to_excel(output_path, index=False)
    print(f"샘플 엑셀 생성: {output_path} ({n_samples}행)")
    return output_path


# =============================================================================
# 실행
# =============================================================================

if __name__ == "__main__":
    
    # 샘플 엑셀이 없으면 생성 (테스트용)
    if not os.path.exists(INPUT_EXCEL_PATH):
        print(f"⚠ 입력 파일이 없어서 샘플 데이터로 테스트합니다.")
        print(f"   실제 사용 시 INPUT_EXCEL_PATH를 실제 파일 경로로 변경하세요.\n")
        
        # 샘플 생성
        sample_path = INPUT_EXCEL_PATH.replace('.xlsx', '_sample.xlsx')
        create_sample_excel(sample_path, n_samples=50)
        INPUT_EXCEL_PATH_USE = sample_path
    else:
        INPUT_EXCEL_PATH_USE = INPUT_EXCEL_PATH
    
    # Calibrator 생성
    result = create_isotonic_calibrator(
        excel_path=INPUT_EXCEL_PATH_USE,
        save_path=OUTPUT_CALIBRATOR_PATH
    )
    
    if result['success']:
        print(f"\n🎉 성공! 이제 CPU_단일~.py에서 사용할 수 있습니다.")
    else:
        print(f"\n❌ 실패: {result.get('error', 'Unknown error')}")
