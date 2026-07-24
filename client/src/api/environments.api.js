import apiClient from './client.js';

export const environmentsApi = {
  getAll: (params) => apiClient.get('/environments', { params }),
  getById: (id) => apiClient.get(`/environments/${id}`),
  create: (data) => apiClient.post('/environments', data),
  update: (id, data) => apiClient.put(`/environments/${id}`, data),
  remove: (id) => apiClient.delete(`/environments/${id}`),
};
