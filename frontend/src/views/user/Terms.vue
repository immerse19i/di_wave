<template>
  <div class="terms-page">
    <!-- 헤더 -->
    <header class="terms-header">
      <div class="header-left">
        <router-link to="/login" class="logo">
          <img src="/assets/logo/logo.svg" alt="OsteoAge" />
        </router-link>
        <span class="header-title">약관 및 정책</span>
      </div>
    </header>

    <div class="terms-body">
      <!-- 사이드바 -->
      <aside class="terms-sidebar">
        <div class="sidebar-title">이용약관</div>
        <ul class="terms-menu">
          <li
            v-for="term in termsList"
            :key="term.id"
            :class="{ active: selectedTerm === term.id }"
            @click="selectTerm(term.id)"
          >
            {{ term.name }}
          </li>
        </ul>
      </aside>

      <!-- 콘텐츠 -->
      <main class="terms-content">
        <!-- 이전기록 드롭다운 -->
        <div class="version-area">
          <div class="version-dropdown" @click="toggleVersionDropdown">
            <span>{{ selectedVersion.date }}</span>
            <img src="/assets/icons/arrow_down.svg" alt="arrow" class="arrow-icon" />
            <ul class="dropdown-list" v-if="isVersionOpen">
              <li
                v-for="ver in currentTermVersions"
                :key="ver.id"
                :class="{ active: selectedVersion.id === ver.id }"
                @click.stop="selectVersion(ver)"
              >
                {{ ver.date }}
              </li>
            </ul>
          </div>
        </div>

        <!-- PDF 뷰어 -->
        <div class="pdf-viewer">
          <iframe
            v-if="currentPdfUrl"
            :src="viewerUrl"
            frameborder="0"
          ></iframe>
          <div v-else class="pdf-empty">
            약관 파일이 등록되지 않았습니다.
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()


// 약관 목록 (추후 API 연동: GET /api/terms)
const termsList = ref([
  { id: 'privacy_collection', name: '서비스 이용을 위한\n개인정보 수집 및 이용 동의' },
  { id: 'privacy_processing', name: '개인정보 처리 위탁 동의' },
  { id: 'paid_service', name: '전자상거래관련약관' },
  { id: 'third_party', name: '전자상거래관련약관' },
  { id: 'refund_policy', name: '전자상거래관련약관' },
])

// 약관별 버전 목록 (추후 API 연동: GET /api/terms/:type/history)
const versionsMap = ref({
  privacy_collection: [
    { id: 1, date: '2026.01.07', file: '/assets/terms/privacy_collection.pdf' },
    { id: 2, date: '2025.06.01', file: '/assets/terms/privacy_collection_v1.pdf' },
  ],
  privacy_processing: [
    { id: 1, date: '2026.01.07', file: '/assets/terms/privacy_processing.pdf' },
  ],
  paid_service: [
    { id: 1, date: '2026.01.07', file: '/assets/terms/paid_service.pdf' },
  ],
  third_party: [
    { id: 1, date: '2026.01.07', file: '/assets/terms/third_party.pdf' },
  ],
  refund_policy: [
    { id: 1, date: '2026.01.07', file: '/assets/terms/refund_policy.pdf' },
  ],
})

const selectedTerm = ref('privacy_collection')
const selectedVersion = ref({ id: 1, date: '2026.01.07', file: '/assets/terms/privacy_collection.pdf' })
const isVersionOpen = ref(false)

// 현재 선택된 약관의 버전 목록
const currentTermVersions = computed(() => {
  return versionsMap.value[selectedTerm.value] || []
})

// PDF URL
const currentPdfUrl = computed(() => {
  return selectedVersion.value?.file || ''
})

// PDF.js Generic Viewer iframe URL
const viewerUrl = computed(() => {
  if (!currentPdfUrl.value) return ''
  // PDF.js generic viewer 사용
  return `/pdfjs/web/viewer.html?file=${encodeURIComponent(currentPdfUrl.value)}`
})

// 약관 선택
const selectTerm = (termId) => {
  selectedTerm.value = termId
  const versions = versionsMap.value[termId] || []
  selectedVersion.value = versions[0] || { id: 0, date: '-', file: '' }
  isVersionOpen.value = false
}

// 버전 선택
const selectVersion = (ver) => {
  selectedVersion.value = ver
  isVersionOpen.value = false
}

// 드롭다운 토글
const toggleVersionDropdown = () => {
  isVersionOpen.value = !isVersionOpen.value
}

// 외부 클릭 시 드롭다운 닫기
const closeDropdown = (e) => {
  if (!e.target.closest('.version-dropdown')) {
    isVersionOpen.value = false
  }
}

onMounted(() => {
  // URL 파라미터로 초기 탭 설정
  const tab = route.query.tab
  if (tab && termsList.value.find(t => t.id === tab)) {
    selectTerm(tab)
  }
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<style lang="scss" scoped>
.terms-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $dark-bg;
}

// 헤더
.terms-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  min-height: 60px;
  background: $main-gad;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .logo img {
      height: 24px;
    }

    .header-title {
      @include font-14-bold;
      color: $white;
    }
  }
}

// 바디
.terms-body {
  display: flex;
  flex: 1;
}

// 사이드바
.terms-sidebar {
  width: 220px;
  min-width: 220px;
  padding: 32px 24px;
  color: $white;

  .sidebar-title {
    @include font-16-bold;
    padding-bottom: 12px;
    border-bottom: 1px solid $white;
    margin-bottom: 8px;
  }

  .terms-menu {
    li {
      padding: 14px 12px;
      @include font-14-regular;
      color: $dark-text;
      cursor: pointer;
      border-bottom: 1px solid $dark-line-gray;
      white-space: pre-line;
      line-height: 1.4;
      transition: all $transition-fast;

      &:hover {
        color: $white;
      }

      &.active {
        color: $white;
        @include font-14-bold;
      }
    }
  }
}

// 콘텐츠
.terms-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  padding-left: 0;
}

// 이전기록 드롭다운
.version-area {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.version-dropdown {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  cursor: pointer;
  min-width: 140px;
  justify-content: space-between;

  .arrow-icon {
    width: 12px;
    height: 12px;
    opacity: 0.6;
  }

  .dropdown-list {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 100%;
    background: $dark-input;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-sm;
    z-index: 10;
    overflow: hidden;

    li {
      padding: 10px 16px;
      @include font-14-regular;
      color: $dark-text;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: $white;
      }

      &.active {
        color: $main-color;
      }
    }
  }
}

// PDF 뷰어
.pdf-viewer {
  flex: 1;
  border-radius: $radius-md;
  overflow: hidden;

  iframe {
    width: 100%;
    height: 100%;
    min-height: calc(100vh - 160px);
    border: none;
  }
}

.pdf-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: $dark-text;
  @include font-14-regular;
  background: $bg-op;
  border-radius: $radius-md;
}
</style>
