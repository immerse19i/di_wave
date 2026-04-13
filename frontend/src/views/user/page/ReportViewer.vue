<template>
  <div class="report-viewer">
    <FadeLoader v-if="isProcessing" />
    <!-- 상단 툴바 -->
    <div class="toolbar">
      <button class="btn-back" @click="goBack">
        <img src="/assets/icons/arrow_back.svg" alt="뒤로" /> 뒤로가기
      </button>
      <div class="toolbar-right">
        <label
          class="mask-toggle"
          @click.prevent="hidePersonalInfo = !hidePersonalInfo"
        >
          <input type="checkbox" :checked="hidePersonalInfo" />
          <span class="checkmark"></span>
          <span>개인정보 숨기기</span>
        </label>
        <div class="zoom-controls">
          <button @click="zoomOut">
            <img src="/assets/icons/zoom_out.svg" alt="-" />
          </button>
          <span class="zoom-text">{{ zoomLevels[zoomIndex] }}%</span>
          <button @click="zoomIn">
            <img src="/assets/icons/zoom_in.svg" alt="+" />
          </button>
        </div>
        <button class="btn-print" @click="handlePrint">인쇄</button>
        <button class="btn-download" @click="handleDownload">
          리포트 다운로드
        </button>
      </div>
    </div>

    <!-- PDF 미리보기 -->
    <div class="preview-area" @wheel.ctrl.prevent="handleWheel">
      <div v-if="loading" class="loading">리포트 생성 중...</div>
      <div
        v-else
        class="pages-wrapper"
        :style="{ zoom: zoomLevels[zoomIndex] / 100 }"
      >
        <!-- ===== 1페이지: 커버 ===== -->
        <div class="pdf-page cover-page" ref="page1">
          <img class="cover-bg" src="/assets/report/cover.png" />
          <img class="cover-logo" src="/assets/report/osteoage_logo.svg" />
          <div class="title-area">
            <h1 class="cover-title">쑥쑥 성장<br />로드맵 보고서</h1>
          </div>
          <div class="cover-info-box">
            <div class="info-row">
              <span class="label">성명</span>
              <span class="value">{{ displayName }}</span>
            </div>
            <div class="info-row">
              <span class="label">검사일자</span>
              <span class="value">{{ formatDate(analysis?.created_at) }}</span>
            </div>
            <div class="info-row">
              <span class="label">검사병원</span>
              <span class="value">{{ displayHospital }}</span>
            </div>
          </div>
          <img class="cover-diwave" src="/assets/report/diwave_logo.svg" />
        </div>

        <!-- ===== 2페이지: 분석 결과 요약 ===== -->
        <div class="pdf-page" ref="page2">
          <img class="page-header" src="/assets/report/header.svg" />
          <div class="page-top-info">
            <span class="hospital">{{ displayHospital }}</span>
            <span class="file-id"
              ><span class="file-id">{{ displayFileId }}</span></span
            >
            <span class="exam-date"
              >검사일 {{ formatDate(analysis?.created_at) }}</span
            >
          </div>

          <!-- 환자 정보 테이블 -->
          <ul class="patient-info">
            <li>
              <div class="tit">성명</div>
              <div class="value">{{ displayName }}</div>
            </li>
            <li>
              <div class="tit">성별</div>
              <div class="value">
                {{ analysis?.gender === 'M' ? '남' : '여' }}
              </div>
            </li>
            <li>
              <div class="tit">생년월일</div>
              <div class="value">{{ displayBirthDate }}</div>
            </li>
            <li>
              <div class="tit">키</div>
              <div class="value">{{ analysis?.height }} cm</div>
            </li>
            <li>
              <div class="tit">몸무게</div>
              <div class="value">{{ analysis?.weight }} kg</div>
            </li>
          </ul>

          <!-- <table class="patient-table">
            <tr>
              <th>성명</th>
              <td>{{ analysis?.patient_name }}</td>
              <th>성별</th>
              <td>{{ analysis?.gender === 'M' ? '남' : '여' }}</td>
              <th>생년월일</th>
              <td>{{ formatDate(analysis?.birth_date) }}</td>
              <th>키</th>
              <td>{{ analysis?.height }} <small>cm</small></td>
              <th>몸무게</th>
              <td>{{ analysis?.weight }} <small>kg</small></td>
            </tr>
          </table> -->

          <!-- 나이 / Score -->
          <div class="age-score-section">
            <div class="age-row">
              <span class="age-item"
                >만 나이
                <strong
                  >{{ ageDisplay.years }}세
                  {{ String(ageDisplay.months).padStart(2, '0') }}개월</strong
                ></span
              >
              <span class="age-arrow">
                <img
                  src="/assets/icons/arrow_left.svg"
                  alt="arrow"
                  :style="{
                    transform: isBoneAgeGreater ? 'none' : 'rotate(180deg)',
                  }"
                />
              </span>
              <span class="age-item"
                >뼈 나이(AI)
                <strong
                  >{{ analysis?.bone_age_years }}세
                  {{
                    String(analysis?.bone_age_months || 0).padStart(2, '0')
                  }}개월</strong
                ></span
              >
              <span class="age-diff">{{ ageDiffText }}</span>
            </div>
            <div class="score-row">
              <span
                >Height Score
                <strong>{{ resultData?.Height_Score }}/100점</strong></span
              >
              <span
                >Potential Score
                <strong>{{ resultData?.Potential_Score }}/100점</strong></span
              >
            </div>
          </div>

          <!-- 우리 아이 결과표 (백분위) -->
          <div class="gauge-section">
            <h3 class="section-title">우리 아이 결과표 (백분위)</h3>

            <!-- 현재 키 -->
            <div class="gauge-row">
              <div class="gauge-label-box current">현재 키</div>
              <span class="gauge-value"
                ><strong>{{ analysis?.height }}</strong> cm</span
              >
              <div class="gauge-bar-wrapper">
                <div class="small_img">
                  <img
                    class="dino-small"
                    src="/assets/report/dino_marker_small.png"
                  />
                  <span>작음(0)</span>
                </div>
                <div class="gauge-bar">
                  <div
                    class="gauge-fill"
                    :style="{ width: heightPercentile + '%' }"
                  ></div>
                  <div
                    class="gauge-marker"
                    :style="{ left: heightPercentile + '%' }"
                  >
                    <span class="marker-value">{{ heightPercentile }}</span>

                    <img src="/assets/report/dino_marker_progress.png" />
                  </div>
                </div>
                <div class="tall_img">
                  <img
                    class="dino-tall"
                    src="/assets/report/dino_marker_tall.png"
                  />
                  <span>큼(100)</span>
                </div>
              </div>
            </div>

            <!-- 유전 기반 예측 키 -->
            <div class="gauge-row">
              <div class="gauge-label-box genetic">유전 기반<br />예측 키</div>
              <span class="gauge-value"
                ><strong>{{
                  resultData?.Genetic_Predicted_Height || '-'
                }}</strong>
                cm</span
              >
              <div class="gauge-bar-wrapper">
                <div class="small_img">
                  <img
                    class="dino-small"
                    src="/assets/report/dino_marker_small.png"
                  />
                  <span>작음(0)</span>
                </div>
                <div class="gauge-bar">
                  <div
                    class="gauge-fill"
                    :style="{ width: geneticPercentile + '%' }"
                  ></div>
                  <div
                    class="gauge-marker"
                    :style="{ left: geneticPercentile + '%' }"
                  >
                    <span class="marker-value">{{ geneticPercentile }}</span>
                    <img src="/assets/report/dino_marker_progress.png" />
                  </div>
                </div>
                <div class="tall_img">
                  <img
                    class="dino-tall"
                    src="/assets/report/dino_marker_tall.png"
                  />
                  <span>큼(100)</span>
                </div>
              </div>
            </div>

            <!-- 뼈나이 기반 예측 키 -->
            <div class="gauge-row">
              <div class="gauge-label-box bone">뼈나이 기반<br />예측 키</div>
              <span class="gauge-value"
                ><strong>{{
                  resultData?.Growth_Curve_Predicted_Height || '-'
                }}</strong>
                cm</span
              >
              <div class="gauge-bar-wrapper">
                <div class="small_img">
                  <img
                    class="dino-small"
                    src="/assets/report/dino_marker_small.png"
                  />
                  <span>작음(0)</span>
                </div>
                <div class="gauge-bar">
                  <div
                    class="gauge-fill"
                    :style="{ width: boneAgePercentile + '%' }"
                  ></div>
                  <div
                    class="gauge-marker"
                    :style="{ left: boneAgePercentile + '%' }"
                  >
                    <span class="marker-value">{{ boneAgePercentile }}</span>
                    <img src="/assets/report/dino_marker_progress.png" />
                  </div>
                </div>
                <div class="tall_img">
                  <img
                    class="dino-tall"
                    src="/assets/report/dino_marker_tall.png"
                  />
                  <span>큼(100)</span>
                </div>
              </div>
            </div>

            <!-- 보정량 -->
            <div class="correction-row">
              <span class="correction"
                >유전기반 보정량 : {{ resultData?.Delta_Genetic >= 0 ? '+' : ''
                }}{{ resultData?.Delta_Genetic }}cm</span
              >
              <span class="correction"
                >성숙도 기반 보정량 :
                {{ resultData?.Delta_Maturity >= 0 ? '+' : ''
                }}{{ resultData?.Delta_Maturity }}cm</span
              >
            </div>

            <!-- 최종 예측 키 -->
            <div class="gauge-row">
              <div class="gauge-label-box final">최종 예측 키</div>
              <span class="gauge-value"
                ><strong>{{
                  resultData?.Final_Predicted_Height || '-'
                }}</strong>
                cm</span
              >
              <div class="gauge-bar-wrapper">
                <div class="small_img">
                  <img
                    class="dino-small"
                    src="/assets/report/dino_marker_small.png"
                  />
                  <span>작음(0)</span>
                </div>
                <div class="gauge-bar">
                  <div
                    class="gauge-fill"
                    :style="{ width: finalPercentile + '%' }"
                  ></div>
                  <div
                    class="gauge-marker"
                    :style="{ left: finalPercentile + '%' }"
                  >
                    <span class="marker-value">{{ finalPercentile }}</span>
                    <img src="/assets/report/dino_marker_progress.png" />
                  </div>
                </div>
                <div class="tall_img">
                  <img
                    class="dino-tall"
                    src="/assets/report/dino_marker_tall.png"
                  />
                  <span>큼(100)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 스코어 설명 -->
          <div class="score-desc">
            <p>
              <strong>Height Score</strong><br />동일 연령 및 성별 대비 현재
              신장의 위치(백분위)를 나타내는 점수입니다. 100점에 가까울수록 또래
              100명 중 신장이 큰 편에 속함을 의미합니다.
            </p>
            <p>
              <strong>Potential Score</strong><br />실제 나이 대비 골연령의
              성숙도를 바탕으로 산출된 향후 성장 여력 점수입니다.<br />·
              골연령이 실제 나이보다 낮아 성숙이 느릴수록(Late Maturity) 점수가
              높으며, 이는 앞으로 성장할 수 있는 잠재적 시간이 더 많이 남았음을
              시사합니다.<br />· 범위: 뼈의 성숙도 차이를 0~100점으로 환산하며,
              50점은 평균적인 성숙 속도를 의미합니다.
            </p>
          </div>
        </div>

        <!-- ===== 3페이지: 체중/BMI/비만도 + 현재키 기반 예측 키 ===== -->
        <div class="pdf-page" ref="page3">
          <img class="page-header" src="/assets/report/header.svg" />
          <div class="page-top-info">
            <span class="hospital">{{ displayHospital }}</span>
            <span class="file-id"
              ><span class="file-id">{{ displayFileId }}</span></span
            >
            <span class="exam-date"
              >검사일 {{ formatDate(analysis?.created_at) }}</span
            >
          </div>

          <!-- 체중 판정 -->
          <div class="health-gauge">
            <div class="health-title">
              체중
              <strong
                >{{ analysis?.weight }} <span class="unit">kg</span></strong
              >
            </div>
            <div class="right_section">
              <div class="level-bar level-4">
                <span :class="{ active: weightLevel === '저체중' }"
                  >저체중</span
                >
                <span :class="{ active: weightLevel === '정상' }">정상</span>
                <span :class="{ active: weightLevel === '과체중' }"
                  >과체중</span
                >
                <span :class="{ active: weightLevel === '비만' }">비만</span>
              </div>
              <p class="health-desc">
                정상: 연령별 체중 5백분위수 이상이고, 연령별 체질량 지수
                85백분위수 미만<br />
                저체중: 연령별 체중 5백분위수 미만<br />
                과체중: 연령별 체질량 지수 85 ~ 95백분위수<br />
                비만: 연령별 체질량 지수 95백분위수 이상
              </p>
            </div>
          </div>

          <!-- 체질량 지수 -->
          <div class="health-gauge">
            <div class="health-title">
              체질량 지수
              <strong>{{ bmiValue }} <span class="unit">kg/m²</span></strong>
            </div>
            <div class="right_section">
              <div class="level-bar level-4">
                <span :class="{ active: bmiLevel === '저체중' }">저체중</span>
                <span :class="{ active: bmiLevel === '정상' }">정상</span>
                <span :class="{ active: bmiLevel === '과체중' }">과체중</span>
                <span :class="{ active: bmiLevel === '비만' }">비만</span>
              </div>
              <p class="health-desc">
                체질량 지수(BMI: Body Mass Index) = 체중(kg) / (키(m) x
                키(m))<br />체질량 지수 기준: 5th 미만(저체중) / 5th ~
                84th(정상) / 85th ~ 94th(과체중) / 95th 이상(비만)
              </p>
            </div>
          </div>

          <!-- 비만도 -->
          <div class="health-gauge">
            <div class="health-title">
              비만도
              <strong>{{ obesityRate }} <span class="unit">%</span></strong>
            </div>
            <div class="right_section">
              <div class="level-bar level-5">
                <span :class="{ active: obesityLevel === '저체중' }"
                  >저체중</span
                >
                <span :class="{ active: obesityLevel === '정상' }">정상</span>
                <span :class="{ active: obesityLevel === '경도비만' }"
                  >경도비만</span
                >
                <span :class="{ active: obesityLevel === '중등도비만' }"
                  >중등도비만</span
                >
                <span :class="{ active: obesityLevel === '고도비만' }"
                  >고도비만</span
                >
              </div>
              <p class="health-desc">
                비만도 (%) = 표준 체중 대비 백분율(%) = 측정 체중 / 표준 체중 x
                100<br />비만도 기준: 90미만(저체중) / 90~119(정상) /
                120~129(경도비만) / 130~149(중등도비만) / 150이상(고도비만)
              </p>
            </div>
          </div>

          <!-- 현재 키 기반 예측 키 차트 -->
          <div class="chart-section">
            <h3 class="chart-title">현재 키 기반 예측 키</h3>
            <p class="percentile-text">
              백분위 <strong>{{ heightPercentile }}</strong> : 큰 순서로 상위
              <strong>{{ 100 - heightPercentile }}%</strong>에 해당하는 키
              입니다.
            </p>
            <div class="chart-with-desc">
              <canvas ref="chartCanvas3" width="340" height="286"></canvas>
              <div class="chart-right">
                <div class="chart-desc-box">
                  <strong>현재 키 기반 예측 키</strong><br />
                  질병관리청 성장도표를 기반으로 현재의 성장 속도가 성인이 될
                  때까지 유지될 경우를 예측한 결과입니다.
                </div>
                <div class="chart-line-legend">
                  <h4>범례</h4>
                  <div class="line-item">
                    <span class="line dashed"></span> 97th
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 95th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span>
                    <strong>90th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 75th
                  </div>
                  <div class="line-item">
                    <span class="line solid blue"></span>
                    <strong class="blue">50th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 25th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span>
                    <strong>10th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 5th
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 3rd
                  </div>
                </div>
              </div>
            </div>
            <div class="chart-legend">
              <span class="legend-dot current"></span> 현재 키 백분위
              <span class="legend-dot predicted"></span> 예측 키 백분위
            </div>
          </div>
        </div>

        <!-- ===== 4페이지: 유전 기반 + 뼈나이 기반 ===== -->
        <div class="pdf-page" ref="page4">
          <img class="page-header" src="/assets/report/header.svg" />
          <div class="page-top-info">
            <span class="hospital">{{ displayHospital }}</span>
            <span class="file-id"
              ><span class="file-id">{{ displayFileId }}</span></span
            >
            <span class="exam-date"
              >검사일 {{ formatDate(analysis?.created_at) }}</span
            >
          </div>

          <!-- 유전 기반 예측 키 -->
          <div class="chart-section half">
            <h3 class="chart-title">
              유전 기반 예측 키
              <strong>{{
                resultData?.Genetic_Predicted_Height
                  ? resultData.Genetic_Predicted_Height + 'cm'
                  : '-'
              }}</strong>
            </h3>
            <p
              class="percentile-text"
              v-if="resultData?.Genetic_Predicted_Height"
            >
              백분위 <strong>{{ geneticPercentile }}</strong
              >: 큰 순서로 상위
              <strong>{{ 100 - geneticPercentile }}%</strong>에 해당하는 키
              입니다.
            </p>
            <p class="percentile-text" v-else>
              백분위 <strong>-</strong>: 큰 순서로 상위 <strong>-%</strong>에
              해당하는 키 입니다.
            </p>
            <div class="chart-with-desc">
              <canvas ref="chartCanvas4a" width="340" height="286"></canvas>
              <div class="chart-right">
                <div class="chart-desc-box">
                  <strong>유전 기반 예측 키</strong><br />
                  부모의 신장을 바탕으로 산출된 자녀의 유전적 기대
                  신장(Mid-Parental Height)입니다.
                </div>
                <div class="chart-line-legend">
                  <h4>범례</h4>
                  <div class="line-item">
                    <span class="line dashed"></span> 97th
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 95th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span> <strong>90th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 75th
                  </div>
                  <div class="line-item">
                    <span class="line solid blue"></span>
                    <strong class="blue">50th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 25th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span> <strong>10th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 5th
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 3rd
                  </div>
                </div>
              </div>
            </div>
            <div class="chart-legend">
              <span class="legend-dot current"></span> 현재 키 백분위
              <span class="legend-dot predicted"></span> 예측 키 백분위
            </div>
          </div>

          <!-- 뼈나이 기반 예측 키 -->
          <div class="chart-section half">
            <h3 class="chart-title">
              뼈나이 기반 예측 키
              <strong>{{ resultData?.Growth_Curve_Predicted_Height }}cm</strong>
            </h3>
            <p class="percentile-text">
              백분위 <strong>{{ boneAgePercentile }}</strong
              >: 큰 순서로 상위
              <strong>{{ 100 - boneAgePercentile }}%</strong>에 해당하는 키
              입니다.
            </p>
            <div class="chart-with-desc">
              <canvas ref="chartCanvas4b" width="340" height="286"></canvas>
              <div class="chart-right">
                <div class="chart-desc-box">
                  <strong>뼈나이 기반 예측 키</strong><br />
                  AI가 판독한 뼈나이 값과 현재 키를 사용하여 추정한 값입니다.
                </div>
                <div class="chart-line-legend">
                  <h4>범례</h4>
                  <div class="line-item">
                    <span class="line dashed"></span> 97th
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 95th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span> <strong>90th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 75th
                  </div>
                  <div class="line-item">
                    <span class="line solid blue"></span>
                    <strong class="blue">50th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 25th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span> <strong>10th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 5th
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 3rd
                  </div>
                </div>
              </div>
            </div>
            <div class="chart-legend">
              <span class="legend-dot current"></span> 현재 키 백분위
              <span class="legend-dot predicted"></span> 예측 키 백분위
            </div>
          </div>
        </div>

        <!-- ===== 5페이지: 최종 예측 키 ===== -->
        <div class="pdf-page" ref="page5">
          <img class="page-header" src="/assets/report/header.svg" />
          <div class="page-top-info">
            <span class="hospital">{{ displayHospital }}</span>
            <span class="file-id"
              ><span class="file-id">{{ displayFileId }}</span></span
            >
            <span class="exam-date"
              >검사일 {{ formatDate(analysis?.created_at) }}</span
            >
          </div>

          <div class="chart-section">
            <h3 class="chart-title">
              최종 예측 키
              <strong>{{ resultData?.Final_Predicted_Height }}cm</strong>
            </h3>
            <p class="percentile-text">
              백분위 <strong>{{ finalPercentile }}</strong
              >: 큰 순서로 상위 <strong>{{ 100 - finalPercentile }}%</strong>에
              해당하는 키 입니다.
            </p>
            <div class="chart-with-desc">
              <canvas ref="chartCanvas5" width="340" height="286"></canvas>
              <div class="chart-right">
                <div class="chart-desc-box">
                  <strong>최종 예측 키</strong><br />
                  표준 성장 곡선 기반 예측 키에 유전적 요인 및 골연령 성숙도를
                  반영하여 보정한 최종 예측키 입니다.
                </div>
                <div class="chart-line-legend">
                  <h4>범례</h4>
                  <div class="line-item">
                    <span class="line dashed"></span> 97th
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 95th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span> <strong>90th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 75th
                  </div>
                  <div class="line-item">
                    <span class="line solid blue"></span>
                    <strong class="blue">50th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 25th
                  </div>
                  <div class="line-item">
                    <span class="line solid bold"></span> <strong>10th</strong>
                  </div>
                  <div class="line-item">
                    <span class="line solid"></span> 5th
                  </div>
                  <div class="line-item">
                    <span class="line dashed"></span> 3rd
                  </div>
                </div>
              </div>
            </div>
            <div class="chart-legend">
              <span class="legend-dot current"></span> 현재 키 백분위
              <span class="legend-dot predicted"></span> 예측 키 백분위
            </div>
          </div>

          <p class="disclaimer">
            성인 예측 키는 현재 시점의 데이터를 바탕으로 산출된 통계적
            참고치입니다. Osteoage는
            <strong>한국인 소아·청소년의 표준 데이터를 학습</strong>하여 기존
            해외 데이터 기반 모델보다 정밀한 분석을 제공합니다. 그러나 아이의
            건강 상태나 성장 치료 여부, 기타 환경적 요인에 따라 실제 성장은 예측
            결과와 다를 수 있으므로, 최종적인 의학적 판단은 반드시 전문의와
            상담하시기 바랍니다.
          </p>
        </div>

        <!-- 6~15페이지: 공통 이미지 -->
        <div class="pdf-page" v-for="i in 10" :key="'common-' + i">
          <img
            :src="`/assets/report/common_${String(i + 5).padStart(2, '0')}.jpg`"
            style="width: 100%; height: 100%; object-fit: cover"
          />
        </div>
      </div>
    </div>

    <!-- ========== 숨겨진 PDF 렌더링 영역 ========== -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { analysisAPI } from '@/api/analysis';
import growthHeightData from '@/data/growth_height.json';
import growthWeightData from '@/data/growth_weight.json';
import growthBmiData from '@/data/growth_bmi.json';
import FadeLoader from '@/components/common/FadeLoader.vue';
// import html2canvas from 'html2canvas';
// import { jsPDF } from 'jspdf';

const router = useRouter();
const route = useRoute();
const userStore = useAuthStore();

// ===== 상태 =====
const hidePersonalInfo = ref(false);
const loading = ref(true);
const isProcessing = ref(false);
const pdfUrl = ref(null);
const pdfBlob = ref(null);
const analysis = ref(null);
const resultData = ref(null);

// ===== 줌 =====
const zoomLevels = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];
const zoomIndex = ref(5);
const zoomIn = () => {
  if (zoomIndex.value < zoomLevels.length - 1) zoomIndex.value++;
};
const zoomOut = () => {
  if (zoomIndex.value > 0) zoomIndex.value--;
};
const handleWheel = (e) => {
  e.deltaY < 0 ? zoomIn() : zoomOut();
};

// ===== refs =====
const page1 = ref(null);
const page2 = ref(null);
const page3 = ref(null);
const page4 = ref(null);
const page5 = ref(null);
const chartCanvas3 = ref(null);
const chartCanvas4a = ref(null);
const chartCanvas4b = ref(null);
const chartCanvas5 = ref(null);

// ===== 네비게이션 =====
const goBack = () => router.push(`/main/analysis/${route.params.id}`);

// ===== 유틸 =====
const formatDate = (dateStr, sep = '.') => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return sep === '' ? `${y}${m}${day}` : `${y}${sep}${m}${sep}${day}`;
};

const calcAge = (birthDate) => {
  if (!birthDate || !analysis.value) return { years: 0, months: 0 };
  const birth = new Date(birthDate);
  const exam = new Date(analysis.value.created_at);
  let years = exam.getFullYear() - birth.getFullYear();
  let months = exam.getMonth() - birth.getMonth();
  if (exam.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months };
};

// ===== 마스킹 =====
const maskName = (name) => {
  if (!name) return '';
  if (name.length <= 1) return '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
};

const maskHospital = (name) => {
  if (!name) return '';
  if (name.length <= 3) return '*'.repeat(name.length);
  return '***' + name.slice(3);
};

const maskBirthDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.**.**`;
};

const maskFileId = () => {
  const name = analysis.value?.patient_name || '';
  const code = analysis.value?.patient_code || '';
  const id = analysis.value?.id || '';
  const suffix = `${code}_a${id}`;
  const starLen = Math.max(name.length + 1, 6);
  return '*'.repeat(starLen) + suffix;
};

const displayName = computed(() =>
  hidePersonalInfo.value
    ? maskName(analysis.value?.patient_name)
    : analysis.value?.patient_name,
);

const displayHospital = computed(() =>
  hidePersonalInfo.value
    ? maskHospital(userStore.user?.hospital_name)
    : userStore.user?.hospital_name,
);

const displayBirthDate = computed(() =>
  hidePersonalInfo.value
    ? maskBirthDate(analysis.value?.birth_date)
    : formatDate(analysis.value?.birth_date),
);

const displayFileId = computed(() => {
  if (hidePersonalInfo.value) return maskFileId();
  return `${analysis.value?.patient_name}_${formatDate(analysis.value?.birth_date, '')}_a${analysis.value?.id}`;
});

// ===== 데이터 로드 =====
const loadAnalysis = async () => {
  const res = await analysisAPI.getDetail(route.params.id);
  analysis.value = res.data.data;
  resultData.value =
    typeof analysis.value.result_json === 'string'
      ? JSON.parse(analysis.value.result_json)
      : analysis.value.result_json;
};

// ===== computed =====
const ageDisplay = computed(() => calcAge(analysis.value?.birth_date));

const ageMonths = computed(() => {
  const a = ageDisplay.value;
  return a.years * 12 + a.months;
});

const ageDiffText = computed(() => {
  if (!analysis.value) return '';
  const chronoM =
    (analysis.value.chronological_age_years || 0) * 12 +
    (analysis.value.chronological_age_months || 0);
  const boneM =
    (analysis.value.bone_age_years || 0) * 12 +
    (analysis.value.bone_age_months || 0);
  const diff = boneM - chronoM;
  const abs = Math.abs(diff);
  const y = Math.floor(abs / 12);
  const m = abs % 12;
  const text = (y > 0 ? `${y}세 ` : '') + `${String(m).padStart(2, '0')}개월`;
  return `뼈 나이가 ${text} ${diff >= 0 ? '많습니다' : '적습니다'}.`;
});

// 뼈나이가 만나이보다 큰지 (화살표 방향 결정)
const isBoneAgeGreater = computed(() => {
  if (!analysis.value) return false;
  const chronoM =
    (analysis.value.chronological_age_years || 0) * 12 +
    (analysis.value.chronological_age_months || 0);
  const boneM =
    (analysis.value.bone_age_years || 0) * 12 +
    (analysis.value.bone_age_months || 0);
  return boneM > chronoM;
});

// 백분위 계산 함수
const getPercentile = (value, data, months, gender) => {
  if (!value || !gender) return 0;
  const gData = gender === 'M' ? data.male : data.female;
  const row = gData.reduce((prev, curr) =>
    Math.abs(curr.month - months) < Math.abs(prev.month - months) ? curr : prev,
  );
  const pList = [
    { key: 'p3', val: 3 },
    { key: 'p5', val: 5 },
    { key: 'p10', val: 10 },
    { key: 'p25', val: 25 },
    { key: 'p50', val: 50 },
    { key: 'p75', val: 75 },
    { key: 'p90', val: 90 },
    { key: 'p95', val: 95 },
    { key: 'p97', val: 97 },
  ];
  for (let i = 0; i < pList.length - 1; i++) {
    if (value >= row[pList[i].key] && value <= row[pList[i + 1].key]) {
      const ratio =
        (value - row[pList[i].key]) /
        (row[pList[i + 1].key] - row[pList[i].key]);
      return Math.round(
        pList[i].val + ratio * (pList[i + 1].val - pList[i].val),
      );
    }
  }
  return value < row.p3 ? 1 : value > row.p97 ? 99 : 50;
};

// 18세(216개월) 시점의 예측 키 → 백분위
const getPredictedPercentile = (predictedHeight, gender) => {
  if (!predictedHeight || !gender) return 0;
  return getPercentile(
    parseFloat(predictedHeight),
    growthHeightData,
    216,
    gender,
  );
};

const heightPercentile = computed(() =>
  getPercentile(
    parseFloat(analysis.value?.height),
    growthHeightData,
    ageMonths.value,
    analysis.value?.gender,
  ),
);
const geneticPercentile = computed(() =>
  getPredictedPercentile(
    resultData.value?.Genetic_Predicted_Height,
    analysis.value?.gender,
  ),
);
const boneAgePercentile = computed(() =>
  getPredictedPercentile(
    resultData.value?.Growth_Curve_Predicted_Height,
    analysis.value?.gender,
  ),
);
const finalPercentile = computed(() =>
  getPredictedPercentile(
    resultData.value?.Final_Predicted_Height,
    analysis.value?.gender,
  ),
);

// 체중/BMI/비만도
const weightLevel = computed(() => {
  if (!analysis.value) return '';
  const w = parseFloat(analysis.value.weight);
  const wData =
    analysis.value.gender === 'M'
      ? growthWeightData.male
      : growthWeightData.female;
  const row = wData.reduce((prev, curr) =>
    Math.abs(curr.month - ageMonths.value) <
    Math.abs(prev.month - ageMonths.value)
      ? curr
      : prev,
  );
  if (w < row.p5) return '저체중';
  if (bmiPercentile.value >= 95) return '비만';
  if (bmiPercentile.value >= 85) return '과체중';
  return '정상';
});

const bmiValue = computed(() => {
  if (!analysis.value) return '0';
  const h = parseFloat(analysis.value.height) / 100;
  const w = parseFloat(analysis.value.weight);
  return (w / (h * h)).toFixed(2);
});

const bmiPercentile = computed(() =>
  getPercentile(
    parseFloat(bmiValue.value),
    growthBmiData,
    ageMonths.value,
    analysis.value?.gender,
  ),
);

const bmiLevel = computed(() => {
  const p = bmiPercentile.value;
  if (p < 5) return '저체중';
  if (p < 85) return '정상';
  if (p < 95) return '과체중';
  return '비만';
});

const obesityRate = computed(() => {
  if (!analysis.value) return '0';
  const wData =
    analysis.value.gender === 'M'
      ? growthWeightData.male
      : growthWeightData.female;
  const row = wData.reduce((prev, curr) =>
    Math.abs(curr.month - ageMonths.value) <
    Math.abs(prev.month - ageMonths.value)
      ? curr
      : prev,
  );
  return ((parseFloat(analysis.value.weight) / row.p50) * 100).toFixed(1);
});

const obesityLevel = computed(() => {
  const r = parseFloat(obesityRate.value);
  if (r < 90) return '저체중';
  if (r < 120) return '정상';
  if (r < 130) return '경도비만';
  if (r < 150) return '중등도비만';
  return '고도비만';
});

// ===== 성장곡선 차트 그리기 =====
const drawGrowthChart = (canvas, options) => {
  if (!canvas) return;
  const {
    genderData,
    currentAge,
    currentHeight,
    predictedAge,
    predictedHeight,
    xLabel,
  } = options;
  const ctx = canvas.getContext('2d');
  const W = canvas.width,
    H = canvas.height;
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  const margin = { top: 20, right: 10, bottom: 40, left: 50 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const xMin = 36,
    xMax = 216;
  const yMin = 70,
    yMax = 185;

  const toX = (m) => margin.left + ((m - xMin) / (xMax - xMin)) * plotW;
  const toY = (v) => margin.top + ((yMax - v) / (yMax - yMin)) * plotH;

  // 배경
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // 그리드
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  for (let y = yMin; y <= yMax; y += 10) {
    ctx.beginPath();
    ctx.moveTo(margin.left, toY(y));
    ctx.lineTo(W - margin.right, toY(y));
    ctx.stroke();
  }

  // 백분위 라인
  const pKeys = ['p3', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p97'];
  const pLabels = {
    p3: '3rd',
    p5: '5th',
    p10: '10th',
    p25: '25th',
    p50: '50th',
    p75: '75th',
    p90: '90th',
    p95: '95th',
    p97: '97th',
  };
  const filtered = genderData.filter((d) => d.month >= xMin && d.month <= xMax);

  pKeys.forEach((key) => {
    const is50 = key === 'p50';
    const isBold = ['p10', 'p90'].includes(key); // 굵은 실선
    const isDashed = ['p3', 'p25', 'p75', 'p97'].includes(key); // 점선
    // p5, p95 = 얇은 실선 (기본)

    ctx.beginPath();
    ctx.strokeStyle = is50 ? '#4A90D9' : '#c0c0c0';
    ctx.lineWidth = is50 || isBold ? 1 : 0.5;
    if (isDashed) ctx.setLineDash([4, 3]);
    else ctx.setLineDash([]);
    filtered.forEach((d, i) => {
      const x = toX(d.month),
        y = toY(d[key]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // X축
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, H - margin.bottom);
  ctx.lineTo(W - margin.right, H - margin.bottom);
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.font = '10px Pretendard';
  ctx.textAlign = 'center';
  for (let age = 3; age <= 18; age++) {
    ctx.fillText(String(age), toX(age * 12), H - margin.bottom + 15);
  }
  ctx.fillText(xLabel || '만 나이(세)', W / 2, H - 5);

  // Y축
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, H - margin.bottom);
  ctx.stroke();
  ctx.textAlign = 'right';
  for (let y = yMin; y <= yMax; y += 10) {
    ctx.fillText(String(y), margin.left - 5, toY(y) + 4);
  }
  ctx.save();
  ctx.translate(12, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('신장(cm)', 0, 0);
  ctx.restore();

  // 현재 키 점 (초록)
  if (currentAge && currentHeight) {
    ctx.beginPath();
    ctx.fillStyle = '#4ECDC4';
    ctx.arc(toX(currentAge), toY(currentHeight), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 예측 키 점 (빨강)
  if (predictedAge && predictedHeight) {
    ctx.beginPath();
    ctx.fillStyle = '#FF6B6B';
    ctx.arc(toX(predictedAge), toY(predictedHeight), 4, 0, Math.PI * 2);
    ctx.fill();
  }
};

// 현재키의 18세 예측값 (같은 백분위 유지)
const getCurrentHeightPredicted18 = () => {
  if (!analysis.value) return null;
  const gender = analysis.value.gender;
  const gData =
    gender === 'M' ? growthHeightData.male : growthHeightData.female;
  const p = heightPercentile.value;
  const row18 = gData.reduce((prev, curr) =>
    Math.abs(curr.month - 216) < Math.abs(prev.month - 216) ? curr : prev,
  );
  // 백분위에 해당하는 18세 키 값 보간
  const pList = [
    { key: 'p3', val: 3 },
    { key: 'p5', val: 5 },
    { key: 'p10', val: 10 },
    { key: 'p25', val: 25 },
    { key: 'p50', val: 50 },
    { key: 'p75', val: 75 },
    { key: 'p90', val: 90 },
    { key: 'p95', val: 95 },
    { key: 'p97', val: 97 },
  ];
  for (let i = 0; i < pList.length - 1; i++) {
    if (p >= pList[i].val && p <= pList[i + 1].val) {
      const ratio = (p - pList[i].val) / (pList[i + 1].val - pList[i].val);
      return (
        row18[pList[i].key] +
        ratio * (row18[pList[i + 1].key] - row18[pList[i].key])
      );
    }
  }
  return row18.p50;
};

// ===== PDF 생성 =====
// const generatePDF = async () => {
//   const pdf = new jsPDF('p', 'mm', 'a4');
//   const pageWidth = 210;
//   const pageHeight = 297;

//   // ★ 줌 리셋
//   const savedZoom = zoomIndex.value;
//   zoomIndex.value = 5; // 100%
//   await nextTick();

//   const pages = [
//     page1.value,
//     page2.value,
//     page3.value,
//     page4.value,
//     page5.value,
//   ];
//   for (let i = 0; i < pages.length; i++) {
//     if (!pages[i]) continue;
//     const canvas = await html2canvas(pages[i], {
//       scale: 2,
//       useCORS: true,
//       allowTaint: true,
//       backgroundColor: '#ffffff',
//     });
//     const imgData = canvas.toDataURL('image/png');
//     if (i > 0) pdf.addPage();
//     pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
//   }
//   // ★ 줌 복원
//   zoomIndex.value = savedZoom;
//   // 6~15페이지: 공통 이미지
//   for (let i = 6; i <= 15; i++) {
//     pdf.addPage();
//     const img = await loadImage(
//       `/assets/report/common_${String(i).padStart(2, '0')}.jpg`,
//     );
//     pdf.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);
//   }

//   pdfBlob.value = pdf.output('blob');
//   pdfUrl.value = URL.createObjectURL(pdfBlob.value);
//   loading.value = false;
// };

// const loadImage = (src) => {
//   return new Promise((resolve, reject) => {
//     const img = new Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => {
//       const c = document.createElement('canvas');
//       c.width = img.width;
//       c.height = img.height;
//       c.getContext('2d').drawImage(img, 0, 0);
//       resolve(c.toDataURL('image/jpeg', 0.95));
//     };
//     img.onerror = reject;
//     img.src = src;
//   });
// };

// ===== 인쇄 / 다운로드 =====

const handlePrint = async () => {
  if (isProcessing.value) return;
  try {
    isProcessing.value = true;
    const res = await analysisAPI.getReportPdf(
      route.params.id,
      hidePersonalInfo.value,
    );
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  } catch (error) {
    console.error('PDF 인쇄 실패:', error);
  } finally {
    isProcessing.value = false;
  }
};

const handleDownload = async () => {
  if (isProcessing.value) return;
  try {
    isProcessing.value = true;
    const res = await analysisAPI.getReportPdf(
      route.params.id,
      hidePersonalInfo.value,
    );
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = hidePersonalInfo.value
      ? maskName(analysis.value?.patient_name)
      : analysis.value?.patient_name || 'report';
    const date = formatDate(analysis.value?.created_at, '');
    a.download = `${name}_${date}_report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF 다운로드 실패:', error);
  } finally {
    isProcessing.value = false;
  }
};
// ===== 마운트 =====
onMounted(async () => {
  await loadAnalysis();
  loading.value = false; // ★ 먼저 로딩 해제 → v-else DOM 생성
  await nextTick(); // ★ DOM 업데이트 대기
  await document.fonts.ready;

  // 차트 그리기
  const gender = analysis.value.gender;
  const gData =
    gender === 'M' ? growthHeightData.male : growthHeightData.female;

  const curAgeM = ageMonths.value;
  const curH = parseFloat(analysis.value.height);
  const predicted18 = getCurrentHeightPredicted18();

  // 3p: 현재 키 기반 예측 키
  drawGrowthChart(chartCanvas3.value, {
    genderData: gData,
    currentAge: curAgeM,
    currentHeight: curH,
    predictedAge: 216,
    predictedHeight: predicted18,
    xLabel: '만 나이(세)',
  });

  // 4p 상단: 유전 기반
  drawGrowthChart(chartCanvas4a.value, {
    genderData: gData,
    currentAge: curAgeM,
    currentHeight: curH,
    predictedAge: resultData.value?.Genetic_Predicted_Height ? 216 : null,
    predictedHeight: resultData.value?.Genetic_Predicted_Height
      ? parseFloat(resultData.value.Genetic_Predicted_Height)
      : null,
    xLabel: '만 나이(세)',
  });

  // 4p 하단: 뼈나이 기반 (X축 = 뼈나이)
  const boneAgeM =
    (analysis.value.bone_age_years || 0) * 12 +
    (analysis.value.bone_age_months || 0);
  drawGrowthChart(chartCanvas4b.value, {
    genderData: gData,
    currentAge: boneAgeM,
    currentHeight: curH,
    predictedAge: 216,
    predictedHeight: parseFloat(
      resultData.value?.Growth_Curve_Predicted_Height,
    ),
    xLabel: '뼈 나이(세)',
  });
  console.log(
    'height:',
    analysis.value.height,
    'weight:',
    analysis.value.weight,
  );
  // 5p: 최종 예측 키
  drawGrowthChart(chartCanvas5.value, {
    genderData: gData,
    currentAge: curAgeM,
    currentHeight: curH,
    predictedAge: 216,
    predictedHeight: parseFloat(resultData.value?.Final_Predicted_Height),
    xLabel: '만 나이(세)',
  });

  await new Promise((r) => setTimeout(r, 200));
  loading.value = false; // 바로 페이지 표시
});

onUnmounted(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
});
</script>

<style lang="scss" scoped>
.report-viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
}

// ===== 툴바 =====
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: $dark-black;
  // border-bottom: 1px solid #444;
  color: #fff;

  .btn-back {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    img {
      width: 16px;
      filter: brightness(0) invert(1);
    }
  }
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      img {
        width: 18px;
        filter: brightness(0) invert(1);
      }
    }
  }
  .zoom-text {
    min-width: 50px;
    text-align: center;
    font-size: 14px;
  }
  .btn-print,
  .btn-download {
    padding: 6px 16px;
    border: 1px solid #666;
    border-radius: 4px;
    background: none;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    &:hover {
      background: #444;
    }
  }
}

// ===== 미리보기 =====
.preview-area {
  flex: 1;
  overflow: auto;
  background: $dark-black;
  display: flex;
  justify-content: center;
  padding: 20px;
}
.loading {
  color: #fff;
  font-size: 18px;
  align-self: center;
}
.pdf-iframe {
  width: 800px;
  height: 100%;
  border: none;
  transform-origin: top center;
  background: #fff;
}

// ===== 숨겨진 PDF 영역 =====
.pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-bottom: 40px;
  margin: auto;
}

.pdf-page {
  width: 595px;
  height: 842px; // A4 at 96dpi
  background: #fff;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  font-family: 'Pretendard', sans-serif;
  color: #333;
  overflow: hidden;
}

// ===== 공통 헤더/상단 =====
.page-header {
  width: 100%;
  display: block;
}
.page-top-info {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 8px 40px;
  font-size: 11px;
  color: #666;
  .hospital {
    font-weight: bold;
    color: #333;
  }
}

// ===== 1페이지: 커버 =====
.cover-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  // padding: 60px 40px;
  .cover-logo {
    display: block;
    position: relative;
    z-index: 1;
    width: 135px;
    margin-top: 142px;
    margin-bottom: 12px;
  }
  .title-area {
    position: relative;
    z-index: 1;
  }
  .cover-title {
    font-family: $font2-cafe;
    text-align: center;
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    color: #ff7f2f;
    position: relative;
    // margin: px 0;
    &::after {
      -webkit-text-stroke: 8px $white;
      content: '쑥쑥 성장\A로드맵 보고서';
      white-space: pre;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      z-index: -1;
    }
  }
  .cover-info-box {
    border: 1px solid $sub-color-2;
    border-radius: 10px;
    padding: 16px;
    display: inline-flex;
    flex-direction: column;
    row-gap: 10px;
    position: absolute;
    top: 38%;
    z-index: 1;
    background: rgba(255, 255, 255, 0.5);
    .info-row {
      display: flex;
      // gap: 16px;
      // margin: 6px 0;
      font-size: 12px;

      .label {
        font-weight: 700;
        width: 42px;
        margin-right: 20px;
        color: $black;
        white-space: nowrap;
        text-align: Center;
      }
      .value {
        color: $black;
      }
    }
  }
  .cover-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    object-fit: cover;
    // width: 500px; margin-top: 30px;
  }
  .cover-diwave {
    width: 56px;
    position: absolute;
    bottom: 50px;
    z-index: 1;
  }
}

// ===== 2페이지 =====

.patient-info {
  display: flex;
  padding: 16px;
  border-top: 1px solid $line-gray;
  border-bottom: 1px solid $line-gray;
  max-width: 544px;
  margin: auto;
  justify-content: center;
  word-break: keep-all;
  li {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 28px;
    padding-left: 28px;
    white-space: nowrap;
    border-right: 1px solid $line-gray;
    &:first-child {
      padding-left: 0;
    }
    &:last-child {
      border-right: none;
      padding-right: 0;
    }
    .tit {
      @include font-12-regular;
      color: $black;
    }
    .value {
      @include font-16-bold;
      color: $black;
      white-space: nowrap;
    }
  }
}

// .patient-table {
//   width: calc(100% - 80px);
//   margin: 10px 40px;
//   border-collapse: collapse;
//   font-size: 13px;
//   th,
//   td {
//     border: 1px solid #ddd;
//     padding: 8px 12px;
//   }
//   th {
//     background: #f5f7fa;
//     font-weight: 600;
//     white-space: nowrap;
//   }
//   small {
//     color: #888;
//   }
// }

.age-score-section {
  padding: 16px 0;
  max-width: 555px;
  margin: auto;
  .age-row {
    display: flex;
    align-items: center;
    justify-content: center;
    // gap: 12px;
    font-size: 14px;
    font-weight: 400;
    margin-bottom: 12px;
    background: $dark-gray-light;
    border-radius: 999px;
    padding: 8px 20px;
    color: $black;
    gap: 12px;
    span {
      display: flex;
      align-items: center;
      white-space: nowrap;
    }
    .age-item {
      align-items: center;
      gap: 12px;
    }

    .age-arrow {
      max-width: 22px;
      img {
        width: 100%;
      }
    }
    .age-diff {
      color: $black;
      font-size: 10px;
    }
    strong {
      font-weight: 700;
      font-size: 20px;
    }
  }
  .score-row {
    display: flex;
    gap: 64px;
    font-size: 14px;
    background-color: $dark-gray-light;
    border-radius: 999px;
    padding: 8px;
    color: $black;
    font-weight: 400;
    justify-content: center;
    align-items: center;
    span {
      display: flex;
      align-items: center;
      white-space: nowrap;
      // margin-left: 23px;
      gap: 23px;
    }
    strong {
      font-size: 20px;
      font-weight: 700;
      // color: #4a90d9;
    }
  }
}

// ===== 게이지 바 =====
.gauge-section {
  padding: 0 40px;
  .section-title {
    font-size: 16px;
    font-weight: 700;
    margin: 15px 0 10px;
  }
}

.gauge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  .gauge-label-box {
    @include font-14-bold;
    width: 104px;
    height: 46px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px 8px;
    border-radius: 8px;
    text-align: center;

    color: #fff;
    line-height: 1;
    background: $pdf-grad;
    // &.current {
    //   background: #4a90d9;
    // }
    // &.genetic {
    //   background: #5bc0be;
    // }
    // &.bone {
    //   background: #f4a261;
    // }
    // &.final {
    //   background: #e76f51;
    // }
  }
  .gauge-value {
    @include font-14-regular;
    width: 80px;
    text-align: center;

    white-space: nowrap;
    strong {
      @include font-18-bold;
    }
  }
}

.gauge-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;

  .small_img,
  .tall_img {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0; // ★ 줄어들지 않게 고정
    span {
      @include font-12-regular;
      // font-size: 10px;
      color: #888;
      white-space: nowrap;
    }
  }
  .dino-small {
    width: 32px;
    transform: rotateY(-180deg);
  }
  .dino-tall {
    width: 40px;
  }
}

.gauge-bar {
  flex: 1;
  height: 6px;
  position: relative;
  // overflow: hidden;
  border-radius: 8px;
  background-color: $dark-gray;
  .gauge-fill {
    border-radius: 8px;
    background: $pdf-grad;
    height: 100%;
    border-radius: 8px;
    // background: transparent; // fill은 gradient로 이미 표현
  }
  .gauge-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -57%);
    display: flex;
    flex-direction: column;
    align-items: center;
    .marker-value {
      @include font-12-regular;
    }
    img {
      width: 32px;
      max-width: unset;
    }
  }
}

.gauge-range {
  display: flex;
  justify-content: space-between;
  padding: 0 44px 0 44px;
  font-size: 10px;
  color: #888;
  margin-top: -2px;
}

.correction-row {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 6px 0;
  .correction {
    padding: 4px 14px;
    position: relative;
    background: $white;
    // border: 1px solid #ddd;
    border-radius: 20px;
    font-size: 11px;
    color: #666;
    z-index: 1;
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% + 2px);
      height: calc(100% + 2px);
      border-radius: 999px;
      z-index: -1;
      background: $bg-grad-blue-green;
    }
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      z-index: -1;
      background: $white;
      border-radius: 999px;
    }
  }
}

// ===== 스코어 설명 =====
.score-desc {
  padding: 8px 12px;
  font-size: 10px;
  color: $text-gray-2;
  line-height: 1;
  max-width: calc(100% - 40px);
  margin: Auto;
  background: $dark-gray-light;
  // border-top: 1px solid #eee;
  margin-top: 8px;

  p {
    margin: 0 0 8px;
    font-size: 8px;
  }
  strong {
    margin: 4px 0;
    font-size: 10px;
    display: inline-block;
  }
}

// ===== 3페이지: 건강 게이지 =====
.health-gauge {
  padding: 0 40px;
  display: flex;
  gap: 21px;
  margin-bottom: 24px;
  .right_section {
    flex: 1;
  }
  .health-title {
    @include font-14-bold;
    // font-size: 15px;
    min-width: 109px;

    color: $text-gray-2;
    strong {
      // font-size: 20px;
      margin-top: 4px;
      display: block;
      color: $black;
      @include font-20-bold;
      .unit {
        @include font-14-regular;
      }
    }
  }
  .health-desc {
    font-size: 9px;
    color: $text-gray-2;

    margin: 8px 0 0;
    line-height: 1.2;
  }
}

.level-bar {
  display: flex;
  border-radius: 4px;

  overflow: hidden;
  span {
    flex: 1;
    padding: 8px 4px;
    text-align: center;
    @include font-12-regular;
    background: #f0f0f0;
    color: #999;
    border-right: 1px solid #ddd;
    &:last-child {
      border-right: none;
    }
    &.active {
      background: $pdf-grad;
      color: #fff;
      font-weight: 700;
    }
  }
}

// ===== 차트 =====
.chart-section {
  padding: 10px 40px;
  &.half {
    padding: 6px 40px;
  }
  .chart-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
    strong {
      color: #333;
    }
  }
  .percentile-text {
    @include font-14-regular;
    color: $dark-gray-dark;
    margin: 2px 0 8px;
    strong {
      color: $main-color;
    }
  }
}

.chart-with-desc {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  canvas {
    border: 1px solid #eee;
    border-radius: 4px;
  }
  .chart-desc-box {
    width: 156px;
    padding: 8px;
    background: #f6f6f6;
    // border-radius: 6px;
    @include font-10-regular;
    color: #666;
    line-height: 1.5;
    strong {
      display: inline-block;
      color: $black;
      font-size: 11px;
      margin-bottom: 4px;
    }
  }
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  margin-top: 6px;
  font-size: 11px;
  color: #666;
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 4px;
    &.current {
      background: #4ecdc4;
    }
    &.predicted {
      background: #ff6b6b;
    }
  }
}

// ===== 5페이지: 면책 =====
.disclaimer {
  position: absolute;
  bottom: 30px;
  left: 40px;
  right: 40px;
  font-size: 10px;
  color: #888;
  line-height: 1.6;
  strong {
    color: #333;
  }
}

.mask-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  @include font-14-regular;
  color: $white;
  user-select: none;

  input[type='checkbox'] {
    display: none;
  }

  .checkmark {
    width: 18px;
    height: 18px;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-sm;
    display: inline-block;
  }

  input:checked + .checkmark {
    background: url(/assets/icons/check.svg) no-repeat center / 12px;
    background-color: $main-color;
    border-color: $main-color;
  }
}

// chart

.chart-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-line-legend {
  width: 70px;
  padding: 8px;
  background: #f6f6f6;
  font-size: 11px;
  color: #666;

  h4 {
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 6px;
  }

  .line-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
    strong {
      color: #333;
    }
    strong.blue {
      color: #4a90d9;
    }
  }

  .line {
    width: 24px;
    border-top: 1px solid #c0c0c0;
    &.dashed {
      border-top-style: dashed;
    }
    &.bold {
      border-top-width: 2px;
    }
    &.blue {
      border-color: #4a90d9;
      border-top-width: 2px;
    }
  }
}
</style>
