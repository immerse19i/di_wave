const express = require('express')
const router = express.Router()
const { confirmPayment, confirmVirtualAccount, handleWebhook, getPaymentStatus, cancelPayment, getPaymentList, getRefundablePayments, refundPayment } = require('../controllers/paymentController')
const { verifyToken } = require('../middlewares/auth')

// 카드 결제 승인
router.post('/confirm', verifyToken, confirmPayment)

// 가상계좌 결제 승인 (계좌 발급)
router.post('/confirm-virtual', verifyToken, confirmVirtualAccount)

// 결제 취소
router.post('/cancel', verifyToken, cancelPayment)

// 결제 내역 목록
router.get('/list', verifyToken, getPaymentList)

// 결제 상태 조회 (가상계좌 입금 확인용)
router.get('/status/:orderId', verifyToken, getPaymentStatus)

// 환불 가능 목록 조회
router.get('/refundable', verifyToken, getRefundablePayments)

// 환불 처리
router.post('/refund', verifyToken, refundPayment)

// 토스 웹훅 (인증 없이 수신 — 서명 검증으로 보안)
router.post('/webhook', handleWebhook)

module.exports = router
