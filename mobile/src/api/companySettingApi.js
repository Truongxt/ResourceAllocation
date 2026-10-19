import apiClient from './client';

/** Cấu hình công ty (`GET /company-settings`), ví dụ ai được tạo dự án. */
export const companySettingApi = {
  get: () => apiClient.get('/company-settings'),
};

export default companySettingApi;
