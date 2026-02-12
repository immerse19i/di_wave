import os
import sys
import json
import tempfile
from flask import Flask, request, jsonify

# Osteoage 모델 Script 경로 추가

SCRIPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "OsteoAge_Model", "Script")
sys.path.insert(0, SCRIPT_DIR)

from CPU_BoneAge_PAH_Compact import predict_bone_age

app = Flask(__name__)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})




@app.route("/predict", methods=["POST"])
def predict():
    try : 
        # 1. 이미지 파일 찾기
        if "image" not in request.files:
            return jsonify({"success": False, "message": "이미지 파일이 필요합니다."}), 400
        
        image = request.files["image"]

        # 2. 필수 파라미터
        sex = request.form.get("sex")
        height = request.form.get("height")
        age_months = request.form.get("age_months")
        if not all ([sex , height, age_months]):
            return jsonify({"success": False, "message": "sex, height, age_months는 필수입니다."}), 400

        sex = int(sex)
        height = float(height)
        age_months = int(age_months)

        # 3. 선택 파라미터 (부모키)
        father_height = request.form.get("father_height")
        mother_height = request.form.get("mother_height")
        father_height = float(father_height) if father_height else None
        mother_height = float(mother_height) if mother_height else None

        # 4. 이미지 임시 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            image.save(tmp.name)
            tmp_path = tmp.name


        # 5. 예측 실행
        result = predict_bone_age(
            image_path=tmp_path,
            sex=sex,
            height=height,
            age_months=age_months,
            father_height=father_height,
            mother_height=mother_height,
            verbose=False
        )

        # 6. 임시 파일 삭제
        os.unlink(tmp_path)

        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
if __name__ == "__main__":
    print("AI 서버 시작중... 모델 로딩 시간 걸림")
    app.run(host="0.0.0.0", port=9079, debug=False)