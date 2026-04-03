const crypto = require('crypto')
const { pool } = require('../config/database')
const config = require('../config/config')

// 카드 결제 승인
exports.confirmPayment = async (req, res) => {
  const { paymentKey, orderId, amount } = req.body
  const hospitalId = req.user.hospital_id

  // 1) 토스 결제 승인 API 호출
  let tossResult
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

    tossResult = await response.json()

    if (!response.ok) {
      return res.status(400).json({ success: false, message: tossResult.message || '결제 승인 실패' })
    }
  } catch (error) {
    console.error('토스 API 호출 오류:', error)
    return res.status(500).json({ success: false, message: '결제 승인 요청 중 오류' })
  }

  // 2) 크레딧 수량 확인
  const creditAmount = getCreditByAmount(amount)
  if (!creditAmount) {
    return res.status(400).json({ success: false, message: '유효하지 않은 결제 금액' })
  }

  // 3) DB 트랜잭션 (payments + credits + credit_transactions)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // payments 기록
    const [paymentResult] = await conn.query(
      `INSERT INTO payments (hospital_id, amount, credit_amount, pg_provider, pg_transaction_id, payment_method, status)
       VALUES (?, ?, ?, 'tosspayments', ?, 'CARD', 'completed')`,
      [hospitalId, amount, creditAmount, paymentKey]
    )

    // credits 잔액 증가
    await conn.query(
      `UPDATE credits SET balance = balance + ? WHERE hospital_id = ?`,
      [creditAmount, hospitalId]
    )

    // 변경 후 잔액 조회
    const [credit] = await conn.query(
      `SELECT balance FROM credits WHERE hospital_id = ?`,
      [hospitalId]
    )

    // credit_transactions 기록 (만료 시스템 필드 포함)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 결제 충전 = 1년 유효

    await conn.query(
      `INSERT INTO credit_transactions
       (hospital_id, type, amount, balance_after, description, payment_id, expires_at, source, remaining_amount)
       VALUES (?, 'charge', ?, ?, ?, ?, ?, 'payment', ?)`,
      [hospitalId, creditAmount, credit[0].balance, `크레딧 ${creditAmount}건 충전`, paymentResult.insertId, expiresAt, creditAmount]
    )

    await conn.commit()

    res.json({ success: true, data: { creditAmount, balance: credit[0].balance } })

  } catch (error) {
    await conn.rollback()
    console.error('결제 DB 처리 오류:', error)
    res.status(500).json({ success: false, message: '결제 처리 중 오류가 발생했습니다.' })
  } finally {
    conn.release()
  }
}

// 가상계좌 결제 승인 (계좌 발급)
exports.confirmVirtualAccount = async (req, res) => {
  const { paymentKey, orderId, amount } = req.body
  const hospitalId = req.user.hospital_id

  // 1) 토스 결제 승인 API 호출
  let tossResult
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

    tossResult = await response.json()

    if (!response.ok) {
      return res.status(400).json({ success: false, message: tossResult.message || '가상계좌 발급 실패' })
    }
  } catch (error) {
    console.error('토스 API 호출 오류:', error)
    return res.status(500).json({ success: false, message: '가상계좌 발급 요청 중 오류' })
  }

  // 2) 크레딧 수량 확인
  const creditAmount = getCreditByAmount(amount)
  if (!creditAmount) {
    return res.status(400).json({ success: false, message: '유효하지 않은 결제 금액' })
  }

  // 3) 가상계좌 정보 추출
  const va = tossResult.virtualAccount || {}

  // 4) DB에 대기 상태로 저장 (입금 전이므로 pending)
  try {
    await pool.query(
      `INSERT INTO payments
       (hospital_id, amount, credit_amount, pg_provider, pg_transaction_id, payment_method, status,
        virtual_account_number, virtual_bank_name, virtual_due_date, virtual_depositor_name)
       VALUES (?, ?, ?, 'tosspayments', ?, 'VIRTUAL_ACCOUNT', 'pending', ?, ?, ?, ?)`,
      [
        hospitalId, amount, creditAmount, paymentKey,
        va.accountNumber || null,
        va.bankCode || null,
        va.dueDate ? new Date(va.dueDate) : null,
        va.customerName || null
      ]
    )

    res.json({
      success: true,
      data: {
        creditAmount,
        accountNumber: va.accountNumber,
        bankCode: va.bankCode,
        bankName: getBankName(va.bankCode),
        dueDate: va.dueDate,
        depositorName: va.customerName
      }
    })
  } catch (error) {
    console.error('가상계좌 DB 저장 오류:', error)
    res.status(500).json({ success: false, message: '가상계좌 정보 저장 중 오류' })
  }
}

// 토스 웹훅 수신 (입금 완료 등)
exports.handleWebhook = async (req, res) => {
  // 1) 서명 검증 (raw body 사용)
  const signature = req.headers['tosspayments-signature']
  const rawBody = req.rawBody || JSON.stringify(req.body)
  if (!verifyWebhookSignature(rawBody, signature, config.toss.webhookSecret)) {
    console.error('웹훅 서명 검증 실패')
    return res.status(400).json({ success: false, message: '서명 검증 실패' })
  }

  const { eventType, data } = req.body

  // 2) 처리 가능한 이벤트만 처리
  if (eventType !== 'DEPOSIT_CALLBACK' && eventType !== 'PAYMENT_STATUS_CHANGED') {
    return res.json({ success: true })
  }

  const { paymentKey, status } = data

  // 입금 완료가 아닌 경우 (CANCELED 등)
  if (status !== 'DONE') {
    // 입금 취소/환불 시 payments 상태만 업데이트
    if (status === 'CANCELED' || status === 'EXPIRED') {
      await pool.query(
        `UPDATE payments SET status = 'cancelled' WHERE pg_transaction_id = ? AND status = 'pending'`,
        [paymentKey]
      )
    }
    return res.json({ success: true })
  }

  // 3) 해당 결제 조회
  const [payments] = await pool.query(
    `SELECT * FROM payments WHERE pg_transaction_id = ? AND status = 'pending'`,
    [paymentKey]
  )

  if (payments.length === 0) {
    console.error('웹훅: 대기 중인 결제를 찾을 수 없음:', paymentKey)
    return res.json({ success: true })
  }

  const payment = payments[0]

  // 4) 크레딧 충전 트랜잭션
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // payments 상태 완료로 업데이트
    await conn.query(
      `UPDATE payments SET status = 'completed' WHERE id = ?`,
      [payment.id]
    )

    // credits 잔액 증가
    await conn.query(
      `UPDATE credits SET balance = balance + ? WHERE hospital_id = ?`,
      [payment.credit_amount, payment.hospital_id]
    )

    // 변경 후 잔액 조회
    const [credit] = await conn.query(
      `SELECT balance FROM credits WHERE hospital_id = ?`,
      [payment.hospital_id]
    )

    // credit_transactions 기록
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await conn.query(
      `INSERT INTO credit_transactions
       (hospital_id, type, amount, balance_after, description, payment_id, expires_at, source, remaining_amount)
       VALUES (?, 'charge', ?, ?, ?, ?, ?, 'payment', ?)`,
      [
        payment.hospital_id, payment.credit_amount, credit[0].balance,
        `크레딧 ${payment.credit_amount}건 충전 (무통장입금)`,
        payment.id, expiresAt, payment.credit_amount
      ]
    )

    await conn.commit()
    console.log(`웹훅: 가상계좌 입금 완료 - hospital_id=${payment.hospital_id}, credit=${payment.credit_amount}`)
  } catch (error) {
    await conn.rollback()
    console.error('웹훅 크레딧 충전 오류:', error)
  } finally {
    conn.release()
  }

  res.json({ success: true })
}

// 결제 상태 조회 (프론트에서 가상계좌 입금 확인용)
exports.getPaymentStatus = async (req, res) => {
  const { orderId } = req.params
  const hospitalId = req.user.hospital_id

  try {
    const [rows] = await pool.query(
      `SELECT status, payment_method, credit_amount, virtual_bank_name, virtual_account_number, virtual_due_date
       FROM payments WHERE pg_transaction_id LIKE ? AND hospital_id = ? ORDER BY id DESC LIMIT 1`,
      [`%${orderId}%`, hospitalId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '결제 정보를 찾을 수 없습니다.' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('결제 상태 조회 오류:', error)
    res.status(500).json({ success: false, message: '조회 중 오류' })
  }
}

// 결제 취소
exports.cancelPayment = async (req, res) => {
  const { paymentId, cancelReason } = req.body
  const hospitalId = req.user.hospital_id

  // 1) 해당 결제 조회 (본인 병원 것만)
  const [payments] = await pool.query(
    `SELECT * FROM payments WHERE id = ? AND hospital_id = ?`,
    [paymentId, hospitalId]
  )

  if (payments.length === 0) {
    return res.status(404).json({ success: false, message: '결제 정보를 찾을 수 없습니다.' })
  }

  const payment = payments[0]

  // 이미 취소된 결제
  if (payment.status === 'cancelled') {
    return res.status(400).json({ success: false, message: '이미 취소된 결제입니다.' })
  }

  // 2) 토스 결제 취소 API 호출
  let tossResult
  try {
    const secretKey = config.toss.secretKey
    const encryptedSecretKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

    const response = await fetch(`https://api.tosspayments.com/v1/payments/${payment.pg_transaction_id}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: encryptedSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason: cancelReason || '고객 요청' }),
    })

    tossResult = await response.json()

    if (!response.ok) {
      return res.status(400).json({ success: false, message: tossResult.message || '결제 취소 실패' })
    }
  } catch (error) {
    console.error('토스 취소 API 오류:', error)
    return res.status(500).json({ success: false, message: '결제 취소 요청 중 오류' })
  }

  // 3) DB 트랜잭션 (완료된 카드 결제만 크레딧 차감, pending 가상계좌는 상태만 변경)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // payments 상태 변경
    await conn.query(
      `UPDATE payments SET status = 'cancelled' WHERE id = ?`,
      [payment.id]
    )

    // 완료된 결제만 크레딧 차감 (pending 가상계좌는 아직 충전 안 됨)
    if (payment.status === 'completed') {
      // credits 잔액 차감
      await conn.query(
        `UPDATE credits SET balance = balance - ? WHERE hospital_id = ?`,
        [payment.credit_amount, hospitalId]
      )

      // 변경 후 잔액 조회
      const [credit] = await conn.query(
        `SELECT balance FROM credits WHERE hospital_id = ?`,
        [hospitalId]
      )

      // credit_transactions에 차감 기록
      await conn.query(
        `INSERT INTO credit_transactions
         (hospital_id, type, amount, balance_after, description, payment_id)
         VALUES (?, 'deduct', ?, ?, ?, ?)`,
        [hospitalId, payment.credit_amount, credit[0].balance, `결제 취소 (크레딧 ${payment.credit_amount}건 회수)`, payment.id]
      )
    }

    await conn.commit()

    res.json({ success: true, message: '결제가 취소되었습니다.' })
  } catch (error) {
    await conn.rollback()
    console.error('결제 취소 DB 오류:', error)
    res.status(500).json({ success: false, message: '결제 취소 처리 중 오류' })
  } finally {
    conn.release()
  }
}

// 결제 내역 목록 조회 (취소 버튼 표시용)
exports.getPaymentList = async (req, res) => {
  const hospitalId = req.user.hospital_id
  const { page = 1, limit = 10 } = req.query
  const offset = (page - 1) * limit

  try {
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM payments WHERE hospital_id = ?`,
      [hospitalId]
    )

    const [rows] = await pool.query(
      `SELECT id, amount, credit_amount, payment_method, status,
              virtual_bank_name, virtual_account_number, virtual_due_date, created_at
       FROM payments WHERE hospital_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
      [hospitalId, Number(limit), Number(offset)]
    )

    res.json({
      success: true,
      data: rows,
      pagination: { page: Number(page), limit: Number(limit), total: countResult[0].total }
    })
  } catch (error) {
    console.error('결제 내역 조회 오류:', error)
    res.status(500).json({ success: false, message: '조회 중 오류' })
  }
}

// 환불 가능 결제 목록 조회
exports.getRefundablePayments = async (req, res) => {
  const hospitalId = req.user.hospital_id

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.amount, p.credit_amount, p.payment_method, p.created_at
       FROM payments p
       JOIN credit_transactions ct ON ct.payment_id = p.id AND ct.type = 'charge'
       WHERE p.hospital_id = ?
         AND p.status = 'completed'
         AND p.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         AND ct.remaining_amount = ct.amount
       ORDER BY p.created_at DESC`,
      [hospitalId]
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('환불 가능 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '조회 중 오류' })
  }
}

// 환불 처리
exports.refundPayment = async (req, res) => {
  const { paymentId } = req.body
  const hospitalId = req.user.hospital_id

  // 1) 결제 조회 (본인 병원)
  const [payments] = await pool.query(
    `SELECT * FROM payments WHERE id = ? AND hospital_id = ?`,
    [paymentId, hospitalId]
  )

  if (payments.length === 0) {
    return res.status(404).json({ success: false, message: '결제 정보를 찾을 수 없습니다.' })
  }

  const payment = payments[0]

  // 이미 환불/취소된 결제
  if (payment.status !== 'completed') {
    return res.status(400).json({ success: false, message: '환불할 수 없는 결제 상태입니다.' })
  }

  // 14일 초과 확인
  const daysSince = (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince > 14) {
    return res.status(400).json({ success: false, message: '결제일로부터 14일이 경과하여 환불이 불가합니다.' })
  }

  // 2) 크레딧 전액 미사용 확인
  const [chargeTx] = await pool.query(
    `SELECT id, amount, remaining_amount FROM credit_transactions
     WHERE payment_id = ? AND type = 'charge' AND hospital_id = ?`,
    [paymentId, hospitalId]
  )

  if (chargeTx.length === 0) {
    return res.status(400).json({ success: false, message: '충전 내역을 찾을 수 없습니다.' })
  }

  if (chargeTx[0].remaining_amount !== chargeTx[0].amount) {
    return res.status(400).json({ success: false, message: '크레딧이 일부 사용되어 환불이 불가합니다.\n부분 취소는 고객센터로 문의해 주세요.' })
  }

  // 3) 토스 결제 취소 API 호출
  try {
    const secretKey = config.toss.secretKey
    const encryptedSecretKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

    const response = await fetch(`https://api.tosspayments.com/v1/payments/${payment.pg_transaction_id}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: encryptedSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason: '고객 환불 요청' }),
    })

    const tossResult = await response.json()

    if (!response.ok) {
      // 이미 취소된 결제면 DB 업데이트만 진행
      if (tossResult.code === 'ALREADY_CANCELED_PAYMENT') {
        console.log('토스: 이미 취소된 결제 — DB 업데이트 진행:', payment.pg_transaction_id)
      } else {
        return res.status(400).json({ success: false, message: tossResult.message || '환불 처리 실패' })
      }
    }
  } catch (error) {
    console.error('토스 환불 API 오류:', error)
    return res.status(500).json({ success: false, message: '환불 요청 중 오류' })
  }

  // 4) DB 트랜잭션
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // payments 상태 변경
    await conn.query(
      `UPDATE payments SET status = 'refunded' WHERE id = ?`,
      [payment.id]
    )

    // 원래 charge 건의 remaining_amount = 0
    await conn.query(
      `UPDATE credit_transactions SET remaining_amount = 0 WHERE id = ?`,
      [chargeTx[0].id]
    )

    // credits 잔액 차감
    await conn.query(
      `UPDATE credits SET balance = balance - ? WHERE hospital_id = ?`,
      [payment.credit_amount, hospitalId]
    )

    // 변경 후 잔액 조회
    const [credit] = await conn.query(
      `SELECT balance FROM credits WHERE hospital_id = ?`,
      [hospitalId]
    )

    // 환불 거래 내역 기록
    const chargeDate = new Date(payment.created_at).toISOString().replace('T', ' ').slice(0, 19)
    await conn.query(
      `INSERT INTO credit_transactions
       (hospital_id, type, amount, balance_after, description, payment_id)
       VALUES (?, 'refund', ?, ?, ?, ?)`,
      [hospitalId, payment.credit_amount, credit[0].balance, `환불완료 (${chargeDate} 충전 건)`, payment.id]
    )

    await conn.commit()

    res.json({ success: true, message: '환불이 완료되었습니다.' })
  } catch (error) {
    await conn.rollback()
    console.error('환불 DB 처리 오류:', error)
    res.status(500).json({ success: false, message: '환불 처리 중 오류가 발생했습니다.' })
  } finally {
    conn.release()
  }
}

// 웹훅 서명 검증 (raw body 문자열 기준)
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64')
  return expected === signature
}

function getCreditByAmount(amount) {
  const plans = { 1000: 1, 267000: 30, 395000: 50, 740000: 100 }
  return plans[amount] || 0
}

function getBankName(bankCode) {
  const banks = {
    '39': '경남은행', '34': '광주은행', '12': '단위농협', '32': '부산은행',
    '45': '새마을금고', '64': '산림조합', '88': '신한은행', '48': '신협',
    '27': '씨티은행', '20': '우리은행', '71': '우체국', '50': '저축은행',
    '37': '전북은행', '35': '제주은행', '90': '카카오뱅크', '89': '케이뱅크',
    '92': '토스뱅크', '81': '하나은행', '54': 'HSBC', '03': 'IBK기업은행',
    '06': 'KB국민은행', '31': 'DGB대구은행', '02': 'KDB산업은행',
    '11': 'NH농협은행', '23': 'SC제일은행',
  }
  return banks[bankCode] || bankCode || '알 수 없음'
}
