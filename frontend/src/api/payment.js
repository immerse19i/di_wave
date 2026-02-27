import api from './index'

export const paymentAPI = {
  confirm(data) {
    return api.post('/payments/confirm', data)
  }
}
