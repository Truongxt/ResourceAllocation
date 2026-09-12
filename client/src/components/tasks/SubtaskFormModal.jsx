/**
 * ============================================================================
 * MODAL TẠO MỚI / CHỈNH SỬA CÔNG VIỆC CON (Subtask Form Modal Component)
 * ============================================================================
 * Hình thức tạo công việc con y chang công việc cha:
 * - Tiêu đề, Trạng thái, Độ ưu tiên, Người phụ trách, Người theo dõi
 * - Giờ ước tính, Giờ thực tế, Tiến độ (%), Khoảng thời gian (dateRange)
 * - Mô tả chi tiết
 * - Kỹ năng yêu cầu (Required Skills) kèm cấp độ và trọng số cho phân bổ AI
 * ============================================================================
 */

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Row,
  Col,
  Select,
  Avatar,
  Tag,
  Space,
  AutoComplete,
  InputNumber,
  Button,
  DatePicker,
  Typography,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  ApartmentOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  taskStatusOptions,
  priorityOptions,
  requiredSkillLevelOptions,
} from '../../i18n/enums';

const { TextArea } = Input;
const { Text } = Typography;

export default function SubtaskFormModal({
  open,
  onClose,
  parentTask,
  editingSubtask = null,
  companyUsers = [],
  knownSkillOptions = [],
  onSubmit,
  submitting = false,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editingSubtask) {
        form.setFieldsValue({
          title: editingSubtask.title || '',
          description: editingSubtask.description || '',
          status: editingSubtask.status || 'todo',
          priority: editingSubtask.priority || 'medium',
          assignee: editingSubtask.assignee?._id || editingSubtask.assignee || undefined,
          followers: (editingSubtask.followers || []).map((f) => f._id || f),
          progress: editingSubtask.progress || 0,
          estimatedHours: editingSubtask.estimatedHours !== undefined ? editingSubtask.estimatedHours : 2,
          actualHours: editingSubtask.actualHours || 0,
          requiredSkills: editingSubtask.requiredSkills || [],
          dateRange:
            editingSubtask.startDate && editingSubtask.endDate
              ? [dayjs(editingSubtask.startDate), dayjs(editingSubtask.endDate)]
              : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'todo',
          priority: parentTask?.priority || 'medium',
          assignee: undefined,
          followers: [],
          progress: 0,
          estimatedHours: 2,
          actualHours: 0,
          requiredSkills: [],
          dateRange:
            parentTask?.startDate && parentTask?.endDate
              ? [dayjs(parentTask.startDate), dayjs(parentTask.endDate)]
              : undefined,
        });
      }
    }
  }, [open, editingSubtask, parentTask, form]);

  const handleFinish = (values) => {
    const payload = {
      ...values,
      startDate: values.dateRange?.[0] ? values.dateRange[0].toISOString() : undefined,
      endDate: values.dateRange?.[1] ? values.dateRange[1].toISOString() : undefined,
    };
    delete payload.dateRange;
    onSubmit(payload, editingSubtask);
  };

  return (
    <Modal
      title={
        <Space align="center">
          {editingSubtask ? (
            <EditOutlined style={{ color: '#6366f1', fontSize: 18 }} />
          ) : (
            <ApartmentOutlined style={{ color: '#6366f1', fontSize: 18 }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {editingSubtask ? 'Chỉnh sửa công việc con' : 'Tạo công việc con mới'}
          </span>
          {parentTask && (
            <Tag color="purple" style={{ borderRadius: 6, fontSize: 11, marginLeft: 8 }}>
              Thuộc: {parentTask.title}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 14 }}>
        {/* Tiêu đề công việc con */}
        <Form.Item
          name="title"
          label="Tiêu đề công việc con"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề công việc con' }]}
        >
          <Input placeholder="Ví dụ: Thiết kế màn hình đăng nhập, Viết API xác thực..." autoFocus />
        </Form.Item>

        {/* Trạng thái & Độ ưu tiên */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
              <Select options={taskStatusOptions().map((s) => ({ value: s.key, label: s.label }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="Độ ưu tiên" rules={[{ required: true }]}>
              <Select options={priorityOptions()} />
            </Form.Item>
          </Col>
        </Row>

        {/* Người phụ trách & Người theo dõi */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="assignee" label="Phân công người phụ trách">
              <Select
                placeholder="Chọn nhân sự thực hiện việc con..."
                allowClear
                showSearch
                optionFilterProp="label"
                options={companyUsers.map((u) => ({
                  value: u._id,
                  label: (
                    <Space>
                      <Avatar size="small" src={u.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                      <span>{u.name || u.email}</span>
                      {u.position && (
                        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                          {u.position}
                        </Tag>
                      )}
                    </Space>
                  ),
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="followers" label="Người theo dõi (Followers)">
              <Select
                mode="multiple"
                placeholder="Chọn người theo dõi..."
                allowClear
                maxTagCount="responsive"
                options={companyUsers.map((u) => ({
                  value: u._id,
                  label: u.name || u.email,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Tiến độ, Giờ ước tính & Giờ thực tế */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="progress" label="Tiến độ (%)">
              <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="estimatedHours" label="Giờ ước tính">
              <InputNumber min={0.5} step={0.5} addonAfter="giờ" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="actualHours" label="Giờ thực tế">
              <InputNumber min={0} step={0.5} addonAfter="giờ" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* Khoảng ngày thực hiện */}
        <Form.Item name="dateRange" label="Thời gian thực hiện">
          <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        {/* Mô tả chi tiết */}
        <Form.Item name="description" label="Mô tả chi tiết">
          <TextArea rows={3} placeholder="Mô tả cụ thể các yêu cầu, kết quả cần đạt của công việc con..." />
        </Form.Item>

        {/* Kỹ năng yêu cầu cho thuật toán tối ưu AI */}
        <Form.Item
          label="Kỹ năng yêu cầu cho thuật toán phân bổ AI"
          extra="Hệ thống AI sẽ gợi ý hoặc phân bổ nhân sự phù hợp dựa trên các kỹ năng này"
          style={{ marginBottom: 12 }}
        >
          <Form.List name="requiredSkills">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: 'Nhập tên kỹ năng' }]}
                      style={{ width: 200, marginBottom: 0 }}
                    >
                      <AutoComplete
                        placeholder="React, Nodejs, Figma..."
                        options={knownSkillOptions}
                        filterOption={(input, option) =>
                          option.value.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'level']}
                      style={{ width: 190, marginBottom: 0 }}
                    >
                      <Select options={requiredSkillLevelOptions()} placeholder="Cấp độ yêu cầu" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'weight']}
                      style={{ width: 140, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        max={1}
                        step={0.1}
                        addonBefore="Trọng số"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444', fontSize: 16 }} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ level: 3, weight: 1 })}
                  block
                  icon={<PlusOutlined />}
                >
                  Thêm kỹ năng yêu cầu
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        {/* Nút hành động */}
        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                fontWeight: 600,
              }}
            >
              {editingSubtask ? 'Lưu thay đổi' : 'Tạo công việc con'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
