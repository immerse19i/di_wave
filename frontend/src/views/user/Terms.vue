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
import { termsAPI } from '@/api/terms'


const route = useRoute()


const termsList = ref([])
const versionsMap = ref({})
const selectedTerm = ref('')
const selectedVersion = ref({ id: 0, date: '-', file: '' })
const isVersionOpen = ref(false)

// API: 공개 약관 목록 조회
const fetchTerms = async () => {
  try {
    const res = await termsAPI.getPublicTerms()
    const terms = res.data.data
    termsList.value = terms.map(t => ({ id: t.type, name: t.name, termId: t.id }))
    
    if (terms.length > 0) {
      // URL 파라미터로 초기 탭 설정
      const tab = route.query.tab
      const initialType = tab && terms.find(t => t.type === tab) ? tab : terms[0].type
      selectTerm(initialType)
    }
  } catch (e) {
    console.error('약관 목록 조회 실패:', e)
  }
}

// API: 이전기록 목록 조회 (버전 드롭다운용)
const fetchVersions = async (type) => {
  try {
    const res = await termsAPI.getPublicHistory(type)

    const history = res.data.data.history || []
    versionsMap.value[type] = history
      .filter(h => h.is_public)
      .map(h => ({
        id: h.id,
        date: formatVersionDate(h.created_at),
        file: termsAPI.getFileUrl(h.id),
      }))
  } catch (e) {
    // 이력 조회 실패 시 현재 약관만 사용
    const term = termsList.value.find(t => t.id === type)
    if (term) {
      versionsMap.value[type] = [{
        id: term.termId,
        date: '-',
        file: termsAPI.getFileUrl(term.termId),
      }]
    }
  }
}

// 날짜 포맷 (버전 드롭다운용 - 날짜만)
const formatVersionDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}



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
const selectTerm = async (termId) => {
  selectedTerm.value = termId
  isVersionOpen.value = false

  // 버전 목록이 없으면 API 호출
  if (!versionsMap.value[termId]) {
    await fetchVersions(termId)
  }

  const versions = versionsMap.value[termId] || []
  selectedVersion.value = versions[0] || { id: 0, date: '-', file: '' }
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
  fetchTerms()
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
