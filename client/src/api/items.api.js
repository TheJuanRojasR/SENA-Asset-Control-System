import apiClient from './client.js';

export const itemsApi = {
  getAll: (params = {}) => apiClient.get('/items', { params: { limit: 100, ...params } }),
  getById: (id) => apiClient.get(`/items/${id}`),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  remove: (id) => apiClient.delete(`/items/${id}`),
  hardDelete: (id) => apiClient.delete(`/items/${id}/hard`),
};
