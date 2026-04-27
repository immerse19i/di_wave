<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">가입계정목록</h2>
      <div class="breadcrumb">승인관리 &gt; 목록</div>
    </div>

    <!-- 필터 영역 -->
    <div class="filter-area">
      <!-- 계정상태 (멀티셀렉트) -->
      <div class="filter-group">
        <span class="filter-label">계정상태</span>
        <div class="multi-select-btns">
          <button
            :class="['filter-btn', { active: isAllSelected }]"
            @click="toggleAll"
          >
            전체
          </button>
          <button
            :class="['filter-btn', { active: statusFilter.active }]"
            @click="toggleStatus('active')"
          >
            <span v-if="statusFilter.active" class="check-icon">✓</span>
            정상
          </button>
          <button
            :class="['filter-btn', { active: statusFilter.inactive }]"
            @click="toggleStatus('inactive')"
          >
            <span v-if="statusFilter.inactive" class="check-icon">✓</span>
            탈퇴
          </button>
        </div>
      </div>

      <!-- 가입일 필터 -->
      <div class="filter-group">
        <label class="radio-label">
          <input type="radio" v-model="dateMode" value="none" />
          <span class="radio-custom"></span>
          기간선택안함
        </label>
        <label class="radio-label">
          <input type="radio" v-model="dateMode" value="date" />
          <span class="radio-custom"></span>
          가입일
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

    <!-- 검색 영역 -->
    <div class="search-area">
      <div class="search_bar">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="병원명(2자이상) 또는 사업자번호(4자리이상)를 입력해 주세요"
          @keyup.enter="handleSearch"
        />
      </div>
      <button class="btn-search" @click="handleSearch">검색</button>
    </div>

    <!-- 테이블 -->
    <div class="content_list">
      <div class="table-top">
        <button class="btn-add" @click="openAddAccount">계정추가</button>
        <span class="total-count">총 {{ pagination.total }}건</span>
      </div>
      <table>
        <colgroup>
          <col style="width: 14%" />
          <col style="width: 14%" />
          <col style="width: 20%" />
          <col style="width: 14%" />
          <col style="width: 14%" />
          <col style="width: 8%" />
          <col style="width: 10%" />
        </colgroup>
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('login_id')">
              ID
              <SortIcon
                :direction="sortFieldVal === 'login_id' ? sortOrderVal : ''"
              />
            </th>
            <th class="sortable" @click="toggleSort('name')">
              병원명
              <SortIcon
                :direction="sortFieldVal === 'name' ? sortOrderVal : ''"
              />
            </th>
            <th class="sortable" @click="toggleSort('email')">
              이메일
              <SortIcon
                :direction="sortFieldVal === 'email' ? sortOrderVal : ''"
              />
            </th>
            <th class="sortable" @click="toggleSort('phone')">
              전화
              <SortIcon
                :direction="sortFieldVal === 'phone' ? sortOrderVal : ''"
              />
            </th>
            <th class="sortable" @click="toggleSort('created_at')">
              가입일
              <SortIcon
                :direction="sortFieldVal === 'created_at' ? sortOrderVal : ''"
              />
            </th>
            <th>상태</th>
            <th>상세보기</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in accountList"
            :key="item.id"
            class="clickable-row"
            @click="goToDetail(item.id)"
          >
            <td>{{ item.login_id }}</td>
            <td>{{ item.name }}</td>
            <td class="ellipsis">{{ item.email }}</td>
            <td>{{ item.phone || '-' }}</td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td>
              {{
                item.status === 'approved'
                  ? '정상'
                  : item.status === 'suspended'
                    ? '정지'
                    : '탈퇴'
              }}
            </td>
            <td>
              <button class="btn-detail" @click.stop="goToDetail(item.id)">
                상세보기
              </button>
            </td>
          </tr>
          <tr v-if="accountList.length === 0">
            <td colspan="7" class="empty-message">조회 결과가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 페이지네이션 -->
    <div class="pagination" v-if="pagination.totalPages > 1">
      <button
        class="page-btn arrow"
        :disabled="pagination.page <= 1"
        @click="goToPage(1)"
      >
        &laquo;
      </button>
      <button
        class="page-btn arrow"
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        &lt;
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
        &gt;
      </button>
      <button
        class="page-btn arrow"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.totalPages)"
      >
        &raquo;
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';
import DatePicker from '@/components/common/DatePicker.vue';
import SortIcon from '@/components/common/SortIcon.vue';

const router = useRouter();
const message = UseMessageStore();

// 계정상태 필터 (멀티셀렉트)
const statusFilter = ref({ active: true, inactive: true });
const isAllSelected = computed(
  () => statusFilter.value.active && statusFilter.value.inactive,
);

const toggleAll = () => {
  statusFilter.value.active = true;
  statusFilter.value.inactive = true;
  pagination.value.page = 1;
  fetchList();
};

const toggleStatus = (key) => {
  statusFilter.value[key] = !statusFilter.value[key];
  if (!statusFilter.value.active && !statusFilter.value.inactive) {
    toggleAll();
    return;
  }
  pagination.value.page = 1;
  fetchList();
};

// 가입일 필터
const dateMode = ref('none');
const today = new Date().toISOString().slice(0, 10);
const startDate = ref(today);
const endDate = ref(today);

// 검색/정렬/페이징
const searchKeyword = ref('');
const currentSearch = ref('');
const sortFieldVal = ref('');
const sortOrderVal = ref('');
const sortClickCount = ref({});
const accountList = ref([]);
const pagination = ref({ page: 1, limit: 12, total: 0, totalPages: 0 });

const visiblePages = computed(() => {
  const total = pagination.value.totalPages;
  const current = pagination.value.page;
  const pages = [];
  let start = Math.max(1, current - 4);
  let end = Math.min(total, start + 9);
  start = Math.max(1, end - 9);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

// API 호출
const fetchList = async () => {
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sortField: sortFieldVal.value,
      sortOrder: sortOrderVal.value,
    };

    // 계정상태
    if (isAllSelected.value) {
      params.accountStatus = 'all';
    } else {
      const selected = [];
      if (statusFilter.value.active) selected.push('active');
      if (statusFilter.value.inactive) selected.push('inactive');
      params.accountStatus = selected.join(',');
    }

    // 가입일
    if (dateMode.value === 'date') {
      if (startDate.value) params.startDate = startDate.value;
      if (endDate.value) params.endDate = endDate.value;
    }

    // 검색어
    if (currentSearch.value) params.search = currentSearch.value;

    const res = await adminAPI.getAccounts(params);
    accountList.value = res.data.data;
    pagination.value.total = res.data.total;
    pagination.value.totalPages = res.data.totalPages;
  } catch (e) {
    console.error('목록 조회 실패:', e);
  }
};

const handleSearch = () => {
  const keyword = searchKeyword.value.trim();
  if (keyword.length > 0) {
    const isNumber = /^\d+$/.test(keyword.replace(/-/g, ''));
    if (
      (isNumber && keyword.replace(/-/g, '').length < 4) ||
      (!isNumber && keyword.length < 2)
    ) {
      message.showAlert(
        '최소 입력 글자수를 확인해 주세요.\n(병원명 2자이상, 사업자번호 4자리이상)',
      );
      return;
    }
  }
  currentSearch.value = keyword;
  pagination.value.page = 1;
  fetchList();
};

const toggleSort = (field) => {
  if (sortFieldVal.value !== field) {
    sortFieldVal.value = field;
    sortOrderVal.value = field === 'created_at' ? 'DESC' : 'ASC';
  } else {
    sortOrderVal.value = sortOrderVal.value === 'ASC' ? 'DESC' : 'ASC';
  }
  fetchList();
};

const goToPage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  fetchList();
};

const goToDetail = (id) => {
  router.push(`/admin/accounts/${id}`);
};

const openAddAccount = () => {
  router.push('/admin/accounts/add');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

onMounted(() => fetchList());
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
.filter-area {
  display: flex;
  align-items: center;
  gap: 48px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-label {
  @include font-14-medium;
  margin-right: 8px;
}

.multi-select-btns {
  display: flex;
  gap: 4px;

  .filter-btn {
    padding: 8px 20px;
    min-width: 80px;
    border-radius: $radius-sm;
    border: 1px solid $dark-line-gray;
    background: none;
    color: $dark-text;
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
  gap: 12px;
  cursor: pointer;
  @include font-12-regular;
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

.filter-group :deep(.dp-input-wrap) {
  width: 126px;
}

.date-active :deep(.dp-input-wrap:focus-within) {
  border-color: $sub-color-2;
}

.date-separator {
  color: $dark-text;
}

// 검색
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
  padding: 12px 16px;
  background: $table-bg;
  border-radius: 12px;
  .table-top {
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }

  .btn-add {
    padding: 7px 20px;
    min-width: 100px;
    background: $main-gad;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
  }

  .total-count {
    @include font-14-bold;

    color: $dark-text;
  }

  table {
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
      height: 40px;
    }

    th.sortable {
      cursor: pointer;
      user-select: none;
      &:hover {
        opacity: 0.8;
      }
      .sort-icon {
        margin-left: 4px;
        width: 16px;
        height: 16px;
        display: inline-block;
        vertical-align: middle;
      }
    }

    tbody tr.clickable-row {
      cursor: pointer;
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .ellipsis {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-message {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }
}

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

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.08);
    }
    &.active {
      background: $main-color;
      color: $white;
      @include font-12-bold;
    }
    &.arrow {
      @include font-14-bold;
    }
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  }
}
</style>
