import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Space,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Tag,
  Alert,
  Divider,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, StarOutlined } from '@ant-design/icons';
import { requiredSkillLevelOptions } from '../../i18n/enums';
import { useTranslation } from 'react-i18next';

const { Text, Paragraph } = Typography;

export default function SelfSkillEvaluationModal({
  open,
  onClose,
  currentResource,
  onSubmit,
  submitting = false,
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const skillLevelOptions = requiredSkillLevelOptions();

  useEffect(() => {
    if (open && currentResource) {
      const initialSkills = (currentResource.skills || []).map((s) => ({
        name: s.name,
        selfLevel: s.selfLevel || s.level || 1,
        managerLevel: s.managerLevel,
        yearsOfExperience: s.yearsOfExperience || 0,
        evaluationStatus: s.evaluationStatus || 'draft',
        managerFeedback: s.managerFeedback || '',
      }));
      form.setFieldsValue({ skills: initialSkills });
    }
  }, [open, currentResource, form]);

  const handleFinish = (values) => {
    onSubmit(values.skills || []);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StarOutlined style={{ color: '#f59e0b' }} />
          <span>Tự Đánh Giá Năng Lực & Kỹ Năng Bản Thân (Self-Assessment)</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message="Cơ chế đánh giá 2 chiều"
        description="Bạn tự đánh giá mức độ thành thạo và kinh nghiệm thực tế của bản thân. Sau khi bạn gửi, Người quản lý sẽ xem xét, đối chiếu với kết quả công việc thực tế và phê duyệt cấp độ chính thức dùng cho việc phân bổ dự án."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.List name="skills">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const currentItem = form.getFieldValue(['skills', name]);
                const isApproved = currentItem?.evaluationStatus === 'approved';

                return (
                  <div
                    key={key}
                    style={{
                      background: '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: 8,
                      marginBottom: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        Kỹ năng #{name + 1}
                      </Text>
                      <Space>
                        {isApproved ? (
                          <Tag color="success">✓ Quản lý đã duyệt: Lv.{currentItem?.managerLevel}</Tag>
                        ) : (
                          <Tag color="warning">⏳ Chờ quản lý duyệt</Tag>
                        )}
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        />
                      </Space>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                        name={[name, 'selfLevel']}
                        label="Tự đánh giá"
                        rules={[{ required: true, message: 'Chọn cấp độ' }]}
                        style={{ flex: 2, minWidth: 170, marginBottom: 0 }}
                      >
                        <Select options={skillLevelOptions} placeholder="Chọn level của bạn" />
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

                    {currentItem?.managerFeedback && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#475569', background: '#eff6ff', padding: '6px 10px', borderRadius: 6 }}>
                        💬 <strong>Nhận xét từ Quản lý:</strong> {currentItem.managerFeedback}
                      </div>
                    )}
                  </div>
                );
              })}

              <Form.Item style={{ marginTop: 12 }}>
                <Button
                  type="dashed"
                  onClick={() => add({ selfLevel: 2, yearsOfExperience: 1, evaluationStatus: 'self_assessed' })}
                  block
                  icon={<PlusOutlined />}
                  style={{ borderRadius: 8 }}
                >
                  Thêm kỹ năng tự đánh giá
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider style={{ margin: '14px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{ background: 'var(--brand-primary)', borderRadius: 6, fontWeight: 600 }}
          >
            Gửi bản tự đánh giá cho Quản lý ➔
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
