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

    // 고객 첨부파일
    const [inquiryAttachments] = await pool.query(
      `SELECT id, file_name, file_path, file_size, file_type, sort_order
       FROM inquiry_attachments WHERE inquiry_id = ? AND type = 'inquiry' ORDER BY sort_order ASC`,
      [id]
    )

    // 답변 첨부파일
    const [answerAttachments] = await pool.query(
      `SELECT id, file_name, file_path, file_size, file_type, sort_order
       FROM inquiry_attachments WHERE inquiry_id = ? AND type = 'answer' ORDER BY sort_order ASC`,
      [id]
    )

    const inquiry = rows[0]
    inquiry.attachments = inquiryAttachments
    inquiry.answer_attachments = answerAttachments

    res.json({ success: true, data: inquiry })
  } catch (error) {
    console.error('getInquiryDetail error:', error)
    res.status(500).json({ success: false, message: '문의 상세 조회 실패' })
  }
}


const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

// ============ [관리자] 답변 저장 (임시저장 / 답변완료) ============
exports.answerInquiry = async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const { id } = req.params
    const { answer, status } = req.body // status: 'draft' or 'answered'
    const keepAttachments = req.body.keep_attachments
      ? JSON.parse(req.body.keep_attachments)
      : []

    // 문의 존재 확인
    const [existing] = await conn.query(
      `SELECT i.*, h.name AS hospital_name, u.login_id, u.email
       FROM inquiries i
       LEFT JOIN hospitals h ON i.hospital_id = h.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    )
    if (existing.length === 0) {
      await conn.rollback()
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다' })
    }

    const inquiry = existing[0]

    // 이미 답변완료된 문의는 수정 불가
    if (inquiry.status === 'answered') {
      await conn.rollback()
      return res.status(400).json({ success: false, message: '이미 답변 완료된 문의입니다' })
    }

    // 답변완료 시 내용 필수
    if (status === 'answered' && (!answer || !answer.trim())) {
      await conn.rollback()
      return res.status(400).json({ success: false, message: '답변 내용을 입력해 주세요' })
    }

    // 문의 업데이트
    if (status === 'answered') {
      await conn.query(
        `UPDATE inquiries SET answer = ?, status = 'answered', answered_at = NOW() WHERE id = ?`,
        [answer || '', id]
      )
    } else {
      await conn.query(
        `UPDATE inquiries SET answer = ?, status = 'draft' WHERE id = ?`,
        [answer || '', id]
      )
    }

    // 기존 답변 첨부파일 중 유지 목록에 없는 것 삭제
    if (keepAttachments.length > 0) {
      await conn.query(
        `DELETE FROM inquiry_attachments WHERE inquiry_id = ? AND type = 'answer' AND id NOT IN (?)`,
        [id, keepAttachments]
      )
    } else {
      await conn.query(
        `DELETE FROM inquiry_attachments WHERE inquiry_id = ? AND type = 'answer'`,
        [id]
      )
    }

    // 새 첨부파일 저장
    if (req.files && req.files.length > 0) {
      const [maxOrder] = await conn.query(
        `SELECT COALESCE(MAX(sort_order), -1) as max_order FROM inquiry_attachments WHERE inquiry_id = ? AND type = 'answer'`,
        [id]
      )
      let sortOrder = maxOrder[0].max_order + 1

      for (const file of req.files) {
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
        const filePath = file.path.replace(/\\/g, '/')
        const ext = fileName.split('.').pop().toLowerCase()
        await conn.query(
          `INSERT INTO inquiry_attachments (inquiry_id, type, file_name, file_path, file_size, file_type, sort_order)
           VALUES (?, 'answer', ?, ?, ?, ?, ?)`,
          [id, fileName, filePath, file.size, ext, sortOrder++]
        )
      }
    }

    await conn.commit()

    // 답변완료 시 이메일 발송
    if (status === 'answered' && inquiry.email) {
      try {
        // 답변 첨부파일 조회 (이메일 첨부용)
        const [answerFiles] = await pool.query(
          `SELECT file_name, file_path FROM inquiry_attachments WHERE inquiry_id = ? AND type = 'answer'`,
          [id]
        )

        const emailAttachments = answerFiles.map(f => ({
          filename: f.file_name,
          path: f.file_path,
        }))

        const createdAt = new Date(inquiry.created_at)
        const dateStr = `${createdAt.getFullYear()}.${String(createdAt.getMonth() + 1).padStart(2, '0')}.${String(createdAt.getDate()).padStart(2, '0')}. ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`

        await transporter.sendMail({
          from: `"OsteoAge" <${process.env.MAIL_FROM}>`,
          to: inquiry.email,
          subject: `[OsteoAge] Re : ${inquiry.title}`,
          attachments: emailAttachments,
          html: `
            <div style="max-width:600px; margin:0 auto; font-family:'Inter','Noto Sans KR',Arial,sans-serif; color:#353535;">
          <img src="http://osteoage.ai/assets/logo/di_wave_logo_color.png" alt="DiwaveLogo" style="width:101px; margin-top:16px;" />  
          
          <div style="padding:16px;width:100%; font-family:'Inter',Arial,sans-serif; font-size:16px; line-height:1.4; font-weight:500; color:#f8f9fa ">OsteoAge 문의 답변 안내</div>

              <!-- 답변 본문 -->
              <div style="padding:0 0 24px; line-height:1.8; font-size:14px;">
                <p>안녕하세요<br/>OsteoAge 입니다.</p><br/><br/>
                <div>${answer}</div>
                <br/><br/>
                <p>앞으로 안정적이고 신뢰할 수 있는 서비스 제공을 위해 최선을 다하겠습니다.</p><br/><br/>
                <p>OsteoAge 드림</p>
              </div>

              <hr style="border:none; border-top:1px solid #DFE1E7; margin:20px 0;" />

              <!-- 고객 문의 내역 -->
              <div style="padding:0 0 24px;">
                <h3 style="font-size:16px; font-weight:bold; margin-bottom:12px;">고객님 문의 내용</h3>
                <p style="font-size:13px; color:#666; margin-bottom:8px;">
                  ${inquiry.hospital_name} (${inquiry.login_id})&nbsp;&nbsp;|&nbsp;&nbsp;${dateStr}
                </p>
                <p style="font-size:15px; font-weight:bold; margin-bottom:8px;">${inquiry.title}</p>
                <p style="font-size:14px; line-height:1.6;">${inquiry.content}</p>
              </div>

              <hr style="border:none; border-top:1px solid #DFE1E7; margin:20px 0;" />

              <!-- 푸터 -->
              <div style="font-size:12px; color:#999; line-height:1.4; padding-bottom:32px;">
                <p>본 메일은 발송 전용으로 회신이 불가능합니다.<br/>
추가 문의 사항은 서비스 내 [문의하기] 게시판을 이용해 주세요.<br/>
Copyright © DiWAVE Inc. All rights reserved.</p>
                <br/>
                <p>디웨이브주식회사<br/>
02-2088-8728 [문의가능시간 : 10:00~17:00 (토 · 일 · 공휴일 휴무)]</p>
                <div style="margin-top:16px;">
                  <img src="http://osteoage.ai/assets/logo/di_wave_logo_color.png" alt="diwaveLogo" style="width:185px;" />
                </div>
              </div>
            </div>
          `,
        })
      } catch (emailErr) {
        console.error('답변 이메일 발송 실패:', emailErr)
        // 이메일 실패해도 답변 저장은 성공으로 처리
      }
    }

    res.json({ success: true })
  } catch (error) {
    await conn.rollback()
    console.error('answerInquiry error:', error)
    res.status(500).json({ success: false, message: '답변 저장 실패' })
  } finally {
    conn.release()
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

