import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Checkbox, Space, Typography, Card, Divider, message } from 'antd';
import { CheckCircleOutlined, PlusOutlined, DeleteOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import taskService from '../../services/taskService';

const { Text, Title } = Typography;
const { TextArea } = Input;

export default function TaskResultModal({ open, onClose, task, onSuccess }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && task) {
      const existing = task.resultReport || {};
      form.setFieldsValue({
        summary: existing.summary || '',
        actualHours: existing.actualHours || task.actualHours || task.estimatedHours || 0,
        deliverableLinks: (existing.deliverableLinks && existing.deliverableLinks.length > 0)
          ? existing.deliverableLinks
          : [{ title: '', url: '' }],
        markAsDone: task.status !== 'done',
      });
    }
  }, [open, task, form]);

  const handleSubmit = async (values) => {
    if (!task) return;
    setSubmitting(true);
    try {
      const validLinks = (values.deliverableLinks || []).filter((l) => l && l.url && l.url.trim());
      const payload = {
        summary: values.summary || '',
        actualHours: Number(values.actualHours) || 0,
        deliverableLinks: validLinks,
        markAsDone: !!values.markAsDone,
      };

      await taskService.reportResult(task._id, payload);
      message.success('Đã cập nhật báo cáo kết quả công việc thành công!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể lưu báo cáo kết quả');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} />
          <span>Báo cáo Kết quả Công việc & Hoàn thành</span>
        </Space>
      }
      width={640}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Công việc: <strong style={{ color: 'var(--text-primary)' }}>{task?.title}</strong>
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="summary"
          label={
            <Space>
              <FileTextOutlined style={{ color: '#6366f1' }} />
              <span style={{ fontWeight: 600 }}>Tóm tắt kết quả thực hiện</span>
            </Space>
          }
          rules={[{ required: true, message: 'Vui lòng nhập tóm tắt kết quả công việc' }]}
        >
          <TextArea
            rows={4}
            placeholder="Mô tả kết quả đạt được, sản phẩm đầu ra, ghi chú bàn giao hoặc link tài liệu liên quan..."
            maxLength={3000}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="actualHours"
          label={<span style={{ fontWeight: 600 }}>Số giờ làm thực tế đã thực hiện (giờ)</span>}
          rules={[{ required: true, message: 'Vui lòng nhập số giờ thực tế' }]}
        >
          <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="VD: 8" />
        </Form.Item>

        <Divider style={{ margin: '16px 0 12px 0' }} />

        <div style={{ marginBottom: 8 }}>
          <Space>
            <LinkOutlined style={{ color: '#3b82f6' }} />
            <span style={{ fontWeight: 600 }}>Liên kết sản phẩm / Minh chứng đầu ra (Links)</span>
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Thêm đường link tài liệu Figma, Google Drive, GitHub PR, Jira, hoặc tài liệu bàn giao.
            </Text>
          </div>
        </div>

        <Form.List name="deliverableLinks">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  style={{
                    background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
                    borderColor: 'var(--border-color, rgba(255,255,255,0.1))',
                  }}
                  bodyStyle={{ padding: '8px 12px' }}
                >
                  <Space align="baseline" style={{ width: '100%', display: 'flex' }}>
                    <Form.Item
                      {...restField}
                      name={[name, 'title']}
                      style={{ marginBottom: 0, flex: 1, minWidth: 160 }}
                    >
                      <Input placeholder="Tên tài liệu (VD: Figma Wireframe)" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'url']}
                      style={{ marginBottom: 0, flex: 2, minWidth: 260 }}
                      rules={[{ type: 'url', message: 'URL không đúng định dạng' }]}
                    >
                      <Input placeholder="https://..." />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Space>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                Thêm đường dẫn kết quả
              </Button>
            </div>
          )}
        </Form.List>

        <Form.Item name="markAsDone" valuePropName="checked" style={{ marginBottom: 20 }}>
          <Checkbox>
            <span style={{ fontWeight: 600, color: '#10b981' }}>
              Đánh dấu hoàn thành 100% công việc (Chuyển trạng thái sang Done)
            </span>
          </Checkbox>
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onClose}>Hủy bỏ</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#10b981',
              fontWeight: 600,
            }}
          >
            Lưu báo cáo kết quả
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
