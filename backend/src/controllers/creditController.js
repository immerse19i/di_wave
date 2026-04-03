const { pool } = require('../config/database')

exports.getMyCreditHistory = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id
    const { startDate, endDate, type, page = 1, limit = 12 } = req.query

    let where = 'WHERE ct.hospital_id = ?'
    const params = [hospitalId]

    if (startDate) {
      where += ' AND DATE(ct.created_at) >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND DATE(ct.created_at) <= ?'
      params.push(endDate)
    }

    if (type === 'charge') {
      where += " AND ct.type = 'charge'"
    } else if (type === 'use') {
      where += " AND ct.type IN ('use', 'refund')"
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM credit_transactions ct ${where}`,
      params
    )
    const total = countResult[0].total

    const offset = (page - 1) * limit
    const [rows] = await pool.query(
      `SELECT ct.id, ct.type, ct.amount, ct.balance_after, ct.description,
              ct.analysis_id, ct.payment_id, ct.created_at,
              p.patient_code, p.name as patient_name,
              a.physician
       FROM credit_transactions ct
       LEFT JOIN analyses a ON ct.analysis_id = a.id
       LEFT JOIN patients p ON a.patient_id = p.id
       ${where}
       ORDER BY ct.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    )

    const [creditRows] = await pool.query(
      'SELECT COALESCE(balance, 0) as balance FROM credits WHERE hospital_id = ?',
      [hospitalId]
    )
    const balance = creditRows.length > 0 ? creditRows[0].balance : 0

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      balance,
    })
  } catch (error) {
    console.error('GetMyCreditHistory error:', error)
    res.status(500).json({ success: false, message: '서버 오류' })
  }
}


// POST /api/credits/expire-check - 만료 크레딧 처리
exports.expireCheck = async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const hospitalId = req.user.hospital_id

    await conn.beginTransaction()

    // 만료된 배치 조회 (expires_at 지남 + 잔여량 > 0)
    const [expired] = await conn.query(
      `SELECT id, remaining_amount FROM credit_transactions
       WHERE hospital_id = ? AND type = 'charge'
         AND expires_at IS NOT NULL AND expires_at < NOW()
         AND remaining_amount > 0`,
      [hospitalId]
    )

    let totalExpired = 0
    for (const batch of expired) {
      totalExpired += batch.remaining_amount
      await conn.query(
        'UPDATE credit_transactions SET remaining_amount = 0 WHERE id = ?',
        [batch.id]
      )
    }

    // balance 차감
    if (totalExpired > 0) {
      await conn.query(
        'UPDATE credits SET balance = balance - ? WHERE hospital_id = ?',
        [totalExpired, hospitalId]
      )

      // 만료 거래 내역 기록
      const [credit] = await conn.query(
        'SELECT balance FROM credits WHERE hospital_id = ?',
        [hospitalId]
      )
      await conn.query(
        `INSERT INTO credit_transactions (hospital_id, type, amount, balance_after, description)
         VALUES (?, 'use', ?, ?, '크레딧 만료 소멸')`,
        [hospitalId, totalExpired, credit[0].balance]
      )
    }

    await conn.commit()
    res.json({ success: true, data: { expiredAmount: totalExpired } })
  } catch (error) {
    await conn.rollback()
    console.error('ExpireCheck error:', error)
    res.status(500).json({ success: false, message: '서버 오류' })
  } finally {
    conn.release()
  }
}

// GET /api/credits/expiring - 만료 예정 배치 조회
exports.getExpiring = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id

const [rows] = await pool.query(
  `SELECT expires_at, remaining_amount FROM credit_transactions
   WHERE hospital_id = ? AND type = 'charge'
     AND expires_at IS NOT NULL AND expires_at > NOW()
     AND expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY)
     AND remaining_amount > 0
   ORDER BY expires_at ASC`,
  [hospitalId]
)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GetExpiring error:', error)
    res.status(500).json({ success: false, message: '서버 오류' })
  }
}

// GET /api/credits/unnotified-grants - 미알림 지급건 조회
exports.getUnnotifiedGrants = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id

    const [rows] = await pool.query(
      `SELECT id, amount, created_at, expires_at FROM credit_transactions
       WHERE hospital_id = ? AND source = 'admin_grant'
         AND is_notified = 0 AND type = 'charge'
       ORDER BY created_at ASC`,
      [hospitalId]
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GetUnnotifiedGrants error:', error)
    res.status(500).json({ success: false, message: '서버 오류' })
  }
}

// PATCH /api/credits/mark-notified - 알림 확인 처리
exports.markNotified = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id

    await pool.query(
      `UPDATE credit_transactions SET is_notified = 1
       WHERE hospital_id = ? AND source = 'admin_grant'
         AND is_notified = 0 AND type = 'charge'`,
      [hospitalId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('MarkNotified error:', error)
    res.status(500).json({ success: false, message: '서버 오류' })
  }
}
