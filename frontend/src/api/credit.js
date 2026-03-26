import api from './index'

export const creditAPI = {
  getMyCreditHistory(params) {
    return api.get('/credits/my', { params })
  },
  expireCheck() {
    return api.post('/credits/expire-check')
  },
  getExpiring() {
    return api.get('/credits/expiring')
  },
  getUnnotifiedGrants() {
    return api.get('/credits/unnotified-grants')
  },
  markNotified() {
    return api.patch('/credits/mark-notified')
  },
}
