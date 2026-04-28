<template>
  <div class="page-wrap">
    <h2 class="page-title">사용기록</h2>
    <div class="breadcrumb">사용기록 &gt; 목록 &gt; 상세보기</div>

    <button class="btn-back" @click="goBack">
      <img src="/assets/icons/arrow_back.svg" alt="back" />
      뒤로가기
    </button>

    <h3 class="section-title">기록 상세보기</h3>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">일시</span>
        <span class="info-value">{{ formatDate(log.created_at) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">작업유형</span>
        <span class="info-value">{{ displayCategory(log) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">카테고리</span>
        <span class="info-value">{{ categoryLabel(log.target_type) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">관리자</span>
        <span class="info-value">{{ log.operator }}</span>
      </div>
    </div>

    <h3 class="section-title">기록 상세</h3>
    <div class="detail-content">{{ log.details || '' }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminAPI } from '@/api/admin';

const route = useRoute();
const router = useRouter();
const log = ref({});

// 작업유형 치환
const displayCategory = (l) => {
  if (!l) return '';
  // 승인상태 변경 → '계정 승인' / '계정 반려'
  if (l.category === '승인상태 변경') {
    if (!l.details) return l.category;
    const firstLine = l.details.split('\n')[0];
    if (firstLine.includes('→') && firstLine.includes('[반려]'))
      return '계정 반려';
    if (l.details.includes('→ [승인]')) return '계정 승인';
    return l.category;
  }
  // 기존 '크레딧 수동 관리' 레코드 호환 → '정보수정 (계정 정보 및 관리)'
  if (l.category === '크레딧 수동 관리') return '정보수정 (계정 정보 및 관리)';
  return l.category || '';
};

const categoryLabel = (targetType) => {
  const map = {
    account: '가입계정목록',
    approval: '승인관리',
    notice: '공지사항',
    popup: '안내팝업',
    terms: '이용약관',
    inquiry: '고객문의관리',
    info: '정보수정',
    credit: '크레딧',
  };
  return map[targetType] || targetType;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${mi}:${ss}`;
};

const formatDetails = (details) => {
  if (!details) return '';
  return details.replace(/\n/g, '<br>');
};

const goBack = () => {
  router.push('/admin/logs');
};

onMounted(async () => {
  try {
    const res = await adminAPI.getLogDetail(route.params.id);
    log.value = res.data.data;
  } catch (err) {
    console.error('getLogDetail error:', err);
  }
});
</script>
<style lang="scss" scoped>
.page-wrap {
  padding: 32px 24px;
  color: $white;
}

.page-title {
  @include font-20-bold;
  margin-bottom: 8px;
}

.breadcrumb {
  @include font-16-regular;
  color: $dark-text;
  text-align: right;
  margin-bottom: 24px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  @include font-14-regular;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
  img {
    width: 12px;
    height: 12px;
  }

  &:hover {
    color: $white;
  }
}

.section-title {
  @include font-16-bold;
  margin-bottom: 16px;
}

// 기록 상세보기 카드 (pill 라벨)
.info-card {
  margin-bottom: 32px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-label {
  display: inline-flex;
  align-items: center;
  justify-content: left;
  min-width: 152px;
  min-height: 43px;
  padding: 12px 24px;
  background: $bg-op;
  border-radius: $radius-md;
  @include font-14-bold;
  white-space: nowrap;
}

.info-value {
  margin-left: 24px;
  @include font-14-regular;
}

// 기록 상세 내용
.detail-content {
  @include font-14-regular;
  line-height: 1.8;
  color: $white;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
