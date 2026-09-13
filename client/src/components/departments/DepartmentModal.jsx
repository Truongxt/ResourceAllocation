import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Alert,
  Space,
  Avatar,
  Typography,
  Divider,
  Tag,
  message,
} from 'antd';
import {
  ApartmentOutlined,
  UserOutlined,
  BgColorsOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import departmentService from '../../services/departmentService';
import resourceService from '../../services/resourceService';
import authService from '../../services/authService';

const { Text } = Typography;
const { TextArea } = Input;

const COLOR_PRESETS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Teal', value: '#06b6d4' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Slate', value: '#64748b' },
];

export default function DepartmentModal({ open, department, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#6366f1');

  useEffect(() => {
    if (!open) return;

    // Tải danh sách người dùng để gắn tag Quản lý phân nhóm
    const loadUsers = async () => {
      try {
        if (authService.getUsers) {
          const res = await authService.getUsers().catch(() => null);
          if (res?.data?.users) {
            setUsers(res.data.users);
            return;
          }
        }
        const resRes = await resourceService.getAll();
        const extracted = (resRes.data?.data?.resources || resRes.data?.resources || [])
          .map((r) => r.user || { _id: r._id, name: r.name, email: r.email, avatar: r.avatar })
          .filter(Boolean);
        setUsers(extracted);
      } catch {
        /* ignore */
      }
    };

    loadUsers();

    if (department) {
      const color = department.color || '#6366f1';
      setSelectedColor(color);
      form.setFieldsValue({
        name: department.name,
        code: department.code || '',
        description: department.description || '',
        color,
        managers: Array.isArray(department.managers)
          ? department.managers.map((m) => m._id || m)
          : [],
      });
    } else {
      setSelectedColor('#6366f1');
      form.resetFields();
      form.setFieldsValue({
        color: '#6366f1',
        managers: [],
      });
    }
  }, [open, department, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code ? values.code.trim().toUpperCase() : undefined,
        description: values.description ? values.description.trim() : '',
        managers: values.managers || [],
        color: selectedColor,
      };

      if (department) {
        await departmentService.update(department._id, payload);
        message.success('Cập nhật Department thành công');
      } else {
        await departmentService.create(payload);
        message.success('Tạo mới Department thành công');
      }

      onSuccess?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể lưu Department');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ApartmentOutlined style={{ color: selectedColor, fontSize: 18 }} />
          <span>{department ? 'Chỉnh sửa Department' : 'Tạo mới 1 Department'}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={department ? 'Lưu thay đổi' : 'Tạo Department'}
      cancelText="Hủy"
      width={600}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
        message="Chuẩn Base Wework"
        description="Department là cấp cha của Dự án (project) / phòng ban (team), sẽ chứa toàn bộ phòng ban/dự án thuộc vào department đó và quản lý toàn bộ các mục tiêu trong phân nhóm."
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label={<Text strong>Tên Department / Phân nhóm</Text>}
          rules={[
            { required: true, message: 'Vui lòng nhập tên Department' },
            { max: 120, message: 'Tên không vượt quá 120 ký tự' },
          ]}
        >
          <Input placeholder="Ví dụ: Khối Công nghệ Thông tin, Khối Kinh doanh, Chi nhánh Miền Nam..." />
        </Form.Item>

        <Form.Item
          name="code"
          label={<Text strong>Mã Department</Text>}
          rules={[{ max: 12, message: 'Mã không vượt quá 12 ký tự' }]}
        >
          <Input placeholder="Ví dụ: IT, SALES, TECH..." style={{ textTransform: 'uppercase' }} />
        </Form.Item>

        <Form.Item
          name="managers"
          label={
            <Space>
              <Text strong>Quản lý Department</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>(Tag @username quản trị phân nhóm)</Text>
            </Space>
          }
        >
          <Select
            mode="multiple"
            placeholder="Tag tên thành viên là quản trị Department..."
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

        <Form.Item label={<Text strong><BgColorsOutlined /> Màu sắc nhận diện</Text>}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {COLOR_PRESETS.map((p) => {
              const active = selectedColor === p.value;
              return (
                <div
                  key={p.value}
                  onClick={() => setSelectedColor(p.value)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: p.value,
                    cursor: 'pointer',
                    border: active ? '3px solid #ffffff' : '2px solid transparent',
                    boxShadow: active ? `0 0 0 2px ${p.value}` : 'none',
                    transition: 'all 0.2s',
                  }}
                  title={p.label}
                />
              );
            })}
          </div>
        </Form.Item>

        <Form.Item name="description" label={<Text strong>Mô tả & Mục tiêu</Text>}>
          <TextArea rows={3} placeholder="Mô tả chức năng, vai trò hoặc mục tiêu chiến lược của Department này..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
