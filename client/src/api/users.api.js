import apiClient from './client.js';

export const usersApi = {
  getAll: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  remove: (id) => apiClient.delete(`/users/${id}`),
  // AC-USR-04-1: cambio de la propia contraseña (cualquier rol autenticado).
  changeOwnPassword: (data) => apiClient.patch('/users/me/password', data),
  // AC-USR-05-1: restablecimiento por el administrador.
  resetPassword: (id, newPassword) => apiClient.patch(`/users/${id}/password`, { newPassword }),
  // AC-USR-03-4 / AC-USR-06-1: activar o desactivar con protección del último admin.
  updateStatus: (id, isActive) => apiClient.patch(`/users/${id}/status`, { isActive }),
};
