import apiClient from './client';

export const departmentApi = {
  getAll: (params) => apiClient.get('/departments', { params }),
};

export default departmentApi;
