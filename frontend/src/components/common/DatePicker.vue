<template>
  <VueDatePicker
    v-model="model"
    :locale="ko"
    :format="'yyyy-MM-dd'"
    model-type="yyyy-MM-dd"
    :enable-time-picker="false"
    :auto-apply="true"
    :dark="true"
    :teleport="true"
    :hide-input-icon="true"
    :clearable="false"
    :disabled="disabled"
    :placeholder="placeholder"
    :max-date="maxDate"
    :min-date="minDate"
    input-class-name="dp-custom-input"
    menu-class-name="dp-custom-menu"
    :hide-navigation="['time']"
    :action-row="{
      showNow: false,
      showPreview: false,
      showCancel: false,
      showSelect: false,
    }"
  >
    <template #dp-input="{ onBlur }">
      <div :class="['dp-input-wrap', { 'dp-disabled': disabled }]">
        <input
          type="text"
          :value="model"
          :placeholder="placeholder"
          :disabled="disabled"
          maxlength="10"
          @input="handleInput"
          @blur="
            (e) => {
              applyInput(e);
              onBlur(e);
            }
          "
          @keydown.enter="applyInput"
        />
        <img src="/assets/icons/calendar_icon.svg" alt="" class="dp-cal-icon" />
      </div>
    </template>
    <template #arrow-left>
      <img src="/assets/icons/cal_arrow_prev.svg" alt="prev" />
    </template>
    <template #arrow-right>
      <img src="/assets/icons/cal_arrow_next.svg" alt="next" />
    </template>
  </VueDatePicker>
</template>

<script setup>
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { ko } from 'date-fns/locale';

const model = defineModel();

defineProps({
  placeholder: { type: String, default: '' },
  maxDate: { type: [Date, String], default: null },
  minDate: { type: [Date, String], default: null },
  disabled: { type: Boolean, default: false },
});

// 숫자 입력 시 자동 하이픈 삽입 (yyyy-MM-dd)
const handleInput = (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '');
  if (val.length > 8) val = val.slice(0, 8);
  if (val.length >= 6) {
    val = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6)}`;
  } else if (val.length >= 4) {
    val = `${val.slice(0, 4)}-${val.slice(4)}`;
  }
  e.target.value = val;
};

// blur 또는 Enter 시 유효한 날짜면 model 반영
const applyInput = (e) => {
  const val = e.target?.value || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      model.value = val;
      return;
    }
  }
  // 유효하지 않으면 원래 값 복원
  if (e.target) e.target.value = model.value || '';
};
</script>

<style lang="scss">
// 다크테마 CSS 변수 오버라이드 (unscoped — 전역 적용 필요)
.dp__theme_dark {
  --dp-background-color: #{$dark-input};
  --dp-text-color: #{$white};
  --dp-hover-color: rgba(255, 255, 255, 0.08);
  --dp-hover-text-color: #{$white};
  --dp-primary-color: #{$main-color};
  --dp-primary-text-color: #{$white};
  --dp-secondary-color: #{$dark-line-gray};
  --dp-border-color: #{$dark-line-gray};
  --dp-menu-border-color: #{$dark-line-gray};
  --dp-border-color-hover: #{$sub-color-2};
  --dp-disabled-color: #{$dark-gray-dark};
  --dp-disabled-color-text: #{$dark-line-gray};
  --dp-highlight-color: rgba(48, 91, 134, 0.2);
  --dp-range-between-dates-background-color: rgba(48, 91, 134, 0.3);
  --dp-range-between-dates-text-color: #{$white};
  --dp-range-between-border-color: transparent;
}

// 라이브러리 기본 UI 요소 숨김
.dp__clear_icon,
.dp__input_icon,
.dp__input_icon_pad,
.dp--clear-btn {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
}

// 메뉴 (캘린더 드롭다운) 스타일
.dp-custom-menu {
  border-radius: $radius-md !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  font-family: $font-family !important;
}

// 인풋 래퍼
.dp-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 126px;
  padding: 8px 12px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover:not(.dp-disabled) {
    border-color: $sub-color-2;
  }

  &.dp-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  input {
    background: none;
    border: none;
    color: $white;
    font-family: $font-family;
    font-size: 12px;
    font-weight: 400;
    cursor: pointer;
    width: 100%;
    outline: none;

    &::placeholder {
      color: $dark-input-gray;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .dp-cal-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}
</style>
