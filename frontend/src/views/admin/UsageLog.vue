<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">사용기록</h2>
      <div class="breadcrumb">사용기록 &gt; 목록</div>
    </div>

    <!-- 필터 영역 -->
    <div class="filter-section">
      <!-- 기간 필터 -->
      <div class="filter-row">
        <label class="radio-label">
          <input type="radio" v-model="periodType" value="none" />
          <span>기간선택안함</span>
        </label>
        <label class="radio-label">
          <input type="radio" v-model="periodType" value="period" />
          <span>기간선택</span>
        </label>
        <DatePicker v-model="startDate" :max-date="endDate" />
        <span class="date-sep">-</span>
        <DatePicker v-model="endDate" :min-date="startDate" />
      </div>

      <!-- 검색 -->
      <div class="search-row">
        <div class="search-box">
          <img src="/assets/icons/search.svg" class="search-icon" />
          <input
            v-model="searchText"
            type="text"
            placeholder="검색어입력"
            class="search-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button class="btn-search" @click="handleSearch">검색</button>
      </div>
    </div>

    <!-- 테이블 -->
    <div class="table-wrap">
      <!-- 총 건수 (테이블 박스 내부 우측 상단) -->
      <div class="count-row">
        <span>총 {{ total }}건</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-date">일시</th>
            <th class="col-category">카테고리</th>
            <th class="col-action">작업유형</th>
            <th class="col-admin">관리자</th>
            <th class="col-detail">세부내용</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in logList" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td>{{ categoryLabel(item.target_type) }}</td>
            <td>{{ displayCategory(item) }}</td>
            <td>{{ item.operator }}</td>
            <td>
              <button class="btn-detail" @click="goDetail(item.id)">
                상세보기
              </button>
            </td>
          </tr>
          <tr v-if="logList.length === 0">
            <td colspan="6" class="empty-row">조회 결과가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 페이지네이션 -->
    <div class="pagination" v-if="totalPages > 0">
      <button @click="goPage(1)" :disabled="currentPage === 1">&laquo;</button>
      <button @click="goPage(currentPage - 1)" :disabled="currentPage === 1">
        &lsaquo;
      </button>
      <button
        v-for="p in pageRange"
        :key="p"
        :class="{ active: p === currentPage }"
        @click="goPage(p)"
      >
        {{ p }}
      </button>
      <button
        @click="goPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
      >
        &rsaquo;
      </button>
      <button
        @click="goPage(totalPages)"
        :disabled="currentPage === totalPages"
      >
        &raquo;
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminAPI } from '@/api/admin';
import DatePicker from '@/components/common/DatePicker.vue';

const router = useRouter();

// 상태
const logList = ref([]);
const total = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// 필터
const today = new Date().toISOString().slice(0, 10);
const periodType = ref('none');
const startDate = ref(today);
const endDate = ref(today);
const searchText = ref('');

// 카테고리 라벨 매핑
const categoryLabel = (targetType) => {
  const map = {
    account: '가입계정목록',
    approval: '승인관리',
    notice: '공지사항',
    popup: '안내팝업',
    terms: '이용약관',
    inquiry: '고객문의관리',
    info: '정보수정',
    credit: '크레딧',
  };
  return map[targetType] || targetType;
};

// 작업유형 치환
const displayCategory = (item) => {
  // 승인상태 변경 → '계정 승인' / '계정 반려'
  if (item.category === '승인상태 변경') {
    if (!item.details) return item.category;
    const firstLine = item.details.split('\n')[0];
    if (firstLine.includes('→') && firstLine.includes('[반려]'))
      return '계정 반려';
    if (item.details.includes('→ [승인]')) return '계정 승인';
    return item.category;
  }
  // 기존 '크레딧 수동 관리' 레코드 호환 → '정보수정 (계정 정보 및 관리)'
  if (item.category === '크레딧 수동 관리')
    return '정보수정 (계정 정보 및 관리)';
  return item.category || '';
};

// 날짜 포맷 (YY.MM.DD HH:MM:SS)
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${mi}:${ss}`;
};

// 목록 조회
const fetchList = async () => {
  try {
    const params = { page: currentPage.value, limit: pageSize.value };
    if (periodType.value === 'period' && startDate.value && endDate.value) {
      params.startDate = startDate.value;
      params.endDate = endDate.value;
    }
    if (searchText.value.trim()) {
      params.search = searchText.value.trim();
    }
    const res = await adminAPI.getLogs(params);
    logList.value = res.data.data;
    total.value = res.data.total;
    totalPages.value = res.data.totalPages;
    currentPage.value = res.data.currentPage;
  } catch (err) {
    console.error('fetchList error:', err);
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchList();
};

// 페이지네이션
const pageRange = computed(() => {
  const start = Math.floor((currentPage.value - 1) / 10) * 10 + 1;
  const end = Math.min(start + 9, totalPages.value);
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
});

const goPage = (p) => {
  if (p < 1 || p > totalPages.value) return;
  currentPage.value = p;
  fetchList();
};

const goDetail = (id) => {
  router.push(`/admin/logs/${id}`);
};

// 동적 행 수
const calculatePageSize = () => {
  const available = window.innerHeight - 340;
  pageSize.value = Math.max(5, Math.floor(available / 44));
};

const onResize = () => {
  const old = pageSize.value;
  calculatePageSize();
  if (old !== pageSize.value) fetchList();
};

onMounted(() => {
  calculatePageSize();
  fetchList();
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>
<style lang="scss" scoped>
.page-wrap {
  padding: 32px 24px;
  color: $white;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  .page-title {
    @include font-20-bold;
  }
  .breadcrumb {
    @include font-12-regular;
    color: $dark-text;
  }
}

// 필터 영역
.filter-section {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  @include font-14-regular;
  white-space: nowrap;

  input[type='radio'] {
    display: none;
  }

  span {
    position: relative;
    padding-left: 22px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      background: $dark-line-gray;
      border: none;
      border-radius: 50%;
    }

    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
    }
  }

  input[type='radio']:checked + span::before {
    background: $main-color;
  }

  input[type='radio']:checked + span::after {
    background: $white;
  }
}

.date-input {
  padding: 8px 12px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.date-sep {
  color: $dark-text;
}

// 검색
.search-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;

  .search-box {
    width: 590px;
    max-width: 100%;
    display: flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: $radius-sm;
    background: $bg-op;
    border: 1px solid $dark-line-gray;

    .search-icon {
      margin-right: 8px;
      font-size: 16px;
      opacity: 0.5;
    }

    .search-input {
      width: 100%;
      background: none;
      border: none;
      color: $white;
      @include font-14-regular;
      &::placeholder {
        color: $dark-input-gray;
      }
    }

    &:has(input:focus) {
      border-color: $sub-color-2;
    }
  }

  .btn-search {
    color: $white;
    background: $main-gad;
    min-width: 136px;
    padding: 8px 16px;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
  }
}

// 테이블
.table-wrap {
  padding: 12px 16px;
  background: $table-bg;
  border-radius: 12px;

  // 총 건수 (테이블 박스 내부 우측 상단)
  .count-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
    @include font-14-regular;
    color: $dark-text;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
    overflow: hidden;

    th,
    td {
      text-align: center;
      padding: 12px 8px;
      @include font-12-regular;
    }

    thead tr {
      background: $bg-op;
    }
    th {
      @include font-14-bold;
      color: $gray;
    }

    .empty-row {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }

  // 상세보기 버튼
  .btn-detail {
    padding: 6px 16px;
    background: $main-color;
    color: $white;
    border: none;
    border-radius: $radius-sm;
    @include font-12-regular;
    cursor: pointer;
    &:hover {
      background: $sub-color;
    }
  }

  // 컬럼 너비
  .col-no {
    width: 60px;
  }
  .col-date {
    width: 160px;
  }
  .col-category {
    width: 140px;
  }
  .col-action {
    width: auto;
  }
  .col-admin {
    width: 100px;
  }
  .col-detail {
    width: 100px;
  }
}

// 페이지네이션
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 24px;

  button {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    background: none;
    color: $dark-text;
    border: none;
    border-radius: $radius-sm;
    @include font-12-regular;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.08);
    }
    &.active {
      background: $main-color;
      color: $white;
      @include font-12-bold;
    }
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  }
}
</style>
