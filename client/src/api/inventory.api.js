import apiClient from './client.js';

export const inventoryApi = {
  getAll: (params) => apiClient.get('/inventory', { params }),
  getById: (id) => apiClient.get(`/inventory/${id}`),
  getDetail: (id) => apiClient.get(`/inventory/${id}/detail`),
  create: (data) => apiClient.post('/inventory', data),
  update: (id, data) => apiClient.put(`/inventory/${id}`, data),
  restore: (id) => apiClient.post(`/inventory/${id}/restore`),
  remove: (id) => apiClient.delete(`/inventory/${id}`),
  hardRemove: (id) => apiClient.delete(`/inventory/${id}/hard`),
  assemble: (id, childUnitIds) => apiClient.post(`/inventory/${id}/assemble`, { childUnitIds }),
  disassemble: (id, childUnitIds) =>
    apiClient.post(`/inventory/${id}/disassemble`, { childUnitIds }),
};
