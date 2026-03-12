/**
 * PDF 리포트 HTML 템플릿 생성
 * ReportViewer.vue의 로직을 서버사이드로 이식
 */

function generateReportHTML(data) {
  const { analysis, resultData, hospitalName, growthHeight, growthWeight, growthBmi, baseUrl } = data;

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

  // ===== 백분위 계산 (ReportViewer.vue L689-717 이식) =====
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

  // 현재키의 18세 예측값 (같은 백분위 유지 시)
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

  // ===== HTML 생성 =====
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; font-family: 'Pretendard', sans-serif; background: #fff; }

    .pdf-page {
      width: 210mm; height: 297mm;
      page-break-after: always;
      overflow: hidden; position: relative;
    }
    .pdf-page:last-child { page-break-after: auto; }

    /* ===== 여기에 ReportViewer.vue의 scoped CSS를 순수 CSS로 변환하여 붙여넣기 ===== */
    /* $pdf-grad → linear-gradient(270deg, #2DB7AE 0%, #285989 100%) */
    /* 기타 SCSS 변수 → 실제 값으로 치환 */

    /* 커버 페이지 */
    .cover-page { display: flex; flex-direction: column; align-items: center; padding-top: 120px; }
    .cover-logo { width: 135px; }
    .cover-title { font-size: 48px; text-align: center; color: #FF8C42; margin-top: 40px; line-height: 1.3; }
    .cover-info-box { border: 2px solid #4a90d9; border-radius: 8px; padding: 20px 40px; margin-top: 60px; }
    .cover-info-box .info-row { display: flex; gap: 20px; margin: 8px 0; }
    .cover-info-box .label { color: #4a90d9; font-weight: 600; min-width: 80px; }
    .cover-info-box .value { font-weight: 500; }
    .cover-bg { display: none; }
    .cover-diwave { width: 140px; position: absolute; bottom: 40px; right: 40px; }

    /* 페이지 헤더 */
    .page-header { width: 100%; }

    /* 게이지 바 */
    .gauge-bar-wrapper { display: flex; align-items: center; gap: 8px; }
    .gauge-bar { flex: 1; height: 20px; background: #e0e0e0; border-radius: 10px; position: relative; }
    .gauge-fill { height: 100%; border-radius: 10px; background: linear-gradient(270deg, #2DB7AE 0%, #285989 100%); }
    .gauge-marker { position: absolute; top: -8px; transform: translateX(-50%); }

    /* ... 나머지 CSS ... */
  </style>
</head>
<body>

  <!-- ===== 1페이지: 커버 ===== -->
  <div class="pdf-page cover-page">
    <img class="cover-logo" src="${baseUrl}/report-assets/osteoage_logo.svg" />
    <h1 class="cover-title">쑥쑥 성장<br/>로드맵 보고서</h1>
    <div class="cover-info-box">
      <div class="info-row"><span class="label">성명</span><span class="value">${analysis.patient_name}</span></div>
      <div class="info-row"><span class="label">검사일자</span><span class="value">${formatDate(analysis.created_at)}</span></div>
      <div class="info-row"><span class="label">검사병원</span><span class="value">${hospitalName}</span></div>
    </div>
    <img class="cover-diwave" src="${baseUrl}/report-assets/diwave_logo.svg" />
  </div>

  <!-- ===== 2페이지: 분석 결과 요약 ===== -->
  <div class="pdf-page">
    <img class="page-header" src="${baseUrl}/report-assets/header.svg" />
    <!-- 환자정보, 나이, 스코어, 게이지 4종 -->
    <!-- ReportViewer.vue L56-339의 HTML을 그대로 이식하되, -->
    <!-- Vue 바인딩({{ }})을 템플릿 리터럴(${})로 변환 -->

    <!-- 예시: 게이지 하나 -->
    <div class="gauge-row">
      <span>현재 키</span>
      <span><strong>${analysis.height}</strong> cm</span>
      <div class="gauge-bar-wrapper">
        <div class="gauge-bar">
          <div class="gauge-fill" style="width: ${heightPercentile}%"></div>
        </div>
      </div>
    </div>

    <!-- ... 나머지 게이지 (유전기반, 뼈나이기반, 최종예측키) ... -->
  </div>

  <!-- ===== 3페이지: 체중/BMI/비만도 + 차트 ===== -->
  <div class="pdf-page">
    <!-- 체중: ${analysis.weight} kg, 판정: ${weightLevel} -->
    <!-- BMI: ${bmiValue}, 판정: ${bmiLevel} -->
    <!-- 비만도: ${obesityRate}%, 판정: ${obesityLevel} -->
    <canvas id="chart3" width="340" height="240"></canvas>
  </div>

  <!-- ===== 4페이지: 유전기반 + 뼈나이기반 차트 ===== -->
  <div class="pdf-page">
    <canvas id="chart4a" width="340" height="190"></canvas>
    <canvas id="chart4b" width="340" height="190"></canvas>
  </div>

  <!-- ===== 5페이지: 최종 예측키 + 면책 ===== -->
  <div class="pdf-page">
    <canvas id="chart5" width="340" height="240"></canvas>
    <p class="disclaimer">본 분석 결과는 ...</p>
  </div>

  <!-- ===== 6~15페이지: 공통 이미지 ===== -->
  ${Array.from({length: 10}, (_, i) => `
  <div class="pdf-page">
    <img src="${baseUrl}/report-assets/common_${String(i + 6).padStart(2, '0')}.jpg"
         style="width:100%;height:100%;object-fit:cover" />
  </div>`).join('')}

  <!-- ===== 차트 그리기 스크립트 ===== -->
  <script>
    // drawGrowthChart: ReportViewer.vue L826-950 그대로 이식
    function drawGrowthChart(canvas, options) {
      if (!canvas) return;
      const { genderData, currentAge, currentHeight, predictedAge, predictedHeight, xLabel } = options;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const margin = { top: 20, right: 10, bottom: 40, left: 50 };
      const plotW = W - margin.left - margin.right;
      const plotH = H - margin.top - margin.bottom;
      const xMin = 36, xMax = 216;
      const yMin = 70, yMax = 185;
      const toX = (m) => margin.left + ((m - xMin) / (xMax - xMin)) * plotW;
      const toY = (v) => margin.top + ((yMax - v) / (yMax - yMin)) * plotH;

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);

      // 그리드
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5;
      for (let y = yMin; y <= yMax; y += 10) {
        ctx.beginPath(); ctx.moveTo(margin.left, toY(y));
        ctx.lineTo(W - margin.right, toY(y)); ctx.stroke();
      }

      // 백분위 라인
      const pKeys = ['p3','p5','p10','p25','p50','p75','p90','p95','p97'];
      const pLabels = { p3:'3rd', p5:'5th', p10:'10th', p25:'25th', p50:'50th', p75:'75th', p90:'90th', p95:'95th', p97:'97th' };
      const filtered = genderData.filter(d => d.month >= xMin && d.month <= xMax);

      pKeys.forEach(key => {
        const is50 = key === 'p50';
        ctx.beginPath();
        ctx.strokeStyle = is50 ? '#4A90D9' : '#c0c0c0';
        ctx.lineWidth = is50 ? 2 : 1;
        if (!is50) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
        filtered.forEach((d, i) => {
          const x = toX(d.month), y = toY(d[key]);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke(); ctx.setLineDash([]);

        const last = filtered[filtered.length - 1];
        if (last) {
          ctx.fillStyle = is50 ? '#4A90D9' : '#999';
          ctx.font = is50 ? 'bold 10px Pretendard' : '9px Pretendard';
          ctx.fillText(pLabels[key], toX(last.month) + 3, toY(last[key]) + 3);
        }
      });

      // X축
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(margin.left, H - margin.bottom);
      ctx.lineTo(W - margin.right, H - margin.bottom); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.font = '10px Pretendard'; ctx.textAlign = 'center';
      for (let a = 3; a <= 18; a++) ctx.fillText(String(a), toX(a * 12), H - margin.bottom + 15);
      ctx.fillText(xLabel || '만 나이(세)', W / 2, H - 5);

      // Y축
      ctx.beginPath(); ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, H - margin.bottom); ctx.stroke();
      ctx.textAlign = 'right';
      for (let y = yMin; y <= yMax; y += 10) ctx.fillText(String(y), margin.left - 5, toY(y) + 4);
      ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText('신장(cm)', 0, 0); ctx.restore();

      // 현재 키 점 (초록)
      if (currentAge && currentHeight) {
        ctx.beginPath(); ctx.fillStyle = '#4ECDC4';
        ctx.arc(toX(currentAge), toY(currentHeight), 6, 0, Math.PI * 2); ctx.fill();
      }
      // 예측 키 점 (빨강)
      if (predictedAge && predictedHeight) {
        ctx.beginPath(); ctx.fillStyle = '#FF6B6B';
        ctx.arc(toX(predictedAge), toY(predictedHeight), 6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 성장 데이터
    const gData = ${JSON.stringify(gender === 'M' ? growthHeight.male : growthHeight.female)};
    const curAgeM = ${ageMonths};
    const curH = ${parseFloat(analysis.height)};
    const boneAgeM = ${boneM};

    // 4개 차트 그리기
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

    // ★ Puppeteer 완료 플래그
    window.__reportReady = true;
  </script>
</body>
</html>`;
}

module.exports = { generateReportHTML };
