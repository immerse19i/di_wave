const { pool } = require('../config/database');
const path = require('path');

// 유저단: 공개 약관 목록 (현재 버전, is_public=true)
exports.getPublicTerms = async (req, res) => {
  try {
    const [terms] = await pool.query(
      `SELECT id, type, group_type, name, file_name, is_public, created_at
       FROM terms WHERE is_current = TRUE AND is_public = TRUE AND file_name != ''
       ORDER BY FIELD(type, 'terms_of_service','privacy_collection','privacy_consignment','paid_service','third_party','refund_policy')`
    );
    res.json({ success: true, data: terms });
  } catch (error) {
    console.error('getPublicTerms error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 유저단: 특정 약관의 공개 버전 목록 (이전기록 드롭다운용)
// query param: ?type=terms_of_service
exports.getTermFile = async (req, res) => {
  try {
    const { id } = req.params;
    const [terms] = await pool.query('SELECT file_path, file_name FROM terms WHERE id = ?', [id]);
    if (!terms.length || !terms[0].file_path) {
      return res.status(404).json({ success: false, message: '파일을 찾을 수 없습니다.' });
    }
    const filePath = path.join(__dirname, '../../uploads/terms', path.basename(terms[0].file_path));
    res.sendFile(filePath);
  } catch (error) {
    console.error('getTermFile error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 관리자: 전체 약관 목록 (현재 버전)
exports.getAdminTerms = async (req, res) => {
  try {
    const [terms] = await pool.query(
      `SELECT id, type, group_type, name, file_name, file_path, version, is_current, is_public, created_at
       FROM terms WHERE is_current = TRUE
       ORDER BY FIELD(type, 'terms_of_service','privacy_collection','privacy_consignment','paid_service','third_party','refund_policy')`
    );
    res.json({ success: true, data: terms });
  } catch (error) {
    console.error('getAdminTerms error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 관리자: 약관 이름 수정
exports.updateTermName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '이름을 입력해주세요.' });
    }

    // 같은 type의 모든 버전 이름도 함께 변경
    const [current] = await pool.query('SELECT type FROM terms WHERE id = ?', [id]);
    if (!current.length) {
      return res.status(404).json({ success: false, message: '약관을 찾을 수 없습니다.' });
    }

    await pool.query('UPDATE terms SET name = ? WHERE type = ?', [name.trim(), current[0].type]);
    res.json({ success: true, message: '이름이 수정되었습니다.' });
  } catch (error) {
    console.error('updateTermName error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 관리자: PDF 파일 업로드 (새 버전 생성)
exports.uploadTermFile = async (req, res) => {
  try {
    const { type } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF 파일을 선택해주세요.' });
    }

    // 현재 버전 조회
    const [current] = await pool.query(
      'SELECT id, name, group_type, version FROM terms WHERE type = ? AND is_current = TRUE',
      [type]
    );
    if (!current.length) {
      return res.status(404).json({ success: false, message: '약관 타입을 찾을 수 없습니다.' });
    }

    const { name, group_type, version } = current[0];
    const newVersion = version + 1;
const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    // 기존 현재 버전 해제
    await pool.query('UPDATE terms SET is_current = FALSE WHERE type = ? AND is_current = TRUE', [type]);

    // 새 버전 INSERT
    const [result] = await pool.query(
      `INSERT INTO terms (type, group_type, name, file_name, file_path, version, is_current, is_public)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
      [type, group_type, name, originalName, req.file.filename, newVersion]
    );

    res.json({
      success: true,
      message: '업로드 완료되었습니다.',
      data: { id: result.insertId, version: newVersion, file_name: originalName }
    });
  } catch (error) {
    console.error('uploadTermFile error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 관리자: 공개/비공개 토글
exports.toggleTermPublic = async (req, res) => {
  try {
    const { id } = req.params;
    const [term] = await pool.query('SELECT is_public FROM terms WHERE id = ?', [id]);
    if (!term.length) {
      return res.status(404).json({ success: false, message: '약관을 찾을 수 없습니다.' });
    }

    const newValue = !term[0].is_public;
    await pool.query('UPDATE terms SET is_public = ? WHERE id = ?', [newValue, id]);
    res.json({ success: true, data: { is_public: newValue } });
  } catch (error) {
    console.error('toggleTermPublic error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 관리자: 이전약관 이력 조회 (해당 type의 전체 버전)
exports.getTermHistory = async (req, res) => {
  try {
    const { type } = req.params;
    const [history] = await pool.query(
      `SELECT id, type, name, file_name, file_path, version, is_current, is_public, created_at
       FROM terms WHERE type = ? AND file_name != ''
       ORDER BY version DESC`,
      [type]
    );

    // 약관 이름 (현재 버전 기준)
    const [current] = await pool.query('SELECT name FROM terms WHERE type = ? AND is_current = TRUE', [type]);
    const termName = current.length ? current[0].name : '';

    res.json({ success: true, data: { name: termName, history } });
  } catch (error) {
    console.error('getTermHistory error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};
