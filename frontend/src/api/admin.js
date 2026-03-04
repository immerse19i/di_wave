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


}
