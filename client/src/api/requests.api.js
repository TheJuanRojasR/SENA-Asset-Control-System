import apiClient from './client.js';

/**
 * API client para el módulo de solicitudes.
 */
export const requestsApi = {
  create: (payload) => apiClient.post('/requests', payload),
  getAll: () => apiClient.get('/requests'),
  getById: (id) => apiClient.get(`/requests/${id}`),
  approve: (id) => apiClient.put(`/requests/${id}/approve`),
  reject: (id, rejectionReason) => apiClient.put(`/requests/${id}/reject`, { rejectionReason }),
  pack: (id) => apiClient.put(`/requests/${id}/pack`),
  deliver: (id) => apiClient.put(`/requests/${id}/deliver`),
  complete: (id) => apiClient.put(`/requests/${id}/complete`),
  cancel: (id) => apiClient.delete(`/requests/${id}`),
};
