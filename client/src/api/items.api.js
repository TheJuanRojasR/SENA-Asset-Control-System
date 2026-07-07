import apiClient from './client.js';

export const itemsApi = {
  getAll: () => apiClient.get('/items'),
  getById: (id) => apiClient.get(`/items/${id}`),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  remove: (id) => apiClient.delete(`/items/${id}`),
};
