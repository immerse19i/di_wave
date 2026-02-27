const { pool } = require('../config/database')
const config = require('../config/config')

exports.confirmPayment = async (req, res) => {
  const { paymentKey, orderId, amount } = req.body
  const hospitalId = req.user.hospital_id

  try {
    const secretKey = config.toss.secretKey
    const encryptedSecretKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: encryptedSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const result = await response.json()

    if (!response.ok) {
      return res.status(400).json({ success: false, message: result.message })
    }

    const creditAmount = getCreditByAmount(amount)
    if (!creditAmount) {
      return res.status(400).json({ success: false, message: '유효하지 않은 결제 금액' })
    }

    const [paymentResult] = await pool.query(
      `INSERT INTO payments (hospital_id, amount, credit_amount, pg_provider, pg_transaction_id, status)
       VALUES (?, ?, ?, 'tosspayments', ?, 'completed')`,
      [hospitalId, amount, creditAmount, paymentKey]
    )

    await pool.query(
      `UPDATE credits SET balance = balance + ? WHERE hospital_id = ?`,
      [creditAmount, hospitalId]
    )

    const [credit] = await pool.query(
      `SELECT balance FROM credits WHERE hospital_id = ?`,
      [hospitalId]
    )

    await pool.query(
      `INSERT INTO credit_transactions (hospital_id, type, amount, balance_after, description, payment_id)
       VALUES (?, 'charge', ?, ?, ?, ?)`,
      [hospitalId, creditAmount, credit[0].balance, `크레딧 ${creditAmount}건 충전`, paymentResult.insertId]
    )

    res.json({ success: true, data: { creditAmount, balance: credit[0].balance } })

  } catch (error) {
    console.error('결제 승인 오류:', error)
    res.status(500).json({ success: false, message: '결제 승인 처리 중 오류' })
  }
}

function getCreditByAmount(amount) {
  const plans = { 267000: 30, 395000: 50, 740000: 100 }
  return plans[amount] || 0
}
