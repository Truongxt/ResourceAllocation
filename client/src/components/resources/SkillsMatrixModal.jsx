/**
 * ============================================================================
 * MODAL CẬP NHẬT MA TRẬN KỸ NĂNG (Skills Matrix Modal Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép Quản lý dự án / Admin cập nhật danh sách kỹ năng, trình độ (Level 1-4)
 *     và số năm kinh nghiệm của từng nhân sự.
 *   - Dữ liệu ma trận kỹ năng này là đầu vào quan trọng cho thuật toán GA & CSP
 *     để tính toán điểm thích nghi (Skill Match Score) và thỏa mãn ràng buộc cứng H1.
 *
 * Props:
 *   - @param {boolean} open - Trạng thái hiển thị modal
 *   - @param {Function} onClose - Hàm đóng modal
 *   - @param {Object} resource - Bản ghi nhân sự đang chỉnh sửa
 *   - @param {Array} skillLevelOptions - Danh sách tùy chọn Level kỹ năng
 *   - @param {Function} onSubmit - Hàm gửi dữ liệu ma trận lên server
 *   - @param {boolean} submitting - Trạng thái đang lưu
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { useEffect } from 'react';
import { Modal, Form, Space, Input, InputNumber, Select, Button } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

export default function SkillsMatrixModal({
  open,
  onClose,
  resource,
  skillLevelOptions = [],
  onSubmit,
  submitting = false,
  t,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && resource) {
      form.setFieldsValue({
        skills: resource.skills || [],
      });
    }
  }, [open, resource, form]);

  const handleFinish = (values) => {
    onSubmit(values.skills || []);
  };

  return (
    <Modal
      title={`Skill Matrix — ${resource?.user?.name || resource?.position || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 16 }}>
        <Form.List name="skills">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'name']}
                    rules={[{ required: true, message: t('tasks.form.skillNameRequired') || 'Vui lòng nhập tên kỹ năng' }]}
                    style={{ width: 180 }}
                  >
                    <Input placeholder={t('tasks.form.skillNamePlaceholder') || 'VD: React, NodeJS...'} />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'level']}
                    rules={[{ required: true, message: 'Chọn level' }]}
                    style={{ width: 190 }}
                  >
                    <Select options={skillLevelOptions} />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'yearsOfExperience']}
                    style={{ width: 100 }}
                  >
                    <InputNumber
                      min={0}
                      placeholder={t('resources.yearsShort') || 'Năm'}
                      addonAfter={t('resources.yearsUnit') || 'năm'}
                    />
                  </Form.Item>

                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  {t('resources.addSkill') || 'Thêm kỹ năng'}
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={onClose}>{t('common.cancel') || 'Hủy'}</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('resources.saveMatrix') || 'Lưu ma trận kỹ năng'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
