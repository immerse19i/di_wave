# OsteoAge Model - 뼈나이 예측 및 성인 예상키(PAH) 산출 시스템

## 개요

손 X-ray 이미지를 입력받아 딥러닝 기반 뼈나이(Bone Age)를 예측하고, 성인 예상키(PAH)를 산출하는 AI 시스템입니다.

### 주요 기능
- 뼈나이 예측: ConvNeXt Base + FiLM 아키텍처 기반 5-Fold 앙상블 모델
- 성인 예상키(PAH) 계산: 한국인 LMS 성장곡선 기반
- 유전/성숙도 보정: 부모키 및 뼈나이-실제나이 차이 반영
- Isotonic Calibration: 병원별 특성 보정 (선택적)

---

## 프로젝트 구조

```
OsteoAge_Model/
│
├── README.md                        # 본 문서
├── BoneAge_Script_Manual.md         # 입출력 상세 매뉴얼
├── requirements.txt                 # Python 패키지 의존성
│
├── Script/
│   └── CPU_BoneAge_PAH_Compact.py   # 메인 예측 스크립트
│
├── Data/
│   ├── LMS.csv                      # 한국 성장곡선 LMS 데이터
│   └── criteria_C1C2A_*.json        # 이미지 전처리 기준
│
├── Model9_ROI/
│   ├── *_fold1~5.pth                # 모델 가중치 (5개, 총 약 2GB)
│   └── *_ensemble_weights_*.json    # 앙상블 가중치
│
├── Calibration_Model/
│   └── isotonic_calibrator.joblib   # 보정 모델
│
└── Total raw image/
    └── Test Image.jpg               # 테스트용 샘플 이미지
```

---

## 환경 구성

### 1. 가상환경 생성

```bash
conda create -n boneage-cpu python=3.10 -y
conda activate boneage-cpu
```

### 2. 패키지 설치

```bash
pip install -r requirements.txt
```

### 3. 설치 확인

```bash
python -c "import torch; import timm; import cv2; import pandas; print('All packages OK')"
```

---

## 테스트 실행

```bash
cd OsteoAge_Model/Script
python CPU_BoneAge_PAH_Compact.py
```

실행 시 포함된 테스트 이미지(Total raw image/Test Image.jpg)로 예측이 수행되며, 결과가 콘솔에 출력되고 JSON 파일로 저장됩니다.

---

## 입력값

| 변수 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| image_path | string | ✅ | X-ray 이미지 경로 |
| sex | int | ✅ | 성별 (1=남자, 0=여자) |
| height | float | ✅ | 현재 키 (cm) |
| age_months | int | ✅ | 현재 나이 (개월) |
| father_height | float | ❌ | 아버지 키 (cm), 없으면 None |
| mother_height | float | ❌ | 어머니 키 (cm), 없으면 None |

---

## 출력값

16개 필드가 포함된 dict(JSON) 형태로 반환됩니다.

```json
{
  "PAH_Final": 158.25,
  "Current_Age": "11Y 11M",
  "BoneAge": "12Y 8M",
  "MPH": 154.0,
  "Height_Score": 73.2,
  "Potential_Score": 30.8,
  "Current_Height": 155.0,
  "Current_Height_Percentile": 73.2,
  "Genetic_Predicted_Height": 154.0,
  "MPH_Percentile": 8.5,
  "Growth_Curve_Predicted_Height": 160.86,
  "LMS_Percentile": 51.7,
  "Delta_Genetic": -2.34,
  "Delta_Maturity": -0.27,
  "Final_Predicted_Height": 158.25,
  "PAH_Final_Percentile": 31.4
}
```

각 필드에 대한 상세 설명은 BoneAge_Script_Manual.md를 참고해 주세요.

---

## 경로 설정

스크립트는 상대경로 기반으로 작성되어 있습니다. 폴더 구조만 유지하면 별도 경로 수정 없이 동작합니다.

| 리소스 | 경로 (스크립트 기준) |
|--------|---------------------|
| LMS 데이터 | ../Data/LMS.csv |
| 전처리 기준 | ../Data/criteria_*.json |
| 모델 가중치 | ../Model9_ROI/*.pth |
| 앙상블 가중치 | ../Model9_ROI/*_ensemble_weights_*.json |
| 보정 모델 | ../Calibration_Model/isotonic_calibrator.joblib |

---

## 시스템 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| CPU | Intel Core i5 | Intel Core i7+ |
| RAM | 8GB | 16GB |
| 저장공간 | 5GB | 10GB |
| Python | 3.10 이상 | |
| OS | Windows 10/11, Linux, macOS | |

---

## 문제 해결

| 오류 | 원인 | 해결 |
|------|------|------|
| FileNotFoundError | 이미지/모델 경로 오류 | 경로 확인, 폴더 구조 유지 |
| ModuleNotFoundError | 패키지 미설치 | pip install -r requirements.txt |
| RuntimeError (state_dict) | 모델 파일 손상 | 모델 파일 재다운로드 |
| KeyError: 'L' | LMS.csv 형식 오류 | CSV 컬럼명 확인 |

---

## 참고 문서

- 입출력 상세 매뉴얼: BoneAge_Script_Manual.md
