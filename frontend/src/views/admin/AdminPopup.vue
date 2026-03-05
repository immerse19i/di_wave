<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">안내팝업</h2>
      <div class="breadcrumb">안내팝업 &gt; 목록</div>
    </div>

    <!-- ① 검색 -->
    <div class="search-row">
      <div class="search-box">
        <img src="/assets/icons/search.svg" alt="검색" class="search-icon" />
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

    <!-- ③ 생성 버튼 -->
    <div class="action-row">
      <button class="btn-create" @click="goToCreate">생성</button>
    </div>

    <!-- ④ 총 건수 -->
    <div class="count-row">
      <span class="total-count">총 {{ total }}건</span>
    </div>

    <!-- ⑤⑥ 테이블 -->
    <div class="table-area">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-draft">임시저장</th>
            <th class="col-title sortable" @click="toggleSort('title')">
              제목 <span class="sort-icon">{{ getSortIcon('title') }}</span>
            </th>
            <th
              class="col-period sortable"
              @click="toggleSort('display_start')"
            >
              팝업 게시기간
              <span class="sort-icon">{{ getSortIcon('display_start') }}</span>
            </th>
            <th class="col-author sortable" @click="toggleSort('author_name')">
              작성자
              <span class="sort-icon">{{ getSortIcon('author_name') }}</span>
            </th>
            <th
              class="col-published sortable"
              @click="toggleSort('published_at')"
            >
              게시일시
              <span class="sort-icon">{{ getSortIcon('published_at') }}</span>
            </th>
            <th class="col-updated sortable" @click="toggleSort('updated_at')">
              최근수정일시
              <span class="sort-icon">{{ getSortIcon('updated_at') }}</span>
            </th>
            <th class="col-active sortable" @click="toggleSort('is_active')">
              현재 게시여부
              <span class="sort-icon">{{ getSortIcon('is_active') }}</span>
            </th>
            <th class="col-edit">수정</th>
            <th class="col-delete">삭제</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in popupList"
            :key="item.id"
            class="data-row"
            :class="{ 'row-deleted': item.status === 'deleted' }"
          >
            <td>{{ item.status === 'draft' ? '-' : item.id }}</td>
            <td>{{ item.status === 'draft' ? 'O' : '' }}</td>
            <td class="td-title">{{ item.title }}</td>
            <td>{{ displayPeriod(item) }}</td>
            <td>{{ item.author_name }}</td>
            <td>
              {{
                item.status === 'draft'
                  ? '-'
                  : formatDateTime(item.published_at)
              }}
            </td>
            <td>{{ formatDateTime(item.updated_at) }}</td>
            <td>
              <span :class="['active-badge', `active-${item.is_active}`]">
                {{ activeLabel(item.is_active) }}
              </span>
            </td>
            <td class="td-edit" @click.stop="goToEdit(item)">
              <button class="btn-edit-icon">
                <img src="/assets/icons/edit.svg" alt="수정" class="icon-img" />
              </button>
            </td>
            <td class="td-delete">
              <button class="btn-delete-icon" @click.stop="handleDelete(item)">
                <img
                  src="/assets/icons/delete_icon.svg"
                  alt="삭제"
                  class="icon-img"
                />
              </button>
            </td>
          </tr>
          <tr v-if="popupList.length === 0">
            <td colspan="10" class="empty-row">조회 결과가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ⑦ 페이지네이션 -->
    <div class="pagination" v-if="totalPages > 0">
      <button @click="goPage(1)" :disabled="currentPage === 1">«</button>
      <button @click="goPage(currentPage - 1)" :disabled="currentPage === 1">
        ‹
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
        ›
      </button>
      <button
        @click="goPage(totalPages)"
        :disabled="currentPage === totalPages"
      >
        »
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';

const router = useRouter();
const message = UseMessageStore();

// ---- 검색 ----
const searchText = ref('');

// ---- 정렬 ----
const sortField = ref('');
const sortOrder = ref('');

const toggleSort = (field) => {
  if (sortField.value === field) {
    if (sortOrder.value === 'asc') sortOrder.value = 'desc';
    else if (sortOrder.value === 'desc') {
      sortField.value = '';
      sortOrder.value = '';
    } else sortOrder.value = 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
  fetchList();
};
const getSortIcon = (field) => {
  if (sortField.value !== field) return '⇅';
  return sortOrder.value === 'asc' ? '↑' : '↓';
};

// ---- 데이터 ----
const popupList = ref([]);
const total = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// 브라우저 높이 기반 동적 행 수
const calculatePageSize = () => {
  const headerH = 60;
  const searchH = 140;
  const paginationH = 60;
  const theadH = 44;
  const rowH = 52;
  const available =
    window.innerHeight - headerH - searchH - paginationH - theadH - 40;
  pageSize.value = Math.max(5, Math.floor(available / rowH));
};

const fetchList = async () => {
  try {
    const params = { page: currentPage.value, limit: pageSize.value };
    if (searchText.value.trim()) params.search = searchText.value.trim();
    if (sortField.value) {
      params.sortField = sortField.value;
      params.sortOrder = sortOrder.value;
    }

    const res = await adminAPI.getPopups(params);
    popupList.value = res.data.data;
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

// ---- 페이지네이션 ----
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
const displayPeriod = (item) => {
  if (item.is_always) return '상시';
  if (!item.display_start) return '-';
  const s = formatShortDate(item.display_start);
  const e = formatShortDate(item.display_end);
  return `${s} ~\n${e}`;
};

const activeLabel = (status) => {
  if (status === 'active') return 'O';
  if (status === 'deleted') return '삭제됨';
  return '';
};

const formatDateTime = (dt) => {
  if (!dt) return '-';
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${y}.${m}.${day}\n${h}:${min}:${sec}`;
};

const formatShortDate = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
};

// ---- 이동 ----
const goToCreate = () => router.push('/admin/popups/write');
const goToEdit = (item) => router.push(`/admin/popups/${item.id}`);

// ---- 삭제 ----
const handleDelete = (item) => {
  if (item.status === 'deleted') return;
  message.showConfirm(
    `선택하신 팝업을 정말 삭제하시겠습니까?\n\n대상 : ${item.title}`,
    async () => {
      try {
        await adminAPI.deletePopup(item.id);
        message.showAlert('삭제되었습니다.');
        fetchList();
      } catch (e) {
        message.showAlert('삭제에 실패했습니다.');
      }
    },
  );
};

// ---- 초기화 ----
onMounted(() => {
  calculatePageSize();
  window.addEventListener('resize', onResize);
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
  padding: 32px 42px;
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

// 검색
.search-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;

  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: $radius-sm;
    background: $bg-op;
    border: 1px solid;
    border-image-source: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.09) 0%,
      rgba(255, 255, 255, 0.06) 100%
    );

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
      border-image-source: none;
      border-color: $main-color;
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

// 생성 버튼
.action-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.btn-create {
  padding: 8px 28px;
  background: $main-color;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
  &:hover {
    background: $sub-color;
  }
}

// 총 건수
.count-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.total-count {
  @include font-14-regular;
  color: $dark-text;
}

// 테이블
.table-area {
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
      white-space: pre-line;
    }

    thead tr {
      background: $main-gad;
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

    tbody tr:nth-child(odd) {
      background: $bg-op;
    }

    .data-row {
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .row-deleted {
      opacity: 0.5;
    }

    .td-title {
      text-align: left;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .active-badge.active-active {
      color: $main-color;
    }
    .active-badge.active-deleted {
      color: #e57373;
    }

    .td-edit,
    .td-delete {
      cursor: pointer;
    }
    .btn-edit-icon,
    .btn-delete-icon {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      opacity: 0.7;
      &:hover {
        opacity: 1;
      }
    }

    .empty-row {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }

  // 컬럼 너비
  .col-no {
    width: 50px;
  }
  .col-draft {
    width: 70px;
  }
  .col-title {
    width: auto;
  }
  .col-period {
    width: 120px;
  }
  .col-author {
    width: 80px;
  }
  .col-published {
    width: 110px;
  }
  .col-updated {
    width: 110px;
  }
  .col-active {
    width: 110px;
  }
  .col-edit {
    width: 50px;
  }
  .col-delete {
    width: 50px;
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
