import apiClient from './client.js';

export const loansApi = {
  getAll: (params) => apiClient.get('/loans', { params }),
  returnUnits: (payload) => apiClient.post('/loans/return', payload),
};
