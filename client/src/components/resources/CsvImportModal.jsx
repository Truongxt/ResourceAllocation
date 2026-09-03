/**
 * ============================================================================
 * MODAL IMPORT NHÂN SỰ TỪ FILE CSV (CSV Import Modal Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép nhập danh sách nhiều nhân sự cùng lúc bằng định dạng văn bản CSV.
 *
 * Props:
 *   - @param {boolean} open - Trạng thái hiển thị modal
 *   - @param {Function} onClose - Hàm đóng modal
 *   - @param {string} content - Nội dung văn bản CSV hiện tại
 *   - @param {Function} setContent - Hàm cập nhật nội dung CSV
 *   - @param {Function} onImport - Hàm thực thi nhập dữ liệu
 *   - @param {boolean} submitting - Trạng thái đang import
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { Modal, Typography, Input } from 'antd';

const { Paragraph } = Typography;
const { TextArea } = Input;

export default function CsvImportModal({
  open,
  onClose,
  content,
  setContent,
  onImport,
  submitting = false,
  t,
}) {
  return (
    <Modal
      title={t('resources.csvTitle') || 'Nhập danh sách nhân sự từ CSV'}
      open={open}
      onCancel={onClose}
      onOk={onImport}
      confirmLoading={submitting}
      okText={t('projects.csvStart') || 'Bắt đầu Import'}
      cancelText={t('common.cancel') || 'Hủy'}
      width={600}
    >
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
        {t('projects.csvFormat') || 'Định dạng các cột:'}{' '}
        <code>{t('resources.csvColumns') || 'Name, Email, Password, Position, Department, FTE, Capacity, HourlyRate'}</code>
      </Paragraph>
      <TextArea
        rows={8}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          t('resources.csvExample') ||
          'Nguyen Van A, nva@example.com, password123, Frontend Dev, IT, 1, 40, 150000'
        }
        style={{ fontFamily: 'monospace', fontSize: 12 }}
      />
    </Modal>
  );
}
