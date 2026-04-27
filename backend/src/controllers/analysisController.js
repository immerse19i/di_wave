const {pool} = require('../config/database');
const { predictBoneAge, recalculatePAH} = require('../services/aiService');
const config = require('../config/config');
const pdfService = require('../services/pdfService');



// 분석 요청
exports.createAnalysis = async (req, res) => {
    try {
        // 2026.02.19 req.body : weight, physician 추가
        // L9: analysisDate 추가
const { patientCode, patientName, birthDate, gender, height, weight, ageMonths, sex, fatherHeight, motherHeight, physician, analysisDate } = req.body;

        const userId = req.user.id;
        const hospitalId = req.user.hospital_id;
        const imagePath = req.file.path;
        
        // 1. 크레딧 확인
        const [credits] = await pool.query(
            `SELECT balance FROM credits WHERE hospital_id = ?`,
            [hospitalId]
        );

        if(!credits.length || credits[0].balance < config.credit.perAnalysis){
            return res.status(400).json({
                success:false,
                message: '크레딧이 부족합니다.'
            });
        }
// 환자 조회/등록
const [existingPatients] = await pool.query(
    'SELECT id FROM patients WHERE hospital_id = ? AND patient_code = ? AND name = ?',
    [hospitalId, patientCode, patientName]
);

let patientId;
if (existingPatients.length > 0) {
    patientId = existingPatients[0].id;
} else {
    const [newPatient] = await pool.query(
        'INSERT INTO patients (hospital_id, patient_code, name, birth_date, gender) VALUES (?, ?, ?, ?, ?)',
        [hospitalId, patientCode, patientName, birthDate, gender]
    );
    patientId = newPatient.insertId;
}


        // 2. 분석 생성 (status: processing)
        // 2026.02.19 INSERT 쿼리에 {hegiht, weight,physican} 추가
// L47~54: INSERT 쿼리에 analysis_date 추가
const [result] = await pool.query(
    `INSERT INTO analyses (hospital_id, patient_id, user_id, image_path,
    chronological_age_years, chronological_age_months, height, weight, physician,
    analysis_date, father_height, mother_height, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
    [hospitalId, patientId, userId, imagePath, Math.floor(ageMonths / 12), ageMonths % 12,
     parseFloat(height), weight ? parseFloat(weight) : null, physician || null,
     analysisDate || null,
     fatherHeight ? parseFloat(fatherHeight) : null,
     motherHeight ? parseFloat(motherHeight) : null]
);


        const analysisId = result.insertId;

        // 3. AI 서버 호출
        const aiResult = await predictBoneAge(imagePath, {
            sex: parseInt(sex),
            height: parseFloat(height),
            ageMonths: parseInt(ageMonths),
            fatherHeight : fatherHeight ? parseFloat(fatherHeight): null,
            motherHeight: motherHeight ? parseFloat(motherHeight): null
        })

        if(!aiResult.success) {
            await pool.query(
                "UPDATE analyses SET status = 'failed' WHERE id = ?",
                [analysisId]
            );
            return res.status(500).json({
                success: false,
                message: 'AI 분석 실패했습니다.'
            });
        }

        // 4. 뼈 나이 파싱 ('12Y 8M > years, months)
        const boneAgeMatch = aiResult.data.BoneAge.match(/(\d+)Y\s*(\d+)M/);
        const boneAgeYears =boneAgeMatch ? parseInt(boneAgeMatch[1]) : null;
        const boneAgeMonths = boneAgeMatch ? parseInt(boneAgeMatch[2]) : null;

        // 5. 분석 결과 저장
        await pool.query(
            `UPDATE analyses SET bone_age_years = ?, bone_age_months = ?,
            result_json = ?, status = 'completed' WHERE id = ?`,
            [boneAgeYears, boneAgeMonths, JSON.stringify(aiResult.data), analysisId] 
        );

                // 6. FIFO 크레딧 차감 (트랜잭션으로 보호)
        const creditConn = await pool.getConnection();
        try {
          await creditConn.beginTransaction();

          // 잔여량 있는 charge 배치 조회 (FOR UPDATE 락)
          const [batches] = await creditConn.query(
            `SELECT id, remaining_amount, expires_at FROM credit_transactions
             WHERE hospital_id = ? AND type = 'charge' AND remaining_amount > 0
               AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY expires_at IS NULL ASC, expires_at ASC, id ASC
             FOR UPDATE`,
            [hospitalId]
          );

          let remainingCost = config.credit.perAnalysis;
          for (const batch of batches) {
            if (remainingCost <= 0) break;
            const deduct = Math.min(batch.remaining_amount, remainingCost);
            await creditConn.query(
              'UPDATE credit_transactions SET remaining_amount = remaining_amount - ? WHERE id = ?',
              [deduct, batch.id]
            );
            remainingCost -= deduct;
          }

          // credits balance 차감
          await creditConn.query(
            'UPDATE credits SET balance = balance - ? WHERE hospital_id = ?',
            [config.credit.perAnalysis, hospitalId]
          );

          // 변경 후 잔액 조회
          const [updatedCredit] = await creditConn.query(
            'SELECT balance FROM credits WHERE hospital_id = ?',
            [hospitalId]
          );

          // 크레딧 거래 내역 기록
          await creditConn.query(
            `INSERT INTO credit_transactions (hospital_id, type, amount, balance_after, description, analysis_id)
             VALUES (?, 'use', ?, ?, ?, ?)`,
            [hospitalId, config.credit.perAnalysis, updatedCredit[0].balance, '뼈나이 분석', analysisId]
          );

          await creditConn.commit();
        } catch (creditError) {
          await creditConn.rollback();
          // 분석은 완료됐지만 크레딧 차감 실패 → 로그 남기고 에러
          console.error('Credit deduction error:', creditError);
          return res.status(500).json({ success: false, message: '크레딧 차감 중 오류가 발생했습니다.' });
        } finally {
          creditConn.release();
        }

        res.status(201).json({
            success: true,
            data: {
                analysisId,
                ...aiResult.data
            }
        });

    } catch (error) {
        console.error('분석 오류:', error);
        res.status(500).json({
            success: false,
            message: '분석 처리 중 오류가 발생 했습니다.'
        })
    }
};

// 분석 목록 조회


exports.getAnalyses = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
const sortField = req.query.sortField || 'analysis_date';
const sortOrder = req.query.sortOrder || 'DESC';

        // 허용된 정렬 필드만 허용 (SQL Injection 방지)
        const allowedSortFields = {
            'patient_code': 'p.patient_code',
            'patient_name': 'p.name',
            'created_at': 'a.created_at',
            'analysis_date': 'a.analysis_date' 
        };
        const dbSortField = allowedSortFields[sortField] || 'a.created_at';
        const dbSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        // 동일 값 시 2차/3차 정렬
        // analysis_date 정렬일 때만 NULL을 마지막으로 보내고, created_at으로 fallback
const isAnalysisDate = dbSortField === 'a.analysis_date';
const orderClause = isAnalysisDate
  ? `a.analysis_date IS NULL ASC, a.analysis_date ${dbSortOrder}, a.created_at DESC, p.name ASC`
  : `${dbSortField} ${dbSortOrder}, p.name ASC, p.birth_date ASC, a.created_at DESC`;

  
        // 검색 조건
        let whereClause = 'a.hospital_id = ?';
        const params = [hospitalId];

        if (search) {
            whereClause += ' AND (p.name LIKE ? OR p.patient_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const [analyses] = await pool.query(
`SELECT a.id, a.status, a.bone_age_years, a.bone_age_months,
        a.chronological_age_years, a.chronological_age_months,
        a.height, a.weight, a.physician, a.result_json,
        a.analysis_date, a.created_at, p.name as patient_name, p.patient_code,
        p.birth_date, p.gender
             FROM analyses a
             JOIN patients p ON a.patient_id = p.id
             WHERE ${whereClause}
             ORDER BY ${orderClause}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // count 쿼리도 검색 조건 적용
        const countParams = [hospitalId];
        let countWhere = 'a.hospital_id = ?';
        if (search) {
            countWhere += ' AND (p.name LIKE ? OR p.patient_code LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM analyses a
             JOIN patients p ON a.patient_id = p.id
             WHERE ${countWhere}`,
            countParams
        );

        res.json({
            success: true,
            data: analyses,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' });
    }
};

// 분석 상세 조회

exports.getAnalysis = async (req,res) => {
    try{
        const {id} = req.params;
        const hospitalId = req.user.hospital_id;
        const [analyses] = await pool.query(
            `SELECT a.*, p.name as patient_name, p.patient_code, p.birth_date, p.gender
             FROM analyses a
             JOIN patients p ON a.patient_id = p.id
             WHERE a.id = ? AND a.hospital_id = ?`,
            [id, hospitalId]
        )
        if (!analyses.length) {
            return res.status(404).json({success: false, message: '분석결과를 찾을 수 없습니다.'});
        }
        const analysis = analyses[0];
        if (analysis.result_json){
            analysis.result_json = JSON.parse(analysis.result_json);
        } 


        res.json({ success:true,data: analysis});
    }catch (error){
        console.error( '상세 조회 오류:', error);
        res.status(500).json({success:false, message: '조회 중 오류가 발생했습니다.'});
    }

};

exports.updateDoctorBoneAge = async (req, res) => {
  try {
    const { id } = req.params;
    const { bone_age_years, bone_age_months } = req.body;
    const hospitalId = req.user.hospital_id;

    // 기존 분석 데이터 조회
    const [rows] = await pool.query(
      `SELECT a.*, p.gender FROM analyses a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = ? AND a.hospital_id = ?`,
      [id, hospitalId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: '분석을 찾을 수 없습니다.' });
    }
    const analysis = rows[0];

    // 의사 뼈나이 기준 PAH 재계산 (크레딧 차감 없음, 이미지 추론 없음)
    const ageMonths = (analysis.chronological_age_years || 0) * 12
                    + (analysis.chronological_age_months || 0);
    const aiResult = await recalculatePAH({
      boneAgeYears: bone_age_years,
      boneAgeMonths: bone_age_months,
      sex: analysis.gender === 'M' ? 1 : 0,
      height: parseFloat(analysis.height),
      ageMonths: ageMonths,
      fatherHeight: analysis.father_height ? parseFloat(analysis.father_height) : null,
      motherHeight: analysis.mother_height ? parseFloat(analysis.mother_height) : null
    });

    if (!aiResult.success) {
      return res.status(500).json({ success: false, message: 'PAH 재계산 실패' });
    }

    // 기존 result_json에서 AI 원본 뼈나이 보존
    const existingResult = JSON.parse(analysis.result_json || '{}');
    const newResult = aiResult.data;
    newResult.AI_BoneAge = existingResult.AI_BoneAge || existingResult.BoneAge;

    // 의사 뼈나이 + 새 result_json 저장
    await pool.query(
      'UPDATE analyses SET bone_age_years = ?, bone_age_months = ?, result_json = ? WHERE id = ? AND hospital_id = ?',
      [bone_age_years, bone_age_months, JSON.stringify(newResult), id, hospitalId]
    );

    res.json({ success: true, data: newResult });
  } catch (error) {
    console.error('의사 뼈나이 저장 오류:', error);
    res.status(500).json({ success: false, message: '저장 실패' });
  }
};


// 분석 정보 수정 (재분석 포함)
exports.updateAnalysisInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospital_id;
const {
  patientCode, patientName, birthDate, gender,
  height, weight, fatherHeight, motherHeight,
  physician, ageMonths, sex, analysisDate
} = req.body;

    // 1. 기존 분석 조회
    const [analyses] = await pool.query(
      'SELECT * FROM analyses WHERE id = ? AND hospital_id = ?',
      [id, hospitalId]
    );
    if (!analyses.length) {
      return res.status(404).json({ success: false, message: '분석을 찾을 수 없습니다.' });
    }
    const analysis = analyses[0];

    // 2. 환자 매칭 로직
    const [existingPatients] = await pool.query(
      'SELECT id, gender FROM patients WHERE hospital_id = ? AND patient_code = ? AND name = ?',
      [hospitalId, patientCode, patientName]
    );

    let patientId;
    if (existingPatients.length > 0) {
      // 기존 환자 존재 → 성별 체크
      if (existingPatients[0].gender !== gender) {
        return res.status(400).json({
          success: false,
          message: '성별이 일치하지 않아 연동이 불가합니다.'
        });
      }
      patientId = existingPatients[0].id;
    } else {
      // 새 환자 생성
      const [newPatient] = await pool.query(
        'INSERT INTO patients (hospital_id, patient_code, name, birth_date, gender) VALUES (?, ?, ?, ?, ?)',
        [hospitalId, patientCode, patientName, birthDate, gender]
      );
      patientId = newPatient.insertId;
    }

    // 3. 이미지 경로 결정 (새 이미지가 있으면 사용, 없으면 기존 이미지)
    const imagePath = req.file ? req.file.path : analysis.image_path;

    // 4. AI 재분석 (크레딧 차감 없음)
    const aiResult = await predictBoneAge(imagePath, {
      sex: parseInt(sex),
      height: parseFloat(height),
      ageMonths: parseInt(ageMonths),
      fatherHeight: fatherHeight ? parseFloat(fatherHeight) : null,
      motherHeight: motherHeight ? parseFloat(motherHeight) : null
    });

    if (!aiResult.success) {
      return res.status(500).json({ success: false, message: 'AI 재분석 실패' });
    }

    // 5. 뼈 나이 파싱
    const boneAgeMatch = aiResult.data.BoneAge.match(/(\d+)Y\s*(\d+)M/);
    const boneAgeYears = boneAgeMatch ? parseInt(boneAgeMatch[1]) : null;
    const boneAgeMonths = boneAgeMatch ? parseInt(boneAgeMatch[2]) : null;

    // 6. analyses 업데이트
await pool.query(
  `UPDATE analyses SET patient_id = ?, height = ?, weight = ?, physician = ?,
   analysis_date = ?, father_height = ?, mother_height = ?,
   chronological_age_years = ?, chronological_age_months = ?,
   bone_age_years = ?, bone_age_months = ?, result_json = ?${req.file ? ', image_path = ?' : ''}
   WHERE id = ? AND hospital_id = ?`,
  [
    patientId, parseFloat(height), weight ? parseFloat(weight) : null,
    physician || null,
    analysisDate || null,
    fatherHeight ? parseFloat(fatherHeight) : null,
    motherHeight ? parseFloat(motherHeight) : null,
    Math.floor(ageMonths / 12), ageMonths % 12,
    boneAgeYears, boneAgeMonths, JSON.stringify(aiResult.data),
    ...(req.file ? [req.file.path] : []),
    id, hospitalId
  ]
);


    res.json({ success: true, data: { analysisId: id, ...aiResult.data } });

  } catch (error) {
    console.error('분석 수정 오류:', error);
    res.status(500).json({ success: false, message: '수정 중 오류가 발생했습니다.' });
  }
};



exports.generateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospital_id;
const masked = req.query.masked === 'true';
    const [rows] = await pool.query(
      `SELECT a.*, p.name AS patient_name FROM analyses a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = ? AND a.hospital_id = ?`,
      [id, hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '분석을 찾을 수 없습니다.' });
    }

const pdfBuffer = await pdfService.generatePDF(id, masked);

    const patientName = rows[0].patient_name || 'report';
    const date = new Date(rows[0].created_at).toISOString().slice(0, 10).replace(/-/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="${encodeURIComponent(patientName)}_${date}_report.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({ success: false, message: 'PDF 생성에 실패했습니다.' });
  }
};