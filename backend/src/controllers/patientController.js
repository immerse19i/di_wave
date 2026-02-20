const { pool } = require('../config/database');

// 환자 존재 여부 확인
// GET /api/patients/check?patientCode=XXX&patientName=XXX
exports.checkPatient = async (req, res) => {
    try {
        const { patientCode, patientName } = req.query;
        const hospitalId = req.user.hospital_id;

        if (!patientCode || !patientName) {
            return res.status(400).json({
                success: false,
                message: '환자등록번호와 환자명은 필수입니다.'
            });
        }

        const [patients] = await pool.query(
            'SELECT id, patient_code, name, birth_date, gender FROM patients WHERE hospital_id = ? AND patient_code = ? AND name = ?',
            [hospitalId, patientCode, patientName]
        );

        if (patients.length > 0) {
            res.json({ success: true, exists: true, patient: patients[0] });
        } else {
            res.json({ success: true, exists: false });
        }
    } catch (error) {
        console.error('환자 조회 오류:', error);
        res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' });
    }
};
