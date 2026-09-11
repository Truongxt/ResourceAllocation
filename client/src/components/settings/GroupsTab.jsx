import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Typography, Modal, Form, Input, message, Popconfirm, Row, Col } from 'antd';
import {
  ApartmentOutlined,
  PlusOutlined,
  TeamOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import departmentService from '../../services/departmentService';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function GroupsTab() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.data?.departments || res.data?.departments || []);
    } catch (err) {
      console.error('Lỗi khi tải phòng ban:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      if (editingDept) {
        await departmentService.update(editingDept._id, values);
        message.success('Đã cập nhật nhóm / phòng ban');
      } else {
        await departmentService.create(values);
        message.success('Đã tạo nhóm / phòng ban mới');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingDept(null);
      loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phòng ban');
    }
  };

  const handleDelete = async (id) => {
    try {
      await departmentService.remove(id);
      message.success('Đã xóa phòng ban thành công');
      loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa phòng ban đang có nhân sự');
    }
  };

  const columns = [
    {
      title: 'Tên Nhóm / Phòng ban',
      key: 'name',
      render: (_, record) => (
        <Space size={12}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ApartmentOutlined style={{ color: '#2563eb', fontSize: 18 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 13.5, display: 'block' }}>
              {record.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description || 'Không có mô tả'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số thành viên',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 140,
      render: (count) => (
        <Tag color="blue" icon={<TeamOutlined />}>
          {count || 0} nhân sự
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      render: (isActive) =>
        isActive !== false ? <Tag color="success">Đang hoạt động</Tag> : <Tag color="default">Tạm dừng</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: '#3b82f6' }} />}
            onClick={() => {
              setEditingDept(record);
              form.setFieldsValue({
                name: record.name,
                description: record.description || '',
              });
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title="Xóa phòng ban này?"
            description="Chỉ có thể xóa phòng ban khi không còn nhân sự trực thuộc."
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <div
        className="saas-card"
        style={{
          padding: 24,
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ApartmentOutlined style={{ color: '#2563eb' }} />
              <span>Cơ Cấu Nhóm & Phòng Ban (Base Groups)</span>
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tổ chức nhân sự theo các phòng ban, đội ngũ chức năng và phân bổ công việc theo nhóm
            </Text>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadDepartments}>
              Tải lại
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingDept(null);
                form.resetFields();
                setModalOpen(true);
              }}
              style={{ background: '#2563eb' }}
            >
              Thêm Nhóm / Phòng ban
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={departments}
          rowKey="_id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingDept(null);
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700 }}>
            <ApartmentOutlined style={{ color: '#2563eb' }} />
            <span>{editingDept ? 'Chỉnh Sửa Phòng Ban' : 'Thêm Nhóm / Phòng Ban Mới'}</span>
          </div>
        }
        footer={null}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên nhóm / phòng ban" rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban' }]}>
            <Input placeholder="VD: Khối Kỹ thuật & Công nghệ" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chức năng">
            <TextArea rows={3} placeholder="Mô tả nhiệm vụ và phạm vi chuyên môn..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#2563eb' }}>
              {editingDept ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
