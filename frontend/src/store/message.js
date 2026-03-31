// store/message.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const UseMessageStore = defineStore('message', () => {
  const isOpen = ref(false);
  const text = ref('');
  const title = ref('');
  const confirmText = ref('');
  const cancelText = ref('');
  const type = ref('alert'); // 'timer' | 'alert' | 'confirm'
  const timer = ref(0);
  const onConfirm = ref(null);
  const onCancel = ref(null);
  let interval = null;

  // 타입1: 타이머 (자동 닫힘)
  const showTimer = (msg, time = 3) => {
    _reset();
    type.value = 'timer';
    text.value = msg;
    timer.value = time;
    isOpen.value = true;

    interval = setInterval(() => {
      timer.value--;
      if (timer.value <= 0) {
        clearInterval(interval);
        close();
      }
    }, 1000);
  };

  // 타입2: 단순 알림 (확인 버튼)
  const showAlert = (msg, callback = null) => {
    _reset();
    type.value = 'alert';
    text.value = msg;
    onConfirm.value = callback;
    isOpen.value = true;
  };

  // 타입3: 확인/취소
  // options: { title, confirmText, cancelText } (선택)
  const showConfirm = (msg, confirmCallback, cancelCallback = null, options = {}) => {
    _reset();
    type.value = 'confirm';
    text.value = msg;
    title.value = options.title || '';
    confirmText.value = options.confirmText || '';
    cancelText.value = options.cancelText || '';
    onConfirm.value = confirmCallback;
    onCancel.value = cancelCallback;
    isOpen.value = true;
  };

  const confirm = () => {
    const cb = onConfirm.value;
    close();
    if (cb) cb();
  };

  const cancel = () => {
    const cb = onCancel.value;
    close();
    if (cb) cb();
  };

  const close = () => {
    isOpen.value = false;
    if (interval) clearInterval(interval);
    _reset();
  };

  const _reset = () => {
    text.value = '';
    title.value = '';
    confirmText.value = '';
    cancelText.value = '';
    type.value = 'alert';
    timer.value = 0;
    onConfirm.value = null;
    onCancel.value = null;
  };

  return { isOpen, text, title, confirmText, cancelText, type, timer, showTimer, showAlert, showConfirm, confirm, cancel, close };
});
