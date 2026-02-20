const {pool} = require('../config/database');
const { predictBoneAge} = require('../services/aiService');
const config = require('../config/config');

// 분석 요청
exports.createAnalysis = async (req, res) => {
    try {
        // 2026.02.19 req.body : weight, physician 추가
        const { patientCode, patientName, birthDate, gender, height, weight, ageMonths, sex, fatherHeight, motherHeight, physician } = req.body;
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
const [result] = await pool.query(
    `INSERT INTO analyses (hospital_id, patient_id, user_id, image_path,
    chronological_age_years, chronological_age_months, height, weight, physician, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
    [hospitalId, patientId, userId, imagePath, Math.floor(ageMonths / 12), ageMonths % 12,
     parseFloat(height), weight ? parseFloat(weight) : null, physician || null]
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

        // 6. 크레딧 차감
        await pool.query(
            'UPDATE credits SET balance = balance - ? WHERE hospital_id = ?',
            [config.credit.perAnalysis, hospitalId]
        )

// 7. 크레딧 거래 내역 기록
const [updatedCredit] = await pool.query(
    'SELECT balance FROM credits WHERE hospital_id = ?',
    [hospitalId]
);

        await pool.query(
            `INSERT INTO credit_transactions (hospital_id, type, amount, balance_after, description, analysis_id)
            vALUES (?, 'use' , ?, ?, ?, ?)`,
            [hospitalId, config.credit.perAnalysis, updatedCredit[0].balance, '뼈나이 분석', analysisId]
        );

        res.status(201).json({
            success: true,
            data: {
                analysisId,
                ...aiResult.data
            }
        });


    }catch (error) {
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
        const sortField = req.query.sortField || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        // 허용된 정렬 필드만 허용 (SQL Injection 방지)
        const allowedSortFields = {
            'patient_code': 'p.patient_code',
            'patient_name': 'p.name',
            'created_at': 'a.created_at'
        };
        const dbSortField = allowedSortFields[sortField] || 'a.created_at';
        const dbSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        // 동일 값 시 2차/3차 정렬
        const orderClause = `${dbSortField} ${dbSortOrder}, p.name ASC, p.birth_date ASC, a.created_at DESC`;

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
                    a.created_at, p.name as patient_name, p.patient_code,
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