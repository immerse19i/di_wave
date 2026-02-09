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
        <tr v-for="item in paginatedList" :key="item.id">
          <td class="col-title">{{ item.title }}</td>
          <td class="col-date">{{ item.date }}</td>
<td class="col-file">
  <span v-if="item.attachment" class="attach-icon">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_587_26557)">
<path d="M10.8527 18.9047C9.39235 20.365 7.02464 20.365 5.56427 18.9047C4.1039 17.4443 4.1039 15.0766 5.56427 13.6162" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.4917 13.6896L14.4521 4.72915C15.4243 3.75695 17.0007 3.75695 17.9729 4.72915C18.945 5.70135 18.945 7.27768 17.9729 8.24988L11.8173 14.4054" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10.8352 18.9334L19.531 10.2375" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.8441 14.3778C11.335 14.8869 10.5096 14.8869 10.0005 14.3778C9.49137 13.8687 9.49137 13.0432 10.0005 12.5342L13.6284 8.90625" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_587_26557">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>

    <!-- <img src="/assets/icons/attachment.svg" alt="attachment_icon"> -->
  </span>
</td>
        </tr>
      </tbody>
    </table>

    <!-- 페이지네이션 -->
    <div class="pagination">
      <button @click="goPage(currentPage - 1)" :disabled="currentPage === 1">&lt;</button>
      <button
        v-for="page in totalPages"
        :key="page"
        :class="{ active: page === currentPage }"
        @click="goPage(page)"
      >
        {{ page }}
      </button>
      <button @click="goPage(currentPage + 1)" :disabled="currentPage === totalPages">&gt;</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { noticeList } from '@/mock';

const currentPage = ref(1);
const perPage = 15;

const totalPages = computed(() => Math.ceil(noticeList.length / perPage));

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return noticeList.slice(start, start + perPage);
});

const goPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
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
      
      &:nth-child(odd){
        background:$bg-op;
      }

      &:nth-child(-n+4) td.col-title {
        @include font-14-bold;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
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
      width:auto;
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
}
</style>
