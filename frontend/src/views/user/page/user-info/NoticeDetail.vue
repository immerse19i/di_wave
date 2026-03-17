<template>
  <div class="notice-detail" v-if="notice">
    <!-- 상단: 제목 + 날짜 -->
    <div class="detail-header">
      <span class="detail-title">{{ notice.title }}</span>
      <span class="detail-date">{{ formatDate(notice.published_at) }}</span>
    </div>

    <!-- 본문 -->
    <div class="detail-content" v-html="notice.content"></div>

    <!-- 첨부파일 -->
    <div
      class="detail-attachments"
      v-if="notice.attachments && notice.attachments.length > 0"
    >
      <div
        class="attachment-item"
        v-for="file in notice.attachments"
        :key="file.id"
        @click="downloadFile(file)"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_att)">
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
            <clipPath id="clip0_att">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
        <span class="file-name">{{ file.file_name }}</span>
      </div>
    </div>

    <!-- 목록으로 버튼 -->
    <div class="detail-footer">
      <button class="list-btn" @click="goList">목록으로</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { adminAPI } from '@/api/admin';

const router = useRouter();
const route = useRoute();
const notice = ref(null);

const fetchDetail = async () => {
  try {
    const res = await adminAPI.getPublicNoticeDetail(route.params.id);
    notice.value = res.data.data;
  } catch (error) {
    console.error('공지사항 상세 조회 실패:', error);
    router.push('/user-info/notice');
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
};

const getFileUrl = (path) => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return `${apiUrl}/${path}`;
};

const downloadFile = (file) => {
  const a = document.createElement('a');
  a.href = getFileUrl(file.file_path);
  a.download = file.file_name;
  a.click();
};

const goList = () => {
  router.push('/user-info/notice');
};

onMounted(() => {
  fetchDetail();
});
</script>

<style scoped lang="scss">
.notice-detail {
  //   padding: 24px;
  color: $white;
  background: $bg-op;
  border-radius: $radius-xxl;
  .detail-header {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    align-items: start;
    gap: 8px;
    // background: $main-color;
    padding: 16px 24px 20px;
    // border-radius:
    position: relative;
    .detail-title {
      @include font-20-bold;
      padding: 8px 0;
    }

    .detail-date {
      @include font-14-regular;
      opacity: 0.8;
    }
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      height: 1px;
      width: 100%;
      left: 0;
      background: $stroke-grad;
    }
  }

  .detail-content {
    padding: 24px;
    // margin-top: 12px;
    // background: $bg-op;
    border-radius: $radius-md;
    min-height: 300px;
    @include font-14-regular;
    line-height: 1.8;

    :deep(img) {
      max-width: 100%;
      height: auto;
    }
  }

  .detail-attachments {
    margin-top: 12px;

    .attachment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: $bg-op;
      border-radius: $radius-sm;
      cursor: pointer;
      margin-bottom: 8px;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .file-name {
        @include font-14-regular;
        text-decoration: underline;
      }
    }
  }

  .detail-footer {
    display: flex;
    justify-content: center;
    margin-top: 24px;

    .list-btn {
      @include font-14-medium;
      color: $white;
      background: $main-gad;
      padding: 12px 48px;
      border-radius: $radius-sm;
      cursor: pointer;
    }
  }
}
</style>
