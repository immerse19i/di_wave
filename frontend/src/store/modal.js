import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false);
  const role = ref('');
  const type = ref('');
  const open = (modalType, modalRole) => {
    role.value = modalRole;
    type.value = modalType;
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
    type.value = '';
    role.value = '';
  };

  return { isOpen, type, role, open, close };
});
