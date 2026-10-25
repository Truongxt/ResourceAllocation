import api from './api';

const base = (taskId) => `/tasks/${taskId}/attachments`;

const attachmentService = {
  async list(taskId) {
    const res = await api.get(base(taskId));
    return res.data.data?.attachments || [];
  },

  /** Một tệp mỗi lần, trường `file`. Trả về bản ghi vừa tạo. */
  async upload(taskId, file) {
    const form = new FormData();
    form.append('file', file);
    // Ghi đè `application/json` mặc định của `api`: để nguyên thì axios đổi FormData thành JSON.
    const res = await api.post(base(taskId), form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.attachment;
  },

  /**
   * Route tải về cần header Authorization, nên không dùng được `<a href>` trơn: lấy blob qua
   * axios rồi mới bật hộp lưu tệp, với đúng tên gốc.
   */
  async download(taskId, attachment) {
    const res = await api.get(`${base(taskId)}/${attachment._id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalName;
    link.click();
    URL.revokeObjectURL(url);
  },

  remove(taskId, attachmentId) {
    return api.delete(`${base(taskId)}/${attachmentId}`);
  },
};

export default attachmentService;
