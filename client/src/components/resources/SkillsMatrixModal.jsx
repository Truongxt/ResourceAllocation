/**
 * ============================================================================
 * MODAL ĐÁNH GIÁ VÀ DUYỆT MA TRẬN KỸ NĂNG (Skills Matrix & Two-Way Assessment)
 * ============================================================================
 *
 * Cho phép Quản lý dự án / Admin:
 *   1. Xem điểm tự đánh giá (Self-Assessment) của nhân sự.
 *   2. Đánh giá lại và phê duyệt cấp độ chính thức (Manager Level: 1-4).
 *   3. Nhập phản hồi / nhận xét năng lực (Manager Feedback).
 *   4. Chấm điểm hiệu suất tổng thể (Performance Rating: 1-5 sao).
 */

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Space,
  Input,
  InputNumber,
  Select,
  Button,
  Tag,
  Rate,
  Divider,
  Typography,
  Alert,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

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
        skills: (resource.skills || []).map((s) => ({
          name: s.name,
          level: s.managerLevel || s.level || 1,
          selfLevel: s.selfLevel,
          yearsOfExperience: s.yearsOfExperience || 0,
          managerFeedback: s.managerFeedback || '',
          evaluationStatus: s.evaluationStatus || 'approved',
        })),
        performanceRating: resource.performanceRating || 4.5,
        performanceNotes: resource.performanceNotes || '',
      });
    }
  }, [open, resource, form]);

  const handleFinish = (values) => {
    // values contains skills, performanceRating, performanceNotes
    onSubmit(values);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#10b981' }} />
          <span>
            Đánh Giá & Phê Duyệt Năng Lực — {resource?.user?.name || resource?.position || ''}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      destroyOnHidden
    >
      <Alert
        type="success"
        showIcon
        message="Cơ chế phê duyệt năng lực 2 chiều"
        description="Quản lý đối chiếu giữa điểm nhân sự tự đánh giá (Self-Level) và kết quả thực tế để thiết lập Cấp độ chính thức (Manager Level). Cấp độ này sẽ được nạp vào thuật toán GA & CSP để phân bổ công việc có độ khó tương thích."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 8 }}>
        <Form.List name="skills">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const currentSkill = form.getFieldValue(['skills', name]);
                const hasSelf = currentSkill?.selfLevel !== undefined;

                return (
                  <div
                    key={key}
                    style={{
                      background: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: 10,
                      marginBottom: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Space>
                        <Text strong style={{ fontSize: 13.5 }}>
                          Kỹ năng #{name + 1}
                        </Text>
                        {hasSelf ? (
                          <Tag color="blue" style={{ borderRadius: 4 }}>
                            Nhân sự tự chấm: Lv.{currentSkill.selfLevel}
                          </Tag>
                        ) : (
                          <Tag color="default" style={{ borderRadius: 4 }}>
                            Chưa tự đánh giá
                          </Tag>
                        )}
                        {currentSkill?.evaluationStatus === 'approved' && (
                          <Tag color="success" style={{ borderRadius: 4 }}>
                            ✓ Đã phê duyệt
                          </Tag>
                        )}
                      </Space>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: 'Nhập tên kỹ năng' }]}
                        style={{ flex: 2, minWidth: 160, marginBottom: 0 }}
                      >
                        <Input placeholder="Tên kỹ năng (VD: React, Node, AI...)" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'level']}
                        label="Cấp độ Quản lý duyệt"
                        rules={[{ required: true, message: 'Chọn level' }]}
                        style={{ flex: 2, minWidth: 190, marginBottom: 0 }}
                      >
                        <Select options={skillLevelOptions} placeholder="Cấp độ chính thức" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'yearsOfExperience']}
                        label="Kinh nghiệm"
                        style={{ flex: 1, minWidth: 110, marginBottom: 0 }}
                      >
                        <InputNumber min={0} addonAfter="năm" style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    <Form.Item
                      {...restField}
                      name={[name, 'managerFeedback']}
                      label="Nhận xét / Phản hồi của Quản lý về kỹ năng này"
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Ghi chú đánh giá thực tế (VD: Nắm chắc kiến thức, đã hoàn thành tốt task module X...)" />
                    </Form.Item>
                  </div>
                );
              })}

              <Form.Item>
                <Button type="dashed" onClick={() => add({ level: 2, yearsOfExperience: 1 })} block icon={<PlusOutlined />}>
                  {t('resources.addSkill') || 'Thêm kỹ năng vào ma trận'}
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider style={{ margin: '14px 0' }} />

        {/* Performance Rating */}
        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <Text strong style={{ fontSize: 14 }}>
                ⭐ Điểm đánh giá Năng suất & Thái độ làm việc
              </Text>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Đóng góp vào điểm năng suất tổng hợp trên biểu đồ cột
              </div>
            </div>
            <Form.Item name="performanceRating" style={{ marginBottom: 0 }}>
              <Rate allowHalf style={{ color: '#f59e0b' }} />
            </Form.Item>
          </div>

          <Form.Item name="performanceNotes" label="Nhận xét tổng thể về năng lực & thái độ" style={{ marginBottom: 0 }}>
            <TextArea rows={2} placeholder="Nhận xét tổng quát giúp nhân sự cải thiện và định hướng giao việc..." />
          </Form.Item>
        </div>

        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>{t('common.cancel') || 'Hủy'}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: 'var(--brand-primary)', fontWeight: 600, borderRadius: 6 }}
            >
              {t('resources.saveMatrix') || 'Duyệt & Lưu Ma Trận Năng Lực ➔'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
