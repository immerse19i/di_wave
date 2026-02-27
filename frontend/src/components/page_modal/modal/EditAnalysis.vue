<template>
  <div class="edit-analysis">
    <FadeLoader v-if="modal.isLoading" />
    <h2 class="modal-title">정보 수정</h2>

    <div class="modal-body">
      <!-- 왼쪽: 기존 X-ray 이미지 -->
      <div class="image-section">
        <div class="image-preview">
          <img :src="imageUrl" alt="X-ray" class="preview-image" />
        </div>
      </div>

      <!-- 오른쪽: 폼 영역 -->
      <div class="form-section">
        <form @submit.prevent>
          <!-- 환자등록번호 -->
          <div class="form-row">
            <label>
              <span class="required">*</span>환자등록번호
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img"
                    src="/assets/images/tooltip/patient_number.svg"
                  />
                </span>
              </div>
            </label>
            <input type="text" v-model="form.patientCode" />
          </div>

          <!-- 환자명 -->
          <div class="form-row">
            <label>
              <span class="required">*</span>환자명
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img"
                    src="/assets/images/tooltip/patient_name.svg"
                  />
                </span>
              </div>
            </label>
            <input type="text" v-model="form.patientName" />
          </div>

          <!-- 생년월일 -->
          <div class="form-row">
            <label><span class="required">*</span>생년월일</label>
            <div class="birth-inputs">
              <input type="text" v-model="form.birthYear" class="input-year" />
              <span class="unit">년</span>
              <input
                type="text"
                v-model="form.birthMonth"
                class="input-month"
              />
              <span class="unit">월</span>
              <input type="text" v-model="form.birthDay" class="input-day" />
              <span class="unit">일</span>
            </div>
          </div>

          <!-- 성별 (비활성) -->
          <div class="form-row">
            <label><span class="required">*</span>성별</label>
            <div class="gender-wrapper">
              <div class="gender-toggle">
                <button
                  type="button"
                  :class="['btn-gender', { active: form.gender === 'M' }]"
                  disabled
                >
                  남
                </button>
                <button
                  type="button"
                  :class="['btn-gender', { active: form.gender === 'F' }]"
                  disabled
                >
                  여
                </button>
              </div>
              <span class="gender-warning"
                >*성별은 분석 이후 수정할 수 없습니다.</span
              >
            </div>
          </div>

          <!-- 현재 키 / 몸무게 -->
          <div class="form-row">
            <label><span class="required">*</span>현재 키</label>
            <div class="dual-input">
              <input type="text" v-model="form.currentHeight" />
              <span class="unit">cm</span>
              <label class="second-label"
                ><span class="required">*</span>몸무게</label
              >
              <input type="text" v-model="form.weight" />
              <span class="unit">kg</span>
            </div>
          </div>

          <!-- 아버지 키 -->
          <div class="form-row">
            <label>아버지 키</label>
            <div class="single-input-unit">
              <input type="text" v-model="form.fatherHeight" />
              <span class="unit">cm</span>
            </div>
          </div>

          <!-- 어머니 키 -->
          <div class="form-row">
            <label>어머니 키</label>
            <div class="single-input-unit">
              <input type="text" v-model="form.motherHeight" />
              <span class="unit">cm</span>
            </div>
          </div>

          <!-- 담당주치의 -->
          <div class="form-row">
            <label><span class="required">*</span>담당주치의</label>
            <div class="single-input-unit">
              <input type="text" v-model="form.physician" />
            </div>
          </div>

          <!-- 분석일 -->
          <div class="form-row">
            <label><span class="required">*</span>분석일</label>
            <div class="input-date">
              <div class="single-input-unit">
                <input
                  type="date"
                  ref="dateInput"
                  v-model="form.analysisDate"
                />
              </div>
              <img
                src="/assets/icons/calendar.svg"
                alt=""
                class="icon-calendar"
                @click="dateInput.showPicker()"
              />
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- 버튼 영역 -->
    <div class="form-actions">
      <button type="button" class="btn-cancel" @click="handleCancel">
        취소
      </button>
      <button type="button" class="btn-submit" @click="handleSubmit">
        수정
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useModalStore } from '@/store/modal';
import { UseMessageStore } from '@/store/message';
import { analysisAPI } from '@/api/analysis';
import { patientAPI } from '@/api/patient';
import FadeLoader from '@/components/common/FadeLoader.vue';
import { useRouter } from 'vue-router';

const modal = useModalStore();
const message = UseMessageStore();
const router = useRouter();
const dateInput = ref(null);

// props 대신 modal.role로 analysis 데이터 전달받기
const analysisData = ref(null);
const imageUrl = ref('');

// 원본 데이터 (변경 감지용)
const originalForm = ref({});

const form = ref({
  patientCode: '',
  patientName: '',
  birthYear: '',
  birthMonth: '',
  birthDay: '',
  gender: '',
  currentHeight: '',
  weight: '',
  fatherHeight: '',
  motherHeight: '',
  physician: '',
  analysisDate: '',
});

// 변경 여부 확인
const hasChanges = () => {
  return JSON.stringify(form.value) !== JSON.stringify(originalForm.value);
};

// 취소 버튼
const handleCancel = () => {
  if (hasChanges()) {
    message.showConfirm(
      '수정한 내용이 저장되지 않습니다.\n계속하시겠습니까?',
      () => modal.close(),
      null,
    );
  } else {
    modal.close();
  }
};

// 수정(저장) 버튼
const handleSubmit = async () => {
  // 필수항목 체크
  if (
    !form.value.patientCode ||
    !form.value.patientName ||
    !form.value.currentHeight
  ) {
    message.showAlert('필수 항목을 모두 입력해주세요.');
    return;
  }
  if (!form.value.birthYear || !form.value.birthMonth || !form.value.birthDay) {
    message.showAlert('생년월일을 입력해주세요.');
    return;
  }

  // 환자 매칭 확인 (코드 또는 이름이 변경된 경우)
  if (
    form.value.patientCode !== originalForm.value.patientCode ||
    form.value.patientName !== originalForm.value.patientName
  ) {
    try {
      const res = await patientAPI.check(
        form.value.patientCode,
        form.value.patientName,
      );
      if (res.data.exists) {
        // 성별 불일치 체크
        if (res.data.patient.gender !== form.value.gender) {
          message.showAlert('성별이 일치하지 않아 연동이 불가합니다.');
          return;
        }
        // 기존 환자 연동 확인
        message.showConfirm(
          '환자등록번호, 환자명이 일치하는 기존 정보가 있습니다.\n해당 정보에 기록이 연동됩니다.\n원치 않으실 경우 취소 후 환자등록번호, 환자명을 변경해 주세요.',
          () => submitUpdate(),
          null,
        );
        return;
      }
    } catch (e) {
      message.showAlert('환자 정보 확인 중 오류가 발생했습니다.');
      return;
    }
  }

  submitUpdate();
};

// 실제 수정 API 호출
const submitUpdate = async () => {
  const birthDate = `${form.value.birthYear}-${String(form.value.birthMonth).padStart(2, '0')}-${String(form.value.birthDay).padStart(2, '0')}`;
  const bd = new Date(
    form.value.birthYear,
    form.value.birthMonth - 1,
    form.value.birthDay,
  );
  const now = new Date();
  const ageMonths =
    (now.getFullYear() - bd.getFullYear()) * 12 +
    (now.getMonth() - bd.getMonth());

  try {
    modal.isLoading = true;
    const response = await analysisAPI.updateAnalysisInfo(
      analysisData.value.id,
      {
        patientCode: form.value.patientCode,
        patientName: form.value.patientName,
        birthDate,
        gender: form.value.gender,
        height: form.value.currentHeight,
        weight: form.value.weight,
        fatherHeight: form.value.fatherHeight || null,
        motherHeight: form.value.motherHeight || null,
        physician: form.value.physician,
        ageMonths,
        sex: form.value.gender === 'M' ? 1 : 0,
      },
    );

    message.showAlert('수정이 완료되었습니다.', () => {
      modal.close();
      // 페이지 새로고침 (재분석 결과 반영)
      router.go(0);
    });
  } catch (error) {
    message.showAlert(
      error.response?.data?.message || '수정 중 오류가 발생했습니다.',
    );
  } finally {
    modal.isLoading = false;
  }
};

// 초기화 (modal.role에서 데이터 수신)
onMounted(() => {
  // modal.open('edit_analysis', analysisObject) 로 전달된 데이터
  const data = modal.data || {};
  analysisData.value = data;

  // 이미지 URL
  if (data.image_path) {
    const path = data.image_path.replace(/\\/g, '/');
    const idx = path.indexOf('uploads/');
    imageUrl.value = idx !== -1 ? '/' + path.substring(idx) : '';
  }

  // 생년월일 파싱
  let by = '',
    bm = '',
    bday = '';
  if (data.birth_date) {
    const d = new Date(data.birth_date);
    by = d.getFullYear().toString();
    bm = (d.getMonth() + 1).toString();
    bday = d.getDate().toString();
  }

  // 분석일 파싱
  let analysisDate = '';
  if (data.created_at) {
    const d = new Date(data.created_at);
    analysisDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const formData = {
    patientCode: data.patient_code || '',
    patientName: data.patient_name || '',
    birthYear: by,
    birthMonth: bm,
    birthDay: bday,
    gender: data.gender || '',
    currentHeight: data.height ? String(data.height) : '',
    weight: data.weight ? String(data.weight) : '',
    fatherHeight: data.father_height ? String(data.father_height) : '',
    motherHeight: data.mother_height ? String(data.mother_height) : '',
    physician: data.physician || '',
    analysisDate,
  };

  form.value = { ...formData };
  originalForm.value = { ...formData };
});
</script>

<style lang="scss" scoped>
/* NewAnalysis.vue의 스타일을 그대로 복사하되,
   .new-analysis → .edit-analysis 로 변경
   .image-section의 cursor: pointer, placeholder 관련 스타일 제거 */
.edit-analysis {
  width: 952px;
  padding: 20px 0;
}

.modal-title {
  font-weight: $font-weight-bold;
  font-size: 24px;
  color: $white;
  text-align: center;
  margin-bottom: 24px;
}

.modal-body {
  display: flex;
  gap: 20px;
  min-width: 952px;
}

.image-section {
  width: 352px;

  .image-preview {
    width: 100%;
    height: 476px;
    background-color: $dark-input;
    border: 1px solid $gray2;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
}

/* 이하 form-section, form-actions 스타일은 NewAnalysis.vue에서 그대로 복사 */
.form-section {
  flex: 1;

  .form-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    > label {
      width: 108px;
      flex-shrink: 0;
      @include font-14-bold;
      color: $white;
      display: flex;
      align-items: center;
      &:has(.required) {
        color: $sub-color-2;
      }
      .required {
        color: $sub-color-2;
        margin-right: 2px;
      }
    }

    > input {
      flex: 1;
      padding: 8px 12px;
      background-color: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-regular;
      &:focus {
        border-color: $sub-color-2;
      }
    }
  }

  .birth-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    input {
      width: 40px;
      padding: 8px 12px;
      background-color: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-regular;
      text-align: center;
      &:focus {
        border-color: $sub-color-2;
      }
    }
    .input-year {
      width: 60px;
    }
    .unit {
      @include font-12-regular;
      color: $dark-text;
    }
  }

  .gender-wrapper {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  }
  .gender-toggle {
    display: flex;
    gap: 13px;
    .btn-gender {
      width: 100px;
      padding: 10px;
      background-color: $dark-gray-dark;
      color: $dark-text;
      border-radius: $radius-sm;
      @include font-14-regular;
      &.active {
        background: $main-gad;
        @include font-14-bold;
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  .gender-warning {
    @include font-12-regular;
    color: $red;
  }

  .dual-input {
    display: flex;
    align-items: end;
    gap: 8px;
    flex: 1;
    input {
      width: 170px;
      padding: 10px 12px;
      background-color: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-regular;
      &:focus {
        border-color: $sub-color-2;
      }
    }
    .unit {
      @include font-12-regular;
      color: $dark-text;
    }
    .second-label {
      @include font-14-regular;
      color: $sub-color-2;
      margin-left: 16px;
      max-height: 100%;
      height: 38px;
      align-items: center;
      display: flex;
      .required {
        color: $sub-color-2;
        margin-right: 2px;
      }
    }
  }

  .single-input-unit {
    display: flex;
    align-items: end;
    gap: 8px;
    input {
      width: 170px;
      padding: 10px 12px;
      background-color: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-regular;
      &:focus {
        border-color: $sub-color-2;
      }
    }
    .unit {
      @include font-12-regular;
      color: $dark-text;
    }
  }

  .input-date {
    position: relative;
    width: 160px;
    input {
      width: 170px;
      padding: 10px 12px;
      padding-right: 36px;
      background-color: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-regular;
      &:focus {
        border-color: $sub-color-2;
      }
      &::-webkit-calendar-picker-indicator {
        display: none;
        -webkit-appearance: none;
      }
    }
    .icon-calendar {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      opacity: 0.6;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  button {
    width: 140px;
    padding: 12px;
    border-radius: $radius-sm;
    @include font-14-bold;
    &:hover {
      opacity: 0.9;
    }
  }
  .btn-cancel {
    background-color: $dark-gray-dark;
    color: $white;
  }
  .btn-submit {
    background: $main-gad;
    color: $white;
  }
}
</style>
