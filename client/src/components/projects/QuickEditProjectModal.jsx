import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Avatar,
  message,
} from 'antd';
import {
  EditOutlined,
  ApartmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import projectService from '../../services/projectService';
import departmentService from '../../services/departmentService';
import resourceService from '../../services/resourceService';
import authService from '../../services/authService';
import { PROJECT_STATUSES, PRIORITY_OPTIONS } from '../../constants';
import { projectStatusLabel, priorityLabel } from '../../i18n/enums';

const { Text } = Typography;

export default function QuickEditProjectModal({ open, project, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !project) return;

    // Tải danh sách departments và managers
    const loadOptions = async () => {
      try {
        const [deptRes, userRes] = await Promise.all([
          departmentService.getAll({ isActive: true }),
          authService.getUsers ? authService.getUsers().catch(() => null) : null,
        ]);

        setDepartments(deptRes.data?.data?.departments || deptRes.data?.departments || []);

        if (userRes?.data?.users) {
          setUsers(userRes.data.users);
        } else {
          const resRes = await resourceService.getAll();
          const extracted = (resRes.data?.data?.resources || resRes.data?.resources || [])
            .map((r) => r.user || { _id: r._id, name: r.name, email: r.email, avatar: r.avatar })
            .filter(Boolean);
          setUsers(extracted);
        }
      } catch {
        /* ignore */
      }
    };

    loadOptions();

    form.setFieldsValue({
      name: project.name,
      department: project.department?._id || project.department || null,
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      manager: project.manager?._id || project.manager,
    });
  }, [open, project, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        department: values.department || null,
        status: values.status,
        priority: values.priority,
        manager: values.manager,
      };

      await projectService.quickUpdate(project._id, payload);
      message.success('Cập nhật nhanh dự án thành công');
      onSuccess?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật dự án');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined style={{ color: '#6366f1' }} />
          <span>Chỉnh sửa nhanh: {project?.name}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText="Lưu thay đổi"
      cancelText="Hủy"
      width={520}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label={<Text strong>Tên dự án / phòng ban</Text>}
          rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
        >
          <Input placeholder="Tên dự án..." />
        </Form.Item>

        <Form.Item
          name="department"
          label={
            <Space>
              <ApartmentOutlined style={{ color: '#6366f1' }} />
              <Text strong>Phân nhóm Department</Text>
            </Space>
          }
          extra="Lựa chọn phân nhóm Department cấp cha quản lý dự án này (theo chuẩn Base Wework)"
        >
          <Select
            allowClear
            placeholder="-- Chọn Phân nhóm Department --"
            options={[
              { value: null, label: '— Chưa phân nhóm —' },
              ...departments.map((d) => ({
                value: d._id,
                label: (
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: d.color || '#6366f1',
                      }}
                    />
                    <span>{d.name} {d.code ? `(${d.code})` : ''}</span>
                  </Space>
                ),
              })),
            ]}
          />
        </Form.Item>

        <Form.Item name="manager" label={<Text strong>Quản lý dự án (PM)</Text>}>
          <Select
            placeholder="Chọn người quản lý dự án..."
            showSearch
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u._id,
              label: `${u.name} (${u.email})`,
              user: u,
            }))}
            optionRender={(opt) => {
              const u = opt.data.user;
              return (
                <Space>
                  <Avatar size="small" src={u?.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                  <div>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{u?.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{u?.email}</Text>
                  </div>
                </Space>
              );
            }}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="status" label={<Text strong>Trạng thái</Text>}>
            <Select
              options={PROJECT_STATUSES.map((s) => ({
                value: s.key,
                label: projectStatusLabel(s.key),
              }))}
            />
          </Form.Item>

          <Form.Item name="priority" label={<Text strong>Độ ưu tiên</Text>}>
            <Select
              options={PRIORITY_OPTIONS.map((p) => ({
                value: p.key,
                label: priorityLabel(p.key),
              }))}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
