<template>
  <div class="analysis-result" v-if="analysis">
    <!-- 상단: 뒤로가기 + 이전기록 -->
    <div class="top-bar">
      <div class="top-left">
        <button class="btn-back" @click="goBack">
          <span>&lt;</span> 뒤로가기
        </button>
        <div class="history-dropdown" ref="historyRef">
          <button class="btn-history" @click="toggleHistory">
            이전기록 <span class="arrow">&#9662;</span>
          </button>
          <ul v-if="showHistory" class="history-list">
            <li v-if="previousRecords.length === 0" class="no-record">기록이 없습니다</li>
            <li
              v-for="record in previousRecords"
              :key="record.id"
              @click="goToRecord(record.id)"
            >
              {{ formatDate(record.created_at) }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 환자 정보 바 -->
      <div class="patient-info-bar">
        <span><b>담당주치의</b> {{ analysis.physician || '-' }}</span>
        <span><b>환자등록번호</b> {{ analysis.patient_code }}</span>
        <span><b>환자명</b> {{ analysis.patient_name }}</span>
        <span><b>성별</b> {{ analysis.gender === 'M' ? 'M' : 'F' }}</span>
        <span><b>몸무게</b> {{ analysis.weight ? analysis.weight + 'kg' : '-' }}</span>
        <span><b>키</b> {{ analysis.height ? analysis.height + 'cm' : '-' }}</span>
        <span><b>생년월일</b> {{ formatDate(analysis.birth_date) }}</span>
        <span><b>분석일</b> {{ formatDate(analysis.created_at) }}</span>
      </div>

      <!-- 정보 수정 버튼 -->
      <button class="btn-edit" @click="openEditModal">
        <img src="/assets/icons/edit.svg" alt="edit" />
      </button>
    </div>

    <!-- 메인 컨텐츠 -->
    <div class="main-content">
      <!-- 왼쪽: X-ray 이미지 -->
      <div class="left-panel">
        <div class="xray-image">
          <span class="image-date">{{ formatDate(analysis.created_at) }}</span>
          <img :src="getImageUrl(analysis.image_path)" alt="X-ray" />
        </div>
      </div>

      <!-- 오른쪽: 분석 결과 -->
      <div class="right-panel">
        <!-- 최종 예측 키 (#5) -->
        <div class="result-summary">
          <div class="predicted-height">
            <span class="label">최종 예측 키</span>
            <span class="value">{{ finalPredictedHeight }}<small>cm</small></span>
          </div>
          <div class="age-info">
            <div>현재 나이 <b>{{ formatAge(analysis.chronological_age_years, analysis.chronological_age_months) }}</b></div>
            <div>뼈 나이(AI) <b>{{ formatAge(analysis.bone_age_years, analysis.bone_age_months) }}</b></div>
            <div>유전적 예측 키 <b>{{ mphHeight ? mphHeight + ' cm' : '-' }}</b></div>
          </div>
        </div>

        <!-- 뼈나이 예측 - 의사 (#6) -->
        <div class="doctor-boneage">
          <span class="label">뼈 나이 예측(의사)</span>
          <div class="dropdowns">
            <select v-model="doctorBoneAgeYears">
              <option v-for="y in 20" :key="y-1" :value="y-1">{{ y-1 }}</option>
            </select>
            <span>Y</span>
            <select v-model="doctorBoneAgeMonths">
              <option v-for="m in 12" :key="m-1" :value="m-1">{{ m-1 }}</option>
            </select>
            <span>M</span>
          </div>
          <span class="doctor-note">*의료진 최종 확인 필수</span>
        </div>

        <!-- 분석 브리핑 (#7) -->
        <div class="analysis-briefing">
          <h4>분석 Description</h4>
          <p>{{ briefingText }}</p>
        </div>

        <!-- 스코어 (#8) -->
        <div class="scores">
          <div class="score-card">
            <h4>Height Score <span class="tooltip-icon">?</span></h4>
            <div class="score-gauge">
              <span class="score-value">{{ heightScore }}/100 점</span>
            </div>
          </div>
          <div class="score-card">
            <h4>Potential Score <span class="tooltip-icon">?</span></h4>
            <div class="score-gauge">
              <span class="score-value">{{ potentialScore }}/100 점</span>
            </div>
          </div>
        </div>

        <!-- 탭 (#9, #12) -->
        <div class="chart-tabs">
          <button :class="{ active: activeTab === 'growth' }" @click="activeTab = 'growth'">
            표준 성장도표 비교
          </button>
          <button :class="{ active: activeTab === 'predict' }" @click="activeTab = 'predict'">
            예측 키 그래프
          </button>
        </div>

        <!-- 표준성장도표 (#10) -->
        <div v-if="activeTab === 'growth'" class="chart-area">
          <div class="chart-header">
            <div class="legend">
              <span class="dot green"></span> 현재
              <span class="dot gray"></span> 과거
            </div>
            <label class="toggle">
              비교 <input type="checkbox" v-model="showComparison" />
            </label>
          </div>
          <div class="chart-container">
            <!-- Chart.js 캔버스 -->
            <canvas ref="growthChartRef"></canvas>
          </div>
        </div>

        <!-- 예측 키 비교 (#11) -->
        <div v-if="activeTab === 'predict'" class="predict-area">
          <div class="predict-row">
            <span class="predict-label">현재 키</span>
            <span class="predict-value">{{ analysis.height || '-' }} cm</span>
            <div class="slider-bar">
              <div class="slider-fill" :style="{ width: heightPercent + '%' }"></div>
            </div>
          </div>
          <div class="predict-row">
            <span class="predict-label">유전 기반<br/>예측 키</span>
            <span class="predict-value">{{ mphHeight || '-' }} cm</span>
            <div class="slider-bar">
              <div class="slider-fill" :style="{ width: mphPercent + '%' }"></div>
            </div>
          </div>
          <div class="predict-row">
            <span class="predict-label">뼈나이 기반<br/>예측 키</span>
            <span class="predict-value">{{ boneAgePredictedHeight || '-' }} cm</span>
            <div class="slider-bar">
              <div class="slider-fill" :style="{ width: boneAgePercent + '%' }"></div>
            </div>
          </div>
          <div class="correction-info">
            <span>유전기반 보정량 : {{ geneticCorrection }}</span>
            <span>성숙도 기반 보정량 : {{ maturityCorrection }}</span>
          </div>
          <div class="predict-row final">
            <span class="predict-label">최종 예측 키 <span class="tooltip-icon">?</span></span>
            <span class="predict-value">{{ finalPredictedHeight }} cm</span>
            <div class="slider-bar final-bar">
              <div class="slider-fill" :style="{ width: finalPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- 리포트 버튼 (#13) -->
        <button class="btn-report" @click="goToReport">분석결과 Report</button>
      </div>
    </div>
  </div>

  <!-- 로딩 -->
  <div v-else class="loading">데이터를 불러오는 중...</div>
</template>
<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { analysisAPI } from '@/api/analysis';
import growthHeightData from '@/data/growth_height.json';
import Chart from 'chart.js/auto';

const route = useRoute();
const router = useRouter();

// 상태
const analysis = ref(null);
const previousRecords = ref([]);
const showHistory = ref(false);
const historyRef = ref(null);
const activeTab = ref('growth');
const showComparison = ref(true);
const growthChartRef = ref(null);
let growthChart = null;

// 의사 판독값
const doctorBoneAgeYears = ref(0);
const doctorBoneAgeMonths = ref(0);

// 데이터 로드
const fetchAnalysis = async () => {
  try {
    const res = await analysisAPI.getDetail(route.params.id);
    analysis.value = res.data.data;

    // 의사 판독값 초기화 (AI값으로)
    doctorBoneAgeYears.value = analysis.value.bone_age_years || 0;
    doctorBoneAgeMonths.value = analysis.value.bone_age_months || 0;

    // 이전기록 조회
    fetchPreviousRecords();
  } catch (error) {
    console.error('분석 상세 조회 오류:', error);
  }
};

const fetchPreviousRecords = async () => {
  try {
    const res = await analysisAPI.getList({
      page: 1,
      limit: 100,
      search: analysis.value.patient_name,
    });
    previousRecords.value = res.data.data.filter(
      (item) =>
        item.id !== analysis.value.id &&
        item.patient_code === analysis.value.patient_code &&
        item.patient_name === analysis.value.patient_name
    );
  } catch (error) {
    console.error('이전기록 조회 오류:', error);
  }
};

// AI result_json 파싱
const resultData = computed(() => {
  if (!analysis.value?.result_json) return {};
  return typeof analysis.value.result_json === 'string'
    ? JSON.parse(analysis.value.result_json)
    : analysis.value.result_json;
});

// MPH (유전적 예측 키)
const mphHeight = computed(() => {
  return resultData.value?.Genetic_Predicted_Height ?? resultData.value?.MPH ?? null;
});

// AI 결과에서 스코어/예측값 추출
const heightScore = computed(() => resultData.value?.Height_Score ?? '-');
const potentialScore = computed(() => resultData.value?.Potential_Score ?? '-');
const boneAgePredictedHeight = computed(() => resultData.value?.Growth_Curve_Predicted_Height ?? null);
const geneticCorrection = computed(() => {
  const val = resultData.value?.Delta_Genetic;
  return val != null ? (val >= 0 ? '+' : '') + val + 'cm' : '-';
});
const maturityCorrection = computed(() => {
  const val = resultData.value?.Delta_Maturity;
  return val != null ? (val >= 0 ? '+' : '') + val + 'cm' : '-';
});
const finalPredictedHeight = computed(() => resultData.value?.Final_Predicted_Height ?? '-');
// 슬라이더 퍼센트 (0~200cm 범위 기준)
const heightPercent = computed(() => Math.min(100, ((analysis.value?.height || 0) / 200) * 100));
const mphPercent = computed(() => Math.min(100, ((mphHeight.value || 0) / 200) * 100));
const boneAgePercent = computed(() => Math.min(100, ((boneAgePredictedHeight.value || 0) / 200) * 100));
const finalPercent = computed(() => Math.min(100, ((parseFloat(finalPredictedHeight.value) || 0) / 200) * 100));

// 분석 브리핑 텍스트
const briefingText = computed(() => {
  if (!analysis.value) return '';
  const realMonths = (analysis.value.chronological_age_years || 0) * 12 + (analysis.value.chronological_age_months || 0);
  const boneMonths = (analysis.value.bone_age_years || 0) * 12 + (analysis.value.bone_age_months || 0);
  const diff = boneMonths - realMonths;
  const absDiff = Math.abs(diff);
  const y = Math.floor(absDiff / 12);
  const m = absDiff % 12;
  const direction = diff >= 0 ? '많습니다' : '적습니다';
  return `${analysis.value.patient_name} 님의 실제 나이보다 뼈 나이가 ${y}Y ${m}M 만큼 ${direction}`;
});

// 표준성장도표 차트 그리기
const drawGrowthChart = () => {
  if (!growthChartRef.value || !analysis.value) return;

  const isMale = analysis.value.gender === 'M';
  const data = isMale ? growthHeightData.male : growthHeightData.female;

  // 백분위 라인 색상
  const lines = [
    { key: 'p3', color: 'rgba(255,165,0,0.6)', label: '3rd' },
    { key: 'p10', color: 'rgba(255,200,0,0.5)', label: '10th' },
    { key: 'p25', color: 'rgba(100,200,255,0.5)', label: '25th' },
    { key: 'p50', color: 'rgba(100,200,255,0.8)', label: '50th' },
    { key: 'p75', color: 'rgba(100,200,255,0.5)', label: '75th' },
    { key: 'p90', color: 'rgba(255,200,0,0.5)', label: '90th' },
    { key: 'p97', color: 'rgba(255,165,0,0.6)', label: '97th' },
  ];

const datasets = lines.map((line) => ({
    label: line.label,
    data: data.map((d) => ({ x: d.month / 12, y: d[line.key] })),
    borderColor: line.color,
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
    tension: 0.3,
    showLine: true,    // ← 이거 추가
}));

  // 현재 데이터 포인트 (초록점)
  const ageYears = (analysis.value.chronological_age_years || 0) +
    (analysis.value.chronological_age_months || 0) / 12;
  datasets.push({
    label: '현재',
    data: [{ x: ageYears, y: parseFloat(analysis.value.height) || 0 }],
    backgroundColor: '#00e676',
    borderColor: '#00e676',
    pointRadius: 6,
    showLine: false,
  });

  // 이전기록 (회색점)
  if (showComparison.value && previousRecords.value.length > 0) {
    const prevPoints = previousRecords.value
      .filter((r) => r.height)
      .map((r) => ({
        x: (r.chronological_age_years || 0) + (r.chronological_age_months || 0) / 12,
        y: parseFloat(r.height),
      }));
    if (prevPoints.length > 0) {
      datasets.push({
        label: '과거',
        data: prevPoints,
        backgroundColor: '#888',
        borderColor: '#888',
        pointRadius: 5,
        showLine: false,
      });
    }
  }

  if (growthChart) growthChart.destroy();

  growthChart = new Chart(growthChartRef.value, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: '나이', color: '#aaa' },
          min: 0, max: 19,
          ticks: { color: '#aaa' },
          grid: { color: 'rgba(255,255,255,0.1)' },
        },
        y: {
          title: { display: true, text: '키', color: '#aaa' },
          min: 40, max: 200,
          ticks: { color: '#aaa' },
          grid: { color: 'rgba(255,255,255,0.1)' },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
};

// 비교 토글 변경 시 차트 갱신
watch(showComparison, () => {
  nextTick(() => drawGrowthChart());
});

watch(activeTab, (tab) => {
  if (tab === 'growth') {
    nextTick(() => drawGrowthChart());
  }
});

// 네비게이션
const goBack = () => router.push('/main');
const toggleHistory = () => { showHistory.value = !showHistory.value; };
const goToRecord = (id) => {
  showHistory.value = false;
  router.push(`/main/analysis/${id}`);
};
const goToReport = () => router.push(`/main/analysis/${route.params.id}/report`);
const openEditModal = () => { /* TODO: 정보 수정 모달 */ };

// 포맷 헬퍼
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatAge = (years, months) => {
  if (years == null && months == null) return '-';
  return `${years || 0}Y ${String(months || 0).padStart(2, '0')}M`;
};
const getImageUrl = (path) => {
  if (!path) return '';
  const uploadsIndex = path.replace(/\\/g, '/').indexOf('uploads/');
  if (uploadsIndex === -1) return '';
  const relativePath = path.replace(/\\/g, '/').substring(uploadsIndex);
  return `/${relativePath}`;  // 상대경로 (같은 도메인)
};

onMounted(async () => {
  await fetchAnalysis();
  nextTick(() => drawGrowthChart());
});

// 라우트 변경 시 (이전기록 클릭)
watch(() => route.params.id, async (newId) => {
  if (newId) {
    await fetchAnalysis();
    nextTick(() => drawGrowthChart());
  }
});
</script>
<style lang="scss" scoped>
.analysis-result {
  color: $white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  gap: 16px;

  .top-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn-back {
    background: none;
    color: $white;
    @include font-14-regular;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .history-dropdown {
    position: relative;

    .btn-history {
      background: $dark-input;
      color: $white;
      padding: 6px 16px;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      @include font-12-regular;
      cursor: pointer;

      .arrow { font-size: 10px; margin-left: 4px; }
    }

    .history-list {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      min-width: 160px;
      z-index: 10;
      list-style: none;
      padding: 0;

      li {
        padding: 8px 16px;
        @include font-12-regular;
        cursor: pointer;
        &:hover { background: rgba(255,255,255,0.08); }
      }
      .no-record {
        color: $dark-text;
        cursor: default;
        &:hover { background: none; }
      }
    }
  }

  .patient-info-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16px;
    @include font-12-regular;

    b {
      @include font-12-bold;
      margin-right: 4px;
    }
  }

  .btn-edit {
    background: none;
    cursor: pointer;
    img { width: 20px; height: 20px; }
  }
}

.main-content {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
}

// 왼쪽: X-ray
.left-panel {
  width: 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  .xray-image {
    position: relative;
    max-width: 100%;
    max-height: 100%;

    .image-date {
      position: absolute;
      top: 12px;
      left: 12px;
      @include font-12-regular;
      color: $white;
      background: rgba(0,0,0,0.5);
      padding: 4px 8px;
      border-radius: 4px;
    }

    img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
    }
  }
}

// 오른쪽: 결과
.right-panel {
  width: 55%;
  padding: 20px 24px;
  overflow-y: auto;
}

// 최종 예측 키
.result-summary {
  background: $bg-op;
  border-radius: $radius-md;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .predicted-height {
    .label { @include font-14-regular; display: block; margin-bottom: 4px; }
    .value {
      font-size: 56px;
      font-weight: bold;
      small { font-size: 20px; margin-left: 4px; }
    }
  }

  .age-info {
    text-align: right;
    @include font-12-regular;
    line-height: 1.8;
    b { @include font-14-bold; margin-left: 8px; }
  }
}

// 의사 판독
.doctor-boneage {
  background: $bg-op;
  border-radius: $radius-md;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .label { @include font-14-bold; }

  .dropdowns {
    display: flex;
    align-items: center;
    gap: 8px;

    select {
      background: $dark-input;
      color: $white;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      padding: 6px 12px;
      @include font-14-regular;
    }
  }

  .doctor-note {
    color: $red;
    @include font-12-regular;
  }
}

// 분석 브리핑
.analysis-briefing {
  background: $bg-op;
  border-radius: $radius-md;
  padding: 16px 24px;
  margin-bottom: 16px;

  h4 { @include font-14-bold; margin-bottom: 8px; }
  p { @include font-12-regular; }
}

// 스코어
.scores {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  .score-card {
    flex: 1;
    background: $bg-op;
    border-radius: $radius-md;
    padding: 16px 24px;
    text-align: center;

    h4 {
      @include font-14-bold;
      margin-bottom: 12px;
      .tooltip-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 1px solid $dark-text;
        border-radius: 50%;
        @include font-12-regular;
        text-align: center;
        line-height: 16px;
        margin-left: 4px;
        cursor: help;
      }
    }

    .score-value { @include font-14-bold; }
  }
}

// 탭
.chart-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid $dark-line-gray;

  button {
    padding: 12px 24px;
    background: none;
    color: $dark-text;
    @include font-14-regular;
    cursor: pointer;
    border-bottom: 2px solid transparent;

    &.active {
      color: $white;
      @include font-14-bold;
      border-bottom-color: $white;
    }
  }
}

// 차트 영역
.chart-area {
  background: $bg-op;
  border-radius: $radius-md;
  padding: 16px;
  margin-bottom: 16px;

  .chart-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;

    .legend {
      @include font-12-regular;
      display: flex;
      align-items: center;
      gap: 8px;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        &.green { background: #00e676; }
        &.gray { background: #888; }
      }
    }

    .toggle {
      @include font-12-regular;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;

      input { cursor: pointer; }
    }
  }

  .chart-container {
    height: 300px;
    position: relative;
  }
}

// 예측 키 비교
.predict-area {
  background: $bg-op;
  border-radius: $radius-md;
  padding: 20px 24px;
  margin-bottom: 16px;

  .predict-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;

    .predict-label {
      width: 100px;
      @include font-12-regular;
      flex-shrink: 0;
    }
    .predict-value {
      width: 80px;
      @include font-14-bold;
      flex-shrink: 0;
    }
    .slider-bar {
      flex: 1;
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      position: relative;
      overflow: hidden;

      .slider-fill {
        height: 100%;
        background: linear-gradient(90deg, #00bcd4, #2196f3);
        border-radius: 4px;
        transition: width 0.3s;
      }

      &.final-bar .slider-fill {
        background: linear-gradient(90deg, #00bcd4, #2196f3, #e0e0e0);
      }
    }

    &.final {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid $dark-line-gray;
    }
  }

  .correction-info {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 16px;
    @include font-12-regular;

    span {
      background: $dark-input;
      padding: 8px 16px;
      border-radius: $radius-sm;
    }
  }
}

// 리포트 버튼
.btn-report {
  width: 100%;
  max-width: 400px;
  margin: 16px auto 0;
  display: block;
  padding: 14px;
  background: $main-gad;
  color: $white;
  @include font-14-bold;
  border-radius: $radius-sm;
  cursor: pointer;
  text-align: center;

  &:hover { opacity: 0.9; }
}

// 로딩
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: $dark-text;
  @include font-14-regular;
}
</style>
