const { pool } = require('../config/database')

// ============ [유저] 문의 등록 ============
exports.createInquiry = async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const { title, content } = req.body
    const userId = req.user.id
    const hospitalId = req.user.hospital_id

    const [result] = await conn.query(
      `INSERT INTO inquiries (hospital_id, user_id, title, content) VALUES (?, ?, ?, ?)`,
      [hospitalId, userId, title, content]
    )

    const inquiryId = result.insertId

    // 첨부파일 저장
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
        const filePath = file.path.replace(/\\/g, '/')
        const ext = fileName.split('.').pop().toLowerCase()
        await conn.query(
          `INSERT INTO inquiry_attachments (inquiry_id, file_name, file_path, file_size, file_type, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [inquiryId, fileName, filePath, file.size, ext, i]
        )
      }
    }

    await conn.commit()
    res.json({ success: true, data: { id: inquiryId } })
  } catch (error) {
    await conn.rollback()
    console.error('createInquiry error:', error)
    res.status(500).json({ success: false, message: '문의 등록 실패' })
  } finally {
    conn.release()
  }
}

// ============ [유저] 내 문의 목록 ============
exports.getMyInquiries = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id
    const { page = 1, limit = 15 } = req.query

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM inquiries WHERE hospital_id = ?`,
      [hospitalId]
    )
    const total = countResult[0].total

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit) || 15
    const offset = (pageNum - 1) * limitNum

    const [rows] = await pool.query(
      `SELECT id, title, status, created_at, answered_at
       FROM inquiries
       WHERE hospital_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [hospitalId, limitNum, offset]
    )

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    })
  } catch (error) {
    console.error('getMyInquiries error:', error)
    res.status(500).json({ success: false, message: '문의 목록 조회 실패' })
  }
}

// ============ [유저] 문의 상세 ============
exports.getMyInquiryDetail = async (req, res) => {
  try {
    const { id } = req.params
    const hospitalId = req.user.hospital_id

    const [rows] = await pool.query(
      `SELECT * FROM inquiries WHERE id = ? AND hospital_id = ?`,
      [id, hospitalId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다' })
    }

    const [attachments] = await pool.query(
      `SELECT id, file_name, file_path, file_size, file_type, sort_order
       FROM inquiry_attachments WHERE inquiry_id = ? ORDER BY sort_order ASC`,
      [id]
    )

    const inquiry = rows[0]
    inquiry.attachments = attachments

    res.json({ success: true, data: inquiry })
  } catch (error) {
    console.error('getMyInquiryDetail error:', error)
    res.status(500).json({ success: false, message: '문의 상세 조회 실패' })
  }
}

// ============ [관리자] 문의 목록 ============
exports.getInquiries = async (req, res) => {
  try {
    const { status, search, startDate, endDate, sortField, sortOrder, page = 1, limit = 10 } = req.query

    let where = ['1=1']
    let params = []

    if (status) {
      const statuses = status.split(',').filter(s =>
        ['pending', 'answered', 'closed', 'draft'].includes(s)
      )
      if (statuses.length > 0) {
        where.push(`i.status IN (${statuses.map(() => '?').join(',')})`)
        params.push(...statuses)
      }
    }
    if (startDate) {
      where.push('DATE(i.created_at) >= ?')
      params.push(startDate)
    }
    if (endDate) {
      where.push('DATE(i.created_at) <= ?')
      params.push(endDate)
    }
    if (search && search.trim()) {
      where.push('(i.title LIKE ? OR h.name LIKE ? OR u.login_id LIKE ?)')
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`)
    }

    const whereClause = where.join(' AND ')

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM inquiries i
       LEFT JOIN hospitals h ON i.hospital_id = h.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE ${whereClause}`, params
    )
    const total = countResult[0].total

    const allowedSortFields = ['title', 'created_at', 'answered_at', 'status']
    let orderClause = 'ORDER BY i.created_at DESC'
    if (sortField && allowedSortFields.includes(sortField)) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
      orderClause = `ORDER BY i.${sortField} ${order}, i.created_at DESC`
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit) || 10
    const offset = (pageNum - 1) * limitNum

    const [rows] = await pool.query(
      `SELECT i.id, i.title, i.status, i.created_at, i.answered_at,
              h.name AS hospital_name, u.login_id,
              (SELECT COUNT(*) FROM inquiry_attachments WHERE inquiry_id = i.id) > 0 AS has_attachment
       FROM inquiries i
       LEFT JOIN hospitals h ON i.hospital_id = h.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({ success: true, data: rows, total, totalPages: Math.ceil(total / limitNum), currentPage: pageNum })
  } catch (error) {
    console.error('getInquiries error:', error)
    res.status(500).json({ success: false, message: '문의 목록 조회 실패' })
  }
}


// ============ [관리자] 문의 상세 ============
exports.getInquiryDetail = async (req, res) => {
  try {
    const { id } = req.params

    const [rows] = await pool.query(
      `SELECT i.*, h.name AS hospital_name, u.login_id, u.email
       FROM inquiries i
       LEFT JOIN hospitals h ON i.hospital_id = h.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다' })
    }

    const [attachments] = await pool.query(
      `SELECT id, file_name, file_path, file_size, file_type, sort_order
       FROM inquiry_attachments WHERE inquiry_id = ? ORDER BY sort_order ASC`,
      [id]
    )

    const inquiry = rows[0]
    inquiry.attachments = attachments

    res.json({ success: true, data: inquiry })
  } catch (error) {
    console.error('getInquiryDetail error:', error)
    res.status(500).json({ success: false, message: '문의 상세 조회 실패' })
  }
}

// ============ [관리자] 답변 작성 ============
exports.answerInquiry = async (req, res) => {
  try {
    const { id } = req.params
    const { answer } = req.body

    if (!answer || !answer.trim()) {
      return res.status(400).json({ success: false, message: '답변 내용을 입력해 주세요' })
    }

    const [existing] = await pool.query(`SELECT id FROM inquiries WHERE id = ?`, [id])
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다' })
    }

    await pool.query(
      `UPDATE inquiries SET answer = ?, status = 'answered', answered_at = NOW() WHERE id = ?`,
      [answer, id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('answerInquiry error:', error)
    res.status(500).json({ success: false, message: '답변 등록 실패' })
  }
}
// ============ [관리자] 상태별 건수 ============
exports.getInquiryCounts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(status = 'pending') as pending,
        SUM(status = 'answered') as answered,
        SUM(status = 'draft') as draft
       FROM inquiries`
    )
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('getInquiryCounts error:', error)
    res.status(500).json({ success: false, message: '건수 조회 실패' })
  }
}

