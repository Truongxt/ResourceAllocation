import { File, Paths } from 'expo-file-system';
import apiClient from './client';

const base = (taskId) => `/tasks/${taskId}/attachments`;

// Tệp tới 10 MB qua mạng di động: mức mặc định 15 giây của apiClient là quá ngắn.
const TRANSFER_TIMEOUT = 120000;

// Tên tệp đặt trong cache của máy: bỏ các ký tự hệ điều hành không cho dùng trong tên.
const safeFileName = (name) => String(name || 'tep').replace(/[\\/:*?"<>|]/g, '_');

export const attachmentApi = {
  async list(taskId) {
    const res = await apiClient.get(base(taskId));
    return res.data?.data?.attachments || [];
  },

  /** `asset` là một phần tử `assets` của expo-document-picker: `{ uri, name, mimeType }`. */
  async upload(taskId, asset) {
    const form = new FormData();
    form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
    // Ghi đè `application/json` mặc định; React Native tự thêm boundary.
    const res = await apiClient.post(base(taskId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: TRANSFER_TIMEOUT,
    });
    return res.data.data.attachment;
  },

  /**
   * Tải về qua apiClient chứ không đưa URL cho trình tải của hệ điều hành: route cần header
   * Authorization, và đi qua apiClient thì được làm mới token khi hết hạn như mọi request khác.
   * Ghi vào cache của app, trả về `uri` để mở bằng expo-sharing.
   */
  async download(taskId, attachment) {
    const res = await apiClient.get(`${base(taskId)}/${attachment._id}/download`, {
      responseType: 'arraybuffer',
      timeout: TRANSFER_TIMEOUT,
    });
    const file = new File(Paths.cache, safeFileName(attachment.originalName));
    if (file.exists) file.delete();
    file.write(new Uint8Array(res.data));
    return file.uri;
  },

  remove(taskId, attachmentId) {
    return apiClient.delete(`${base(taskId)}/${attachmentId}`);
  },
};

export default attachmentApi;
