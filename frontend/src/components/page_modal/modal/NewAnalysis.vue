<template>
  <div class="new-analysis">
    <h2 class="modal-title">신규분석</h2>

    <div class="modal-body">
      <!-- 왼쪽: 이미지 영역 -->
      <div class="image-section">
        <div class="image-preview" @click="triggerFileInput">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="X-ray preview"
            class="preview-image"
          />
          <div v-else class="placeholder">
            <p class="placeholder-title">X-ray 사진을 첨부해 주세요.</p>
            <p class="placeholder-sub">*좌측 X-ray 사진을 첨부해 주세요.</p>
            <button
              type="button"
              class="btn-select-image"
              @click.stop="triggerFileInput"
            >
              사진 선택
            </button>
          </div>
        </div>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileChange"
          accept=".jpg,.jpeg,.png,.dcm"
          style="display: none"
        />
        <button
          v-if="previewUrl"
          type="button"
          class="btn-select-image"
          @click="triggerFileInput"
        >
          사진 선택
        </button>
      </div>

      <!-- 오른쪽: 폼 영역 -->
      <div class="form-section">
        <form @submit.prevent="handleSubmit">
          <!-- 환자등록번호 -->
          <div class="form-row">
            <label>
              <span class="required">*</span>환자등록번호
              <img
                src="/assets/icons/question.svg"
                alt=""
                class="tooltip-icon"
              />
            </label>
            <input
              type="text"
              v-model="form.patientCode"
              placeholder="환자 차트번호 등 입력"
            />
          </div>

          <!-- 환자명 -->
          <div class="form-row">
            <label>
              <span class="required">*</span>환자명
              <img
                src="/assets/icons/question.svg"
                alt=""
                class="tooltip-icon"
              />
            </label>
            <input type="text" v-model="form.patientName" placeholder="" />
          </div>

          <!-- 생년월일 -->
          <div class="form-row">
            <label> <span class="required">*</span>생년월일 </label>
            <div class="birth-inputs">
              <input
                type="text"
                v-model="form.birthYear"
                placeholder=""
                class="input-year"
              />
              <span class="unit">년</span>
              <input
                type="text"
                v-model="form.birthMonth"
                placeholder=""
                class="input-month"
              />
              <span class="unit">월</span>
              <input
                type="text"
                v-model="form.birthDay"
                placeholder=""
                class="input-day"
              />
              <span class="unit">일</span>
            </div>
          </div>

          <!-- 성별 -->
          <div class="form-row">
            <label> <span class="required">*</span>성별 </label>
            <div class="gender-wrapper">
              <div class="gender-toggle">
                <button
                  type="button"
                  :class="['btn-gender', { active: form.gender === 'M' }]"
                  @click="form.gender = 'M'"
                >
                  남
                </button>
                <button
                  type="button"
                  :class="['btn-gender', { active: form.gender === 'F' }]"
                  @click="form.gender = 'F'"
                >
                  여
                </button>
              </div>
              <span class="gender-warning"
                >*성별은 분석 이후 수정할 수 없습니다.</span
              >
            </div>
          </div>

          <!-- 현재키 / 몸무게 -->
          <div class="form-row">
            <label> <span class="required">*</span>현재 키 </label>
            <div class="dual-input">
              <input type="text" v-model="form.currentHeight" placeholder="" />
              <span class="unit">cm</span>

              <label class="second-label">
                <span class="required">*</span>몸무게
              </label>
              <input type="text" v-model="form.weight" placeholder="" />
              <span class="unit">kg</span>
            </div>
          </div>

          <!-- 아버지 키 -->
          <div class="form-row">
            <label>아버지 키</label>
            <div class="single-input-unit">
              <input type="text" v-model="form.fatherHeight" placeholder="" />
              <span class="unit">cm</span>
            </div>
          </div>

          <!-- 어머니 키 -->
          <div class="form-row">
            <label>어머니 키</label>
            <div class="single-input-unit">
              <input type="text" v-model="form.motherHeight" placeholder="" />
              <span class="unit">cm</span>
            </div>
          </div>

          <!-- 담당주치의 -->
          <div class="form-row">
            <label> <span class="required">*</span>담당주치의 </label>
            <div class="single-input-unit">
              <input type="text" v-model="form.physician" placeholder="" />
            </div>
          </div>

          <!-- 분석일 -->
          <div class="form-row">
            <label> <span class="required">*</span>분석일 </label>
            <div class="input-date">
              <div class="single-input-unit">
                <input
                  type="date"
                  ref="dateInput"
                  v-model="form.analysisDate"
                  placeholder="YYYY-MM-DD"
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

    <!-- 버튼 영역 (모달 중앙) -->
    <div class="form-actions">
      <button type="button" class="btn-cancel" @click="modal.close">
        취소
      </button>
      <button type="button" class="btn-submit" @click="handleSubmit">
        분석
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useModalStore } from '@/store/modal';
import { analysisAPI } from '@/api/analysis';

const modal = useModalStore();
const fileInput = ref(null);
const dateInput = ref(null);
const previewUrl = ref('');
const selectedFile = ref(null);
const isLoading = ref(false);

// 오늘 날짜로 분석일 초기화
const today = new Date();
const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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
  analysisDate: formattedDate,
});

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    if (file.type.startsWith('image/')) {
      previewUrl.value = URL.createObjectURL(file);
    } else {
      previewUrl.value = '';
    }
  }
};

const handleSubmit = async () => {
  if (!selectedFile.value) {
    alert('X-ray 이미지를 선택해주세요.');
    return;
  }
  if (!form.value.patientCode || !form.value.patientName || !form.value.gender || !form.value.currentHeight) {
    alert('필수 항목을 모두 입력해주세요.');
    return;
  }
  if (!form.value.birthYear || !form.value.birthMonth || !form.value.birthDay) {
    alert('생년월일을 입력해주세요.');
    return;
  }

  const birthDate = new Date(form.value.birthYear, form.value.birthMonth - 1, form.value.birthDay);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

  const formData = new FormData();
  formData.append('image', selectedFile.value);
  formData.append('sex', form.value.gender === 'M' ? 1 : 0);
  formData.append('height', form.value.currentHeight);
  formData.append('ageMonths', ageMonths);
  formData.append('patientId', 3); // TODO: 실제 환자 ID 연동
formData.append('weight', form.value.weight);
formData.append('physician', form.value.physician);

  if (form.value.fatherHeight) {
    formData.append('fatherHeight', form.value.fatherHeight);
  }
  if (form.value.motherHeight) {
    formData.append('motherHeight', form.value.motherHeight);
  }

  try {
    isLoading.value = true;
    const response = await analysisAPI.create(formData);
    console.log('분석 결과:', response.data);
    alert('분석이 완료되었습니다.');
    modal.close();
  } catch (error) {
    console.error('분석 오류:', error);
    alert(error.response?.data?.message || '분석 중 오류가 발생했습니다.');
  } finally {
    isLoading.value = false;
  }
};
</script>


<style lang="scss" scoped>
.new-analysis {
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

// 왼쪽: 이미지 영역
.image-section {
  width: 352px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .image-preview {
    width: 100%;
    height: 476px;
    background-color: $dark-input;
    border: 1px solid $gray2;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .placeholder {
      text-align: center;
      padding: 20px;

      .placeholder-title {
        @include font-14-regular;
        color: $white;
        margin-bottom: 8px;
      }

      .placeholder-sub {
        @include font-12-regular;
        color: $red;
        margin-bottom: 20px;
      }
    }
  }

  .btn-select-image {
    width: 136px;
    padding: 12px;
    margin: auto;
    background: $main-gad;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-bold;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.9;
    }
  }
}

// 오른쪽: 폼 영역
.form-section {
  flex: 1;

  .form-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    > label {
      width: 108px;
      flex-shrink: 0;
      // white-space: nowrap;
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

      .tooltip-icon {
        width: 20px;
        height: 20px;
        margin-left: 4px;
        vertical-align: middle;
        cursor: help;
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
      transition: border-color $transition-fast;

      &::placeholder {
        color: $dark-line-gray;
      }

      &:focus {
        border-color: $sub-color-2;
      }
    }
  }

  // 생년월일 인풋
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

  // 성별 토글
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
      transition: background $transition-fast;

      &.active {
        background: $main-gad;
        @include font-14-bold;
      }
    }
  }

  .gender-warning {
    @include font-12-regular;
    color: $red;
  }

  // 현재키/몸무게 듀얼 인풋
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

  // 단일 인풋 + 단위
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

  // 날짜 인풋
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

      // 브라우저 기본 달력 아이콘 숨기기
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

// 버튼 영역 (모달 중앙)
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
    transition: opacity $transition-fast;

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
