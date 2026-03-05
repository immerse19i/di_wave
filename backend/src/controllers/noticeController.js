const { pool } = require('../config/database')

// 목록 조회
exports.getNotices = async (req, res) => {
  try {
    const { status, startDate, endDate, search, sortField, sortOrder, page = 1, limit } = req.query

    let where = ['1=1']
    let params = []

    // 상태 필터 (쉼표 구분 멀티셀렉트)
    if (status) {
      const statuses = status.split(',').filter(s => 
        ['published', 'draft', 'private', 'deleted'].includes(s)
      )
      if (statuses.length > 0) {
        where.push(`n.status IN (${statuses.map(() => '?').join(',')})`)
        params.push(...statuses)
      }
    }

    // 날짜 필터
    if (startDate) {
      where.push('DATE(n.created_at) >= ?')
      params.push(startDate)
    }
    if (endDate) {
      where.push('DATE(n.created_at) <= ?')
      params.push(endDate)
    }

    // 검색 (제목)
    if (search && search.trim()) {
      where.push('n.title LIKE ?')
      params.push(`%${search.trim()}%`)
    }

    const whereClause = where.join(' AND ')

    // 총 건수
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notices n WHERE ${whereClause}`, params
    )
    const total = countResult[0].total

    // 정렬
    let orderClause = ''
    const allowedSortFields = ['title', 'created_at', 'author_name', 'status', 'is_pinned']

    if (sortField && allowedSortFields.includes(sortField)) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'

      if (sortField === 'status') {
        // 상태 가중치 정렬
        if (sortOrder === 'desc') {
          orderClause = `ORDER BY FIELD(n.status, 'deleted', 'private', 'draft', 'published'), n.created_at DESC`
        } else {
          orderClause = `ORDER BY FIELD(n.status, 'published', 'draft', 'private', 'deleted'), n.created_at DESC`
        }
      } else if (sortField === 'is_pinned') {
        // 상단고정 정렬: 실제 노출 중인 것 = is_pinned=TRUE AND status='published'
        if (sortOrder === 'asc') {
          orderClause = `ORDER BY (n.is_pinned = TRUE AND n.status = 'published') DESC, n.created_at DESC`
        } else {
          orderClause = `ORDER BY (n.is_pinned = TRUE AND n.status = 'published') ASC, n.created_at DESC`
        }
      } else {
        orderClause = `ORDER BY n.${sortField} ${order}, n.created_at DESC`
      }
    } else {
      // 기본 정렬: ①공개+상단고정(최신순) → ②임시저장(최신순) → ③나머지(최신순)
      orderClause = `ORDER BY 
        CASE 
          WHEN n.status = 'published' AND n.is_pinned = TRUE THEN 0
          WHEN n.status = 'draft' THEN 1
          ELSE 2 
        END,
        n.created_at DESC`
    }

    // 페이지네이션
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit) || 10
    const offset = (pageNum - 1) * limitNum

    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.status, n.is_pinned, n.has_attachment,
              n.author_name, n.created_at
       FROM notices n
       WHERE ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    })
  } catch (error) {
    console.error('getNotices error:', error)
    res.status(500).json({ success: false, message: '공지사항 조회 실패' })
  }
}

// 상세 조회
exports.getNoticeDetail = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(
      `SELECT * FROM notices WHERE id = ?`, [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '공지사항을 찾을 수 없습니다' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('getNoticeDetail error:', error)
    res.status(500).json({ success: false, message: '상세 조회 실패' })
  }
}

// 생성
exports.createNotice = async (req, res) => {
  try {
    const { title, content, status, is_pinned } = req.body
    const authorId = req.user.id
    const authorName = req.user.name || req.user.login_id

    let attachmentPath = null
    let attachmentName = null
    let hasAttachment = false

    if (req.file) {
      attachmentPath = req.file.path.replace(/\\/g, '/')
      attachmentName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
      hasAttachment = true
    }

    const [result] = await pool.query(
      `INSERT INTO notices (title, content, status, is_pinned, has_attachment, attachment_path, attachment_name, author_id, author_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content || '', status || 'draft', is_pinned === 'true' || is_pinned === true ? 1 : 0,
       hasAttachment, attachmentPath, attachmentName, authorId, authorName]
    )

    res.json({ success: true, data: { id: result.insertId } })
  } catch (error) {
    console.error('createNotice error:', error)
    res.status(500).json({ success: false, message: '공지사항 생성 실패' })
  }
}

// 수정
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, status, is_pinned, remove_attachment } = req.body

    let updateFields = [
      'title = ?', 'content = ?', 'status = ?', 'is_pinned = ?'
    ]
    let updateParams = [
      title, content || '', status || 'draft',
      is_pinned === 'true' || is_pinned === true ? 1 : 0
    ]

    // 첨부파일 처리
    if (req.file) {
      const attachmentPath = req.file.path.replace(/\\/g, '/')
      const attachmentName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
      updateFields.push('has_attachment = TRUE', 'attachment_path = ?', 'attachment_name = ?')
      updateParams.push(attachmentPath, attachmentName)
    } else if (remove_attachment === 'true') {
      updateFields.push('has_attachment = FALSE', 'attachment_path = NULL', 'attachment_name = NULL')
    }

    updateParams.push(id)

    await pool.query(
      `UPDATE notices SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    res.json({ success: true })
  } catch (error) {
    console.error('updateNotice error:', error)
    res.status(500).json({ success: false, message: '공지사항 수정 실패' })
  }
}

// 삭제 (소프트 삭제)
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query(
      `UPDATE notices SET status = 'deleted' WHERE id = ?`, [id]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('deleteNotice error:', error)
    res.status(500).json({ success: false, message: '삭제 실패' })
  }
}
