<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack">←</button>
        <h2 class="page-title">{{ termName }}</h2>
      </div>
      <div class="breadcrumb">이용약관 &gt; 목록 &gt; 이전약관</div>
    </div>

    <!-- 이력 테이블 -->
    <div class="content_list">
      <table>
        <colgroup>
          <col style="width: 60px" />
          <col style="width: auto" />
          <col style="width: 200px" />
          <col style="width: 100px" />
        </colgroup>
        <thead>
          <tr>
            <th>No</th>
            <th>파일명</th>
            <th>날짜</th>
            <th>공개/비공개</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in historyList"
            :key="item.id"
            :class="{ 'is-hidden': !item.is_public }"
          >
            <td>{{ index + 1 }}</td>
            <td>
              <a class="file-link" :href="getFileUrl(item.id)" target="_blank">
                {{ item.file_name }}
              </a>
            </td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td>
              <button
                :class="['btn-toggle', { active: item.is_public }]"
                @click="handleToggle(item)"
              >
                {{ item.is_public ? '공개' : '비공개' }}
              </button>
            </td>
          </tr>
          <tr v-if="historyList.length === 0">
            <td colspan="4" class="empty-message">등록된 이전약관이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { termsAPI } from '@/api/terms'

const route = useRoute()
const router = useRouter()

const termName = ref('')
const historyList = ref([])
const termType = route.params.type

// 이력 조회
const fetchHistory = async () => {
  try {
    const res = await termsAPI.getHistory(termType)
    termName.value = res.data.data.name
    historyList.value = res.data.data.history
  } catch (e) {
    console.error('이력 조회 실패:', e)
  }
}

// PDF URL
const getFileUrl = (id) => termsAPI.getFileUrl(id)

// 토글
const handleToggle = async (item) => {
  try {
    const res = await termsAPI.togglePublic(item.id)
    item.is_public = res.data.data.is_public
  } catch (e) {
    console.error('토글 실패:', e)
  }
}

// 뒤로가기
const goBack = () => {
  router.push('/admin/terms')
}

// 날짜 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${min}:${sec}`
}

onMounted(() => {
  fetchHistory()
})
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

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    @include font-20-bold;
  }

  .breadcrumb {
    @include font-12-regular;
    color: $dark-text;
  }
}

.btn-back {
  background: none;
  border: none;
  color: $white;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    opacity: 0.7;
  }
}

// 테이블
.content_list {
  table {
    width: 100%;
    border-collapse: collapse;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
    overflow: hidden;

    th, td {
      text-align: center;
      padding: 12px 8px;
      @include font-12-regular;
    }

    thead tr {
      background: $main-gad;
    }

    th {
      @include font-14-bold;
    }

    tbody tr:nth-child(odd) {
      background: $bg-op;
    }

    // 비공개 행 스타일
    tbody tr.is-hidden td {
      color: $dark-text;
    }

    .empty-message {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }
}

.file-link {
  color: $main-color;
  text-decoration: underline;
  cursor: pointer;
  @include font-12-regular;

  &:hover {
    color: $sub-color;
  }
}

.btn-toggle {
  padding: 6px 16px;
  background: $dark-input;
  color: $dark-text;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  @include font-12-medium;
  cursor: pointer;

  &.active {
    background: $main-color;
    color: $white;
    border-color: $main-color;
  }

  &:hover {
    opacity: 0.8;
  }
}
</style>
