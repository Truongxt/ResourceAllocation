import api from './api';

const companySettingService = {
  getSettings: () => api.get('/company-settings'),
  updateSettings: (data) => api.put('/company-settings', data),
};

export default companySettingService;
