import api from './index'

export const paymentAPI = {
  // 카드 결제 승인
  confirm(data) {
    return api.post('/payments/confirm', data)
  },

  // 가상계좌 결제 승인 (계좌 발급)
  confirmVirtual(data) {
    return api.post('/payments/confirm-virtual', data)
  },

  // 결제 취소
  cancel(data) {
    return api.post('/payments/cancel', data)
  },

  // 결제 내역 목록
  getList(params) {
    return api.get('/payments/list', { params })
  },

  // 결제 상태 조회 (가상계좌 입금 확인용)
  getPaymentStatus(orderId) {
    return api.get(`/payments/status/${orderId}`)
  },

  // 환불 가능 목록 조회
  getRefundable() {
    return api.get('/payments/refundable')
  },

  // 환불 처리
  refund(paymentId) {
    return api.post('/payments/refund', { paymentId })
  }
}
