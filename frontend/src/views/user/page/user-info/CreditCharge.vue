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
        <label
          v-for="plan in plans"
          :key="plan.credit"
          class="plan-item"
        >
          <input
            type="radio"
            name="plan"
            :value="plan.credit"
            v-model="selectedCredit"
          />
          <span class="plan-label">
            <strong>{{ plan.credit }} Credit</strong>
            <span class="plan-desc">
              (1Credit당 {{ plan.unitPrice.toLocaleString() }}원) 총 : {{ plan.totalPrice.toLocaleString() }} (VAT 포함)
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
        <button class="method-btn active">신용/체크카드</button>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 약관 동의 -->
    <div class="section">
      <div class="terms-area">
        <label class="terms-item all">
          <input
            type="checkbox"
            :checked="isAllChecked"
            @change="toggleAll"
          />
          <span class="checkmark"></span>
          <span>전체동의</span>
        </label>
        <div class="terms-divider"></div>
        <label
          v-for="term in terms"
          :key="term.id"
          class="terms-item"
        >
          <input
            type="checkbox"
            v-model="term.checked"
          />
          <span class="checkmark"></span>
          <span>
            <a class="terms-link" @click.prevent="openTerms(term.id)">{{ term.name }}</a>
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
      <p>충전된 크레딧은 회원 탈퇴 전까지 별도의 유효기간 제한 없이 무제한으로 사용 가능합니다.</p>
      <p>구매하신 크레딧은 사용하지 않은 경우에 한해 전자상거래법에 따라 구매일로부터 7일 이내에 청약철회(환불)가 가능합니다. 단, 크레딧의 일부를 사용했거나 구매 후 7일이 경과한 경우에는 청약철회가 제한됩니다.</p>
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

      <!-- 결제 완료 팝업 -->
      <div class="modal-box" v-if="paymentStep === 'success'">
        <h3 class="modal-title">결제 완료</h3>
        <p>결제가 정상적으로 완료되었습니다.</p>
        <div class="result-info">
          <p>충전 크레딧 : {{ selectedCredit }} Credit</p>
          <p>결제 금액 : {{ selectedPlan.totalPrice.toLocaleString() }}원 (VAT 포함)</p>
          <p>결제수단 : 신용/체크카드</p>
        </div>
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
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 충전 패키지
const plans = [
  { credit: 30, unitPrice: 8900, totalPrice: 267000 },
  { credit: 50, unitPrice: 7900, totalPrice: 395000 },
  { credit: 100, unitPrice: 7400, totalPrice: 740000 },
]

const selectedCredit = ref(50) // 기본값 50

const selectedPlan = computed(() => {
  return plans.find((p) => p.credit === selectedCredit.value) || plans[1]
})

// 약관
const terms = reactive([
  { id: 'paid_service', name: '유료서비스 이용약관', checked: false },
  { id: 'third_party', name: '개인정보 제3자 제공', checked: false },
  { id: 'refund_policy', name: '결제 상품 확인 및 취소/환불 규정', checked: false },
])

const isAllChecked = computed(() => terms.every((t) => t.checked))
const canPay = computed(() => terms.every((t) => t.checked))

const toggleAll = (e) => {
  const checked = e.target.checked
  terms.forEach((t) => (t.checked = checked))
}

const openTerms = (termId) => {
  window.open(`/terms?tab=${termId}`, '_blank')
}

// 결제 상태
const paymentStep = ref('idle') // idle | processing | success | fail
const failMessage = ref('')

const startPayment = () => {
  paymentStep.value = 'processing'

  // TODO: 실제 PG 연동 시 아래를 나이스페이 SDK 호출로 교체
  // 지금은 2초 후 성공 시뮬레이션
  setTimeout(() => {
    // 성공 시:
    paymentStep.value = 'success'

    // 실패 시:
    // failMessage.value = '사용자 취소'
    // paymentStep.value = 'fail'
  }, 2000)
}

const cancelPayment = () => {
  // TODO: PG 결제창 닫기 처리
  paymentStep.value = 'idle'
}

const goToCreditMain = () => {
  paymentStep.value = 'idle'
  router.push('/user-info/credit')
}
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
      accent-color: $main-color;
      width: 18px;
      height: 18px;
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
  .method-btn {
    padding: 10px 24px;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-sm;
    color: $dark-text;
    background: none;
    @include font-14-medium;

    &.active {
      border-color: $main-color;
      color: $main-color;
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
