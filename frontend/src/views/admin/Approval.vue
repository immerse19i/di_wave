<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">승인관리</h2>
      <div class="breadcrumb">승인관리 &gt; 목록</div>
    </div>

    <!-- 탭 메뉴 -->
    <div class="tab-menu">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { active: currentTab === tab.value }]"
        @click="changeTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 검색 영역 -->
    <div class="search-area">
      <div class="search_bar">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="병원명으로 검색"
          @keyup.enter="handleSearch"
        />
      </div>
      <button class="btn-search" @click="handleSearch">검색</button>
    </div>

    <!-- 테이블 -->
    <div class="content_list">
      <table>
        <colgroup>
          <col style="width: auto" />
          <col style="width: 160px" />
          <col style="width: 120px" />
          <col style="width: 120px" />
        </colgroup>
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('name')">
              병원명
              <span class="sort-icon">{{ getSortIcon('name') }}</span>
            </th>
            <th class="sortable" @click="toggleSort('created_at')">
              신청일
              <span class="sort-icon">{{ getSortIcon('created_at') }}</span>
            </th>
            <th>상태</th>
            <th>상세보기</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredList"
            :key="item.id"
            class="clickable-row"
            @click="goToDetail(item.id)"
          >
            <td>{{ item.name }}</td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td>{{ statusLabel(item.status) }}</td>
            <td>
              <button class="btn-detail" @click.stop="goToDetail(item.id)">
                상세보기
              </button>
            </td>
          </tr>
          <tr v-if="filteredList.length === 0">
            <td colspan="4" class="empty-message">검색 결과가 없습니다</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 페이지네이션 -->
    <div class="pagination">
      <button
        class="page-btn arrow"
        :disabled="pagination.page <= 1"
        @click="goToPage(1)"
      >
        <img src="/assets/icons/arrow_first.svg" alt="first" />
      </button>
      <button
        class="page-btn arrow"
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        <img src="/assets/icons/arrow_prev.svg" alt="prev" />
      </button>
      <button
        v-for="pageNum in visiblePages"
        :key="pageNum"
        :class="['page-btn', { active: pageNum === pagination.page }]"
        @click="goToPage(pageNum)"
      >
        {{ pageNum }}
      </button>
      <button
        class="page-btn arrow"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        <img src="/assets/icons/arrow_next.svg" alt="next" />
      </button>
      <button
        class="page-btn arrow"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.totalPages)"
      >
        <img src="/assets/icons/arrow_last.svg" alt="last" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminAPI } from '@/api/admin';
const router = useRouter();

// 탭
const tabs = [
  { label: '전체', value: 'all' },
  { label: '승인대기', value: 'pending' },
  { label: '반려', value: 'rejected' },
];
const currentTab = ref('all');

// 상태
const hospitalList = ref([]);
const searchKeyword = ref('');
const currentSearch = ref('');
const sortField = ref('');
const sortOrder = ref('');
const sortClickCount = ref({});
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });

// ── mock 데이터 (API 연동 시 제거) ──

// 2026.03.03 api 연동 교체

// 탭 + 검색 필터
const filteredList = computed(() => {
  return hospitalList.value;
});

const visiblePages = computed(() => {
  const total = Math.max(1, pagination.value.totalPages);
  const current = pagination.value.page;
  const pages = [];
  let start = Math.max(1, current - 4);
  let end = Math.min(total, start + 9);
  start = Math.max(1, end - 9);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const fetchList = async () => {
  try {
    const res = await adminAPI.getHospitals({
      status: currentTab.value,
      search: currentSearch.value,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
      page: pagination.value.page,
      limit: pagination.value.limit,
    });
    hospitalList.value = res.data.data;
    pagination.value.total = res.data.total;
    pagination.value.totalPages = res.data.totalPages;
  } catch (e) {
    console.error('목록 조회 실패:', e);
  }
};

const changeTab = (tab) => {
  currentTab.value = tab;
  pagination.value.page = 1;
  fetchList();
};

const handleSearch = () => {
  if (searchKeyword.value.length > 0 && searchKeyword.value.length < 2) return;
  currentSearch.value = searchKeyword.value;
  pagination.value.page = 1;
  fetchList();
};

const toggleSort = (field) => {
  const count = (sortClickCount.value[field] || 0) + 1;
  Object.keys(sortClickCount.value).forEach((key) => {
    if (key !== field) sortClickCount.value[key] = 0;
  });

  if (count === 1) {
    sortField.value = field;
    sortOrder.value = field === 'created_at' ? 'DESC' : 'ASC';
  } else if (count === 2) {
    sortField.value = field;
    sortOrder.value = field === 'created_at' ? 'ASC' : 'DESC';
  } else {
    sortField.value = '';
    sortOrder.value = '';
    sortClickCount.value[field] = 0;
    return;
  }
  sortClickCount.value[field] = count;
  fetchList();
};

const getSortIcon = (field) => {
  if (sortField.value !== field) return '↕';
  return sortOrder.value === 'ASC' ? '↑' : '↓';
};

const goToPage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  fetchList();
};

const goToDetail = (id) => {
  router.push(`/admin/approval/${id}`);
};

const statusLabel = (status) => {
  const map = { pending: '승인대기', approved: '승인', rejected: '반려' };
  return map[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

onMounted(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.page-wrap {
  padding: 32px 42px;
  color: $white;
}

// 페이지 헤더
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

// 탭 메뉴
.tab-menu {
  display: flex;
  border-bottom: 1px solid $dark-line-gray;
  margin-bottom: 24px;

  .tab-item {
    padding: 12px 24px;
    background: none;
    color: $dark-text;
    @include font-14-medium;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: $white;
    }

    &.active {
      color: $white;
      border-bottom-color: $white;
    }
  }
}

// 검색 영역
.search-area {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;

  .search_bar {
    flex: 1;
    display: flex;
    padding: 8px 16px;
    position: relative;
    border-radius: $radius-sm;
    background: $bg-op;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: $radius-sm;
      padding: 1px;
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.09) 0%,
        rgba(255, 255, 255, 0.06) 100%
      );
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    input {
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
      &::before {
        background: $sub-color-2;
      }
    }
  }

  .btn-search {
    color: $white;
    background: $main-gad;
    min-width: 100px;
    padding: 8px 16px;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
  }
}

// 테이블
.content_list {
  background: $table-bg;
  padding: 16px 12px;
  border-radius: 12px;
  table {
    width: 100%;
    border-collapse: collapse;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
    overflow: hidden;
    background: unset;
    // th {
    // }
    th,
    td {
      background: none;
      text-align: center;
      padding: 12px 8px;
      @include font-12-regular;
    }

    thead tr {
      // background: $main-gad;
      background: $bg-op;
    }

    th {
      @include font-14-bold;
    }

    th.sortable {
      cursor: pointer;
      user-select: none;
      &:hover {
        opacity: 0.8;
      }
      .sort-icon {
        margin-left: 4px;
        font-size: 10px;
      }
    }

    tbody tr.clickable-row {
      cursor: pointer;
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .empty-message {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }
}

// 상세보기 버튼
.btn-detail {
  padding: 6px 16px;
  background: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover {
    background: $sub-color;
  }
}

// 페이지네이션
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 24px;

  .page-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    background: none;
    color: $dark-text;
    border: none;
    border-radius: $radius-sm;
    @include font-12-regular;
    cursor: pointer;

    &.arrow {
      @include font-14-bold;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 16px;
        height: 16px;
      }
    }

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.08);
    }

    &.active {
      background: $main-gad;
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
