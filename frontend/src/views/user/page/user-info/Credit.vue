<template>
  <div class="credit">
    <!-- 필터 영역 -->
    <div class="filter-area">
      <div class="filter-row">
        <span class="filter-label">기간</span>
        <div class="date-picker-wrap">
          <input type="date" v-model="startDate">
          <span>~</span>
          <input type="date" v-model="endDate">
        </div>
        <div class="quick-btns">
          <button :class="{ active: quickRange === 'today' }" @click="setQuickRange('today')">오늘</button>
          <button :class="{ active: quickRange === '7' }" @click="setQuickRange('7')">7일</button>
          <button :class="{ active: quickRange === '30' }" @click="setQuickRange('30')">30일</button>
          <button :class="{ active: quickRange === '90' }" @click="setQuickRange('90')">90일</button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-label">유형</span>
        <div class="radio-group">
          <label><input type="radio" v-model="filterType" value="all"><span>전체</span></label>
          <label><input type="radio" v-model="filterType" value="charge"><span>충전</span></label>
          <label><input type="radio" v-model="filterType" value="use"><span>사용</span></label>
        </div>
      </div>
    </div>

    <!-- 테이블 영역 -->
    <div class="table-area">
      <div class="table-header">
        <button class="charge-btn">크레딧 충전</button>
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
        <tbody>
          <tr v-for="item in paginatedList" :key="item.id">
            <td>{{ item.date }}</td>
            <td>{{ item.patientCode || '-' }}</td>
            <td>{{ item.patientName || '-' }}</td>
            <td>{{ item.doctor }}</td>
            <td>{{ item.detail }}</td>
            <td>{{ item.amount > 0 ? '+' + item.amount : item.amount }}</td>
            <td>{{ item.balance }}</td>
            <td>
              <img v-if="item.receipt" src="/assets/icons/receipt_icon.svg" alt="영수증" class="receipt-icon">
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 페이지네이션 -->
      <div class="pagination">
        <button @click="goPage(1)" :disabled="currentPage === 1">&laquo;</button>
        <button @click="goPage(currentPage - 1)" :disabled="currentPage === 1">&lt;</button>
        <button
          v-for="page in pageRange"
          :key="page"
          :class="{ active: page === currentPage }"
          @click="goPage(page)"
        >
          {{ page }}
        </button>
        <button @click="goPage(currentPage + 1)" :disabled="currentPage === totalPages">&gt;</button>
        <button @click="goPage(totalPages)" :disabled="currentPage === totalPages">&raquo;</button>
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
import { ref, computed } from 'vue';
import { creditList } from '@/mock';

// 필터
const startDate = ref('2024-01-01');
const endDate = ref('2024-01-07');
const quickRange = ref('30');
const filterType = ref('all');

const setQuickRange = (range) => {
  quickRange.value = range;
  const today = new Date();
  endDate.value = today.toISOString().split('T')[0];

  if (range === 'today') {
    startDate.value = endDate.value;
  } else {
    const start = new Date(today);
    start.setDate(start.getDate() - Number(range));
    startDate.value = start.toISOString().split('T')[0];
  }
};

// 필터링된 목록
const filteredList = computed(() => {
  return creditList.filter((item) => {
    if (filterType.value === 'charge' && item.amount <= 0) return false;
    if (filterType.value === 'use' && item.amount > 0) return false;
    return true;
  });
});

// 잔여 크레딧
const currentBalance = computed(() => {
  return filteredList.value.length > 0 ? filteredList.value[0].balance : 0;
});

// 페이지네이션
const currentPage = ref(1);
const perPage = 12;

const totalPages = computed(() => Math.ceil(filteredList.value.length / perPage));

const pageRange = computed(() => {
  const start = Math.max(1, currentPage.value - 4);
  const end = Math.min(totalPages.value, start + 9);
  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredList.value.slice(start, start + perPage);
});

const goPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
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

      input[type="date"] {
        padding: 8px 12px;
        background: $dark-input;
        border: 1px solid $dark-line-gray;
        border-radius: $radius-sm;
        color: $white;
        @include font-14-regular;

        &::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      }

      span {
        color: $white;
      }
    }

    .quick-btns {
      display: flex;
      gap: 4px;

      button {
        @include font-12-regular;
        padding: 8px 16px;
        border: 1px solid $dark-line-gray;
        border-radius: $radius-sm;
        color: $white;

        &.active {
          background: $main-color;
          border-color: $main-color;
        }
      }
    }

    .radio-group {
      display: flex;
      gap: 16px;

      label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;

        input[type="radio"] {
          accent-color: $main-color;
        }

        span {
          @include font-14-regular;
        }
      }
    }
  }

  .table-area {
    .table-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;

      .charge-btn {
        @include font-14-medium;
        padding: 8px 20px;
        background: $main-gad;
        color: $white;
        border-radius: $radius-sm;
      }

      .balance-box {
        display: flex;

        .balance-label {
          @include font-14-regular;
          padding: 8px 16px;
          background: $dark-gray-dark;
          border-radius: $radius-sm 0 0 $radius-sm;
        }

        .balance-value {
          @include font-14-bold;
          padding: 8px 16px;
          background: $dark-input;
          border-radius: 0 $radius-sm $radius-sm 0;
        }
      }
    }

    table {
      width: 100%;
      border-collapse: collapse;

      thead tr {
        background: $main-color;

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
</style>
