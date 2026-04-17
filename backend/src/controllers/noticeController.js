const { pool } = require('../config/database')

// ============ 목록 조회 ============
exports.getNotices = async (req, res) => {
  try {
    const { status, startDate, endDate, search, sortField, sortOrder, page = 1, limit } = req.query

    let where = ['1=1']
    let params = []

    if (status) {
      const statuses = status.split(',').filter(s =>
        ['published', 'draft', 'private', 'deleted'].includes(s)
      )
      if (statuses.length > 0) {
        where.push(`n.status IN (${statuses.map(() => '?').join(',')})`)
        params.push(...statuses)
      }
    }
    if (startDate) {
      where.push('DATE(n.created_at) >= ?')
      params.push(startDate)
    }
    if (endDate) {
      where.push('DATE(n.created_at) <= ?')
      params.push(endDate)
    }
    if (search && search.trim()) {
      where.push('n.title LIKE ?')
      params.push(`%${search.trim()}%`)
    }

    const whereClause = where.join(' AND ')

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
        if (sortOrder === 'desc') {
          orderClause = `ORDER BY FIELD(n.status, 'deleted', 'private', 'draft', 'published'), n.created_at DESC`
        } else {
          orderClause = `ORDER BY FIELD(n.status, 'published', 'draft', 'private', 'deleted'), n.created_at DESC`
        }
      } else if (sortField === 'is_pinned') {
        if (sortOrder === 'asc') {
          orderClause = `ORDER BY (n.is_pinned = TRUE AND n.status = 'published') DESC, n.created_at DESC`
        } else {
          orderClause = `ORDER BY (n.is_pinned = TRUE AND n.status = 'published') ASC, n.created_at DESC`
        }
      } else {
        orderClause = `ORDER BY n.${sortField} ${order}, n.created_at DESC`
      }
    } else {
      orderClause = `ORDER BY
        CASE
          WHEN n.status = 'published' AND n.is_pinned = TRUE THEN 0
          WHEN n.status = 'draft' THEN 1
          ELSE 2
        END,
        n.created_at DESC`
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit) || 10
    const offset = (pageNum - 1) * limitNum

    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.status, n.is_pinned, n.has_attachment,
              n.author_name, n.created_at, n.published_at
       FROM notices n
       WHERE ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({ success: true, data: rows, total, totalPages: Math.ceil(total / limitNum), currentPage: pageNum })
  } catch (error) {
    console.error('getNotices error:', error)
    res.status(500).json({ success: false, message: '공지사항 조회 실패' })
  }
}

// ============ 상세 조회 (+ 첨부파일) ============
exports.getNoticeDetail = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(`SELECT * FROM notices WHERE id = ?`, [id])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '공지사항을 찾을 수 없습니다' })
    }

    // 첨부파일 조회
    const [attachments] = await pool.query(
      `SELECT id, file_name, file_path, file_size, file_type, sort_order
       FROM notice_attachments WHERE notice_id = ? ORDER BY sort_order ASC`,
      [id]
    )

    const notice = rows[0]
    notice.attachments = attachments

    res.json({ success: true, data: notice })
  } catch (error) {
    console.error('getNoticeDetail error:', error)
    res.status(500).json({ success: false, message: '상세 조회 실패' })
  }
}

// ============ 생성 ============
exports.createNotice = async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const { title, content, status, is_pinned } = req.body
    const authorId = req.user.id
    const authorName = req.user.name || req.user.login_id
    const isPinned = is_pinned === 'true' || is_pinned === true ? 1 : 0
    const hasAttachment = req.files && req.files.length > 0

    // published_at: 게시하기(published/private)일 때만 기록, 임시저장은 null
    const publishedAt = (status === 'published' || status === 'private') ? new Date() : null

    const [result] = await conn.query(
      `INSERT INTO notices (title, content, status, is_pinned, has_attachment, author_id, author_name, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content || '', status || 'draft', isPinned, hasAttachment, authorId, authorName, publishedAt]
    )

    const noticeId = result.insertId

    // 첨부파일 저장
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
        const filePath = file.path.replace(/\\/g, '/')
        const ext = fileName.split('.').pop().toLowerCase()
        await conn.query(
          `INSERT INTO notice_attachments (notice_id, file_name, file_path, file_size, file_type, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [noticeId, fileName, filePath, file.size, ext, i]
        )
      }
    }

    // ★ 관리자 로그 (피그마 포맷)
    const statusLabel = { published: '공개', draft: '임시저장', private: '비공개' }[status] || status
    const pinnedLabel = isPinned ? 'O' : 'X'
    const contentText = (content || '')
      .replace(/<img[^>]*>/gi, '****[첨부이미지]****')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    const actionLabel = status === 'draft' ? '임시저장' : '생성'
    // 임시저장: [No. -] / 생성: [No. N]
    const header = status === 'draft' ? `[No. -]` : `[No. ${noticeId}]`
    const logDetails = `${header}\n\n제목: [${title || ''}]\n\n내용: [${contentText}]\n\n상태: [${statusLabel}]\n상단고정: [${pinnedLabel}]`
    await conn.query(
      `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
       VALUES ('notice', ?, ?, ?, ?, 'admin')`,
      [noticeId, actionLabel, logDetails, authorName]
    )

    await conn.commit()
    res.json({ success: true, data: { id: noticeId } })
  } catch (error) {
    await conn.rollback()
    console.error('createNotice error:', error)
    res.status(500).json({ success: false, message: '공지사항 생성 실패' })
  } finally {
    conn.release()
  }
}

// ============ 수정 ============
exports.updateNotice = async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const { id } = req.params
    const { title, content, status, is_pinned, keep_attachments } = req.body
    const isPinned = is_pinned === 'true' || is_pinned === true ? 1 : 0

    // 기존 공지 조회 (전체 필드 - 로그용)
    const [existing] = await conn.query(
      `SELECT title, content, status, is_pinned, published_at FROM notices WHERE id = ?`,
      [id]
    )
    if (existing.length === 0) {
      await conn.rollback()
      return res.status(404).json({ success: false, message: '공지사항을 찾을 수 없습니다' })
    }
    const oldData = existing[0]

    // 기존 첨부파일명 (로그용, UPDATE 전에 조회)
    const [oldAttRows] = await conn.query(
      `SELECT file_name FROM notice_attachments WHERE notice_id = ? ORDER BY sort_order ASC`,
      [id]
    )
    const oldAttachmentNames = oldAttRows.map(r => r.file_name).join(', ')

    // published_at: 최초 게시 시에만 기록 (이미 게시된 적 있으면 유지)
    let publishedAt = oldData.published_at
    if (!publishedAt && (status === 'published' || status === 'private')) {
      publishedAt = new Date()
    }

    // keep_attachments: 유지할 첨부파일 ID 배열 (JSON string으로 전달)
    let keepIds = []
    if (keep_attachments) {
      try { keepIds = JSON.parse(keep_attachments) } catch (e) { keepIds = [] }
    }

    // 삭제할 첨부파일 제거
    if (keepIds.length > 0) {
      await conn.query(
        `DELETE FROM notice_attachments WHERE notice_id = ? AND id NOT IN (${keepIds.map(() => '?').join(',')})`,
        [id, ...keepIds]
      )
    } else if (!req.files || req.files.length === 0) {
      // keep도 없고 새 파일도 없으면 기존 유지 (아무것도 안함)
    } else {
      // 새 파일만 있고 keep 없으면 기존 전부 삭제
      await conn.query(`DELETE FROM notice_attachments WHERE notice_id = ?`, [id])
    }

    // 새 파일 추가
    if (req.files && req.files.length > 0) {
      // 현재 최대 sort_order
      const [maxSort] = await conn.query(
        `SELECT COALESCE(MAX(sort_order), -1) as maxSort FROM notice_attachments WHERE notice_id = ?`, [id]
      )
      let nextSort = maxSort[0].maxSort + 1

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
        const filePath = file.path.replace(/\\/g, '/')
        const ext = fileName.split('.').pop().toLowerCase()
        await conn.query(
          `INSERT INTO notice_attachments (notice_id, file_name, file_path, file_size, file_type, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, fileName, filePath, file.size, ext, nextSort + i]
        )
      }
    }

    // 첨부파일 유무 체크
    const [attCount] = await conn.query(
      `SELECT COUNT(*) as cnt FROM notice_attachments WHERE notice_id = ?`, [id]
    )
    const hasAttachment = attCount[0].cnt > 0

    await conn.query(
      `UPDATE notices SET title = ?, content = ?, status = ?, is_pinned = ?,
              has_attachment = ?, published_at = ? WHERE id = ?`,
      [title, content || '', status || 'draft', isPinned, hasAttachment, publishedAt, id]
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
    const statusMap = { published: '공개', draft: '임시저장', private: '비공개' }
    const oldStatusLabel = statusMap[oldData.status] || oldData.status
    const newStatusLabel = statusMap[status] || status
    const oldPinnedLabel = oldData.is_pinned ? 'O' : 'X'
    const newPinnedLabel = isPinned ? 'O' : 'X'

    // 변경 후 첨부파일명 조회
    const [newAttRows] = await conn.query(
      `SELECT file_name FROM notice_attachments WHERE notice_id = ? ORDER BY sort_order ASC`,
      [id]
    )
    const newAttachmentNames = newAttRows.map(r => r.file_name).join(', ')

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
      beforeLines.push(`내용: [${oldContentStripped}]`)
      afterLines.push(`내용: [${newContentStripped}]`)
    }
    if (oldStatusLabel !== newStatusLabel) {
      beforeLines.push(`상태: [${oldStatusLabel}]`)
      afterLines.push(`상태: [${newStatusLabel}]`)
    }
    if (oldPinnedLabel !== newPinnedLabel) {
      beforeLines.push(`상단고정: [${oldPinnedLabel}]`)
      afterLines.push(`상단고정: [${newPinnedLabel}]`)
    }
    if (oldAttachmentNames !== newAttachmentNames) {
      beforeLines.push(`첨부파일명: [${oldAttachmentNames}]`)
      afterLines.push(`첨부파일명: [${newAttachmentNames}]`)
    }

    // 변경된 항목이 있을 때만 로그 기록
    if (beforeLines.length > 0) {
      const logDetails = `[No. ${id}]\n\n변경 전\n\n${beforeLines.join('\n\n')}\n\n\n변경 후\n\n${afterLines.join('\n\n')}`
      await conn.query(
        `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
         VALUES ('notice', ?, '수정', ?, ?, 'admin')`,
        [id, logDetails, req.user.name || req.user.login_id || 'admin']
      )
    }

    await conn.commit()
    res.json({ success: true })
  } catch (error) {
    await conn.rollback()
    console.error('updateNotice error:', error)
    res.status(500).json({ success: false, message: '공지사항 수정 실패' })
  } finally {
    conn.release()
  }
}

// ============ 삭제 (소프트) ============
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params

    // 삭제 대상 공지 제목 조회 (로그용)
    const [rows] = await pool.query(
      `SELECT title FROM notices WHERE id = ?`,
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '공지사항을 찾을 수 없습니다' })
    }
    const noticeTitle = rows[0].title || ''

    await pool.query(
      `UPDATE notices SET status = 'deleted', deleted_at = NOW(), updated_at = updated_at WHERE id = ?`,
      [id]
    )

    // ★ 관리자 로그 (피그마 포맷)
    const logDetails = `[No. ${id}]\n\n제목: [${noticeTitle}]`
    await pool.query(
      `INSERT INTO admin_logs (target_type, target_id, category, details, operator, actor_type)
       VALUES ('notice', ?, '삭제', ?, ?, 'admin')`,
      [id, logDetails, req.user.name || req.user.login_id || 'admin']
    )

    res.json({ success: true })
  } catch (error) {
    console.error('deleteNotice error:', error)
    res.status(500).json({ success: false, message: '삭제 실패' })
  }
}

// ============ [유저] 공지사항 목록 ============
exports.getPublicNotices = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notices WHERE status = 'published'`
    )
    const total = countResult[0].total

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit) || 15
    const offset = (pageNum - 1) * limitNum

    const [rows] = await pool.query(
      `SELECT id, title, is_pinned, has_attachment, published_at
       FROM notices
       WHERE status = 'published'
       ORDER BY is_pinned DESC, published_at DESC
       LIMIT ? OFFSET ?`,
      [limitNum, offset]
    )

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    })
  } catch (error) {
    console.error('getPublicNotices error:', error)
    res.status(500).json({ success: false, message: '공지사항 조회 실패' })
  }
}

// ============ [유저] 공지사항 상세 ============
exports.getPublicNoticeDetail = async (req, res) => {
  try {
    const { id } = req.params

    const [rows] = await pool.query(
      `SELECT id, title, content, is_pinned, has_attachment, published_at
       FROM notices WHERE id = ? AND status = 'published'`,
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '공지사항을 찾을 수 없습니다' })
    }

    const [attachments] = await pool.query(
      `SELECT id, file_name, file_path, file_size, file_type, sort_order
       FROM notice_attachments WHERE notice_id = ? ORDER BY sort_order ASC`,
      [id]
    )

    const notice = rows[0]
    notice.attachments = attachments

    res.json({ success: true, data: notice })
  } catch (error) {
    console.error('getPublicNoticeDetail error:', error)
    res.status(500).json({ success: false, message: '상세 조회 실패' })
  }
}
