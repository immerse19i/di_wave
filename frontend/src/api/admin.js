import api from './index'

export const adminAPI = {
  // 병원 목록 (승인관리)
  getHospitals(params) {
    return api.get('/admin/hospitals', { params })
  },

  // 병원 상세
  getHospitalDetail(id) {
    return api.get(`/admin/hospitals/${id}`)
  },

  // 승인
  approveHospital(id) {
    return api.patch(`/admin/hospitals/${id}/approve`)
  },

  // 반려
  rejectHospital(id, data) {
    return api.patch(`/admin/hospitals/${id}/reject`, data)
  },
// 가입계정 목록
getAccounts(params) {
  return api.get('/admin/hospitals/accounts', { params })
},

// 가입계정 상세
getAccountDetail(id) {
  return api.get(`/admin/hospitals/accounts/${id}`)
},

// 기본 정보 수정
updateAccountInfo(id, data) {
  return api.put(`/admin/hospitals/accounts/${id}`, data)
},

// 로그인 제한 해제
unlockAccount(id) {
  return api.patch(`/admin/hospitals/accounts/${id}/unlock`)
},

uploadBusinessLicense(id, formData) {
  return api.post(`/admin/hospitals/accounts/${id}/license`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
},
changeAccountStatus(id, data) {
  return api.patch(`/admin/hospitals/accounts/${id}/status`, data)
},
getAccountLogs(id) {
  return api.get(`/admin/hospitals/accounts/${id}/logs`)
},
// 크레딧 수동 조정
adjustCredit(id, data) {
  return api.patch(`/admin/hospitals/accounts/${id}/credit`, data)
},
// 크레딧 이력 조회
getCreditHistory(id, params) {
  return api.get(`/admin/hospitals/accounts/${id}/credit-history`, { params })
},
// 공지사항 목록
getNotices(params) {
  return api.get('/admin/notices', { params })
},
// 공지사항 상세
getNoticeDetail(id) {
  return api.get(`/admin/notices/${id}`)
},
// 공지사항 생성
createNotice(formData) {
  return api.post('/admin/notices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
},
// 공지사항 수정
updateNotice(id, formData) {
  return api.put(`/admin/notices/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
},
// 공지사항 삭제
deleteNotice(id) {
  return api.patch(`/admin/notices/${id}/delete`)
},


}
