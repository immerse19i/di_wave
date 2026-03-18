import api from './index'

export const creditAPI = {
  getMyCreditHistory(params) {
    return api.get('/credits/my', { params })
  },
}
