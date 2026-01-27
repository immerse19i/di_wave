// store/message.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const UseMessageStore = defineStore('message', () => {
  const isOpen = ref(false);
  const text = ref('');
  const timer = ref(0);
  let interval = null;

  const show = (msg, time = 0) => {
    text.value = msg;
    timer.value = time;
    isOpen.value = true;

    if (time > 0) {
      interval = setInterval(() => {
        timer.value--;
        if (timer.value <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
  };

  const close = () => {
    isOpen.value = false;
    text.value = '';
    timer.value = 0;
    if (interval) clearInterval(interval);
  };

  return { isOpen, text, timer, show, close };
});
