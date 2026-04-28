<template>
  <div class="notice">
    <table>
      <thead>
        <tr>
          <th class="col-title">제목</th>
          <th class="col-date">등록일</th>
          <th class="col-file">첨부파일</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in noticeList"
          :key="item.id"
          @click="goDetail(item.id)"
        >
          <td class="col-title" :class="{ pinned: item.is_pinned }">
            {{ item.title }}
          </td>
          <td class="col-date">{{ formatDate(item.published_at) }}</td>
          <td class="col-file">
            <span v-if="item.has_attachment" class="attach-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clip-path="url(#clip0_587_26557)">
                  <path
                    d="M10.8527 18.9047C9.39235 20.365 7.02464 20.365 5.56427 18.9047C4.1039 17.4443 4.1039 15.0766 5.56427 13.6162"
                    stroke="white"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M5.4917 13.6896L14.4521 4.72915C15.4243 3.75695 17.0007 3.75695 17.9729 4.72915C18.945 5.70135 18.945 7.27768 17.9729 8.24988L11.8173 14.4054"
                    stroke="white"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M10.8352 18.9334L19.531 10.2375"
                    stroke="white"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M11.8441 14.3778C11.335 14.8869 10.5096 14.8869 10.0005 14.3778C9.49137 13.8687 9.49137 13.0432 10.0005 12.5342L13.6284 8.90625"
                    stroke="white"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_587_26557">
                    <rect width="24" height="24" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 페이지네이션 -->
    <div class="pagination">
      <button
        class="page-btn arrow"
        :disabled="currentPage <= 1"
        @click="goPage(1)"
      >
        <img src="/assets/icons/arrow_first.svg" alt="first" />
      </button>
      <button
        class="page-btn arrow"
        :disabled="currentPage <= 1"
        @click="goPage(currentPage - 1)"
      >
        <img src="/assets/icons/arrow_prev.svg" alt="prev" />
      </button>
      <button
        v-for="page in visiblePages"
        :key="page"
        :class="['page-btn', { active: page === currentPage }]"
        @click="goPage(page)"
      >
        {{ page }}
      </button>
      <button
        class="page-btn arrow"
        :disabled="currentPage >= totalPages"
        @click="goPage(currentPage + 1)"
      >
        <img src="/assets/icons/arrow_next.svg" alt="next" />
      </button>
      <button
        class="page-btn arrow"
        :disabled="currentPage >= totalPages"
        @click="goPage(totalPages)"
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

const noticeList = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages = [];
  let start = Math.max(1, current - 4);
  let end = Math.min(total, start + 9);
  start = Math.max(1, end - 9);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const fetchNotices = async () => {
  try {
    const res = await adminAPI.getPublicNotices({
      page: currentPage.value,
      limit: 15,
    });
    noticeList.value = res.data.data;
    totalPages.value = res.data.totalPages;
    currentPage.value = res.data.currentPage;
  } catch (error) {
    console.error('공지사항 조회 실패:', error);
  }
};

const goPage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchNotices();
};

const goDetail = (id) => {
  router.push(`/user-info/notice/${id}`);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
};

onMounted(() => {
  fetchNotices();
});
</script>

<style scoped lang="scss">
.notice {
  padding: 24px;
  color: $white;

  table {
    width: 100%;
    border-collapse: collapse;

    thead tr {
      background: $main-color;

      th {
        @include font-14-bold;
        padding: 12px 16px;
        text-align: center;
      }
    }

    tbody tr {
      // border-bottom: 1px solid $dark-gray-dark;

      &:nth-child(odd) {
        background: $bg-op;
      }

      td.col-title.pinned {
        @include font-14-bold;
      }

      &:hover {
        background: $sub-color;
        cursor: pointer;
      }

      td {
        @include font-12-regular;
        padding: 12px 16px;
        text-align: center;
      }
    }

    .col-title {
      text-align: center;
      width: auto;
    }

    .col-date {
      width: 108px;
    }

    .col-file {
      width: 108px;
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 24px;

    .page-btn {
      min-width: 28px;
      height: 28px;
      padding: 0;
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
          width: 28px;
          height: 28px;
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
}
</style>
