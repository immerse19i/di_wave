<template>
  <div class="content">
    <!-- 상단: 신규분석 + 검색 -->
    <div class="content_top">
      <button @click="modal.open('new_analysis', 'page')">신규분석</button>
      <div class="search_bar">
        <span class="search_icon">
          <img src="/assets/icons/search.svg" alt="search_icon" />
        </span>
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="환자명 또는 환자ID를 입력해 주세요"
          @keyup.enter="handleSearch"
        />
      </div>
      <button @click="handleSearch">검색</button>
    </div>

    <!-- 테이블 -->
    <div class="content_list">
      <table>
        <colgroup>
          <col style="width: auto" />
          <col style="width: 220px" />
          <col style="width: 112px" />
          <col style="width: 60px" />
          <col style="width: 112px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 60px" />
        </colgroup>
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('patient_code')">
              환자ID
              <span class="sort-icon">{{ getSortIcon('patient_code') }}</span>
            </th>
            <th class="sortable" @click="toggleSort('patient_name')">
              환자명
              <span class="sort-icon">{{ getSortIcon('patient_name') }}</span>
            </th>
            <th>생년월일</th>
            <th>성별</th>
            <th class="sortable" @click="toggleSort('created_at')">
              분석일
              <span class="sort-icon">{{ getSortIcon('created_at') }}</span>
            </th>
            <th>나이</th>
            <th>뼈나이</th>
            <th>예측키</th>
            <th>몸무게</th>
            <th>담당주치의</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in analysisList"
            :key="item.id"
            @click="goToDetail(item.id)"
            class="clickable-row"
          >
            <td>{{ item.patient_code }}</td>
            <td>{{ item.patient_name }}</td>
            <td>{{ formatDate(item.birth_date) }}</td>
            <td>{{ item.gender === 'M' ? 'M' : 'F' }}</td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td>{{ formatAge(item.chronological_age_years, item.chronological_age_months) }}</td>
            <td>{{ formatAge(item.bone_age_years, item.bone_age_months) }}</td>
            <td>{{ item.height ? item.height + 'cm' : '-' }}</td>
            <td>{{ item.weight ? item.weight + 'kg' : '-' }}</td>
            <td>{{ item.physician || '-' }}</td>
            <td>
              <a
                v-if="item.status === 'completed'"
                @click.stop="goToReport(item.id)"
                class="btn-report"
              >
                <img src="/assets/icons/pdf_down.svg" alt="download_icon" />
              </a>
            </td>
          </tr>
          <!-- 검색결과 없음 -->
          <tr v-if="analysisList.length === 0">
            <td colspan="11" class="empty-message">검색 결과가 없습니다</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 페이지네이션 -->
    <div class="pagination" v-if="pagination.totalPages > 1">
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
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModalStore } from '@/store/modal';
import { analysisAPI } from '@/api/analysis';

const router = useRouter();
const modal = useModalStore();

// 상태
const analysisList = ref([]);
const searchKeyword = ref('');
const currentSearch = ref('');
const sortField = ref('');
const sortOrder = ref('');
const sortClickCount = ref({});
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });

// 페이지네이션 표시 페이지 계산
const visiblePages = computed(() => {
  const total = pagination.value.totalPages;
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

// API 호출
const fetchList = async () => {
  try {
    const res = await analysisAPI.getList({
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: currentSearch.value,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
    });
    analysisList.value = res.data.data;
    pagination.value = { ...pagination.value, ...res.data.pagination };
  } catch (error) {
    console.error('목록 조회 오류:', error);
  }
};

// 검색
const handleSearch = () => {
  currentSearch.value = searchKeyword.value;
  pagination.value.page = 1;
  fetchList();
};

// 정렬 (3단계 순환)
const toggleSort = (field) => {
  const count = (sortClickCount.value[field] || 0) + 1;

  // 다른 필드 클릭 시 초기화
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
    fetchList();
    return;
  }

  sortClickCount.value[field] = count;
  fetchList();
};

const getSortIcon = (field) => {
  if (sortField.value !== field) return '↕';
  return sortOrder.value === 'ASC' ? '↑' : '↓';
};

// 페이지 이동
const goToPage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  fetchList();
};

const goToDetail = (id) => {
  router.push(`/main/analysis/${id}`);
};

const goToReport = (id) => {
  router.push(`/main/analysis/${id}/report`);
};

// 포맷 헬퍼
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatAge = (years, months) => {
  if (years == null && months == null) return '-';
  return `${years || 0}Y${months || 0}M`;
};

onMounted(() => {
  fetchList();
});
</script>
<style lang="scss" scoped>
.content {
  padding: 42px;
  color: $white;

  .content_list {
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
        background: $main-gad;
        padding: 0 11.5px;
      }

      th {
        @include font-14-bold;
      }

      // 정렬 가능 헤더
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

      // 행 hover
      tbody tr.clickable-row {
        cursor: pointer;
        &:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }
      }

      // 검색결과 없음
      .empty-message {
        padding: 60px 0;
        color: $dark-text;
        @include font-14-regular;
      }

      .btn-report {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity $transition-fast;

        &:hover {
          opacity: 1;
        }
      }
    }
  }

  .content_top {
    display: flex;
    gap: $spacing-xl;
    margin-bottom: 24px;
    button {
      color: $white;
      background: $main-gad;
      min-width: 136px;
      padding: 7.5px;
      border-radius: $radius-sm;
    }
    .search_bar {
      flex: 1;
      display: flex;
      padding: 4px 12px;
      position: relative;
      border-radius: $radius-sm;
      background: $bg-op;
      border: 1px solid;

      border-image-source: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.09) 0%,
        rgba(255, 255, 255, 0.06) 100%
      );

      input {
        width: 100%;
        background: none;
        border: none;
        color: $white;
      }
      &:has(input:focus) {
        border-image-source: none;
        border-color: $main-color;
      }
      .search_icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }
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
        background: $main-gad;
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
}
</style>
