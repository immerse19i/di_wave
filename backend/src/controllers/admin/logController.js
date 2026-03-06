const { pool } = require('../../config/database');

// 사용기록 목록
const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    const params = [];

    let where = 'WHERE 1=1';

    // 기간 필터
    if (startDate && endDate) {
      where += ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 통합 검색 (카테고리, 작업유형, 관리자)
    if (search && search.trim()) {
      where += ' AND (target_type LIKE ? OR category LIKE ? OR operator LIKE ?)';
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    // 총 건수
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM admin_logs ${where}`, params
    );
    const total = countRows[0].total;

    // 목록 조회 (최신순)
    const [rows] = await pool.query(
      `SELECT id, hospital_id, target_type, target_id, category, details, operator, actor_type, created_at
       FROM admin_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (err) {
    console.error('getLogs error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 사용기록 상세
const getLogDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, hospital_id, target_type, target_id, category, details, operator, actor_type, created_at
       FROM admin_logs WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '기록을 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getLogDetail error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

module.exports = { getLogs, getLogDetail };
