const { pool } = require('../config/database')

// ============ 유저용: 현재 게시 중인 팝업 조회 ============
exports.getActivePopups = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const [rows] = await pool.query(
      `SELECT id, title, content, popup_width, popup_height
       FROM popups
       WHERE status = 'published'
         AND deleted_at IS NULL
         AND (is_always = TRUE OR (display_start <= ? AND display_end >= ?))
       ORDER BY published_at DESC`,
      [today, today]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GetActivePopups error:', error)
    res.status(500).json({ success: false, message: '서버 오류' })
  }
}

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
    const { title, content, status, display_start, display_end, is_always, popup_width, popup_height } = req.body
    const authorId = req.user.id
    const authorName = req.user.name || req.user.login_id
    const isAlways = is_always === 'true' || is_always === true ? 1 : 0
    const publishedAt = status === 'published' ? new Date() : null

    const [result] = await pool.query(
      `INSERT INTO popups (title, content, status, display_start, display_end, is_always, popup_width, popup_height, author_id, author_name, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content || '', status || 'draft',
       isAlways ? null : (display_start || null),
       isAlways ? null : (display_end || null),
       isAlways,
       popup_width || 500, popup_height || 400,
       authorId, authorName, publishedAt]
    )

    const popupId = result.insertId

    // ★ 관리자 로그 (피그마 포맷)
    const actionLabel = status === 'draft' ? '임시저장' : '생성'
    const contentText = (content || '')
      .replace(/<img[^>]*>/gi, '****[첨부이미지]****')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    const dotDate = (s) => (s || '').slice(0, 10).replace(/-/g, '.')
    const periodText = isAlways
      ? '상시'
      : `${dotDate(display_start)} ~ ${dotDate(display_end)}`
    const sizeText = `${popup_width || 500} x ${popup_height || 400}`
    // 임시저장: [No. -] / 생성: [No. N] 생성
    const header = status === 'draft' ? `[No. -]` : `[No. ${popupId}] 생성`
    const logDetails = `${header}\n\n제목: [${title || ''}]\n\n내용:\n[${contentText}]\n\n게시기간: [${periodText}]\n팝업크기: [${sizeText}]`
    await pool.query(
      `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
       VALUES ('popup', ?, ?, ?, ?, 'admin')`,
      [popupId, actionLabel, logDetails, authorName]
    )

    res.json({ success: true, data: { id: popupId } })
  } catch (error) {
    console.error('createPopup error:', error)
    res.status(500).json({ success: false, message: '팝업 생성 실패' })
  }
}


// ============ 수정 ============
exports.updatePopup = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, status, display_start, display_end, is_always, popup_width, popup_height } = req.body
    const isAlways = is_always === 'true' || is_always === true ? 1 : 0

    const [existing] = await pool.query(
      `SELECT title, content, display_start, display_end, is_always, popup_width, popup_height, published_at
       FROM popups WHERE id = ?`,
      [id]
    )
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '팝업을 찾을 수 없습니다' })
    }

    const oldData = existing[0]
    let publishedAt = oldData.published_at
    if (!publishedAt && status === 'published') {
      publishedAt = new Date()
    }

    await pool.query(
      `UPDATE popups SET title = ?, content = ?, status = ?,
              display_start = ?, display_end = ?, is_always = ?,
              popup_width = ?, popup_height = ?, published_at = ?
       WHERE id = ?`,
      [title, content || '', status || 'draft',
       isAlways ? null : (display_start || null),
       isAlways ? null : (display_end || null),
       isAlways,
       popup_width || 500, popup_height || 400,
       publishedAt, id]
    )

    // ★ 관리자 로그 (피그마 포맷: 변경된 항목만 변경 전/후 표시)
    const stripContent = (html) =>
      (html || '')
        .replace(/<img[^>]*>/gi, '****[첨부이미지]****')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
    const dotDate = (s) => {
      if (!s) return ''
      if (s instanceof Date) {
        const y = s.getFullYear()
        const m = String(s.getMonth() + 1).padStart(2, '0')
        const d = String(s.getDate()).padStart(2, '0')
        return `${y}.${m}.${d}`
      }
      return String(s).slice(0, 10).replace(/-/g, '.')
    }
    const periodText = (always, ds, de) =>
      always ? '상시' : `${dotDate(ds)} ~ ${dotDate(de)}`

    // 변경된 항목만 수집
    const beforeLines = []
    const afterLines = []

    if ((oldData.title || '') !== (title || '')) {
      beforeLines.push(`제목: [${oldData.title || ''}]`)
      afterLines.push(`제목: [${title || ''}]`)
    }
    const oldContentStripped = stripContent(oldData.content)
    const newContentStripped = stripContent(content)
    if (oldContentStripped !== newContentStripped) {
      beforeLines.push(`내용:\n[${oldContentStripped}]`)
      afterLines.push(`내용:\n[${newContentStripped}]`)
    }
    const oldPeriod = periodText(!!oldData.is_always, oldData.display_start, oldData.display_end)
    const newPeriod = periodText(!!isAlways, display_start, display_end)
    if (oldPeriod !== newPeriod) {
      beforeLines.push(`게시기간: [${oldPeriod}]`)
      afterLines.push(`게시기간: [${newPeriod}]`)
    }
    const oldSize = `${oldData.popup_width || 500} x ${oldData.popup_height || 400}`
    const newSize = `${popup_width || 500} x ${popup_height || 400}`
    if (oldSize !== newSize) {
      beforeLines.push(`팝업크기: [${oldSize}]`)
      afterLines.push(`팝업크기: [${newSize}]`)
    }

    // 변경된 항목이 있을 때만 로그 기록
    if (beforeLines.length > 0) {
      const logDetails = `[No. ${id}]\n\n변경 전\n\n${beforeLines.join('\n\n')}\n\n\n변경 후\n\n${afterLines.join('\n\n')}`
      await pool.query(
        `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
         VALUES ('popup', ?, '수정', ?, ?, 'admin')`,
        [id, logDetails, req.user.name || req.user.login_id || 'admin']
      )
    }

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

    // 삭제 대상 팝업의 제목 조회 (로그용)
    const [rows] = await pool.query(
      `SELECT title FROM popups WHERE id = ?`,
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '팝업을 찾을 수 없습니다' })
    }
    const popupTitle = rows[0].title || ''

    // updated_at = updated_at 명시 → ON UPDATE CURRENT_TIMESTAMP 자동 갱신 방지
    // (삭제된 행이 정렬 상 최상단으로 튀어 올라가는 것 방지, 원래 위치 유지)
    await pool.query(
      `UPDATE popups
       SET status = 'deleted', deleted_at = NOW(), updated_at = updated_at
       WHERE id = ?`,
      [id]
    )

    // ★ 관리자 로그 (피그마 포맷)
    const logDetails = `[No. ${id}]\n\n제목: [${popupTitle}]`
    await pool.query(
      `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
       VALUES ('popup', ?, '삭제', ?, ?, 'admin')`,
      [id, logDetails, req.user.name || req.user.login_id || 'admin']
    )

    res.json({ success: true })
  } catch (error) {
    console.error('deletePopup error:', error)
    res.status(500).json({ success: false, message: '삭제 실패' })
  }
}
