import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false);
  const role = ref('');
  const type = ref('');
  const isLoading = ref(false);
  const data = ref(null);  // ← 추가

  const open = (modalType, modalRole, modalData = null) => {
    role.value = modalRole;
    type.value = modalType;
    data.value = modalData;  // ← 추가
    isOpen.value = true;
  };
  const close = () => {
    if (isLoading.value) return;
    isOpen.value = false;
    type.value = '';
    role.value = '';
    data.value = null;  // ← 추가
  };

  return { isOpen, type, role, isLoading, data, open, close };
});
