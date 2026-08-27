import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Segmented, Button, message } from 'antd';
import {
  CheckSquareOutlined,
  ProjectOutlined,
  TeamOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import projectService from '../../services/projectService';
import taskService from '../../services/taskService';
import resourceService from '../../services/resourceService';

const { Option } = Select;
const { TextArea } = Input;

export default function QuickCreateModal({ open, onClose, defaultType = 'task', onSuccess }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [form] = Form.useForm();

  const [createType, setCreateType] = useState(defaultType);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    if (open) {
      setCreateType(defaultType);
      form.resetFields();
      loadMetadata();
    }
  }, [open, defaultType]);

  const loadMetadata = async () => {
    try {
      const [projRes, resRes] = await Promise.allSettled([
        projectService.getAll(),
        resourceService.getAll(),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        const list = Array.isArray(projRes.value.data) ? projRes.value.data : projRes.value.data.data?.projects || projRes.value.data.projects || [];
        setProjects(list);
      }
      if (resRes.status === 'fulfilled' && resRes.value?.data) {
        const list = Array.isArray(resRes.value.data) ? resRes.value.data : resRes.value.data.data?.resources || resRes.value.data.resources || [];
        setResources(list);
      }
    } catch (err) {
      console.error('Error loading metadata for quick create', err);
    }
  };

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      if (createType === 'task') {
        const payload = {
          title: values.title,
          description: values.description,
          projectId: values.projectId,
          priority: values.priority || 'medium',
          estimatedHours: values.estimatedHours || 8,
          assigneeId: values.assigneeId || null,
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        };
        await taskService.create(payload);
        message.success('Đã tạo công việc mới thành công!');
      } else if (createType === 'project') {
        const payload = {
          name: values.name,
          code: values.code || undefined,
          description: values.description,
          startDate: values.dateRange?.[0]?.toISOString(),
          endDate: values.dateRange?.[1]?.toISOString(),
          budget: values.budget || 0,
        };
        await projectService.create(payload);
        message.success('Đã tạo dự án mới thành công!');
      } else if (createType === 'resource') {
        const payload = {
          name: values.name,
          email: values.email,
          role: values.role || 'Developer',
          department: values.department || 'Engineering',
          maxCapacityHoursPerWeek: values.maxCapacity || 40,
        };
        await resourceService.create(payload);
        message.success('Đã tạo nhân sự mới thành công!');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700 }}>
          <PlusOutlined style={{ color: '#6366f1' }} />
          <span>Tạo Mới Nhanh</span>
        </div>
      }
      footer={null}
      destroyOnClose
      width={540}
    >
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <Segmented
          value={createType}
          onChange={(val) => {
            setCreateType(val);
            form.resetFields();
          }}
          options={[
            { label: 'Công việc (Task)', value: 'task', icon: <CheckSquareOutlined /> },
            { label: 'Dự án (Project)', value: 'project', icon: <ProjectOutlined /> },
            { label: 'Nhân sự (Resource)', value: 'resource', icon: <TeamOutlined /> },
          ]}
          block
          size="middle"
        />
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Task Form */}
        {createType === 'task' && (
          <>
            <Form.Item
              name="title"
              label="Tiêu đề công việc"
              rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}
            >
              <Input placeholder="Ví dụ: Thiết kế Database & API Endpoint" />
            </Form.Item>

            <Form.Item
              name="projectId"
              label="Thuộc Dự án"
              rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
            >
              <Select placeholder="Chọn dự án">
                {projects.map((p) => (
                  <Option key={p._id} value={p._id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="priority" label="Mức độ ưu tiên" initialValue="medium">
                <Select>
                  <Option value="low">Thấp (Low)</Option>
                  <Option value="medium">Trung bình (Medium)</Option>
                  <Option value="high">Cao (High)</Option>
                  <Option value="urgent">Khẩn cấp (Urgent)</Option>
                </Select>
              </Form.Item>

              <Form.Item name="estimatedHours" label="Số giờ ước tính (h)" initialValue={8}>
                <InputNumber min={1} max={500} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="assigneeId" label="Người thực hiện (Tùy chọn)">
                <Select placeholder="Chưa phân công" allowClear>
                  {resources.map((r) => (
                    <Option key={r._id} value={r._id}>
                      {r.name} ({r.role || 'Member'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="dueDate" label="Hạn chót (Deadline)">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <Form.Item name="description" label="Mô tả chi tiết">
              <TextArea rows={3} placeholder="Mô tả yêu cầu và tiêu chí hoàn thành..." />
            </Form.Item>
          </>
        )}

        {/* Project Form */}
        {createType === 'project' && (
          <>
            <Form.Item
              name="name"
              label="Tên dự án"
              rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
            >
              <Input placeholder="Ví dụ: Nâng cấp Hệ thống ERP Doanh Nghiệp" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="code" label="Mã dự án (Code)">
                <Input placeholder="ERP-2026" />
              </Form.Item>

              <Form.Item name="budget" label="Ngân sách (VNĐ)" initialValue={50000000}>
                <InputNumber
                  min={0}
                  step={10000000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <Form.Item name="dateRange" label="Thời gian thực hiện (Bắt đầu - Kết thúc)">
              <DatePicker.RangePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="description" label="Mục tiêu dự án">
              <TextArea rows={3} placeholder="Mô tả phạm vi và mục tiêu tổng thể..." />
            </Form.Item>
          </>
        )}

        {/* Resource Form */}
        {createType === 'resource' && (
          <>
            <Form.Item
              name="name"
              label="Họ và tên nhân sự"
              rules={[{ required: true, message: 'Vui lòng nhập tên nhân sự' }]}
            >
              <Input placeholder="Ví dụ: Nguyễn Văn A" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input placeholder="nguyenvana@company.com" />
              </Form.Item>

              <Form.Item name="role" label="Chức danh" initialValue="Developer">
                <Select>
                  <Option value="Frontend Developer">Frontend Developer</Option>
                  <Option value="Backend Developer">Backend Developer</Option>
                  <Option value="Fullstack Developer">Fullstack Developer</Option>
                  <Option value="DevOps Engineer">DevOps Engineer</Option>
                  <Option value="QA Engineer">QA Engineer</Option>
                  <Option value="AI / ML Engineer">AI / ML Engineer</Option>
                  <Option value="Project Manager">Project Manager</Option>
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="department" label="Phòng ban" initialValue="Engineering">
                <Select>
                  <Option value="Engineering">Engineering</Option>
                  <Option value="Product & Design">Product & Design</Option>
                  <Option value="Quality Assurance">Quality Assurance</Option>
                  <Option value="AI & Research">AI & Research</Option>
                </Select>
              </Form.Item>

              <Form.Item name="maxCapacity" label="Công suất tuần (Giờ)" initialValue={40}>
                <InputNumber min={10} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading} style={{ background: '#6366f1' }}>
            Tạo Ngay
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
