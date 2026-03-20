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
