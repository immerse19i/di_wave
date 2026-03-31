<template>
  <div class="analysis-result" v-if="analysis">
    <!-- 상단: 뒤로가기 + 이전기록 -->
    <div class="top-bar">
      <div class="top-left">
        <button class="btn-back" @click="goBack">
          <span>&lt;</span> 뒤로가기
        </button>
        <div
          class="history-dropdown"
          :class="{ open: showHistory }"
          ref="historyRef"
        >
          <button class="btn-history" @click="toggleHistory">
            <span>이전기록</span>
            <img
              src="/assets/icons/dropdown_icon.svg"
              alt=""
              class="arrow-icon"
            />
          </button>
          <ul v-if="showHistory" class="history-list">
            <li v-if="previousRecords.length === 0" class="no-record">
              기록이 없습니다
            </li>
            <li
              v-for="record in previousRecords"
              :key="record.id"
              @click="goToRecord(record.id)"
            >
              {{ formatDate(record.analysis_date || record.created_at) }}
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
        <span
          ><b>몸무게</b>
          {{ analysis.weight ? analysis.weight + 'kg' : '-' }}</span
        >
        <span
          ><b>키</b> {{ analysis.height ? analysis.height + 'cm' : '-' }}</span
        >
        <span><b>생년월일</b> {{ formatDate(analysis.birth_date) }}</span>
        <span
          ><b>분석일</b>
          {{ formatDate(analysis.analysis_date || analysis.created_at) }}</span
        >
      </div>

      <!-- 정보 수정 버튼 -->
      <button class="btn-edit" @click="openEditModal">
        <img src="/assets/icons/edit.svg" alt="edit" /> 수정
      </button>
    </div>

    <!-- 메인 컨텐츠 -->
    <div class="main-content">
      <!-- 왼쪽: X-ray 이미지 -->
      <div class="left-panel" :class="{ 'dual-view': isComparing }">
        <!-- 비교 이미지 (이전 기록) -->
        <div
          v-if="isComparing && comparisonRecord"
          class="xray-image comparison-image"
        >
          <div
            class="img_box"
            @wheel.prevent="onWheel($event, 'comparison')"
            @mousedown="onMouseDown($event, 'comparison')"
            @mousemove="onMouseMove($event, 'comparison')"
            @mouseup="onMouseUp('comparison')"
            @mouseleave="onMouseUp('comparison')"
            @dblclick="onDblClick('comparison')"
          >
            <span class="image-date">
              {{
                formatDate(
                  comparisonRecord.analysis_date || comparisonRecord.created_at,
                )
              }}
            </span>
            <button class="btn-close-comparison" @click="closeComparison">
              <img src="/assets/icons/close_blue.svg" alt="close" />
            </button>
            <img
              :src="getImageUrl(comparisonRecord.image_path)"
              alt="Previous X-ray"
              :style="getImageStyle('comparison')"
              draggable="false"
            />
          </div>
        </div>
        <!-- 현재 이미지 -->
        <div class="xray-image">
          <div
            class="img_box"
            @wheel.prevent="onWheel($event, 'current')"
            @mousedown="onMouseDown($event, 'current')"
            @mousemove="onMouseMove($event, 'current')"
            @mouseup="onMouseUp('current')"
            @mouseleave="onMouseUp('current')"
            @dblclick="onDblClick('current')"
          >
            <span class="image-date">
              {{ formatDate(analysis.analysis_date || analysis.created_at) }}
            </span>
            <img
              :src="getImageUrl(analysis.image_path)"
              alt="X-ray"
              :style="getImageStyle('current')"
              draggable="false"
            />
          </div>
        </div>
      </div>

      <!-- 오른쪽: 분석 결과 -->
      <div class="right-panel">
        <!-- 이전 기록 비교 카드 -->
        <div
          v-if="isComparing && comparisonRecord"
          class="result-summary comparison-summary"
        >
          <div class="predicted-height">
            <span class="date-label">{{
              formatDate(
                comparisonRecord.analysis_date || comparisonRecord.created_at,
              )
            }}</span>
            <span class="label">최종 예측 키</span>
            <span class="value"
              >{{ comparisonFinalPredictedHeight }}<small>cm</small></span
            >
          </div>
          <div class="age-info">
            <div>
              <span class="type"> 나이 </span>
              <b>{{
                formatAge(
                  comparisonRecord.chronological_age_years,
                  comparisonRecord.chronological_age_months,
                )
              }}</b>
            </div>
            <div>
              <span class="type"> 뼈 나이(AI) </span>
              <b class="born">{{
                formatAge(
                  comparisonRecord.bone_age_years,
                  comparisonRecord.bone_age_months,
                )
              }}</b>
            </div>
            <div class="has-tooltip">
              <span class="type"> 유전적 예측 키 </span>
              <b>{{
                comparisonMphHeight ? comparisonMphHeight + ' cm' : '-'
              }}</b>
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img tooltip-right"
                    src="/assets/images/tooltip/parental_height.svg"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 최종 예측 키 (#5) -->
        <div class="result-summary">
          <div class="predicted-height">
            <span v-if="isComparing" class="date-label">{{
              formatDate(analysis.analysis_date || analysis.created_at)
            }}</span>
            <span class="label">최종 예측 키</span>
            <span class="value"
              >{{ finalPredictedHeight }}<small>cm</small></span
            >
          </div>
          <div class="age-info">
            <div>
              <span class="type"> 현재 나이 </span>
              <b>{{
                formatAge(
                  analysis.chronological_age_years,
                  analysis.chronological_age_months,
                )
              }}</b>
            </div>
            <div>
              <span class="type"> 뼈 나이(AI) </span>
              <b class="born">{{
                formatAge(analysis.bone_age_years, analysis.bone_age_months)
              }}</b>
            </div>
            <div class="has-tooltip">
              <span class="type"> 유전적 예측 키 </span>
              <b>{{ mphHeight ? mphHeight + ' cm' : '-' }}</b>
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img tooltip-right"
                    src="/assets/images/tooltip/parental_height.svg"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 뼈나이 예측 - 의사 (#6) -->
        <div
          class="doctor-boneage"
          :class="{ 'has-changes': isDoctorBoneAgeChanged }"
        >
          <span class="label">뼈 나이 예측(의사)</span>
          <div class="dropdowns">
            <select v-model="doctorBoneAgeYears">
              <option v-for="y in 20" :key="y - 1" :value="y - 1">
                {{ y - 1 }}
              </option>
            </select>
            <span>Y</span>
            <select v-model="doctorBoneAgeMonths">
              <option v-for="m in 12" :key="m - 1" :value="m - 1">
                {{ m - 1 }}
              </option>
            </select>
            <span>M</span>
          </div>
          <button class="btn-default" @click="resetToDefault">기본값</button>
          <button class="btn-save" @click="saveDoctorBoneAge">저장</button>
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
            <div class="card-top-area">
              <h4>Height Score</h4>
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img"
                    src="/assets/images/tooltip/height_score.svg"
                  />
                </span>
              </div>
            </div>
            <ScoreGauge :score="Number(heightScore) || 0" id="height" />
            <span class="score-value">{{ heightScore }}/100 점</span>
          </div>
          <div class="score-card">
            <div class="card-top-area">
              <h4>Potential Score</h4>
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img tooltip-right"
                    src="/assets/images/tooltip/potential_score.svg"
                  />
                </span>
              </div>
            </div>

            <ScoreGauge :score="Number(potentialScore) || 0" id="potential" />
            <span class="score-value">{{ potentialScore }}/100 점</span>
          </div>
        </div>

        <!-- 탭 (#9, #12) -->
        <div class="chart-tabs">
          <button
            :class="{ active: activeTab === 'growth' }"
            @click="activeTab = 'growth'"
          >
            표준 성장도표 비교
          </button>
          <button
            :class="{ active: activeTab === 'predict' }"
            @click="activeTab = 'predict'"
          >
            예측 키 그래프
          </button>
        </div>

        <!-- 표준성장도표 (#10) -->
        <div v-if="activeTab === 'growth'" class="chart-area">
          <div class="chart-header">
            <div class="legend">
              <span class="dot green"></span> 현재
              <span v-if="isComparing" class="dot red"></span>
              <span v-if="isComparing">비교사진</span>
              <span class="dot gray"></span> 과거
            </div>

            <ToggleSwitch
              v-model="showComparison"
              onLabel="비교"
              offLabel="비교"
            />
          </div>
          <div class="chart-container">
            <!-- Chart.js 캔버스 -->
            <canvas ref="growthChartRef"></canvas>
          </div>
        </div>

        <!-- 예측 키 비교 (#11) -->
        <!-- 예측 키 비교 (#11) -->
        <div v-if="activeTab === 'predict'" class="predict-area">
          <div class="predict-row">
            <span class="predict-label">현재 키</span>
            <span class="predict-value"
              >{{ analysis.height || '-' }}
              <div class="unit">cm</div></span
            >
            <div class="slider-wrap">
              <span class="range-label">작음(0)</span>
              <div class="slider-bar">
                <div
                  class="slider-fill"
                  :style="{ width: heightPercent + '%' }"
                ></div>
                <div
                  class="slider-handle"
                  :style="{ left: heightPercent + '%' }"
                >
                  <div class="bubble">
                    <div class="bubble-box">
                      {{ Math.round(heightPercent) }}
                    </div>
                    <img
                      src="/assets/icons/chat_bubble_bottom.svg"
                      alt=""
                      class="bubble-tail"
                    />
                  </div>
                  <div class="dot"></div>
                </div>
              </div>
              <span class="range-label">큼(100)</span>
            </div>
          </div>

          <div class="predict-row">
            <span class="predict-label">유전 기반<br />예측 키</span>
            <span class="predict-value"
              >{{ mphHeight || '-' }}
              <div class="unit">cm</div></span
            >
            <div class="slider-wrap">
              <span class="range-label">작음(0)</span>
              <div class="slider-bar">
                <div
                  class="slider-fill"
                  :style="{ width: mphPercent + '%' }"
                ></div>
                <div class="slider-handle" :style="{ left: mphPercent + '%' }">
                  <div class="bubble">
                    <div class="bubble-box">{{ Math.round(mphPercent) }}</div>
                    <img
                      src="/assets/icons/chat_bubble_bottom.svg"
                      alt=""
                      class="bubble-tail"
                    />
                  </div>
                  <div class="dot"></div>
                </div>
              </div>
              <span class="range-label">큼(100)</span>
            </div>
          </div>

          <div class="predict-row">
            <span class="predict-label">성장곡선기반<br />예측키</span>
            <span class="predict-value"
              >{{ boneAgePredictedHeight || '-' }}
              <div class="unit">cm</div></span
            >
            <div class="slider-wrap">
              <span class="range-label">작음(0)</span>
              <div class="slider-bar">
                <div
                  class="slider-fill"
                  :style="{ width: boneAgePercent + '%' }"
                ></div>
                <div
                  class="slider-handle"
                  :style="{ left: boneAgePercent + '%' }"
                >
                  <div class="bubble">
                    <div class="bubble-box">
                      {{ Math.round(boneAgePercent) }}
                    </div>
                    <img
                      src="/assets/icons/chat_bubble_bottom.svg"
                      alt=""
                      class="bubble-tail"
                    />
                  </div>
                  <div class="dot"></div>
                </div>
              </div>
              <span class="range-label">큼(100)</span>
            </div>
          </div>

          <div class="correction-info">
            <span>유전기반 보정량 : {{ geneticCorrection }}</span>
            <span>성숙도 기반 보정량 : {{ maturityCorrection }}</span>
          </div>

          <div class="predict-row final">
            <div class="card-top-area">
              <span class="predict-label">최종 예측 키</span>
              <div class="tootip_wrap">
                <span class="tooltip-wrap">
                  <img
                    src="/assets/icons/question.svg"
                    alt=""
                    class="tooltip-icon"
                  />
                  <img
                    class="tooltip-img tooltip-left"
                    src="/assets/images/tooltip/final_height.svg"
                  />
                </span>
              </div>
            </div>
            <span class="predict-value"
              >{{ finalPredictedHeight }}
              <div class="unit">cm</div>
            </span>
            <div class="slider-wrap">
              <span class="range-label">작음(0)</span>
              <div class="slider-bar">
                <div
                  class="slider-fill"
                  :style="{ width: finalPercent + '%' }"
                ></div>
                <div
                  class="slider-handle"
                  :style="{ left: finalPercent + '%' }"
                >
                  <div class="bubble">
                    <div class="bubble-box">{{ Math.round(finalPercent) }}</div>
                    <img
                      src="/assets/icons/chat_bubble_bottom.svg"
                      alt=""
                      class="bubble-tail"
                    />
                  </div>
                  <div class="dot"></div>
                </div>
              </div>
              <span class="range-label">큼(100)</span>
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
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';

import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { analysisAPI } from '@/api/analysis';
import { useModalStore } from '@/store/modal';
import { UseMessageStore } from '@/store/message';
import growthHeightData from '@/data/growth_height.json';
import Chart from 'chart.js/auto';
import ToggleSwitch from '../../../components/common/ToggleSwitch.vue';
import ScoreGauge from '../../../components/common/ScoreGauge.vue';

const modal = useModalStore(); // ← 추가
const message = UseMessageStore();

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
//비교 모드
const comparisonRecord = ref(null);
const isComparing = ref(false);

// 의사 판독값
const doctorBoneAgeYears = ref(0);
const doctorBoneAgeMonths = ref(0);

// 저장된 의사 뼈나이 (변경 감지용)
const savedDoctorYears = ref(0);
const savedDoctorMonths = ref(0);
const skipGuard = ref(false);

// 변경 여부
const isDoctorBoneAgeChanged = computed(() => {
  return (
    doctorBoneAgeYears.value !== savedDoctorYears.value ||
    doctorBoneAgeMonths.value !== savedDoctorMonths.value
  );
});

// ── Zoom/Pan ──
const zoomState = reactive({
  current: {
    scale: 1,
    tx: 0,
    ty: 0,
    panning: false,
    sx: 0,
    sy: 0,
    ltx: 0,
    lty: 0,
  },
  comparison: {
    scale: 1,
    tx: 0,
    ty: 0,
    panning: false,
    sx: 0,
    sy: 0,
    ltx: 0,
    lty: 0,
  },
});
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.15;

const resetZoom = (target) => {
  const s = zoomState[target];
  s.scale = 1;
  s.tx = 0;
  s.ty = 0;
  s.panning = false;
};

const onWheel = (e, target) => {
  const s = zoomState[target];
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  s.scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s.scale + delta));
  if (s.scale <= ZOOM_MIN) {
    s.tx = 0;
    s.ty = 0;
  }
};

const onMouseDown = (e, target) => {
  if (e.button !== 0 && e.button !== 1) return;
  e.preventDefault();
  const s = zoomState[target];
  if (s.scale <= 1) return;
  s.panning = true;
  s.sx = e.clientX;
  s.sy = e.clientY;
  s.ltx = s.tx;
  s.lty = s.ty;
};

const onMouseMove = (e, target) => {
  const s = zoomState[target];
  if (!s.panning) return;
  s.tx = s.ltx + (e.clientX - s.sx);
  s.ty = s.lty + (e.clientY - s.sy);
};

const onMouseUp = (target) => {
  zoomState[target].panning = false;
};

const onDblClick = (target) => {
  resetZoom(target);
};

const getImageStyle = (target) => {
  const s = zoomState[target];
  return {
    transform: `scale(${s.scale}) translate(${s.tx / s.scale}px, ${s.ty / s.scale}px)`,
    cursor: s.panning ? 'grabbing' : 'grab',
    transition: s.panning ? 'none' : 'transform 0.15s ease-out',
    transformOrigin: 'center center',
  };
};

// 데이터 로드
const fetchAnalysis = async () => {
  try {
    const res = await analysisAPI.getDetail(route.params.id);
    analysis.value = res.data.data;

    // 의사 판독값 초기화 (AI값으로)
    doctorBoneAgeYears.value = analysis.value.bone_age_years || 0;
    doctorBoneAgeMonths.value = analysis.value.bone_age_months || 0;
    savedDoctorYears.value = analysis.value.bone_age_years || 0; // 추가
    savedDoctorMonths.value = analysis.value.bone_age_months || 0; // 추가

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
        item.patient_name === analysis.value.patient_name,
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
  return (
    resultData.value?.Genetic_Predicted_Height ?? resultData.value?.MPH ?? null
  );
});

// 비교 기록 result_json 파싱
const comparisonResultData = computed(() => {
  if (!comparisonRecord.value?.result_json) return {};
  return typeof comparisonRecord.value.result_json === 'string'
    ? JSON.parse(comparisonRecord.value.result_json)
    : comparisonRecord.value.result_json;
});

// 비교 기록 유전적 예측 키
const comparisonMphHeight = computed(() => {
  return (
    comparisonResultData.value?.Genetic_Predicted_Height ??
    comparisonResultData.value?.MPH ??
    null
  );
});

// 비교 기록 최종 예측 키
const comparisonFinalPredictedHeight = computed(
  () => comparisonResultData.value?.Final_Predicted_Height ?? '-',
);

// AI 결과에서 스코어/예측값 추출
const heightScore = computed(() => resultData.value?.Height_Score ?? '-');
const potentialScore = computed(() => resultData.value?.Potential_Score ?? '-');
const boneAgePredictedHeight = computed(
  () => resultData.value?.Growth_Curve_Predicted_Height ?? null,
);
const geneticCorrection = computed(() => {
  const val = resultData.value?.Delta_Genetic;
  return val != null ? (val >= 0 ? '+' : '') + val + 'cm' : '-';
});
const maturityCorrection = computed(() => {
  const val = resultData.value?.Delta_Maturity;
  return val != null ? (val >= 0 ? '+' : '') + val + 'cm' : '-';
});
const finalPredictedHeight = computed(
  () => resultData.value?.Final_Predicted_Height ?? '-',
);
// 슬라이더 퍼센트 (0~200cm 범위 기준)
const heightPercent = computed(() =>
  Math.min(100, ((analysis.value?.height || 0) / 200) * 100),
);
const mphPercent = computed(() =>
  Math.min(100, ((mphHeight.value || 0) / 200) * 100),
);
const boneAgePercent = computed(() =>
  Math.min(100, ((boneAgePredictedHeight.value || 0) / 200) * 100),
);
const finalPercent = computed(() =>
  Math.min(100, ((parseFloat(finalPredictedHeight.value) || 0) / 200) * 100),
);

// 의사 판독값 변경 시 서버에 저장
// 기본값 복원 (AI 원본)
const resetToDefault = () => {
  const boneAge = resultData.value?.BoneAge;
  if (!boneAge) return;
  const match = boneAge.match(/(\d+)Y\s*(\d+)M/);
  if (match) {
    doctorBoneAgeYears.value = parseInt(match[1]);
    doctorBoneAgeMonths.value = parseInt(match[2]);
  }
};

// 의사 뼈나이 저장
const saveDoctorBoneAge = async () => {
  if (!analysis.value?.id) return;
  try {
    const res = await analysisAPI.updateDoctorBoneAge(analysis.value.id, {
      bone_age_years: doctorBoneAgeYears.value,
      bone_age_months: doctorBoneAgeMonths.value,
    });
    savedDoctorYears.value = doctorBoneAgeYears.value;
    savedDoctorMonths.value = doctorBoneAgeMonths.value;
    analysis.value.bone_age_years = doctorBoneAgeYears.value;
    analysis.value.bone_age_months = doctorBoneAgeMonths.value;

    // 재계산된 result_json 반영
    if (res.data.data) {
      analysis.value.result_json = res.data.data;
    }
    nextTick(() => drawGrowthChart());

    message.showAlert('저장되었습니다.');
  } catch (e) {
    console.error('의사 뼈나이 저장 오류:', e);
    message.showAlert('저장에 실패했습니다.');
  }
};

// 분석 브리핑 텍스트
const briefingText = computed(() => {
  if (!analysis.value) return '';
  const realMonths =
    (analysis.value.chronological_age_years || 0) * 12 +
    (analysis.value.chronological_age_months || 0);
  const boneMonths =
    (analysis.value.bone_age_years || 0) * 12 +
    (analysis.value.bone_age_months || 0);
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
    { key: 'p3', color: '#6DB8BC', label: '3rd', width: 2.5 },
    { key: 'p5', color: '#6DB8BC', label: '5th', width: 1.5 },
    { key: 'p10', color: '#6DB8BC', label: '10th', width: 1.5 },
    { key: 'p25', color: '#6DB8BC', label: '25th', width: 1.5 },
    { key: 'p50', color: '#F9B358', label: '50th', width: 2 },
    { key: 'p75', color: '#6DB8BC', label: '75th', width: 1.5 },
    { key: 'p90', color: '#6DB8BC', label: '90th', width: 1.5 },
    { key: 'p95', color: '#6DB8BC', label: '95th', width: 1.5 },
    { key: 'p97', color: '#6DB8BC', label: '97th', width: 2.5 },
  ];

  const datasets = lines.map((line) => ({
    label: line.label,
    data: data.map((d) => ({ x: d.month / 12, y: d[line.key] })),
    borderColor: line.color,
    borderWidth: line.width, // ← 개별 두께 적용
    pointRadius: 0,
    fill: false,
    tension: 0.3,
    showLine: true,
  }));

  // 현재 데이터 포인트 (초록점)
  const ageYears =
    (analysis.value.chronological_age_years || 0) +
    (analysis.value.chronological_age_months || 0) / 12;
  datasets.push({
    label: '현재',
    data: [{ x: ageYears, y: parseFloat(analysis.value.height) || 0 }],
    backgroundColor: '#00e676',
    borderColor: '#00e676',
    pointRadius: 6,
    showLine: false,
  });

  // 비교 사진 (빨간점)
  if (isComparing.value && comparisonRecord.value) {
    const compAge =
      (comparisonRecord.value.chronological_age_years || 0) +
      (comparisonRecord.value.chronological_age_months || 0) / 12;
    datasets.push({
      label: '비교사진',
      data: [{ x: compAge, y: parseFloat(comparisonRecord.value.height) || 0 }],
      backgroundColor: '#ff1744',
      borderColor: '#ff1744',
      pointRadius: 6,
      showLine: false,
    });
  }

  // 이전기록 (회색점)
  if (showComparison.value && previousRecords.value.length > 0) {
    const prevPoints = previousRecords.value
      .filter((r) => r.height)
      .map((r) => ({
        x:
          (r.chronological_age_years || 0) +
          (r.chronological_age_months || 0) / 12,
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
          min: 0,
          max: 19,
          ticks: { color: '#aaa' },
          grid: { color: 'rgba(255,255,255,0.1)' },
        },
        y: {
          title: { display: true, text: '키', color: '#aaa' },
          min: 40,
          max: 200,
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
const toggleHistory = () => {
  showHistory.value = !showHistory.value;
};
const goToRecord = async (id) => {
  showHistory.value = false;
  try {
    const res = await analysisAPI.getDetail(id);
    comparisonRecord.value = res.data.data;
    isComparing.value = true;
    resetZoom('comparison');
    nextTick(() => drawGrowthChart());
  } catch (e) {
    console.error('비교 기록 조회 오류:', e);
  }
};

const closeComparison = () => {
  comparisonRecord.value = null;
  isComparing.value = false;
  resetZoom('comparison');
  nextTick(() => drawGrowthChart());
};

const goToReport = () => {
  if (isDoctorBoneAgeChanged.value) {
    message.showConfirm(
      '변경내용이 저장되지 않았습니다.\n수정된 내용을 저장하고 리포트를 생성하시겠습니까?',
      async () => {
        await saveDoctorBoneAge();
        skipGuard.value = true;
        router.push(`/main/analysis/${route.params.id}/report`);
      },
    );
    return;
  }
  router.push(`/main/analysis/${route.params.id}/report`);
};
const openEditModal = () => {
  modal.open('edit_analysis', 'page', analysis.value);
};

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
  return `/${relativePath}`; // 상대경로 (같은 도메인)
};

// 미저장 이탈 방지
onBeforeRouteLeave((to) => {
  if (skipGuard.value) return true;
  if (!isDoctorBoneAgeChanged.value) return true;

  message.showConfirm(
    '뼈 나이 예측(의사) 정보가 저장되지 않았습니다.\n현재 페이지를 벗어나시겠습니까?',
    () => {
      skipGuard.value = true;
      router.push(to.fullPath);
    },
  );
  return false;
});

onMounted(async () => {
  await fetchAnalysis();
  nextTick(() => drawGrowthChart());
});

// 라우트 변경 시 (이전기록 클릭)
watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      resetZoom('current');
      resetZoom('comparison');
      await fetchAnalysis();
      nextTick(() => drawGrowthChart());
    }
  },
);
</script>
<style lang="scss" scoped>
.has-tooltip {
  display: flex;
  align-items: center;
  .tooltip-wrap {
    display: flex;
    align-items: center;
  }
}
.analysis-result {
  color: $white;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $analysis-gad;
}
.card-top-area {
  display: flex;
  justify-content: center;
  align-items: center;
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
      min-width: 115px;
      background: $dark-input;
      color: $white;
      padding: 9px 12px;
      border: 1px solid $dark-line-gray;
      border-radius: 10px;
      @include font-12-regular;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .arrow-icon {
        width: 16px;
        height: 16px;
        transition: transform 0.2s;
      }
    }

    // 열린 상태: 버튼 하단 모서리 제거하여 리스트와 연결
    &.open .btn-history {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;

      .arrow-icon {
        transform: rotate(180deg);
      }
    }

    .history-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: -1px;
      background: $dark-input;
      border: 1px solid $dark-line-gray;
      border-top: 1px solid $dark-line-gray;
      border-radius: 0 0 10px 10px;
      z-index: 10;
      list-style: none;
      padding: 0;
      overflow: hidden;

      li {
        padding: 12px 9px;
        @include font-12-regular;
        cursor: pointer;
        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }
      }
      .no-record {
        color: $dark-text;
        cursor: default;
        &:hover {
          background: none;
        }
      }
    }
  }

  .patient-info-bar {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    @include font-12-regular;

    b {
      @include font-14-bold;
      margin-right: 4px;
    }
  }

  .btn-edit {
    @include font-14-bold;
    background: $main-color;
    display: flex;
    color: $white;
    border-radius: 4px;
    padding: 4px;
    gap: 4px;
    align-items: center;
    padding-right: 8px;
    cursor: pointer;

    img {
      width: 20px;
      height: 20px;
    }
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
  // width: 45%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 8px;

  .xray-image {
    position: relative;
    max-width: 100%;
    max-height: 100%;
    flex: 1;
    display: flex;
    justify-content: center;

    .img_box {
      position: relative;
      // width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .image-date {
      position: absolute;
      top: 12px;
      left: 12px;
      @include font-12-regular;
      color: $white;
      background: rgba(0, 0, 0, 0.5);
      padding: 4px 8px;
      border-radius: 4px;
    }

    img {
      max-width: 100%;
      max-height: 70vh;
      width: 100%;
      // height: 100%;
      object-fit: contain;
      object-position: center;
      user-select: none;
    }
  }
}

.comparison-image {
  position: relative;

  .btn-close-comparison {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    color: $white;
    @include font-14-bold;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgba(255, 0, 0, 0.6);
    }
  }
}
.dot.red {
  background: #ff1744;
}
// 오른쪽: 결과
.right-panel {
  // width: 55%;
  flex: 1;
  max-width: 729px;
  padding: 20px 24px;
  // overflow-y: auto;
}

// 최종 예측 키
.result-summary {
  background: $bg-op;
  border-radius: $radius-xxl;
  border: $border-op;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .predicted-height {
    display: flex;
    align-items: center;
    column-gap: 20px;
    row-gap: 4px;
    flex-wrap: wrap;
    .label {
      @include font-20-bold;
      display: block;
      color: $dark-text;
      // margin-bottom: 4px;
    }
    .value {
      font-size: 52px;
      font-weight: bold;
      display: flex;
      align-items: center;
      small {
        font-size: 20px;
        margin-left: 4px;
      }
    }
  }

  .age-info {
    text-align: left;
    @include font-14-bold;
    line-height: 1.8;
    .type {
      width: 95px;
      display: inline-block;
    }
    b {
      @include font-16-bold;
      margin-left: 8px;
      &.born {
        font-size: 20px;
      }
    }
  }

  .date-label {
    width: 100%;
    @include font-12-regular;
    color: $dark-text;
  }
}

// 비교 카드 (이전 기록) — 흐릿한 스타일
.comparison-summary {
  .predicted-height {
    .label {
      color: $dark-input-gray;
    }
    .value {
      color: $dark-input-gray;
      small {
        color: $dark-input-gray;
      }
    }
  }
  .age-info {
    color: $dark-input-gray;
    .type {
      color: $dark-input-gray;
    }
    b {
      color: $dark-input-gray;
    }
  }
}

// 의사 판독
.doctor-boneage {
  background: $bg-op;
  border-radius: $radius-xxl;
  border: $border-op;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .label {
    @include font-14-bold;
    color: $dark-text;
  }

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
      @include font-20-bold;

      // 추가
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image: url('/assets/icons/dropdown_icon.svg');
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 12px;
      padding-right: 28px;
    }
    span {
      @include font-14-bold;
    }
  }
  &.has-changes {
    border: 1px solid $sub-color-2;

    .btn-save {
      border: 1px solid $sub-color-2;
    }
  }

  .btn-default {
    @include font-14-bold;
    background: $sub-color;
    color: $white;
    padding: 6px 16px;
    border-radius: $radius-sm;
    cursor: pointer;
    min-width: 71px;
    &:hover {
      opacity: 0.85;
    }
  }

  .btn-save {
    @include font-14-bold;
    background: $main-gad;
    color: $white;
    min-width: 71px;
    padding: 6px 16px;
    border-radius: $radius-sm;
    border: 1px solid transparent;
    cursor: pointer;
    &:hover {
      opacity: 0.85;
    }
  }
}

.doctor-note {
  color: $red;
  @include font-12-regular;
}

// 분석 브리핑
.analysis-briefing {
  background: $bg-op;
  border-radius: $radius-xxl;
  border: $border-op;
  padding: 16px 24px;
  margin-bottom: 16px;

  h4 {
    @include font-14-bold;
    margin-bottom: 8px;
  }
  p {
    @include font-12-regular;
  }
}

// 스코어
.scores {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  .score-card {
    flex: 1;
    background: $bg-op;
    border-radius: $radius-xxl;
    border: $border-op;
    padding: 16px 24px;
    text-align: center;
    position: relative;
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

    .score-value {
      @include font-14-bold;
      position: absolute;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
    }
  }
}

// 탭
.chart-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  // border-bottom: 1px solid $white;

  button {
    padding: 12px 24px;
    background: none;
    color: $white;
    @include font-14-regular;
    cursor: pointer;
    border-bottom: 2px solid $white;
    opacity: 0.2;
    &.active {
      opacity: 1;
      color: $white;
      @include font-14-bold;
      border-bottom-color: $white;
    }
  }
}

// 차트 영역
.chart-area {
  background: $bg-op;
  border-radius: $radius-xxl;
  border: $border-op;
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
        &.green {
          background: #00e676;
        }
        &.gray {
          background: #888;
        }
      }
    }

    .toggle {
      @include font-12-regular;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;

      input {
        cursor: pointer;
      }
    }
  }

  .chart-container {
    height: 300px;
    position: relative;
  }
}

// 예측 키 비교
// 예측 키 비교
.predict-area {
  background: $bg-op;
  border-radius: $radius-xxl;
  border: $border-op;
  padding: 36.5px 20px 14px;
  margin-bottom: 16px;

  .predict-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    padding-top: 16.5px;
    .predict-label {
      width: 100px;
      @include font-14-bold;
      flex-shrink: 0;
      color: $text-white-70;
      text-align: center;
    }
    .predict-value {
      width: 100px;
      @include font-16-bold;
      flex-shrink: 0;
      display: flex;
      gap: 4px;
      align-items: end;
      .unit {
        @include font-14-regular;
      }
    }

    &.final {
      margin-top: 16px;
      padding-top: 16px;
      // border-top: 1px solid $dark-line-gray;
    }
  }

  .slider-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;

    .range-label {
      @include font-12-regular;
      color: $dark-text;
      white-space: nowrap;
    }
  }

  .slider-bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    position: relative;

    .slider-fill {
      height: 100%;
      background: linear-gradient(90deg, #00bcd4, #2196f3);
      border-radius: 4px;
      transition: width 0.3s;
    }

    .slider-handle {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);

      .dot {
        width: 15px;
        height: 15px;
        background: $white;
        border-radius: 50%;
        box-shadow: 0 0 8.6px rgba(255, 255, 255, 0.5);
      }

      .bubble {
        position: absolute;
        bottom: 22px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;

        .bubble-box {
          background: $dark-gray-dark;
          color: $white;
          @include font-12-regular;
          padding: 6px 12px;
          border-radius: 6px;
          text-align: center;
          min-width: 36px;
          color: $text-white-70;
        }

        .bubble-tail {
          display: block;
          width: 12px;
          height: auto;
          margin-top: -1px;
        }
      }
    }

    &:hover .slider-handle .bubble {
      opacity: 1;
    }
  }

  .correction-info {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 16px;
    @include font-12-regular;

    span {
      background: $white-10;
      padding: 8px 16px;
      border-radius: $radius-full;
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

  &:hover {
    opacity: 0.9;
  }
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
