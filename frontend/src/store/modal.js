import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false);
  const role = ref('');
  const type = ref('');
  const isLoading = ref(false);

  const open = (modalType, modalRole) => {
    role.value = modalRole;
    type.value = modalType;
    isOpen.value = true;
  };
  const close = () => {
    if (isLoading.value) return;
    isOpen.value = false;
    type.value = '';
    role.value = '';
  };

  return { isOpen, type, role, isLoading, open, close };
});
