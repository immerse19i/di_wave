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
        <button
          class="charge-btn"
          @click="router.push('/user-info/credit-charge')"
        >
          크레딧 충전
        </button>
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
            <td>{{ getDetailText(item) }}</td>
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
      <p>환불 문의 고객센터 : (02-2088-8728) 토/일/공휴일 제외</p>
      <p>10:00 ~ 17:00</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { creditAPI } from '@/api/credit';
import { useRouter } from 'vue-router';
import DatePicker from '@/components/common/DatePicker.vue';

const router = useRouter();

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
  isQuickRangeChange.value = false;
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
  if (item.type === 'use' && item.analysis_id) return '분석';
  if (item.type === 'use' && !item.analysis_id) return '차감(관리자)';
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

// 영수증 표시 여부: PG 충전건만
const showReceipt = (item) => {
  return item.type === 'charge' && item.payment_id;
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
        // border: 1px solid $dark-line-gray;
        // border-radius: $radius-sm;
        color: $white;

        &.active {
          background: $main-gad;
          // border-color: $main-color;
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
          // border-radius: $radius-sm 0 0 $radius-sm;
        }

        .balance-value {
          min-width: 116px;
          @include font-14-bold;
          padding: 8px 16px;
          border: 1px solid $dark-gray-dark;
          // border-radius: 0 $radius-sm $radius-sm 0;
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
</style>
