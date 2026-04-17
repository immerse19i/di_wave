<template>
  <div class="page-wrap">
    <!-- 1. 페이지 타이틀 -->
    <div class="page-title-row">
      <h2 class="page-title">이용약관</h2>
    </div>

    <!-- 2. 브레드크럼 (우측 정렬) -->
    <div class="breadcrumb-row">
      <div class="breadcrumb">이용약관 &gt; 목록 &gt; 이전약관</div>
    </div>

    <!-- 3. 뒤로가기 -->
    <div class="back-row">
      <button class="btn-back" @click="goBack">
        <span class="arrow">&lt;</span> 뒤로가기
      </button>
    </div>

    <!-- 4. 선택된 약관 명칭 -->
    <div class="term-name">{{ termName }}</div>

    <!-- 이력 테이블 -->
    <div class="content_list">
      <table>
        <colgroup>
          <col style="width: auto" />
          <col style="width: 200px" />
          <col style="width: 120px" />
        </colgroup>
        <thead>
          <tr>
            <th>파일명</th>
            <th>날짜</th>
            <th>공개/비공개</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in historyList"
            :key="item.id"
            :class="{ 'is-hidden': !item.is_public }"
          >
            <td>
              <a class="file-link" :href="getFileUrl(item.id)" target="_blank">
                {{ item.file_name }}
              </a>
            </td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td>
              <div
                :class="['toggle-switch', { active: item.is_public }]"
                @click="handleToggle(item)"
              >
                <span class="toggle-label">{{
                  item.is_public ? '공개' : '비공개'
                }}</span>
                <span class="toggle-circle"></span>
              </div>
            </td>
          </tr>
          <tr v-if="historyList.length === 0">
            <td colspan="3" class="empty-message">
              등록된 이전약관이 없습니다.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { termsAPI } from '@/api/terms';

const route = useRoute();
const router = useRouter();

const termName = ref('');
const historyList = ref([]);
const termType = route.params.type;

// 이력 조회
const fetchHistory = async () => {
  try {
    const res = await termsAPI.getHistory(termType);
    termName.value = res.data.data.name;
    historyList.value = res.data.data.history;
  } catch (e) {
    console.error('이력 조회 실패:', e);
  }
};

// PDF URL
const getFileUrl = (id) => termsAPI.getFileUrl(id);

// 토글
const handleToggle = async (item) => {
  try {
    const res = await termsAPI.togglePublic(item.id);
    item.is_public = res.data.data.is_public;
  } catch (e) {
    console.error('토글 실패:', e);
  }
};

// 뒤로가기
const goBack = () => {
  router.push('/admin/terms');
};

// 날짜 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${min}:${sec}`;
};

onMounted(() => {
  fetchHistory();
});
</script>

<style lang="scss" scoped>
.page-wrap {
  padding: 32px 42px;
  color: $white;
}

.page-title-row {
  margin-bottom: 8px;
  .page-title {
    @include font-20-bold;
  }
}

.breadcrumb-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  .breadcrumb {
    @include font-16-regular;
    color: #ffffffb2;
  }
}

// 뒤로가기
.back-row {
  margin-bottom: 12px;
  .btn-back {
    background: none;
    border: none;
    color: $dark-text;
    @include font-14-regular;
    cursor: pointer;
    .arrow {
      margin-right: 4px;
    }
    &:hover {
      color: $white;
    }
  }
}

// 선택된 약관 명
.term-name {
  @include font-16-bold;
  color: $white;
  margin-bottom: 16px;
}

// 테이블 박스
.content_list {
  padding: 12px 16px;
  background: $table-bg;
  border-radius: 12px;

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
      color: $white;
    }

    thead tr {
      background: $bg-op;
    }

    th {
      @include font-14-bold;
      color: $gray;
    }

    // 비공개 행: 글씨 색 다르게
    tbody tr.is-hidden td,
    tbody tr.is-hidden .file-link {
      color: $dark-text;
    }

    .empty-message {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }
}

// 파일명 링크
.file-link {
  color: $white;
  text-decoration: underline;
  cursor: pointer;
  @include font-12-regular;

  &:hover {
    opacity: 0.8;
  }
}

// 토글 스위치 (AdminTerms와 동일)
.toggle-switch {
  display: inline-flex;
  align-items: center;
  width: 68px;
  height: 24px;
  border-radius: 12px;
  background: #a0a0a0;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;

  .toggle-label {
    font-family: $font-family;
    font-size: 10px;
    font-weight: $font-weight-medium;
    line-height: 100%;
    color: $white;
    position: absolute;
    right: 10px;
  }

  .toggle-circle {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $white;
    position: absolute;
    left: 4px;
    transition: left 0.2s;
  }

  &.active {
    background: $main-color;

    .toggle-label {
      left: 10px;
      right: auto;
    }

    .toggle-circle {
      left: calc(100% - 20px);
    }
  }
}
</style>
