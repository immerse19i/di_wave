<template>
  <div class="credit-charge">
    <!-- 뒤로가기 -->
    <button class="btn-back" @click="router.push('/user-info/credit')">
      &lt; 뒤로가기
    </button>

    <h3 class="charge-title">크레딧 충전</h3>

    <!-- 충전 금액 선택 -->
    <div class="section">
      <h4 class="section-title">충전 금액 선택</h4>
      <div class="plan-list">
        <label v-for="plan in plans" :key="plan.credit" class="plan-item">
          <input
            type="radio"
            name="plan"
            :value="plan.credit"
            v-model="selectedCredit"
          />
          <span class="radio-custom"></span>
          <span class="plan-label">
            <strong>{{ plan.credit }} Credit</strong>
            <span class="plan-desc">
              (1Credit당 {{ plan.unitPrice.toLocaleString() }}원) 총 :
              {{ plan.totalPrice.toLocaleString() }} (VAT 포함)
            </span>
          </span>
        </label>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 결제 수단 -->
    <div class="section">
      <h4 class="section-title">결제 수단</h4>
      <div class="payment-method">
        <button
          class="method-btn"
          :class="{ active: paymentMethod === 'CARD' }"
          @click="paymentMethod = 'CARD'"
        >신용/체크카드</button>
        <button
          class="method-btn"
          :class="{ active: paymentMethod === 'VIRTUAL_ACCOUNT' }"
          @click="paymentMethod = 'VIRTUAL_ACCOUNT'"
        >가상계좌</button>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 약관 동의 -->
    <div class="section">
      <div class="terms-area">
        <label class="terms-item all">
          <input type="checkbox" :checked="isAllChecked" @change="toggleAll" />
          <span class="checkmark"></span>
          <span>전체동의</span>
        </label>
        <div class="terms-divider"></div>
        <label v-for="term in terms" :key="term.id" class="terms-item">
          <input type="checkbox" v-model="term.checked" />
          <span class="checkmark"></span>
          <span>
            <a class="terms-link" @click.prevent="openTerms(term.id)">{{
              term.name
            }}</a>
            동의 (필수)
          </span>
        </label>
      </div>
    </div>

    <!-- 결제하기 버튼 -->
    <button
      class="btn-pay"
      :class="{ active: canPay }"
      :disabled="!canPay"
      @click="startPayment"
    >
      {{ selectedPlan.totalPrice.toLocaleString() }}원 결제하기
    </button>

    <!-- 하단 안내 -->
    <div class="charge-notice">
      <p>
        충전된 크레딧은 결제일로부터 1년간 유효하며, 유효기간이 지난 크레딧은
        자동으로 소멸됩니다.
      </p>
      <p>
        구매하신 크레딧은 사용하지 않은 경우에 한해 전자상거래법에 따라
        구매일로부터 14일 이내에 청약철회(환불)가 가능합니다. 단, 크레딧의 일부를
        사용했거나 구매 후 14일이 경과한 경우에는 청약철회가 제한됩니다.
      </p>
    </div>

    <!-- 결제 진행 대기 팝업 -->
    <div class="modal-overlay" v-if="paymentStep !== 'idle'">
      <div class="modal-box" v-if="paymentStep === 'processing'">
        <h3 class="modal-title">크레딧 충전</h3>
        <p>결제를 진행중입니다.</p>
        <p>잠시만 기다려주시면 결제창이 나타납니다.</p>
        <p class="modal-warn">결제창이 뜰 때까지 브라우저를 닫지 마세요.</p>
        <button class="btn-cancel" @click="cancelPayment">결제취소</button>
      </div>

      <!-- 카드 결제 완료 팝업 -->
      <div class="modal-box" v-if="paymentStep === 'success'">
        <h3 class="modal-title">결제 완료</h3>
        <p>결제가 정상적으로 완료되었습니다.</p>
        <div class="result-info">
          <p>충전 크레딧 : {{ chargedCredit }} Credit</p>
          <p>결제 금액 : {{ chargedAmount.toLocaleString() }}원 (VAT 포함)</p>
          <p>결제수단 : {{ chargedMethod === 'CARD' ? '신용/체크카드' : '가상계좌' }}</p>
        </div>
        <button class="btn-confirm" @click="goToCreditMain">확인</button>
      </div>

      <!-- 가상계좌 발급 완료 팝업 -->
      <div class="modal-box" v-if="paymentStep === 'virtual-issued'">
        <h3 class="modal-title">가상계좌 발급 완료</h3>
        <p>아래 계좌로 입금해 주시면 크레딧이 자동으로 충전됩니다.</p>
        <div class="virtual-info">
          <div class="info-row">
            <span class="label">입금은행</span>
            <span class="value">{{ virtualAccount.bankName }}</span>
          </div>
          <div class="info-row">
            <span class="label">계좌번호</span>
            <span class="value account-number">{{ virtualAccount.accountNumber }}</span>
          </div>
          <div class="info-row">
            <span class="label">입금금액</span>
            <span class="value">{{ chargedAmount.toLocaleString() }}원</span>
          </div>
          <div class="info-row">
            <span class="label">충전 크레딧</span>
            <span class="value">{{ chargedCredit }} Credit</span>
          </div>
          <div class="info-row">
            <span class="label">입금기한</span>
            <span class="value due-date">{{ formatDueDate(virtualAccount.dueDate) }}</span>
          </div>
        </div>
        <p class="modal-warn">입금기한 내에 입금하지 않으면 자동 취소됩니다.</p>
        <button class="btn-confirm" @click="goToCreditMain">확인</button>
      </div>

      <!-- 결제 실패 팝업 -->
      <div class="modal-box" v-if="paymentStep === 'fail'">
        <h3 class="modal-title">결제 실패</h3>
        <p>결제에 실패하였습니다</p>
        <p class="fail-reason">사유 : {{ failMessage }}</p>
        <button class="btn-confirm" @click="goToCreditMain">확인</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { paymentAPI } from '@/api/payment';
import { termsAPI } from '@/api/terms';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

// 결제 수단 선택
const paymentMethod = ref('CARD');

// 약관 (API에서 동적 로딩)
const terms = reactive([]);

const isAllChecked = computed(() => terms.every((t) => t.checked));
const canPay = computed(() => terms.every((t) => t.checked));

const toggleAll = (e) => {
  const checked = e.target.checked;
  terms.forEach((t) => (t.checked = checked));
};

const openTerms = (termId) => {
  window.open(`/terms?tab=${termId}`, '_blank');
};

// 충전 패키지
const plans = [
  { credit: 30, unitPrice: 8900, totalPrice: 267000 },
  { credit: 50, unitPrice: 7900, totalPrice: 395000 },
  { credit: 100, unitPrice: 7400, totalPrice: 740000 },
];

const selectedCredit = ref(50);
const selectedPlan = computed(() => {
  return plans.find((p) => p.credit === selectedCredit.value) || plans[1];
});

// 결제 상태
const paymentStep = ref('idle');
const failMessage = ref('');
const chargedCredit = ref(0);
const chargedAmount = ref(0);
const chargedMethod = ref('CARD');
const widgetReady = ref(false);

// 가상계좌 정보
const virtualAccount = ref({
  bankName: '',
  accountNumber: '',
  dueDate: '',
});

// 위젯 인스턴스
let widgets = null;

// ★ 위젯 초기화 + 렌더링
onMounted(async () => {
  // 약관 목록 API 로딩
  try {
    const res = await termsAPI.getPublicTerms();
    const creditTerms = res.data.data.filter((t) => t.group_type === 'credit');
    terms.splice(0, terms.length, ...creditTerms.map((t) => ({ id: t.type, name: t.name, checked: false })));
  } catch (e) {
    console.error('약관 목록 로딩 실패:', e);
  }

  // 토스 리다이렉트 결과 처리
  const { paymentKey, orderId, amount, code, message } = route.query;

  if (code) {
    failMessage.value = message || '결제가 취소되었습니다.';
    paymentStep.value = 'fail';
    router.replace({ path: route.path });
    return;
  }

  if (paymentKey && orderId && amount) {
    paymentStep.value = 'processing';

    // orderId 접두사로 결제 수단 판별
    const isVirtual = orderId.startsWith('DIWAVE_VA_');

    try {
      let res;
      if (isVirtual) {
        res = await paymentAPI.confirmVirtual({ paymentKey, orderId, amount: Number(amount) });
        if (res.data.success) {
          chargedCredit.value = res.data.data.creditAmount;
          chargedAmount.value = Number(amount);
          chargedMethod.value = 'VIRTUAL_ACCOUNT';
          virtualAccount.value = {
            bankName: res.data.data.bankName,
            accountNumber: res.data.data.accountNumber,
            dueDate: res.data.data.dueDate,
          };
          paymentStep.value = 'virtual-issued';
        } else {
          failMessage.value = res.data.message || '가상계좌 발급 실패';
          paymentStep.value = 'fail';
        }
      } else {
        res = await paymentAPI.confirm({ paymentKey, orderId, amount: Number(amount) });
        if (res.data.success) {
          chargedCredit.value = res.data.data.creditAmount;
          chargedAmount.value = Number(amount);
          chargedMethod.value = 'CARD';
          paymentStep.value = 'success';
        } else {
          failMessage.value = res.data.message || '승인 실패';
          paymentStep.value = 'fail';
        }
      }
    } catch (e) {
      failMessage.value = e.response?.data?.message || '결제 승인 중 오류';
      paymentStep.value = 'fail';
    }
    router.replace({ path: route.path });
    return;
  }

  // // 위젯 렌더링
  // try {
  //   const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
  //   const tossPayments = TossPayments(clientKey);

  //   widgets = tossPayments.widgets({ customerKey: TossPayments.ANONYMOUS });

  //   await widgets.setAmount({
  //     currency: 'KRW',
  //     value: selectedPlan.value.totalPrice,
  //   });

  //   await widgets.renderPaymentMethods({
  //     selector: '#payment-method',
  //     variantKey: 'DEFAULT',
  //   });

  //   widgetReady.value = true;
  // } catch (e) {
  //   console.error('위젯 초기화 오류:', e);
  // }
});

// ★ 플랜 변경 시 금액 업데이트
watch(selectedCredit, async () => {
  if (widgets) {
    await widgets.setAmount({
      currency: 'KRW',
      value: selectedPlan.value.totalPrice,
    });
  }
});
const startPayment = async () => {
  try {
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
    const tossPayments = TossPayments(clientKey);
    const payment = tossPayments.payment({
      customerKey: TossPayments.ANONYMOUS,
    });

    // orderId에 결제 수단 구분 포함 (리다이렉트 시 판별용)
    const orderIdPrefix = paymentMethod.value === 'VIRTUAL_ACCOUNT' ? 'DIWAVE_VA_' : 'DIWAVE_';
    const orderId = `${orderIdPrefix}${auth.user.hospital_id}_${Date.now()}`;

    const requestParams = {
      method: paymentMethod.value === 'VIRTUAL_ACCOUNT' ? 'VIRTUAL_ACCOUNT' : 'CARD',
      amount: {
        currency: 'KRW',
        value: selectedPlan.value.totalPrice,
      },
      orderId,
      orderName: `DI-WAVE 크레딧 ${selectedCredit.value}건`,
      successUrl: `${window.location.origin}/user-info/credit-charge`,
      failUrl: `${window.location.origin}/user-info/credit-charge`,
      customerEmail: auth.user.email || undefined,
      customerName: auth.user.name || undefined,
    };

    await payment.requestPayment(requestParams);
  } catch (error) {
    if (error.code === 'USER_CANCEL') {
      paymentStep.value = 'idle';
    } else {
      failMessage.value = error.message || '결제 요청 실패';
      paymentStep.value = 'fail';
    }
  }
};

const formatDueDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
};

const cancelPayment = () => {
  paymentStep.value = 'idle';
};

const goToCreditMain = () => {
  paymentStep.value = 'idle';
  router.push('/user-info/credit');
};
</script>

<style lang="scss" scoped>
.credit-charge {
  padding: 24px;
  color: $white;
  //   max-width: 800px;
  margin: 0 auto;
}

.btn-back {
  @include font-14-regular;
  color: $white;
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 24px;

  &:hover {
    opacity: 0.8;
  }
}

.charge-title {
  @include font-20-bold;
  text-align: center;
  margin-bottom: 32px;
}

// 섹션
.section {
  margin-bottom: 24px;
}

.section-title {
  @include font-14-bold;
  margin-bottom: 16px;
}

.divider {
  border-top: 1px solid $dark-line-gray;
  margin: 24px 0;
}

// 충전 금액
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .plan-item {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;

    input[type='radio'] {
      display: none;
    }

    .radio-custom {
      width: 16px;
      height: 16px;
      background: $dark-line-gray;
      border: none;
      border-radius: 50%;
      position: relative;
      flex-shrink: 0;

      &::after {
        content: '';
        width: 6px;
        height: 6px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }

    input[type='radio']:checked + .radio-custom {
      background: $main-color;

      &::after {
        background: $white;
      }
    }

    .plan-label {
      @include font-14-regular;
      display: flex;
      gap: 12px;

      strong {
        @include font-14-bold;
        min-width: 100px;
      }

      .plan-desc {
        color: $dark-text;
      }
    }
  }
}

// 결제 수단
.payment-method {
  display: flex;
  align-items: center;
  gap: 8px;
  .method-btn {
    padding: 10px 24px;
    min-width: 132px;
    border: 1px solid $dark-line-gray;
    // border-radius: $radius-sm;
    color: $dark-text;
    border: 1px solid $dark-gray;
    background: none;
    @include font-14-medium;
    cursor: pointer;

    &.active {
      border-color: $sub-color-2;
      color: $sub-color-2;
    }
  }
}

// 약관
.terms-area {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .terms-divider {
    border-top: 1px solid $dark-line-gray;
    margin: 4px 0;
  }

  .terms-item {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    @include font-14-regular;

    &.all {
      @include font-14-bold;
    }

    input[type='checkbox'] {
      display: none;
    }

    .checkmark {
      width: 22px;
      height: 22px;
      min-width: 22px;
      border: 1px solid $dark-line-gray;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all $transition-fast;
    }

    input[type='checkbox']:checked + .checkmark {
      background: $main-color;
      border-color: $main-color;

      &::after {
        content: '';
        width: 12px;
        height: 12px;
        background: url(/assets/icons/check.svg) no-repeat center / contain;
      }
    }

    .terms-link {
      color: $white;
      text-decoration: underline;
      cursor: pointer;

      &:hover {
        color: $main-color;
      }
    }
  }
}

// 결제 버튼
.btn-pay {
  width: 100%;
  padding: 16px;
  margin-top: 24px;
  background: $dark-line-gray;
  color: $dark-text;
  border: none;
  border-radius: $radius-sm;
  @include font-16-bold;
  cursor: not-allowed;
  transition: all $transition-fast;

  &.active {
    background: $main-gad;
    color: $white;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }
}

// 하단 안내
.charge-notice {
  margin-top: 24px;
  @include font-12-regular;
  color: $dark-input-gray;
  line-height: 1.6;
}

// 모달
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-lg;
  padding: 40px;
  max-width: 480px;
  width: 90%;
  text-align: center;
  color: $white;

  .modal-title {
    @include font-20-bold;
    margin-bottom: 16px;
  }

  p {
    @include font-14-regular;
    margin-bottom: 8px;
    color: $dark-text;
  }

  .modal-warn {
    margin-top: 16px;
    @include font-14-medium;
    color: $white;
  }

  .result-info {
    text-align: left;
    margin: 20px 0;

    p {
      @include font-14-regular;
      color: $white;
      margin-bottom: 6px;
    }
  }

  // 가상계좌 정보
  .virtual-info {
    text-align: left;
    margin: 20px 0;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 16px 20px;

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;

      &:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .label {
        @include font-14-regular;
        color: $dark-text;
        min-width: 80px;
      }

      .value {
        @include font-14-bold;
        color: $white;
        text-align: right;
      }

      .account-number {
        color: $sub-color-2;
        letter-spacing: 0.5px;
      }

      .due-date {
        color: $dark-text;
        @include font-14-regular;
      }
    }
  }

  .fail-reason {
    margin-top: 12px;
    color: $white;
  }

  .btn-cancel {
    margin-top: 24px;
    padding: 10px 40px;
    background: $dark-line-gray;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
  }

  .btn-confirm {
    margin-top: 24px;
    padding: 10px 40px;
    background: $main-color;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;

    &:hover {
      background: $sub-color;
    }
  }
}
</style>
