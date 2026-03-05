const { pool } = require('../config/database')

// ============ 목록 조회 ============
exports.getPopups = async (req, res) => {
  try {
    const { search, sortField, sortOrder, page = 1, limit } = req.query

    let where = ['1=1']
    let params = []

    if (search && search.trim()) {
      where.push('p.title LIKE ?')
      params.push(`%${search.trim()}%`)
    }

    const whereClause = where.join(' AND ')

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM popups p WHERE ${whereClause}`, params
    )
    const total = countResult[0].total

    // 정렬
    let orderClause = ''
    const allowedSortFields = ['title', 'display_start', 'author_name', 'published_at', 'updated_at', 'is_active']

    if (sortField && allowedSortFields.includes(sortField)) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'

      if (sortField === 'is_active') {
        // 현재 게시여부: O → 빈칸 → 삭제됨
        const activeExpr = `CASE
          WHEN p.status = 'published' AND (p.is_always = TRUE OR (p.display_start <= CURDATE() AND p.display_end >= CURDATE())) THEN 0
          WHEN p.status = 'deleted' THEN 2
          ELSE 1 END`
        orderClause = `ORDER BY ${activeExpr} ${order}, p.updated_at DESC`
      } else if (sortField === 'display_start') {
        orderClause = `ORDER BY p.is_always ${order === 'ASC' ? 'DESC' : 'ASC'}, p.display_start ${order}, p.updated_at DESC`
      } else {
        orderClause = `ORDER BY p.${sortField} ${order}, p.updated_at DESC`
      }
    } else {
      // 기본: 임시저장 먼저 → 최근수정일시 → id 역순
      orderClause = `ORDER BY
        (p.status = 'draft') DESC,
        p.updated_at DESC,
        p.id DESC`
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit) || 10
    const offset = (pageNum - 1) * limitNum

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.status, p.display_start, p.display_end, p.is_always,
              p.author_name, p.published_at, p.updated_at, p.deleted_at,
              CASE
                WHEN p.status = 'deleted' THEN 'deleted'
                WHEN p.status = 'published' AND (p.is_always = TRUE OR (p.display_start <= CURDATE() AND p.display_end >= CURDATE())) THEN 'active'
                ELSE 'inactive'
              END as is_active
       FROM popups p
       WHERE ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({ success: true, data: rows, total, totalPages: Math.ceil(total / limitNum), currentPage: pageNum })
  } catch (error) {
    console.error('getPopups error:', error)
    res.status(500).json({ success: false, message: '안내팝업 조회 실패' })
  }
}

// ============ 상세 조회 ============
exports.getPopupDetail = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(`SELECT * FROM popups WHERE id = ?`, [id])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '팝업을 찾을 수 없습니다' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('getPopupDetail error:', error)
    res.status(500).json({ success: false, message: '상세 조회 실패' })
  }
}

// ============ 생성 ============
exports.createPopup = async (req, res) => {
  try {
    const { title, content, status, display_start, display_end, is_always } = req.body
    const authorId = req.user.id
    const authorName = req.user.name || req.user.login_id
    const isAlways = is_always === 'true' || is_always === true ? 1 : 0
    const publishedAt = status === 'published' ? new Date() : null

    const [result] = await pool.query(
      `INSERT INTO popups (title, content, status, display_start, display_end, is_always, author_id, author_name, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content || '', status || 'draft',
       isAlways ? null : (display_start || null),
       isAlways ? null : (display_end || null),
       isAlways, authorId, authorName, publishedAt]
    )

    res.json({ success: true, data: { id: result.insertId } })
  } catch (error) {
    console.error('createPopup error:', error)
    res.status(500).json({ success: false, message: '팝업 생성 실패' })
  }
}

// ============ 수정 ============
exports.updatePopup = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, status, display_start, display_end, is_always } = req.body
    const isAlways = is_always === 'true' || is_always === true ? 1 : 0

    const [existing] = await pool.query(`SELECT published_at FROM popups WHERE id = ?`, [id])
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '팝업을 찾을 수 없습니다' })
    }

    let publishedAt = existing[0].published_at
    if (!publishedAt && status === 'published') {
      publishedAt = new Date()
    }

    await pool.query(
      `UPDATE popups SET title = ?, content = ?, status = ?,
              display_start = ?, display_end = ?, is_always = ?, published_at = ?
       WHERE id = ?`,
      [title, content || '', status || 'draft',
       isAlways ? null : (display_start || null),
       isAlways ? null : (display_end || null),
       isAlways, publishedAt, id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('updatePopup error:', error)
    res.status(500).json({ success: false, message: '팝업 수정 실패' })
  }
}

// ============ 삭제 (소프트) ============
exports.deletePopup = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query(
      `UPDATE popups SET status = 'deleted', deleted_at = NOW() WHERE id = ?`, [id]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('deletePopup error:', error)
    res.status(500).json({ success: false, message: '삭제 실패' })
  }
}
