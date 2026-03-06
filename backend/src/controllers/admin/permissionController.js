const { pool } = require('../../config/database');

// 관리자 목록 (본인 제외)
const getAdmins = async (req, res) => {
  try {
    const myId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id, name, login_id, is_active
       FROM users
       WHERE role = 'admin' AND id != ?
       ORDER BY id ASC`,
      [myId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAdmins error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 활성화/비활성화 토글
const toggleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const myId = req.user.id;

    // 본인은 변경 불가
    if (Number(id) === myId) {
      return res.status(400).json({ success: false, message: '본인 계정은 변경할 수 없습니다.' });
    }

    // 현재 상태 확인
    const [rows] = await pool.query(
      `SELECT id, is_active FROM users WHERE id = ? AND role = 'admin'`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '관리자를 찾을 수 없습니다.' });
    }

    const newActive = !rows[0].is_active;
    await pool.query(
      `UPDATE users SET is_active = ? WHERE id = ?`,
      [newActive, id]
    );

    res.json({
      success: true,
      data: { is_active: newActive },
      message: newActive ? '활성화되었습니다.' : '비활성화되었습니다.'
    });
  } catch (err) {
    console.error('toggleAdmin error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

module.exports = { getAdmins, toggleAdmin };
