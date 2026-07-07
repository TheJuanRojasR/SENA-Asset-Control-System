import apiClient from './client.js';

export const inventoryApi = {
  getAll: (params) => apiClient.get('/inventory', { params }),
  getById: (id) => apiClient.get(`/inventory/${id}`),
  getDetail: (id) => apiClient.get(`/inventory/${id}/detail`),
  create: (data) => apiClient.post('/inventory', data),
  update: (id, data) => apiClient.put(`/inventory/${id}`, data),
  remove: (id) => apiClient.delete(`/inventory/${id}`),
  assemble: (id, childUnitIds) => apiClient.post(`/inventory/${id}/assemble`, { childUnitIds }),
  disassemble: (id, childUnitIds) =>
    apiClient.post(`/inventory/${id}/disassemble`, { childUnitIds }),
};
