/**
 * PDF 리포트 HTML 템플릿 생성
 * ReportViewer.vue의 로직을 서버사이드로 이식
 */

function generateReportHTML(data) {
  const { analysis, resultData, hospitalName, growthHeight, growthWeight, growthBmi, baseUrl, masked } = data;


    // ===== 유틸 함수 =====
  const formatDate = (dateStr, sep = '.') => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return sep === '' ? `${y}${m}${day}` : `${y}${sep}${m}${sep}${day}`;
  };

  const calcAge = (birthDate) => {
    if (!birthDate) return { years: 0, months: 0 };
    const birth = new Date(birthDate);
    const exam = new Date(analysis.created_at);
    let years = exam.getFullYear() - birth.getFullYear();
    let months = exam.getMonth() - birth.getMonth();
    if (exam.getDate() < birth.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    return { years, months };
  };


  // ===== 마스킹 함수 =====
  const maskName = (name) => {
    if (!name || !masked) return name;
    if (name.length <= 1) return '*';
    if (name.length === 2) return name[0] + '*';
    return name[0] + '**' + name[name.length - 1];
  };

  const maskHospital = (name) => {
    if (!name || !masked) return name;
    if (name.length <= 3) return '***';
    return '***' + name.slice(3);
  };

  const maskBirthDate = (dateStr) => {
    if (!dateStr || !masked) return formatDate(dateStr);
    const d = new Date(dateStr);
    return `${d.getFullYear()}.**.**`;
  };

  const maskFileId = (patientName, birthDate, analysisId) => {
    if (!masked) return `${patientName}_${formatDate(birthDate, '')}_a${analysisId}`;
    return `***_********_a${analysisId}`;
  };



  // ===== 백분위 계산 =====
  const getPercentile = (value, data, months, gender) => {
    if (!value || !gender) return 0;
    const gData = gender === 'M' ? data.male : data.female;
    const row = gData.reduce((prev, curr) =>
      Math.abs(curr.month - months) < Math.abs(prev.month - months) ? curr : prev
    );
    const pList = [
      { key: 'p3', val: 3 }, { key: 'p5', val: 5 }, { key: 'p10', val: 10 },
      { key: 'p25', val: 25 }, { key: 'p50', val: 50 }, { key: 'p75', val: 75 },
      { key: 'p90', val: 90 }, { key: 'p95', val: 95 }, { key: 'p97', val: 97 },
    ];
    for (let i = 0; i < pList.length - 1; i++) {
      if (value >= row[pList[i].key] && value <= row[pList[i + 1].key]) {
        const ratio = (value - row[pList[i].key]) / (row[pList[i + 1].key] - row[pList[i].key]);
        return Math.round(pList[i].val + ratio * (pList[i + 1].val - pList[i].val));
      }
    }
    return value < row.p3 ? 1 : value > row.p97 ? 99 : 50;
  };

  const getPredictedPercentile = (predictedHeight, gender) => {
    if (!predictedHeight || !gender) return 0;
    return getPercentile(parseFloat(predictedHeight), growthHeight, 216, gender);
  };

  // ===== 계산값 산출 =====
  const age = calcAge(analysis.birth_date);
  const ageMonths = age.years * 12 + age.months;
  const gender = analysis.gender;

  const heightPercentile = getPercentile(parseFloat(analysis.height), growthHeight, ageMonths, gender);
  const geneticPercentile = getPredictedPercentile(resultData?.Genetic_Predicted_Height, gender);
  const boneAgePercentile = getPredictedPercentile(resultData?.Growth_Curve_Predicted_Height, gender);
  const finalPercentile = getPredictedPercentile(resultData?.Final_Predicted_Height, gender);

  // BMI
  const h = parseFloat(analysis.height) / 100;
  const w = parseFloat(analysis.weight);
  const bmiValue = (w / (h * h)).toFixed(2);
  const bmiPercentile = getPercentile(parseFloat(bmiValue), growthBmi, ageMonths, gender);

  // 체중 판정
  const wData = gender === 'M' ? growthWeight.male : growthWeight.female;
  const wRow = wData.reduce((prev, curr) =>
    Math.abs(curr.month - ageMonths) < Math.abs(prev.month - ageMonths) ? curr : prev
  );
  let weightLevel = '정상';
  if (w < wRow.p5) weightLevel = '저체중';
  else if (bmiPercentile >= 95) weightLevel = '비만';
  else if (bmiPercentile >= 85) weightLevel = '과체중';

  // BMI 판정
  let bmiLevel = '정상';
  if (bmiPercentile < 5) bmiLevel = '저체중';
  else if (bmiPercentile >= 95) bmiLevel = '비만';
  else if (bmiPercentile >= 85) bmiLevel = '과체중';

  // 비만도
  const obesityRate = ((w / wRow.p50) * 100).toFixed(1);
  let obesityLevel = '정상';
  const oRate = parseFloat(obesityRate);
  if (oRate < 90) obesityLevel = '저체중';
  else if (oRate >= 150) obesityLevel = '고도비만';
  else if (oRate >= 130) obesityLevel = '중등도비만';
  else if (oRate >= 120) obesityLevel = '경도비만';

  // 뼈나이 차이 텍스트
  const chronoM = (analysis.chronological_age_years || 0) * 12 + (analysis.chronological_age_months || 0);
  const boneM = (analysis.bone_age_years || 0) * 12 + (analysis.bone_age_months || 0);
  const diff = boneM - chronoM;
  const absD = Math.abs(diff);
  const diffY = Math.floor(absD / 12);
  const diffMo = absD % 12;
  const diffText = (diffY > 0 ? `${diffY}세 ` : '') + `${String(diffMo).padStart(2, '0')}개월`;
  const ageDiffText = `뼈나이가 ${diffText} ${diff >= 0 ? '많습니다' : '적습니다'}.`;
  const arrowRotate = chronoM > boneM ? 'rotate(180deg)' : 'none';
  // 파일 ID & 표시값
  const displayName = maskName(analysis.patient_name);
  const displayHospital = maskHospital(hospitalName);
  const displayBirthDate = maskBirthDate(analysis.birth_date);
  const fileId = maskFileId(analysis.patient_name, analysis.birth_date, analysis.id);



  // 현재키의 18세 예측값
  const getCurrentHeightPredicted18 = () => {
    const gData = gender === 'M' ? growthHeight.male : growthHeight.female;
    const p = heightPercentile;
    const row18 = gData.reduce((prev, curr) =>
      Math.abs(curr.month - 216) < Math.abs(prev.month - 216) ? curr : prev
    );
    const pList = [
      { key: 'p3', val: 3 }, { key: 'p5', val: 5 }, { key: 'p10', val: 10 },
      { key: 'p25', val: 25 }, { key: 'p50', val: 50 }, { key: 'p75', val: 75 },
      { key: 'p90', val: 90 }, { key: 'p95', val: 95 }, { key: 'p97', val: 97 },
    ];
    for (let i = 0; i < pList.length - 1; i++) {
      if (p >= pList[i].val && p <= pList[i + 1].val) {
        const ratio = (p - pList[i].val) / (pList[i + 1].val - pList[i].val);
        return (row18[pList[i].key] + ratio * (row18[pList[i + 1].key] - row18[pList[i].key])).toFixed(1);
      }
    }
    return row18.p50.toFixed(1);
  };

  const predicted18 = getCurrentHeightPredicted18();

  // 파일 ID
  // const fileId = `${analysis.patient_name}_${formatDate(analysis.birth_date, '')}_a${analysis.id}`;

  // ===== 범례 헬퍼 =====
  const lineLegendHTML = `
    <div class="chart-line-legend">
      <h4>범례</h4>
      <div class="line-item"><span class="line dashed"></span> 97th</div>
      <div class="line-item"><span class="line solid"></span> 95th</div>
      <div class="line-item"><span class="line solid bold"></span> <strong>90th</strong></div>
      <div class="line-item"><span class="line dashed"></span> 75th</div>
      <div class="line-item"><span class="line solid blue"></span> <strong class="blue">50th</strong></div>
      <div class="line-item"><span class="line dashed"></span> 25th</div>
      <div class="line-item"><span class="line solid bold"></span> <strong>10th</strong></div>
      <div class="line-item"><span class="line solid"></span> 5th</div>
      <div class="line-item"><span class="line dashed"></span> 3rd</div>
    </div>`;

  // ===== 게이지 행 헬퍼 =====
  const gaugeRowHTML = (label, value, unit, percentile) => `
    <div class="gauge-row">
      <div class="gauge-label-box">${label}</div>
      <span class="gauge-value"><strong>${value || '-'}</strong> ${unit}</span>
      <div class="gauge-bar-wrapper">
        <div class="small_img">
          <img class="dino-small" src="${baseUrl}/report-assets/dino_marker_small.png" />
          <span>작음(0)</span>
        </div>
        <div class="gauge-bar">
          <div class="gauge-fill" style="width: ${percentile}%"></div>
          <div class="gauge-marker" style="left: ${percentile}%">
            <span class="marker-value">${percentile}</span>
            <img src="${baseUrl}/report-assets/dino_marker_progress.png" />
          </div>
        </div>
        <div class="tall_img">
          <img class="dino-tall" src="${baseUrl}/report-assets/dino_marker_tall.png" />
          <span>큼(100)</span>
        </div>
      </div>
    </div>`;

  // 레벨바 헬퍼
  const levelBarHTML = (levels, activeLevel) =>
    `<div class="level-bar level-${levels.length}">
      ${levels.map(l => `<span class="${l === activeLevel ? 'active' : ''}">${l}</span>`).join('')}
    </div>`;

  // ===== HTML 생성 =====
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Cafe24Ssurround';
      src: url('${baseUrl}/report-fonts/Cafe24Ssurround-v2.0.woff2') format('woff2'),
           url('${baseUrl}/report-fonts/Cafe24Ssurround-v2.0.woff') format('woff'),
           url('${baseUrl}/report-fonts/Cafe24Ssurround-v2.0.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }

    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      margin: 0; font-family: 'Pretendard', sans-serif; background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pdf-page {
      width: 595px; height: 842px;
      page-break-after: always;
      overflow: hidden; position: relative;
      background: #fff; padding: 0;
      font-family: 'Pretendard', sans-serif;
      color: #333;
    }
    .pdf-page:last-child { page-break-after: auto; }

    /* ===== 공통 헤더/상단 ===== */
    .page-header { width: 100%; display: block; }
    .page-top-info {
      display: flex; justify-content: flex-end; gap: 16px;
      padding: 8px 40px; font-size: 11px; color: #666;
    }
    .page-top-info .hospital { font-weight: bold; color: #333; }

    /* ===== 1페이지: 커버 ===== */
    .cover-page {
      display: flex; flex-direction: column; align-items: center;
    }
    .cover-page .cover-bg {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover; z-index: 0;
    }
    .cover-page .cover-logo {
      display: block; width: 135px; margin-top: 142px; margin-bottom: 12px;
      position: relative; z-index: 1;
    }
    .cover-page .title-area {
      position: relative; z-index: 1;
    }
    .cover-page .cover-title {
      font-family: 'Cafe24Ssurround', 'Pretendard', sans-serif;
      text-align: center; font-size: 48px; font-weight: 700;
      line-height: 1; color: #ff7f2f; position: relative;
    }
    .cover-page .cover-title::after {
      -webkit-text-stroke: 8px #ffffff;
      content: '쑥쑥 성장\\A로드맵 보고서'; white-space: pre;
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); width: 100%; z-index: -1;
    }
    .cover-page .cover-info-box {
      border: 1px solid #a8c8e8; border-radius: 10px;
      padding: 16px; display: inline-flex; flex-direction: column; row-gap: 10px;
      position: absolute; top: 38%; z-index: 1;
      background: rgba(255, 255, 255, 0.5);
    }
    .cover-page .cover-info-box .info-row {
      display: flex; font-size: 12px;
    }
    .cover-page .cover-info-box .label {
      font-weight: 700; width: 42px; margin-right: 20px;
      color: #383838; white-space: nowrap; text-align: center;
    }
    .cover-page .cover-info-box .value { color: #383838; }
    .cover-page .cover-diwave { width: 56px; position: absolute; bottom: 50px; z-index: 1; }

    /* ===== 2페이지: 환자정보 ===== */
    .patient-info {
      display: flex; padding: 16px; list-style: none;
      border-top: 1px solid #dfe1e7; border-bottom: 1px solid #dfe1e7;
      max-width: 544px; margin: auto; justify-content: center; word-break: keep-all;
    }
    .patient-info li {
      display: flex; flex-direction: column; gap: 10px;
      padding-right: 28px; padding-left: 28px;
      border-right: 1px solid #dfe1e7;
      white-space: nowrap;
    }
    .patient-info li:first-child { padding-left: 0; }
    .patient-info li:last-child { border-right: none; padding-right: 0; }
    .patient-info .tit { font-size: 12px; font-weight: 400; color: #383838; }
    .patient-info .value { font-size: 16px; font-weight: 700; color: #383838; white-space: nowrap; }

    /* 나이/스코어 */
    .age-score-section { padding: 16px 0; max-width: 555px; margin: auto; }
.age-row {
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 400; margin-bottom: 12px;
  background: #f6f6f6; border-radius: 999px; padding: 8px 20px;
  color: #383838; gap: 12px;
}
    .age-row span { display: flex; align-items: center; white-space: nowrap; }
    .age-row .age-arrow { max-width: 22px; }
    .age-row .age-item { align-items: center; gap: 12px; }
    .age-row .age-arrow img { width: 100%; }
    .age-row .age-diff { color: #383838; font-size: 10px; }
    .age-row strong { font-weight: 700; font-size: 20px; }
    .score-row {
      display: flex; gap: 64px; font-size: 14px;
      background-color: #f6f6f6; border-radius: 999px;
      padding: 8px; color: #383838; font-weight: 400;
      justify-content: center; align-items: center;
    }
    .score-row span { display: flex; align-items: center; white-space: nowrap; gap: 23px; }
    .score-row strong { font-size: 20px; font-weight: 700; }

    /* ===== 게이지 바 ===== */
    .gauge-section { padding: 0 40px; }
    .gauge-section .section-title { font-size: 16px; font-weight: 700; margin: 15px 0 10px; }
    .gauge-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .gauge-label-box {
      width: 104px; height: 46px; display: flex;
      justify-content: center; align-items: center;
      padding: 6px 8px; border-radius: 8px; text-align: center;
      font-size: 14px; font-weight: 700; color: #fff; line-height: 1;
      background: linear-gradient(270deg, #2DB7AE 0%, #285989 100%);
    }
.gauge-value { width: 80px; text-align: center; font-size: 14px; font-weight: 400; white-space: nowrap; }
.gauge-value strong { font-size: 18px; font-weight: 700; }
    .gauge-bar-wrapper {
      flex: 1; display: flex; align-items: center; gap: 6px;
    }
    .small_img, .tall_img {
      display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
    }
    .small_img span, .tall_img span { font-size: 12px; color: #888; white-space: nowrap; }
   .dino-small { width: 32px; transform: rotateY(-180deg); }
    .dino-tall { width: 40px; }
.gauge-bar {
  flex: 1; height: 6px; border-radius: 8px; position: relative;
  background-color: #dfe1e7;
}
.gauge-fill { height: 100%; border-radius: 8px; background: linear-gradient(270deg, #2DB7AE 0%, #285989 100%); }
    .gauge-marker {
      position: absolute; top: 50%; transform: translate(-50%, -57%);
      display: flex; flex-direction: column; align-items: center;
    }
    .gauge-marker .marker-value { font-size: 12px; font-weight: 400; }
    .gauge-marker img { width: 32px; max-width: unset; }

    /* 보정량 */
    .correction-row { display: flex; justify-content: center; gap: 30px; margin: 6px 0; }
.correction {
  padding: 4px 14px; position: relative;
  background: #fff; border-radius: 20px;
  font-size: 11px; color: #666; z-index: 1;
}
.correction::before {
  content: ''; position: absolute;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: calc(100% + 2px); height: calc(100% + 2px);
  border-radius: 999px; z-index: -1;
  background: linear-gradient(270deg, #2DB7AE 0%, #285989 100%);
}
.correction::after {
  content: ''; position: absolute;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100%; height: 100%;
  z-index: -1; background: #fff; border-radius: 999px;
}

    /* 스코어 설명 */
.score-desc {
  padding: 8px 12px; font-size: 10px; color: #737373;
  line-height: 1; max-width: calc(100% - 40px);
  margin: 8px auto 0; background: #f6f6f6;
}
.score-desc p { margin: 0 0 8px; font-size: 8px; }
.score-desc strong { margin: 4px 0; font-size: 10px; display: inline-block; }

    /* ===== 3페이지: 건강 게이지 ===== */
    .health-gauge { padding: 0 40px; display: flex; gap: 21px; margin-bottom: 24px; }
.health-gauge .right_section { flex: 1; }
.health-gauge .health-title { font-size: 14px; font-weight: 700; min-width: 109px; color: #737373; }
.health-gauge .health-title strong { margin-top: 4px; display: block; color: #383838; font-size: 20px; font-weight: 700; }
.health-gauge .health-title strong .unit { font-size: 14px; font-weight: 400; }
.health-gauge .health-desc { font-size: 9px; color: #737373; margin: 8px 0 0; line-height: 1.2; }

    .level-bar {
      display: flex; border-radius: 4px; overflow: hidden;
    }
    .level-bar span {
      flex: 1; padding: 8px 4px; text-align: center;
      font-size: 12px; background: #f0f0f0; color: #999;
      border-right: 1px solid #ddd;
    }
    .level-bar span:last-child { border-right: none; }
    .level-bar span.active {
      background: linear-gradient(270deg, #2DB7AE 0%, #285989 100%);
      color: #fff; font-weight: 700;
    }

    /* ===== 차트 ===== */
    .chart-section { padding: 10px 40px; }
    .chart-section.half { padding: 6px 40px; }
    .chart-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .chart-title strong { color: #333; }
.percentile-text { font-size: 14px; font-weight: 400; color: #4e545c; margin: 2px 0 8px; }
.percentile-text strong { color: #305b86; }


    .chart-with-desc { display: flex; gap: 12px; align-items: flex-start; }
    .chart-with-desc canvas { border: 1px solid #eee; border-radius: 4px; }
.chart-desc-box {
  width: 156px; padding: 8px; background: #f6f6f6;
  font-size: 10px; font-weight: 400; color: #666; line-height: 1.5;
}
.chart-desc-box strong { display: inline-block; color: #383838; font-size: 11px; margin-bottom: 4px; }
    .chart-legend {
      display: flex; align-items: center; gap: 16px;
      justify-content: center; margin-top: 6px; font-size: 11px; color: #666;
    }
    .legend-dot {
      width: 10px; height: 10px; border-radius: 50%;
      display: inline-block; margin-right: 4px;
    }
    .legend-dot.current { background: #4ecdc4; }
    .legend-dot.predicted { background: #ff6b6b; }

    /* ===== 차트 오른쪽 패널 ===== */
    .chart-right { display: flex; flex-direction: column; gap: 8px; }
    .chart-line-legend {
      width: 70px; padding: 8px; background: #f6f6f6;
      font-size: 11px; color: #666;
    }
    .chart-line-legend h4 { font-size: 12px; font-weight: 700; text-align: center; margin-bottom: 6px; }
    .chart-line-legend .line-item { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
    .chart-line-legend .line-item strong { color: #333; }
    .chart-line-legend .line-item strong.blue { color: #4A90D9; }
    .chart-line-legend .line { width: 24px; border-top: 1px solid #c0c0c0; }
    .chart-line-legend .line.dashed { border-top-style: dashed; }
    .chart-line-legend .line.bold { border-top-width: 2px; }
    .chart-line-legend .line.blue { border-color: #4A90D9; border-top-width: 2px; }

    /* ===== 5페이지: 면책 ===== */
    .disclaimer {
      position: absolute; bottom: 30px; left: 40px; right: 40px;
      font-size: 10px; color: #888; line-height: 1.6;
    }
    .disclaimer strong { color: #333; }
  </style>
</head>
<body>

  <!-- ===== 1페이지: 커버 ===== -->
  <div class="pdf-page cover-page">
    <img class="cover-bg" src="${baseUrl}/report-assets/cover.png" />
    <img class="cover-logo" src="${baseUrl}/report-assets/osteoage_logo.svg" />
    <div class="title-area"><h1 class="cover-title">쑥쑥 성장<br/>로드맵 보고서</h1></div>
    <div class="cover-info-box">
      <div class="info-row"><span class="label">성명</span><span class="value">${displayName}</span></div>
      <div class="info-row"><span class="label">검사일자</span><span class="value">${formatDate(analysis.created_at)}</span></div>
      <div class="info-row"><span class="label">검사병원</span><span class="value">${displayHospital}</span></div>
    </div>
    <img class="cover-diwave" src="${baseUrl}/report-assets/diwave_logo.svg" />
  </div>

  <!-- ===== 2페이지: 분석 결과 요약 ===== -->
  <div class="pdf-page">
    <img class="page-header" src="${baseUrl}/report-assets/header.svg" />
    <div class="page-top-info">
      <span class="hospital">${displayHospital}</span>
      <span>${fileId}</span>
      <span>검사일 ${formatDate(analysis.created_at)}</span>
    </div>

    <ul class="patient-info">
      <li><div class="tit">성명</div><div class="value">${displayName}</div></li>
      <li><div class="tit">성별</div><div class="value">${gender === 'M' ? '남' : '여'}</div></li>
      <li><div class="tit">생년월일</div><div class="value">${displayBirthDate}</div></li>
      <li><div class="tit">키</div><div class="value">${analysis.height} cm</div></li>
      <li><div class="tit">몸무게</div><div class="value">${analysis.weight} kg</div></li>
    </ul>

    <div class="age-score-section">
      <div class="age-row">
        <span>만나이 <strong>${age.years}세 ${String(age.months).padStart(2, '0')}개월</strong></span>
        <span class="age-arrow"><img src="${baseUrl}/report-assets/arrow_left.svg" style="width:22px;transform:${arrowRotate}" /></span>
        <span>뼈 나이(AI) <strong>${analysis.bone_age_years}세 ${String(analysis.bone_age_months || 0).padStart(2, '0')}개월</strong></span>
        <span class="age-diff">${ageDiffText}</span>
      </div>
      <div class="score-row">
        <span>Height Score <strong>${resultData?.Height_Score || '-'}/100점</strong></span>
        <span>Potential Score <strong>${resultData?.Potential_Score || '-'}/100점</strong></span>
      </div>
    </div>

    <div class="gauge-section">
      <h3 class="section-title">우리 아이 결과표 (백분위)</h3>
      ${gaugeRowHTML('현재 키', analysis.height, 'cm', heightPercentile)}
      ${gaugeRowHTML('유전 기반<br/>예측 키', resultData?.Genetic_Predicted_Height || '-', 'cm', geneticPercentile)}
      ${gaugeRowHTML('뼈나이 기반<br/>예측 키', resultData?.Growth_Curve_Predicted_Height || '-', 'cm', boneAgePercentile)}

      <div class="correction-row">
        <span class="correction">유전기반 보정량 : ${resultData?.Delta_Genetic >= 0 ? '+' : ''}${resultData?.Delta_Genetic}cm</span>
        <span class="correction">성숙도 기반 보정량 : ${resultData?.Delta_Maturity >= 0 ? '+' : ''}${resultData?.Delta_Maturity}cm</span>
      </div>

      ${gaugeRowHTML('최종 예측 키', resultData?.Final_Predicted_Height || '-', 'cm', finalPercentile)}
    </div>

    <div class="score-desc">
      <p><strong>Height Score</strong><br/>동일 연령 및 성별 대비 현재 신장의 위치(백분위)를 나타내는 점수입니다. 100점에 가까울수록 또래 100명 중 신장이 큰 편에 속함을 의미합니다.</p>
      <p><strong>Potential Score</strong><br/>실제 나이 대비 골연령의 성숙도를 바탕으로 산출된 향후 성장 여력 점수입니다.<br/>· 골연령이 실제 나이보다 낮아 성숙이 느릴수록(Late Maturity) 점수가 높으며, 이는 앞으로 성장할 수 있는 잠재적 시간이 더 많이 남았음을 시사합니다.<br/>· 범위: 뼈의 성숙도 차이를 0~100점으로 환산하며, 50점은 평균적인 성숙 속도를 의미합니다.</p>
    </div>
  </div>

  <!-- ===== 3페이지: 체중/BMI/비만도 + 현재키 기반 예측 키 ===== -->
  <div class="pdf-page">
    <img class="page-header" src="${baseUrl}/report-assets/header.svg" />
    <div class="page-top-info">
      <span class="hospital">${displayHospital}</span>
      <span>${fileId}</span>
      <span>검사일 ${formatDate(analysis.created_at)}</span>
    </div>

    <div class="health-gauge">
      <div class="health-title">체중 <strong>${analysis.weight} <span class="unit">kg</span></strong></div>
      <div class="right_section">
      ${levelBarHTML(['저체중', '정상', '과체중', '비만'], weightLevel)}
      <p class="health-desc">정상: 연령별 체중 5백분위수 이상이고, 연령별 체질량 지수 85백분위수 미만<br/>저체중: 연령별 체중 5백분위수 미만<br/>과체중: 연령별 체질량 지수 85 ~ 95백분위수<br/>비만: 연령별 체질량 지수 95백분위수 이상</p>
      
      </div>
    </div>

    <div class="health-gauge">
      <div class="health-title">체질량 지수 <strong>${bmiValue} <span class="unit">kg/m&sup2;</span></strong></div>
      <div class="right_section">
      ${levelBarHTML(['저체중', '정상', '과체중', '비만'], bmiLevel)}
      <p class="health-desc">체질량 지수(BMI: Body Mass Index) = 체중(kg) / (키(m) x 키(m))<br/>체질량 지수 기준: 5th 미만(저체중) / 5th ~ 84th(정상) / 85th ~ 94th(과체중) / 95th 이상(비만)</p>
      
      </div>
    </div>

    <div class="health-gauge">
      <div class="health-title">비만도 <strong>${obesityRate} <span class="unit">%</span></strong></div>
      <div class="right_section">
      ${levelBarHTML(['저체중', '정상', '경도비만', '중등도비만', '고도비만'], obesityLevel)}
      <p class="health-desc">비만도 (%) = 표준 체중 대비 백분율(%) = 측정 체중 / 표준 체중 x 100<br/>비만도 기준: 90미만(저체중) / 90~119(정상) / 120~129(경도비만) / 130~149(중등도비만) / 150이상(고도비만)</p>
      </div>
    </div>

    <div class="chart-section">
      <h3 class="chart-title">현재 키 기반 예측 키</h3>
      <p class="percentile-text">백분위 <strong>${heightPercentile}</strong> : 큰 순서로 상위 <strong>${100 - heightPercentile}%</strong>에 해당하는 키 입니다.</p>
      <div class="chart-with-desc">
        <canvas id="chart3" width="340" height="286"></canvas>
        <div class="chart-right">
          ${lineLegendHTML}
          <div class="chart-desc-box">
            <strong>현재 키 기반 예측 키</strong>
            질병관리청 성장도표를 기반으로 현재의 성장 속도가 성인이 될 때까지 유지될 경우를 예측한 결과입니다.
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
  <div class="pdf-page">
    <img class="page-header" src="${baseUrl}/report-assets/header.svg" />
    <div class="page-top-info">
      <span class="hospital">${displayHospital}</span>
      <span>${fileId}</span>
      <span>검사일 ${formatDate(analysis.created_at)}</span>
    </div>

    <div class="chart-section half">
      <h3 class="chart-title">유전 기반 예측 키 <strong>${resultData?.Genetic_Predicted_Height ? resultData.Genetic_Predicted_Height + 'cm' : '-'}</strong></h3>
      <p class="percentile-text">${resultData?.Genetic_Predicted_Height
        ? `백분위 <strong>${geneticPercentile}</strong> : 큰 순서로 상위 <strong>${100 - geneticPercentile}%</strong>에 해당하는 키 입니다.`
        : '백분위 <strong>-</strong> : 큰 순서로 상위 <strong>-%</strong>에 해당하는 키 입니다.'}</p>
      <div class="chart-with-desc">
        <canvas id="chart4a" width="340" height="286"></canvas>
        <div class="chart-right">
          ${lineLegendHTML}
          <div class="chart-desc-box">
            <strong>유전 기반 예측 키</strong>
            부모의 신장을 바탕으로 산출된 자녀의 유전적 기대 신장(Mid-Parental Height)입니다.
          </div>
        </div>
      </div>
      <div class="chart-legend">
        <span class="legend-dot current"></span> 현재 키 백분위
        <span class="legend-dot predicted"></span> 예측 키 백분위
      </div>
    </div>

    <div class="chart-section half">
      <h3 class="chart-title">뼈나이 기반 예측 키 <strong>${resultData?.Growth_Curve_Predicted_Height}cm</strong></h3>
      <p class="percentile-text">백분위 <strong>${boneAgePercentile}</strong> : 큰 순서로 상위 <strong>${100 - boneAgePercentile}%</strong>에 해당하는 키 입니다.</p>
      <div class="chart-with-desc">
        <canvas id="chart4b" width="340" height="286"></canvas>
        <div class="chart-right">
          ${lineLegendHTML}
          <div class="chart-desc-box">
            <strong>뼈나이 기반 예측 키</strong>
            AI가 판독한 뼈나이 값과 현재 키를 사용하여 추정한 값입니다.
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
  <div class="pdf-page">
    <img class="page-header" src="${baseUrl}/report-assets/header.svg" />
    <div class="page-top-info">
      <span class="hospital">${displayHospital}</span>
      <span>${fileId}</span>
      <span>검사일 ${formatDate(analysis.created_at)}</span>
    </div>

    <div class="chart-section">
      <h3 class="chart-title">최종 예측 키 <strong>${resultData?.Final_Predicted_Height}cm</strong></h3>
      <p class="percentile-text">백분위 <strong>${finalPercentile}</strong> : 큰 순서로 상위 <strong>${100 - finalPercentile}%</strong>에 해당하는 키 입니다.</p>
      <div class="chart-with-desc">
        <canvas id="chart5" width="340" height="286"></canvas>
        <div class="chart-right">
          ${lineLegendHTML}
          <div class="chart-desc-box">
            <strong>최종 예측 키</strong>
            표준 성장 곡선 기반 예측 키에 유전적 요인 및 골연령 성숙도를 반영하여 보정한 최종 예측키 입니다.
          </div>
        </div>
      </div>
      <div class="chart-legend">
        <span class="legend-dot current"></span> 현재 키 백분위
        <span class="legend-dot predicted"></span> 예측 키 백분위
      </div>
    </div>

    <p class="disclaimer">성인 예측 키는 현재 시점의 데이터를 바탕으로 산출된 통계적 참고치입니다. Osteoage는 <strong>한국인 소아·청소년의 표준 데이터를 학습</strong>하여 기존 해외 데이터 기반 모델보다 정밀한 분석을 제공합니다. 그러나 아이의 건강 상태나 성장 치료 여부, 기타 환경적 요인에 따라 실제 성장은 예측 결과와 다를 수 있으므로, 최종적인 의학적 판단은 반드시 전문의와 상담하시기 바랍니다.</p>
  </div>

  <!-- ===== 6~15페이지: 공통 이미지 ===== -->
  ${Array.from({length: 10}, (_, i) => `
  <div class="pdf-page">
    <img src="${baseUrl}/report-assets/common_${String(i + 6).padStart(2, '0')}.jpg"
         style="width:100%;height:100%;object-fit:cover" />
  </div>`).join('')}

  <!-- ===== 차트 그리기 스크립트 ===== -->
  <script>
    function drawGrowthChart(canvas, options) {
      if (!canvas) return;
      var genderData = options.genderData;
      var currentAge = options.currentAge;
      var currentHeight = options.currentHeight;
      var predictedAge = options.predictedAge;
      var predictedHeight = options.predictedHeight;
      var xLabel = options.xLabel;
      var ctx = canvas.getContext('2d');
      var W = canvas.width, H = canvas.height;
      var dpr = 2;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);
      var margin = { top: 20, right: 10, bottom: 40, left: 50 };
      var plotW = W - margin.left - margin.right;
      var plotH = H - margin.top - margin.bottom;
      var xMin = 36, xMax = 216;
      var yMin = 70, yMax = 185;
      function toX(m) { return margin.left + ((m - xMin) / (xMax - xMin)) * plotW; }
      function toY(v) { return margin.top + ((yMax - v) / (yMax - yMin)) * plotH; }

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5;

      for (var y = yMin; y <= yMax; y += 10) {
        ctx.beginPath(); ctx.moveTo(margin.left, toY(y));
        ctx.lineTo(W - margin.right, toY(y)); ctx.stroke();
      }

      var pKeys = ['p3','p5','p10','p25','p50','p75','p90','p95','p97'];
      var pLabels = { p3:'3rd', p5:'5th', p10:'10th', p25:'25th', p50:'50th', p75:'75th', p90:'90th', p95:'95th', p97:'97th' };
      var filtered = genderData.filter(function(d) { return d.month >= xMin && d.month <= xMax; });

      pKeys.forEach(function(key) {
        var is50 = key === 'p50';
        var isBold = key === 'p10' || key === 'p90';
        var isDashed = key === 'p3' || key === 'p25' || key === 'p75' || key === 'p97';
        ctx.beginPath();
        ctx.strokeStyle = is50 ? '#4A90D9' : '#c0c0c0';
        ctx.lineWidth = (is50 || isBold) ? 1 : 0.5;
        if (isDashed) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
        filtered.forEach(function(d, i) {
          var x = toX(d.month), y = toY(d[key]);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke(); ctx.setLineDash([]);
      });

      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(margin.left, H - margin.bottom);
      ctx.lineTo(W - margin.right, H - margin.bottom); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.font = '10px Pretendard'; ctx.textAlign = 'center';
      for (var a = 3; a <= 18; a++) ctx.fillText(String(a), toX(a * 12), H - margin.bottom + 15);
      ctx.fillText(xLabel || '만 나이(세)', W / 2, H - 5);

      ctx.beginPath(); ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, H - margin.bottom); ctx.stroke();
      ctx.textAlign = 'right';
      for (var y2 = yMin; y2 <= yMax; y2 += 10) ctx.fillText(String(y2), margin.left - 5, toY(y2) + 4);
      ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText('신장(cm)', 0, 0); ctx.restore();

      if (currentAge && currentHeight) {
        ctx.beginPath(); ctx.fillStyle = '#4ECDC4';
        ctx.arc(toX(currentAge), toY(currentHeight), 4, 0, Math.PI * 2); ctx.fill();
      }
      if (predictedAge && predictedHeight) {
        ctx.beginPath(); ctx.fillStyle = '#FF6B6B';
        ctx.arc(toX(predictedAge), toY(predictedHeight), 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    var gData = ${JSON.stringify(gender === 'M' ? growthHeight.male : growthHeight.female)};
    var curAgeM = ${ageMonths};
    var curH = ${parseFloat(analysis.height)};
    var boneAgeM = ${boneM};

    drawGrowthChart(document.getElementById('chart3'), {
      genderData: gData, currentAge: curAgeM, currentHeight: curH,
      predictedAge: 216, predictedHeight: ${predicted18}, xLabel: '만 나이(세)'
    });

    drawGrowthChart(document.getElementById('chart4a'), {
      genderData: gData, currentAge: curAgeM, currentHeight: curH,
      predictedAge: ${resultData?.Genetic_Predicted_Height ? 216 : 'null'},
      predictedHeight: ${resultData?.Genetic_Predicted_Height ? parseFloat(resultData.Genetic_Predicted_Height) : 'null'},
      xLabel: '만 나이(세)'
    });

    drawGrowthChart(document.getElementById('chart4b'), {
      genderData: gData, currentAge: boneAgeM, currentHeight: curH,
      predictedAge: 216,
      predictedHeight: ${resultData?.Growth_Curve_Predicted_Height ? parseFloat(resultData.Growth_Curve_Predicted_Height) : 'null'},
      xLabel: '뼈 나이(세)'
    });

    drawGrowthChart(document.getElementById('chart5'), {
      genderData: gData, currentAge: curAgeM, currentHeight: curH,
      predictedAge: 216,
      predictedHeight: ${resultData?.Final_Predicted_Height ? parseFloat(resultData.Final_Predicted_Height) : 'null'},
      xLabel: '만 나이(세)'
    });

    window.__reportReady = true;
  </script>
</body>
</html>`;
}

module.exports = { generateReportHTML };
