import api from './api';

const jobService = {
  /** Lần chạy gần nhất và cờ `stale` của từng job định kỳ. Chỉ Owner/Admin. */
  getStatus() {
    return api.get('/jobs/status');
  },
};

export default jobService;
