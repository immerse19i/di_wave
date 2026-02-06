import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || null);

  // Getters
  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  // 세션 관련
  const SESSION_TIMEOUT = 30 * 60 * 1000; //30분 (밀리초);
  let timeoutId = null;
  let intervalId = null // update left time
  // let lastActivity = ref(Date.now());
  const lastActivity = ref(Date.now());
  const timeLeft =ref(SESSION_TIMEOUT); // left time (밀리초)


  // 남은시간 포멧 (MM:SS);
  const timeLeftFormatted = computed(()=> {
    const minutes = Math.floor(timeLeft.value / 60000);
    const seconds = Math.floor((timeLeft.value % 60000) / 1000) ;
  
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2,'0')}`
  })


// 타이머 리셋 (활동 감지 시 호출)

  function resetTimer(){
    lastActivity.value = Date.now();
    timeLeft.value = SESSION_TIMEOUT; //남은 시간 리셋

    if(timeoutId) {
      clearTimeout(timeoutId);
    }

    if(token.value){
      timeoutId = setTimeout(()=>{
        logout();
        alert('30분간 활동이 없어 자동 로그아웃');
        window.location.href = '/login'
      }, SESSION_TIMEOUT);
    }

  }
  // 남은 시간 카운트 다운 (1초 마다);

  function startCountdown(){
    if(intervalId){
      clearInterval(intervalId);
    }
    intervalId = setInterval(()=>  {
      const elapsed =Date.now() - lastActivity.value;
      timeLeft.value = Math.max(0, SESSION_TIMEOUT - elapsed);
    }, 1000);
  }

  // 활동 감지 이벤트
  function startActivityTracking(){
    const events = ['mousedown', 'keydown', 'scroll' ,'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    })
    resetTimer();
    startCountdown();
  }

  //활동감지 해제

  function stopActivityTracking(){
    const events = ['mousedown', 'keydown', 'scroll' ,'touchstart'];
    events.forEach(event => {
      window.removeEventListener(event,resetTimer);
    })
    //타임아웃 해제
    if(timeoutId){
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    // 인터벌 해제
    if(intervalId){
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  
  // Actions
  function setUser(userData) {
    user.value = userData;
  }



  function setToken(tokenValue) {
    token.value = tokenValue;
    if (tokenValue) {
      localStorage.setItem('token', tokenValue);
      startActivityTracking();// 추적 시작
    } else {
      localStorage.removeItem('token');
      stopActivityTracking(); // 추적 중지
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    stopActivityTracking(); // 추적 중지
  }

  // 초기화: 이미 토큰 있으면 추적 시작
  if (token.value){
    startActivityTracking();
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    timeLeft,
    timeLeftFormatted, // "MM:SS"
    setUser,
    setToken,
    logout,
    resetTimer,
  };
});
