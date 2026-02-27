<template>
  <label class="toggle-switch" :class="{ active: modelValue }">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="track">
      <span class="label-on">{{ onLabel }}</span>
      <span class="circle"></span>
      <span class="label-off">{{ offLabel }}</span>
    </span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  onLabel: { type: String, default: '' },
  offLabel: { type: String, default: '' },
});
defineEmits(['update:modelValue']);
</script>

<style lang="scss" scoped>
.toggle-switch {
  cursor: pointer;

  input {
    display: none;
  }

  .track {
    position: relative;
    display: flex;
    align-items: center;
    width: 68px;
    height: 24px;
    border-radius: 20px;
    background: $gray;
    overflow: hidden;
    transition: background 0.3s ease;
  }

  .circle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $white;
    transition: left 0.3s ease;
    z-index: 2;
  }

  .label-on,
  .label-off {
    position: absolute;
    top: 50%;
    @include font-12-regular;
    color: $white;
    white-space: nowrap;
    z-index: 1;
    transition: all 0.3s ease;
  }

  // ON 텍스트 (왼쪽에 표시)
  .label-on {
    left: 8.5px;
    transform: TranslateY(-50%);
    // transform: translateY(-50%) translateX(-20px);
    opacity: 0;
  }

  // OFF 텍스트 (오른쪽에 표시)
  .label-off {
    right: 8.5px;
    transform: translateY(-50%) translateX(0);
    opacity: 1;
  }

  // === ON 상태 ===
  &.active {
    .track {
      background: $main-color;
    }

    .circle {
      left: calc(100% - 20px);
    }

    // ON 텍스트: 원 뒤에서 나타남
    .label-on {
      opacity: 1;
      width: 50%;
      //   transform: translateY(-50%) translateX(0);
    }

    // OFF 텍스트: 원 뒤로 사라짐
    .label-off {
      opacity: 0;
      //   transform: translateY(-50%) translateX(20px);
    }
  }
}
</style>
