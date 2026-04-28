<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">고객문의관리</h2>
      <div class="breadcrumb">고객문의관리 &gt; 목록</div>
    </div>

    <!-- ① 상태 대시보드 -->
    <div class="status-cards">
      <div
        v-for="card in statusCards"
        :key="card.key"
        :class="['status-card', { active: activeStatus === card.key }]"
        @click="selectStatus(card.key)"
      >
        <span class="card-label">{{ card.label }}</span>
        <span class="card-count">{{ card.count }} 건</span>
      </div>
    </div>

    <!-- ② 날짜 필터 -->
    <div class="filter-area">
      <div class="filter-row">
        <div class="filter-group date-filter">
          <label class="radio-label">
            <input type="radio" v-model="dateMode" value="none" />
            <span class="radio-custom"></span>
            기간선택안함
          </label>
          <label class="radio-label">
            <input type="radio" v-model="dateMode" value="date" />
            <span class="radio-custom"></span>
            문의일시
          </label>
          <DatePicker
            v-model="startDate"
            :max-date="endDate"
            :disabled="dateMode !== 'date'"
            :class="{ 'date-active': dateMode === 'date' }"
          />
          <span class="date-separator">~</span>
          <DatePicker
            v-model="endDate"
            :min-date="startDate"
            :disabled="dateMode !== 'date'"
            :class="{ 'date-active': dateMode === 'date' }"
          />
        </div>
      </div>

      <!-- ③ 검색 -->
      <div class="search-row">
        <div class="search-box">
          <img
            src="/assets/icons/search.svg"
            alt="search"
            class="search-icon"
          />
          <input
            v-model="searchText"
            type="text"
            placeholder="제목, 병원명, ID를 입력하세요"
            class="search-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button class="btn-search" @click="handleSearch">검색</button>
      </div>
    </div>

    <!-- ④ 총 건수 -->
    <div class="toolbar">
      <span></span>
      <span class="total-count">총 {{ total }}건</span>
    </div>

    <!-- ⑤ 테이블 -->
    <div class="table-area">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-status">상태</th>
            <th class="col-title">제목</th>
            <th class="col-attach">첨부</th>
            <th class="col-hospital">병원명</th>
            <th class="col-id">ID</th>
            <th class="col-date">일시</th>
            <th class="col-answer-date">답변일</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in inquiryList"
            :key="item.id"
            class="data-row"
            @click="goToDetail(item)"
          >
            <td>{{ item.id }}</td>
            <td>
              <span :class="['status-badge', `status-${item.status}`]">
                {{ statusLabel(item.status) }}
              </span>
            </td>
            <td class="td-title">{{ item.title }}</td>
            <td>
              <img
                v-if="item.has_attachment"
                src="/assets/icons/attachment.svg"
                alt="attach"
                width="16"
                height="16"
              />
            </td>
            <td>{{ item.hospital_name }}</td>
            <td>{{ item.login_id }}</td>
            <td class="td-date">{{ formatDate(item.created_at) }}</td>
            <td class="td-date">
              {{ item.answered_at ? formatDate(item.answered_at) : '-' }}
            </td>
          </tr>
          <tr v-if="inquiryList.length === 0">
            <td colspan="8" class="empty-row">조회 결과가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ⑥ 페이지네이션 -->
    <div class="pagination" v-if="totalPages > 0">
      <button @click="goPage(1)" :disabled="currentPage === 1">
        <img src="/assets/icons/arrow_first.svg" alt="first" />
      </button>
      <button @click="goPage(currentPage - 1)" :disabled="currentPage === 1">
        <img src="/assets/icons/arrow_prev.svg" alt="prev" />
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
        <img src="/assets/icons/arrow_next.svg" alt="next" />
      </button>
      <button
        @click="goPage(totalPages)"
        :disabled="currentPage === totalPages"
      >
        <img src="/assets/icons/arrow_last.svg" alt="last" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { inquiryAPI } from '@/api/inquiry';
import DatePicker from '@/components/common/DatePicker.vue';

const router = useRouter();

// ---- ① 상태 대시보드 ----
const activeStatus = ref('all');
const counts = ref({ total: 0, pending: 0, answered: 0, draft: 0 });

const statusCards = computed(() => [
  { key: 'all', label: '전체', count: counts.value.total },
  { key: 'pending', label: '답변대기', count: counts.value.pending },
  { key: 'answered', label: '답변완료', count: counts.value.answered },
  { key: 'draft', label: '임시저장', count: counts.value.draft },
]);

const selectStatus = (key) => {
  activeStatus.value = key;
  currentPage.value = 1;
  fetchList();
};

const fetchCounts = async () => {
  try {
    const res = await inquiryAPI.getInquiryCounts();
    counts.value = res.data.data;
  } catch (e) {
    console.error('fetchCounts error:', e);
  }
};

// ---- ② 날짜 필터 ----
const dateMode = ref('none');
const today = new Date().toISOString().slice(0, 10);
const startDate = ref(today);
const endDate = ref(today);

watch(dateMode, (val) => {
  if (val === 'date' && !startDate.value) {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    endDate.value = today.toISOString().slice(0, 10);
    startDate.value = weekAgo.toISOString().slice(0, 10);
  }
});

// ---- ③ 검색 ----
const searchText = ref('');

// ---- 데이터 ----
const inquiryList = ref([]);
const total = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const calculatePageSize = () => {
  const headerH = 60;
  const cardsH = 120;
  const filterH = 130;
  const toolbarH = 40;
  const paginationH = 60;
  const theadH = 44;
  const rowH = 52;
  const available =
    window.innerHeight -
    headerH -
    cardsH -
    filterH -
    toolbarH -
    paginationH -
    theadH -
    60;
  pageSize.value = Math.max(5, Math.floor(available / rowH));
};

const fetchList = async () => {
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    if (activeStatus.value !== 'all') {
      params.status = activeStatus.value;
    }
    if (dateMode.value === 'date') {
      if (startDate.value) params.startDate = startDate.value;
      if (endDate.value) params.endDate = endDate.value;
    }
    if (searchText.value.trim()) {
      params.search = searchText.value.trim();
    }

    const res = await inquiryAPI.getInquiries(params);
    inquiryList.value = res.data.data;
    total.value = res.data.total;
    totalPages.value = res.data.totalPages;
    currentPage.value = res.data.currentPage;
  } catch (e) {
    console.error('fetchList error:', e);
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchList();
};

// ---- ⑥ 페이지네이션 ----
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

// ---- 유틸 ----
const statusLabel = (s) => {
  const map = {
    pending: '답변대기',
    answered: '답변완료',
    draft: '임시저장',
    closed: '완료',
  };
  return map[s] || s;
};
const formatDate = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day}\n${h}:${min}`;
};

// ---- 이동 ----
const goToDetail = (item) => {
  router.push(`/admin/inquiries/${item.id}`);
};

// ---- 초기화 ----
onMounted(() => {
  calculatePageSize();
  window.addEventListener('resize', onResize);
  fetchCounts();
  fetchList();
});
onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
const onResize = () => {
  const oldSize = pageSize.value;
  calculatePageSize();
  if (oldSize !== pageSize.value) fetchList();
};
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

// ① 상태 대시보드
.status-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;

  .status-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 197px;
    height: 136px;
    background: #2f3844;
    // border: 1px solid $dark-line-gray;
    border-radius: 12px;
    gap: 19px;
    color: $white;
    cursor: pointer;
    // transition: background 0.2s;

    &.active {
      background: #3591b3;
      border-color: transparent;
    }

    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.06);
    }

    .card-label {
      @include font-20-bold;
      margin-bottom: 8px;
    }
    .card-count {
      @include font-16-regular;
      font-size: 20px;
    }
  }
}

// ② 필터 영역
.filter-area {
  margin-bottom: 16px;
  padding: 16px 12px;
  background-color: $table-bg;
  border-radius: 12px;
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 12px;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
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

.date-filter :deep(.dp-input-wrap) {
  width: 126px;
}

.date-active :deep(.dp-input-wrap:focus-within) {
  border-color: $sub-color-2;
}

.date-separator {
  color: $dark-text;
}

// ③ 검색
.search-row {
  display: flex;
  gap: 12px;
  // margin-bottom: 24px;

  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: $radius-sm;
    background: $bg-op;
    border: 1px solid $dark-line-gray;
    gap: 8px;

    .search-icon {
      width: 16px;
      height: 16px;
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

// ④ 총 건수
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 8px;
}

.total-count {
  @include font-14-regular;
  color: $dark-text;
}

// ⑤ 테이블
.table-area {
  padding: 12px 16px;
  background: $table-bg;
  border-radius: 12px;
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

    .data-row {
      cursor: pointer;
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .td-title {
      text-align: center;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .td-date {
      white-space: pre-line;
    }

    .status-badge {
      padding: 4px;
      border-radius: 4px;
      @include font-12-regular;
      color: $white;
    }
    .status-pending {
      background: #3591b3;
    }
    .status-answered {
      background: #7d7d7d;
    }
    .status-draft {
      background: #ff4545;
    }

    .empty-row {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }

  .col-no {
    width: 60px;
  }
  .col-status {
    width: 100px;
  }
  .col-title {
    width: auto;
  }
  .col-attach {
    width: 50px;
  }
  .col-hospital {
    width: 140px;
  }
  .col-id {
    width: 100px;
  }
  .col-date {
    width: 110px;
  }
  .col-answer-date {
    width: 110px;
  }
}

// ⑥ 페이지네이션
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

    img {
      width: 12px;
      height: 12px;
    }
  }
}
</style>
