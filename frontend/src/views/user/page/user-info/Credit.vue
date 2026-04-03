<template>
  <div class="credit">
    <!-- 필터 영역 -->
    <div class="filter-area">
      <div class="filter-row">
        <span class="filter-label">기간</span>
        <div class="date-picker-wrap">
          <DatePicker v-model="startDate" :max-date="endDate" />
          <span>~</span>
          <DatePicker v-model="endDate" :min-date="startDate" />
        </div>
        <div class="quick-btns">
          <button
            :class="{ active: quickRange === 'today' }"
            @click="setQuickRange('today')"
          >
            오늘
          </button>
          <button
            :class="{ active: quickRange === '7' }"
            @click="setQuickRange('7')"
          >
            7일
          </button>
          <button
            :class="{ active: quickRange === '30' }"
            @click="setQuickRange('30')"
          >
            30일
          </button>
          <button
            :class="{ active: quickRange === '90' }"
            @click="setQuickRange('90')"
          >
            90일
          </button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-label">유형</span>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="filterType" value="all" />
            <span class="radio-custom"></span>
            <span>전체</span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="filterType" value="charge" />
            <span class="radio-custom"></span>
            <span>충전</span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="filterType" value="use" />
            <span class="radio-custom"></span>
            <span>사용</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 테이블 영역 -->
    <div class="table-area">
      <div class="table-header">
        <div class="header-btns">
          <button class="refund-btn" @click="openRefundModal">
            크레딧 환불
          </button>
          <button
            class="charge-btn"
            @click="router.push('/user-info/credit-charge')"
          >
            크레딧 충전
          </button>
        </div>
        <div class="balance-box">
          <span class="balance-label">잔여</span>
          <span class="balance-value">{{ currentBalance }}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>환자등록번호</th>
            <th>환자명</th>
            <th>담당주치의</th>
            <th>상세 내역</th>
            <th>충전/사용</th>
            <th>잔여량</th>
            <th>영수증</th>
          </tr>
        </thead>
        <tbody v-if="creditList.length === 0">
          <tr>
            <td colspan="8" class="empty-msg">내역이 없습니다.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="item in creditList" :key="item.id">
            <td>{{ formatDate(item.created_at) }}</td>
            <td>{{ item.patient_code || '-' }}</td>
            <td>{{ item.patient_name || '-' }}</td>
            <td>{{ item.physician || '-' }}</td>
            <td class="detail-cell" v-html="getDetailText(item)"></td>
            <td>{{ getAmountText(item) }}</td>
            <td>{{ item.balance_after }}</td>
            <td class="receipt-cell">
              <img
                v-if="showReceipt(item)"
                src="/assets/icons/receipt_icon.svg"
                alt="영수증"
                class="receipt-icon"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 페이지네이션 -->
      <div class="pagination">
        <button @click="goPage(1)" :disabled="currentPage === 1">
          &laquo;
        </button>
        <button @click="goPage(currentPage - 1)" :disabled="currentPage === 1">
          &lt;
        </button>
        <button
          v-for="page in pageRange"
          :key="page"
          :class="{ active: page === currentPage }"
          @click="goPage(page)"
        >
          {{ page }}
        </button>
        <button
          @click="goPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
        >
          &gt;
        </button>
        <button
          @click="goPage(totalPages)"
          :disabled="currentPage === totalPages"
        >
          &raquo;
        </button>
      </div>
    </div>

    <!-- 하단 안내 -->
    <div class="refund-info">
      <p>환불 문의 고객센터 : (02-2088-8728) 토/일/공휴일 제외 10:00 ~ 17:00</p>
    </div>

    <!-- 환불 모달 -->
    <div
      class="modal-overlay"
      v-if="showRefundModal"
      @click.self="showRefundModal = false"
    >
      <div class="refund-modal">
        <h3 class="modal-title">환불 가능 내역 선택</h3>

        <table class="refund-table" v-if="refundableList.length > 0">
          <thead>
            <tr>
              <th>날짜</th>
              <th>충전 크레딧</th>
              <th>결제 수단</th>
              <th>환불하기</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in refundableList" :key="item.id">
              <td>{{ formatDate(item.created_at) }}</td>
              <td>+{{ item.credit_amount }}</td>
              <td>{{ getMethodText(item.payment_method) }}</td>
              <td>
                <button class="refund-action-btn" @click="confirmRefund(item)">
                  환불하기
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="no-refundable">환불 가능한 내역이 없습니다.</p>

        <div class="refund-modal-info">
          <p class="info-bold">전액 미사용된 충전 건만 리스트에 표시됩니다.</p>
          <p>부분 취소 문의는 02-2088-8728로 문의 바랍니다.</p>
          <p>고객센터 운영시간 : 토/일/공휴일 제외 10:00 ~ 17:00</p>
        </div>

        <button class="modal-close-btn" @click="showRefundModal = false">
          닫기
        </button>
      </div>
    </div>

    <!-- 가상계좌 환불 계좌 입력 모달 -->
    <div class="modal-overlay" v-if="showAccountForm" @click.self="showAccountForm = false">
      <div class="account-modal">
        <h3 class="modal-title">환불 계좌 입력</h3>
        <p class="account-desc">가상계좌 결제 건은 환불받을 계좌 정보가 필요합니다.</p>

        <div class="account-form">
          <div class="form-row">
            <label>은행</label>
            <select v-model="refundAccountForm.bank">
              <option value="">은행 선택</option>
              <option v-for="bank in bankList" :key="bank.code" :value="bank.code">
                {{ bank.name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label>계좌번호</label>
            <input type="text" v-model="refundAccountForm.accountNumber" placeholder="'-' 없이 숫자만 입력" />
          </div>
          <div class="form-row">
            <label>예금주</label>
            <input type="text" v-model="refundAccountForm.holderName" placeholder="예금주명" />
          </div>
        </div>

        <div class="account-btns">
          <button class="btn-cancel" @click="showAccountForm = false">취소</button>
          <button class="btn-submit" @click="submitAccountRefund">환불 요청</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { creditAPI } from '@/api/credit';
import { paymentAPI } from '@/api/payment';
import { useRouter } from 'vue-router';
import { UseMessageStore } from '@/store/message';
import DatePicker from '@/components/common/DatePicker.vue';

const router = useRouter();
const message = UseMessageStore();

// 필터
const startDate = ref('');
const endDate = ref('');
const quickRange = ref('30');
const filterType = ref('all');
const isQuickRangeChange = ref(false);

// 데이터
const creditList = ref([]);
const currentBalance = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);
const perPage = 12;

// 환불 모달
const showRefundModal = ref(false);
const refundableList = ref([]);

// 가상계좌 환불 계좌 입력
const showAccountForm = ref(false);
const selectedRefundItem = ref(null);
const refundAccountForm = ref({
  bank: '',
  accountNumber: '',
  holderName: '',
});

const bankList = [
  { code: '06', name: 'KB국민은행' },
  { code: '88', name: '신한은행' },
  { code: '20', name: '우리은행' },
  { code: '81', name: '하나은행' },
  { code: '11', name: 'NH농협은행' },
  { code: '03', name: 'IBK기업은행' },
  { code: '90', name: '카카오뱅크' },
  { code: '92', name: '토스뱅크' },
  { code: '89', name: '케이뱅크' },
  { code: '23', name: 'SC제일은행' },
  { code: '31', name: 'DGB대구은행' },
  { code: '32', name: '부산은행' },
  { code: '34', name: '광주은행' },
  { code: '37', name: '전북은행' },
  { code: '35', name: '제주은행' },
  { code: '39', name: '경남은행' },
  { code: '71', name: '우체국' },
  { code: '45', name: '새마을금고' },
  { code: '48', name: '신협' },
  { code: '50', name: '저축은행' },
  { code: '02', name: 'KDB산업은행' },
];

// 초기 30일 설정
const setQuickRange = (range) => {
  quickRange.value = range;
  isQuickRangeChange.value = true;
  const today = new Date();
  endDate.value = today.toISOString().split('T')[0];

  if (range === 'today') {
    startDate.value = endDate.value;
  } else {
    const start = new Date(today);
    start.setDate(start.getDate() - Number(range));
    startDate.value = start.toISOString().split('T')[0];
  }
  nextTick(() => {
    isQuickRangeChange.value = false;
  });
};

// API 호출
const fetchList = async () => {
  try {
    const params = {
      startDate: startDate.value,
      endDate: endDate.value,
      page: currentPage.value,
      limit: perPage,
    };
    if (filterType.value !== 'all') {
      params.type = filterType.value;
    }

    const res = await creditAPI.getMyCreditHistory(params);
    creditList.value = res.data.data;
    totalPages.value = res.data.totalPages;
    total.value = res.data.total;
    currentBalance.value = res.data.balance;
  } catch (error) {
    console.error('크레딧 내역 조회 실패:', error);
  }
};

// 환불 모달 열기
const openRefundModal = async () => {
  try {
    const res = await paymentAPI.getRefundable();
    refundableList.value = res.data.data;
  } catch (error) {
    console.error('환불 가능 목록 조회 실패:', error);
    refundableList.value = [];
  }
  showRefundModal.value = true;
};

// 환불 확인
const confirmRefund = (item) => {
  if (item.payment_method === 'VIRTUAL_ACCOUNT') {
    // 가상계좌: 계좌 입력 폼 표시
    selectedRefundItem.value = item;
    refundAccountForm.value = { bank: '', accountNumber: '', holderName: '' };
    showAccountForm.value = true;
  } else {
    // 카드: 바로 확인 팝업
    const dateStr = formatDate(item.created_at);
    message.showConfirm(
      `충전일시 : ${dateStr}\n충전크레딧 : ${item.credit_amount}\n정말 환불하시겠습니까?`,
      () => executeRefund(item.id, null),
    );
  }
};

// 가상계좌 환불 계좌 입력 후 실행
const submitAccountRefund = () => {
  const { bank, accountNumber, holderName } = refundAccountForm.value;
  if (!bank || !accountNumber || !holderName) {
    message.showAlert('은행, 계좌번호, 예금주를 모두 입력해주세요.');
    return;
  }
  const item = selectedRefundItem.value;
  const dateStr = formatDate(item.created_at);
  message.showConfirm(
    `충전일시 : ${dateStr}\n충전크레딧 : ${item.credit_amount}\n정말 환불하시겠습니까?`,
    () => executeRefund(item.id, refundAccountForm.value),
  );
};

// 환불 실행 (공통)
const executeRefund = async (paymentId, refundAccount) => {
  try {
    const res = await paymentAPI.refund(paymentId, refundAccount);
    if (res.data.success) {
      message.showAlert('환불이 완료되었습니다.');
      showRefundModal.value = false;
      showAccountForm.value = false;
      fetchList();
    } else {
      message.showAlert(res.data.message || '환불 처리에 실패했습니다.');
    }
  } catch (error) {
    message.showAlert(
      error.response?.data?.message || '환불 처리 중 오류가 발생했습니다.',
    );
  }
};

// 결제 수단 텍스트
const getMethodText = (method) => {
  if (method === 'VIRTUAL_ACCOUNT') return '가상계좌';
  return '신용카드';
};

// 날짜 유효성 보정 + 즉시 조회
watch(startDate, (val) => {
  if (val && endDate.value && val > endDate.value) {
    endDate.value = val;
  }
  if (!isQuickRangeChange.value) quickRange.value = '';
  currentPage.value = 1;
  fetchList();
});

watch(endDate, (val) => {
  if (val && startDate.value && val < startDate.value) {
    startDate.value = val;
  }
  if (!isQuickRangeChange.value) quickRange.value = '';
  currentPage.value = 1;
  fetchList();
});

// 유형 변경 시 1페이지 리셋
watch(filterType, () => {
  currentPage.value = 1;
  fetchList();
});

// 상세내역 텍스트 매핑
const getDetailText = (item) => {
  if (item.type === 'refund') return item.description || '환불완료';
  if (item.type === 'use' && item.analysis_id) return '분석';
  if (item.type === 'use' && !item.analysis_id) {
    if (item.description === '크레딧 만료 소멸') return '만료 소멸';
    return '차감(관리자)';
  }
  if (item.type === 'charge' && item.payment_id) return '충전';
  if (item.type === 'charge' && !item.payment_id) return '지급(관리자)';
  return '-';
};

// 충전/사용 표시
const getAmountText = (item) => {
  if (item.type === 'use' || item.type === 'refund') {
    return '-' + item.amount;
  }
  return '+' + item.amount;
};

// 영수증 표시 여부: PG 충전건 + 환불건
const showReceipt = (item) => {
  return (item.type === 'charge' || item.type === 'refund') && item.payment_id;
};

// 날짜 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return dateStr.replace('T', ' ').slice(0, 19);
};

// 페이지네이션
const pageRange = computed(() => {
  const start = Math.max(1, currentPage.value - 4);
  const end = Math.min(totalPages.value, start + 9);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const goPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchList();
  }
};

onMounted(() => {
  setQuickRange('30'); // 기본 30일 → watch가 fetchList 호출
});
</script>

<style scoped lang="scss">
.credit {
  padding: 24px;
  color: $white;

  .filter-area {
    margin-bottom: 24px;

    .filter-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .filter-label {
      @include font-14-bold;
      min-width: 40px;
    }

    .date-picker-wrap {
      display: flex;
      align-items: center;
      gap: 8px;

      span {
        color: $white;
      }
    }

    .quick-btns {
      display: flex;
      gap: 4px;

      button {
        @include font-12-regular;
        font-weight: 500;
        padding: 8px 16px;
        min-width: 71px;
        background: $dark-gray-dark;
        color: $white;

        &.active {
          background: $main-gad;
        }
      }
    }

    .radio-group {
      display: flex;
      gap: 16px;

      .radio-label {
        display: flex;
        align-items: center;
        gap: 8px;
        @include font-14-regular;
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
      }
    }
  }

  .table-area {
    padding: 16px 12px;
    background: $table-bg;
    border-radius: 20px;
    .table-header {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 12px;

      .header-btns {
        display: flex;
        gap: 8px;
      }

      .refund-btn {
        @include font-14-medium;
        padding: 8px 20px;
        min-width: 104px;
        background: $sub-color-2;
        color: $white;
        border-radius: $radius-sm;
      }

      .charge-btn {
        @include font-14-medium;
        padding: 8px 20px;
        min-width: 136px;
        background: $main-gad;
        color: $white;
        border-radius: $radius-sm;
      }

      .balance-box {
        display: flex;
        text-align: center;
        .balance-label {
          @include font-14-regular;
          padding: 8px 16px;
          min-width: 116px;
          background: $bg-op;
        }

        .balance-value {
          min-width: 116px;
          @include font-14-bold;
          padding: 8px 16px;
          border: 1px solid $dark-gray-dark;
        }
      }
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px 8px 0 0;
      overflow: hidden;
      thead tr {
        background: $main-gad;
        th {
          @include font-12-bold;
          padding: 12px 8px;
          text-align: center;
        }
      }

      tbody tr {
        &:nth-child(odd) {
          background: $bg-op;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        td {
          @include font-12-regular;
          padding: 10px 8px;
          text-align: center;
          white-space: nowrap;

          &.detail-cell {
            white-space: pre-line;
          }

          &.receipt-cell {
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
      }

      .receipt-icon {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 24px;

    button {
      @include font-14-regular;
      color: $white;
      width: 32px;
      height: 32px;
      border-radius: $radius-sm;
      display: flex;
      align-items: center;
      justify-content: center;

      &.active {
        background: $main-color;
        @include font-14-bold;
      }

      &:hover:not(.active):not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
      }

      &:disabled {
        opacity: 0.3;
        cursor: default;
      }
    }
  }

  .refund-info {
    margin-top: 24px;
    @include font-12-regular;
    color: $dark-input-gray;
  }
}

.empty-msg {
  text-align: center;
  padding: 80px 0 !important;
  color: $dark-input-gray;
  @include font-14-regular;
}

/* 환불 모달 */
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

.refund-modal {
  background: $dark-bg;
  // border: 1px solid $dark-line-gray;
  border-radius: $radius-lg;
  padding: 40px;
  max-width: 812px;
  min-height: 540px;
  width: 90%;
  color: $white;
  display: flex;
  flex-direction: column;

  .modal-title {
    @include font-20-bold;
    text-align: center;
    margin-bottom: 24px;
  }

  .refund-table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
    margin-bottom: 24px;

    thead tr {
      background: $main-gad;
      th {
        @include font-14-bold;
        padding: 12px 8px;
        text-align: center;
        width: 25%;
      }
    }

    tbody tr {
      &:nth-child(odd) {
        background: $bg-op;
      }

      td {
        @include font-12-regular;
        padding: 10px 8px;
        text-align: center;
      }
    }

    .refund-action-btn {
      @include font-14-medium;
      padding: 6px 16px;
      background: $main-gad;
      color: $white;
      border-radius: $radius-sm;
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }
  }

  .no-refundable {
    @include font-14-regular;
    color: $dark-input-gray;
    text-align: center;
    padding: 40px 0;
  }

  .refund-modal-info {
    text-align: center;
    margin-bottom: 24px;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-direction: column;
    .info-bold {
      @include font-14-bold;
      margin-bottom: 12px;
    }

    p {
      @include font-12-regular;
      color: $dark-text;
      line-height: 1.6;
    }
  }

  .modal-close-btn {
    display: block;
    margin: 0 auto;
    padding: 10px 48px;
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

/* 가상계좌 환불 계좌 입력 모달 */
.account-modal {
  background: $dark-bg;
  border-radius: $radius-lg;
  padding: 40px;
  max-width: 480px;
  width: 90%;
  color: $white;

  .modal-title {
    @include font-20-bold;
    text-align: center;
    margin-bottom: 12px;
  }

  .account-desc {
    @include font-14-regular;
    color: $dark-text;
    text-align: center;
    margin-bottom: 24px;
  }

  .account-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        @include font-14-medium;
      }

      select,
      input {
        padding: 10px 12px;
        background: $dark-input;
        border: 1px solid $dark-line-gray;
        border-radius: $radius-sm;
        color: $white;
        @include font-14-regular;

        &::placeholder {
          color: $dark-input-gray;
        }

        &:focus {
          border-color: $sub-color-2;
        }
      }

      select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }
    }
  }

  .account-btns {
    display: flex;
    justify-content: center;
    gap: 12px;

    .btn-cancel {
      padding: 10px 32px;
      background: $dark-line-gray;
      color: $white;
      border-radius: $radius-sm;
      @include font-14-medium;
      cursor: pointer;
    }

    .btn-submit {
      padding: 10px 32px;
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
}
</style>
