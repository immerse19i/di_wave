const { pool } = require('../config/database')

// 조회 (관리자 + 유저 공용)
exports.getInfo = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM site_info WHERE id = 1')
    if (rows.length === 0) {
      return res.json({ success: true, data: { title: '', content: '' } })
    }
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('getInfo error:', error)
    res.status(500).json({ success: false, message: '정보 조회 실패' })
  }
}

// 수정 (관리자만)
exports.updateInfo = async (req, res) => {
  try {
    const { title, content } = req.body
    const [existing] = await pool.query('SELECT id FROM site_info WHERE id = 1')
    
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO site_info (id, title, content) VALUES (1, ?, ?)',
        [title || '', content || '']
      )
    } else {
      await pool.query(
        'UPDATE site_info SET title = ?, content = ? WHERE id = 1',
        [title || '', content || '']
      )
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('updateInfo error:', error)
    res.status(500).json({ success: false, message: '정보 수정 실패' })
  }
}
