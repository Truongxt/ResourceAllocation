import SkillEvaluationHistory from './SkillEvaluationHistory';
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
          original: true,
          evidence: s.evidence || '',
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
    if (!values.skills?.length) return;
    onSubmit({ ...values, action: 'approve' });
  };

  const returnForEvidence = () => {
    const pending = (form.getFieldsValue(true).skills || []).map((skill, index) => ({ skill, index })).filter(({ skill }) => skill.evaluationStatus === 'self_assessed');
    if (!pending.length) return;
    const missing = pending.filter(({ skill }) => !skill.managerFeedback?.trim());
    if (missing.length) {
      form.setFields(missing.map(({ index }) => ({ name: ['skills', index, 'managerFeedback'], errors: ['Ghi rõ minh chứng hoặc thông tin cần bổ sung'] })));
      return;
    }
    onSubmit({ action: 'return', skills: pending.map(({ skill }) => skill) });
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
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 } }}
      style={{ top: 24 }}
      footer={<Space wrap>
        <Button onClick={onClose}>{t('common.cancel') || 'Hủy'}</Button>
        {(resource?.skills || []).some(s => s.evaluationStatus === 'self_assessed') && <Button onClick={returnForEvidence} loading={submitting}>Yêu cầu bổ sung</Button>}
        <Button type="primary" onClick={() => form.submit()} loading={submitting}>{t('resources.saveMatrix') || 'Phê duyệt & lưu đánh giá'}</Button>
      </Space>}
      width={780}
      destroyOnHidden
    >
      <Alert
        type="success"
        showIcon
        message="Cơ chế phê duyệt năng lực 2 chiều"
        description="Đối chiếu điểm tự chấm với minh chứng để duyệt mức năng lực chính thức. Nếu thiếu thông tin, ghi phản hồi cho các kỹ năng đang chờ duyệt và chọn Yêu cầu bổ sung. Mức đã duyệt trước đó được giữ nguyên trong lúc chờ."
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
                            Đã phê duyệt
                          </Tag>
                        )}
                      </Space>
                      {!currentSkill?.original && <Button
                        type="text"
                        danger
                        size="small"
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        label="Tên kỹ năng"
                        rules={[{ required: true, message: 'Nhập tên kỹ năng' }]}
                        style={{ flex: 2, minWidth: 160, marginBottom: 0 }}
                      >
                        <Input disabled={Boolean(currentSkill?.original)} placeholder="Tên kỹ năng (VD: React, Node, AI...)" />
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
                        <InputNumber disabled={Boolean(currentSkill?.original)} min={0} max={60} addonAfter="năm" style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    <ParagraphEvidence evidence={currentSkill?.evidence} />
                    {currentSkill?.evaluationStatus === 'self_assessed' && <Tag color="orange">Chờ duyệt</Tag>}
                    {currentSkill?.evaluationStatus === 'returned' && <Tag color="orange">Cần bổ sung</Tag>}
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
                Đánh giá định tính của quản lý; hiển thị riêng, không quyết định màu tải công việc.
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

        <SkillEvaluationHistory history={resource?.skillEvaluationHistory} />

      </Form>
    </Modal>
  );
}

function ParagraphEvidence({ evidence }) { return <Typography.Paragraph style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}><strong>Minh chứng của nhân viên:</strong> {evidence || 'Chưa cung cấp'}</Typography.Paragraph>; }
