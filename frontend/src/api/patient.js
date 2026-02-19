import api from './index';

export const patientAPI = {
    check: (patientCode, patientName) => api.get('/patients/check', {
        params: { patientCode, patientName }
    }),
};