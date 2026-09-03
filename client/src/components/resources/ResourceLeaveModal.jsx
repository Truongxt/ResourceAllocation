/**
 * ============================================================================
 * MODAL QUẢN LÝ LỊCH NGHỈ PHÉP NHÂN SỰ (Resource Leave Modal Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép Quản lý dự án / Admin xem và cập nhật các khoảng thời gian nghỉ phép
 *     của từng nhân sự cụ thể.
 *   - Tích hợp cảnh báo Ràng buộc H3 của CSP Solver: hệ thống sẽ không phân công
 *     công việc rơi vào những ngày vắng mặt này.
 *
 * Props:
 *   - @param {boolean} open - Trạng thái hiển thị modal
 *   - @param {Function} onClose - Hàm đóng modal
 *   - @param {Object} resource - Bản ghi nhân sự đang chỉnh sửa
 *   - @param {Function} onSubmit - Hàm gửi danh sách kỳ nghỉ lên server
 *   - @param {boolean} submitting - Trạng thái đang lưu
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { useEffect } from 'react';
import { Modal, Form, Space, Input, DatePicker, Button, Alert, Typography } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function ResourceLeaveModal({
  open,
  onClose,
  resource,
  onSubmit,
  submitting = false,
  t,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && resource) {
      form.setFieldsValue({
        periods: (resource.unavailablePeriods || []).map((p) => ({
          range: [dayjs(p.startDate), dayjs(p.endDate)],
          reason: p.reason || '',
        })),
      });
    }
  }, [open, resource, form]);

  const handleFinish = (values) => {
    const unavailablePeriods = (values.periods || [])
      .filter((p) => p && p.range && p.range.length === 2)
      .map((p) => ({
        startDate: p.range[0].startOf('day').toISOString(),
        endDate: p.range[1].endOf('day').toISOString(),
        reason: p.reason?.trim() || 'Nghỉ phép',
      }));

    onSubmit(unavailablePeriods);
  };

  return (
    <Modal
      title={`${t('resources.leaveTitle') || 'Lịch nghỉ'} — ${resource?.user?.name || resource?.position || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 8 }}
        message={t('resources.leaveNotice.title') || 'Ràng buộc H3 (CSP Solver)'}
        description={
          t('resources.leaveNotice.body') ||
          'Các khoảng thời gian vắng mặt này sẽ được CSP Solver loại trừ hoàn toàn khi phân công công việc.'
        }
      />

      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 16 }}>
        <Form.List name="periods">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'range']}
                    rules={[{ required: true, message: t('resources.leaveRangeRequired') || 'Chọn ngày bắt đầu và kết thúc' }]}
                    style={{ width: 280, marginBottom: 0 }}
                  >
                    <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'reason']}
                    style={{ width: 240, marginBottom: 0 }}
                  >
                    <Input placeholder={t('resources.leaveReasonPlaceholder') || 'Lý do nghỉ...'} maxLength={200} />
                  </Form.Item>

                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                </Space>
              ))}
              <Form.Item style={{ marginTop: 12 }}>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  {t('resources.addLeave') || 'Thêm kỳ nghỉ'}
                </Button>
              </Form.Item>
              {fields.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('resources.noLeave') || 'Chưa có kỳ nghỉ nào'}
                </Text>
              )}
            </>
          )}
        </Form.List>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={onClose}>{t('common.cancel') || 'Hủy'}</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('resources.saveLeave') || 'Lưu lịch nghỉ'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
