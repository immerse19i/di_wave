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
    const [existing] = await pool.query(
      'SELECT id, title, content FROM site_info WHERE id = 1'
    )

    let oldTitle = ''
    let oldContent = ''
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO site_info (id, title, content) VALUES (1, ?, ?)',
        [title || '', content || '']
      )
    } else {
      oldTitle = existing[0].title || ''
      oldContent = existing[0].content || ''
      await pool.query(
        'UPDATE site_info SET title = ?, content = ? WHERE id = 1',
        [title || '', content || '']
      )
    }

    // ★ 관리자 로그 (피그마 포맷: 변경 전 / 변경 후)
    const newTitle = title || ''
    const newContent = content || ''
    if (oldTitle !== newTitle || oldContent !== newContent) {
      const stripContent = (html) =>
        (html || '')
          .replace(/<img[^>]*>/gi, '****[첨부이미지]****')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
      const logDetails = `변경 전\n\n제목: ${oldTitle}\n\n내용:\n${stripContent(oldContent)}\n\n\n변경 후\n\n제목: ${newTitle}\n\n내용:\n${stripContent(newContent)}`
      await pool.query(
        `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
         VALUES ('info', 1, '수정', ?, ?, 'admin')`,
        [logDetails, req.user.name || req.user.login_id || 'admin']
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('updateInfo error:', error)
    res.status(500).json({ success: false, message: '정보 수정 실패' })
  }
}
