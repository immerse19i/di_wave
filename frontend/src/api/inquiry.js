import api from './index'

export const inquiryAPI = {
  // 문의 등록 (multipart/form-data)
  createInquiry(formData) {
    return api.post('/inquiries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // 내 문의 목록
  getMyInquiries(params) {
    return api.get('/inquiries/my', { params })
  },

  // 내 문의 상세
  getMyInquiryDetail(id) {
    return api.get(`/inquiries/my/${id}`)
  },

// ===== 고객문의관리 =====
getInquiries(params) {
  return api.get('/inquiries', { params })
},
getInquiryCounts() {
  return api.get('/inquiries/counts')
},
getInquiryDetail(id) {
  return api.get(`/inquiries/${id}`)
},
answerInquiry(id, data) {
  return api.patch(`/inquiries/${id}/answer`, data)
},


}
