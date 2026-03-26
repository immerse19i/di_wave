<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">공지사항</h2>
      <div class="breadcrumb">승인관리 &gt; 목록</div>
    </div>

    <!-- 필터 영역 -->
    <div class="filter-area">
      <!-- ① 상태 멀티셀렉트 -->
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">상태</span>
          <div class="multi-select-btns">
            <button
              :class="['filter-btn', { active: isAllStatusSelected }]"
              @click="toggleAllStatus"
            >
              전체
            </button>
            <button
              v-for="s in statusOptions"
              :key="s.value"
              :class="['filter-btn', { active: statusFilter[s.value] }]"
              @click="toggleStatus(s.value)"
            >
              <span v-if="statusFilter[s.value]" class="check-icon">✓</span>
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- ② 등록일 필터 -->
        <div class="filter-group date-filter">
          <label class="radio-label">
            <input type="radio" v-model="dateMode" value="none" />
            <span class="radio-custom"></span>
            기간선택안함
          </label>
          <label class="radio-label">
            <input type="radio" v-model="dateMode" value="date" />
            <span class="radio-custom"></span>
            등록일
          </label>
          <input
            type="date"
            v-model="startDate"
            :disabled="dateMode !== 'date'"
            class="date-input"
          />
          <span class="date-separator">~</span>
          <input
            type="date"
            v-model="endDate"
            :disabled="dateMode !== 'date'"
            class="date-input"
          />
        </div>
      </div>

      <!-- ③ 검색 + 검색 버튼 -->
      <div class="search-row">
        <div class="search-box">
          <input
            v-model="searchText"
            type="text"
            placeholder="제목 검색"
            class="search-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button class="btn-search" @click="handleSearch">검색</button>
      </div>
    </div>

    <!-- ④ 작성 버튼 + 총 건수 -->
    <div class="toolbar">
      <span class="total-count">총 {{ total }}건</span>
      <button class="btn-write" @click="goToWrite">작성</button>
    </div>

    <!-- ⑤⑥ 테이블 -->
    <div class="table-area">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-draft">임시저장</th>
            <th class="col-title sortable" @click="toggleSort('title')">
              제목
              <span class="sort-icon">{{ getSortIcon('title') }}</span>
            </th>
            <th class="col-attach">첨부</th>
            <th class="col-pinned sortable" @click="toggleSort('is_pinned')">
              상단고정여부
              <span class="sort-icon">{{ getSortIcon('is_pinned') }}</span>
            </th>
            <th class="col-status sortable" @click="toggleSort('status')">
              상태
              <span class="sort-icon">{{ getSortIcon('status') }}</span>
            </th>
            <th class="col-date sortable" @click="toggleSort('created_at')">
              작성일
              <span class="sort-icon">{{ getSortIcon('created_at') }}</span>
            </th>
            <th class="col-author sortable" @click="toggleSort('author_name')">
              작성자
              <span class="sort-icon">{{ getSortIcon('author_name') }}</span>
            </th>
            <th class="col-delete">삭제</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in noticeList"
            :key="item.id"
            class="data-row"
            :class="{ 'row-deleted': item.status === 'deleted' }"
            @click="goToDetail(item)"
          >
            <td>{{ item.id }}</td>
            <td>{{ item.status === 'draft' ? 'O' : '' }}</td>
            <td class="td-title">{{ item.title }}</td>
            <td>
              <img v-if="item.has_attachment" src="/assets/icons/attach_icon.svg" alt="첨부" class="attach-icon" />
            </td>
            <td>{{ getPinnedDisplay(item) }}</td>
            <td>
              <span :class="['status-badge', `status-${item.status}`]">
                {{ statusLabel(item.status) }}
              </span>
            </td>
            <td class="td-date">{{ formatDate(item.created_at) }}</td>
            <td>{{ item.author_name }}</td>
            <td class="td-delete" @click.stop="handleDelete(item)">
              <button class="btn-delete-icon">
                <img src="/assets/icons/trash_icon.svg" alt="삭제 아이콘" />
              </button>
            </td>
          </tr>
          <tr v-if="noticeList.length === 0">
            <td colspan="9" class="empty-row">조회 결과가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ⑧ 페이지네이션 -->
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

// ---- 상태 필터 ----
const statusOptions = [
  { label: '공개', value: 'published' },
  { label: '비공개', value: 'private' },
  { label: '삭제됨', value: 'deleted' },
  { label: '임시저장', value: 'draft' },
];
const statusFilter = ref({
  published: true,
  private: true,
  deleted: true,
  draft: true,
});
const isAllStatusSelected = computed(() =>
  Object.values(statusFilter.value).every((v) => v),
);
const toggleAllStatus = () => {
  const newVal = !isAllStatusSelected.value;
  Object.keys(statusFilter.value).forEach(
    (k) => (statusFilter.value[k] = newVal),
  );
  currentPage.value = 1;
  fetchList();
};
const toggleStatus = (key) => {
  statusFilter.value[key] = !statusFilter.value[key];
  currentPage.value = 1;
  fetchList();
};

// ---- 날짜 필터 ----
const dateMode = ref('none');
const startDate = ref('');
const endDate = ref('');

// 등록일 선택 시 기본값 세팅
import { watch } from 'vue';
watch(dateMode, (val) => {
  if (val === 'date' && !startDate.value) {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    endDate.value = today.toISOString().slice(0, 10);
    startDate.value = weekAgo.toISOString().slice(0, 10);
  }
});

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
const noticeList = ref([]);
const total = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// 브라우저 높이 기반 동적 행 수
const calculatePageSize = () => {
  const headerH = 60; // 관리자 헤더
  const filterH = 180; // 필터+검색+툴바
  const paginationH = 60;
  const theadH = 44;
  const rowH = 52;
  const available =
    window.innerHeight - headerH - filterH - paginationH - theadH - 40;
  pageSize.value = Math.max(5, Math.floor(available / rowH));
};

const fetchList = async () => {
  try {
    // 상태 파라미터
    const selectedStatuses = Object.entries(statusFilter.value)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const params = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    if (selectedStatuses.length > 0 && selectedStatuses.length < 4) {
      params.status = selectedStatuses.join(',');
    }
    if (dateMode.value === 'date') {
      if (startDate.value) params.startDate = startDate.value;
      if (endDate.value) params.endDate = endDate.value;
    }
    if (searchText.value.trim()) {
      params.search = searchText.value.trim();
    }
    if (sortField.value) {
      params.sortField = sortField.value;
      params.sortOrder = sortOrder.value;
    }

    const res = await adminAPI.getNotices(params);
    noticeList.value = res.data.data;
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
const statusLabel = (s) => {
  const map = {
    published: '공개',
    private: '비공개',
    deleted: '삭제됨',
    draft: '임시저장',
  };
  return map[s] || s;
};
const getPinnedDisplay = (item) => {
  // 상단고정 + 공개 상태일 때만 O 표시
  return item.is_pinned && item.status === 'published' ? 'O' : '';
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
const goToWrite = () => {
  router.push('/admin/notices/write');
};
const goToDetail = (item) => {
  // 삭제된 글은 조회모드, 나머지는 수정모드
  router.push(`/admin/notices/${item.id}`);
};

// ⑦ 삭제
const handleDelete = (item) => {
  if (item.status === 'deleted') {
    return message.showAlert('이미 삭제된 게시물입니다.');
  }
  message.showConfirm('해당 공지사항을 삭제하시겠습니까?', async () => {
    try {
      await adminAPI.deleteNotice(item.id);
      message.showAlert('삭제되었습니다.');
      fetchList();
    } catch (e) {
      message.showAlert('삭제에 실패했습니다.');
    }
  });
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

// 필터 영역
.filter-area {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  margin-bottom: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  @include font-14-medium;
  margin-right: 8px;
}

.multi-select-btns {
  display: flex;
  gap: 4px;

  .filter-btn {
    padding: 8px 0;
    border-radius: $radius-sm;
    text-align: center;
    border: 1px solid $dark-line-gray;
    background: none;
    color: $dark-text;
    min-width: 80px;
    @include font-14-medium;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;

    .check-icon {
      font-size: 12px;
    }

    &.active {
      background: $sub-color;
      border-color: $sub-color;
      color: $white;
    }
  }
}

// 라디오 버튼
.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  @include font-14-regular;

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

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
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

.date-separator {
  color: $dark-text;
}

// 검색
.search-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  justify-content: center;
  .search-box {
    flex: 1;
    display: flex;
    padding: 8px 16px;
    border-radius: $radius-sm;
    background: $bg-op;
    border: 1px solid $dark-line-gray;
    max-width: 618px;
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
    min-width: 100px;
    padding: 8px 16px;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
  }
}

// 툴바 (총 건수 + 작성 버튼)
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

.btn-write {
  padding: 8px 20px;
  background: $main-gad;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
}

// 테이블
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
      color: $dark-text;
    }

    thead tr {
      background: $bg-op;
    }
    th {
      @include font-14-bold;
      color: $gray;
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

    // tbody tr:nth-child(odd) {
    //   background: $bg-op;
    // }

    .data-row {
      cursor: pointer;
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .row-deleted {
      opacity: 0.5;
    }

    .td-title {
      text-align: left;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .td-date {
      white-space: pre-line;
    }

    .attach-icon {
      width: 24px;
      height: 24px;
      vertical-align: middle;
      display: block;
      margin: 0 auto;
    }

    // 상태 배지
    .status-badge {
      padding: 2px 8px;
      border-radius: $radius-sm;
      @include font-12-regular;
      color: $dark-text;
    }

    .td-delete {
      cursor: pointer;
    }
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
    width: 60px;
  }
  .col-draft {
    width: 80px;
  }
  .col-title {
    width: auto;
  }
  .col-attach {
    width: 50px;
  }
  .col-pinned {
    width: 110px;
  }
  .col-status {
    width: 80px;
  }
  .col-date {
    width: 110px;
  }
  .col-author {
    width: 100px;
  }
  .col-delete {
    width: 60px;
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
