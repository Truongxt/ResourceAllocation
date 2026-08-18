import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Progress,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import projectService from '../services/projectService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Lập kế hoạch', color: 'blue' },
  { value: 'in_progress', label: 'Đang thực hiện', color: 'processing' },
  { value: 'on_hold', label: 'Tạm dừng', color: 'warning' },
  { value: 'completed', label: 'Hoàn thành', color: 'success' },
  { value: 'cancelled', label: 'Đã hủy', color: 'error' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Thấp', color: 'default' },
  { value: 'medium', label: 'Trung bình', color: 'blue' },
  { value: 'high', label: 'Cao', color: 'warning' },
  { value: 'critical', label: 'Khẩn cấp', color: 'red' },
];

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [csvContent, setCsvContent] = useState('');
  const [form] = Form.useForm();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await projectService.getAll(params);
      setProjects(response.data.data.projects || []);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadProjects, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.priority]);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === 'in_progress').length;
    const completed = projects.filter((project) => project.status === 'completed').length;
    return { total, active, completed };
  }, [projects]);

  const openCreate = () => {
    setEditingProject(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'planning',
      priority: 'medium',
      budget: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name || '',
      code: project.code || '',
      description: project.description || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      dateRange: project.startDate && project.endDate ? [dayjs(project.startDate), dayjs(project.endDate)] : undefined,
      budget: project.budget || 0,
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        code: values.code || undefined,
        description: values.description,
        status: values.status,
        priority: values.priority,
        budget: Number(values.budget) || 0,
        tags: values.tags
          ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };

      if (values.dateRange && values.dateRange.length === 2) {
        payload.startDate = values.dateRange[0].toISOString();
        payload.endDate = values.dateRange[1].toISOString();
      }

      if (editingProject) {
        await projectService.update(editingProject._id, payload);
        message.success('Cập nhật dự án thành công');
      } else {
        await projectService.create(payload);
        message.success('Tạo dự án thành công');
      }
      setModalOpen(false);
      await loadProjects();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu dự án');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await projectService.remove(id, true);
      message.success('Xóa dự án thành công');
      await loadProjects();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa dự án');
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      message.warning('Vui lòng nhập nội dung CSV');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    const lines = csvContent.trim().split('\n');
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.toLowerCase().includes('tên'))) continue;

      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (!parts[0]) continue;

      try {
        await projectService.create({
          name: parts[0],
          code: parts[1] || undefined,
          description: parts[2] || '',
          status: parts[3] || 'planning',
          priority: parts[4] || 'medium',
          budget: Number(parts[5]) || 0,
          startDate: parts[6] || today,
          endDate: parts[7] || nextMonth,
        });
        successCount++;
      } catch {
        /* skip invalid line */
      }
    }

    message.success(`Đã nhập thành công ${successCount} dự án từ CSV.`);
    setSubmitting(false);
    setCsvModalOpen(false);
    setCsvContent('');
    await loadProjects();
  };

  const columns = [
    {
      title: 'Dự án',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{text}</Text>
          {record.code && (
            <Tag color="purple" style={{ marginLeft: 8 }}>{record.code}</Tag>
          )}
          {record.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '2px 0 0' }}>
              {record.description}
            </Paragraph>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const option = STATUS_OPTIONS.find((o) => o.value === status) || { label: status, color: 'default' };
        return <Tag color={option.color}>{option.label}</Tag>;
      },
    },
    {
      title: 'Mức ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => {
        const option = PRIORITY_OPTIONS.find((o) => o.value === priority) || { label: priority, color: 'default' };
        return <Tag color={option.color}>{option.label}</Tag>;
      },
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
      ),
    },
    {
      title: 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      width: 140,
      render: (budget) => <Text>{formatMoney(budget)}</Text>,
    },
    {
      title: 'Thời gian',
      key: 'dates',
      width: 180,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '—'}
          {' → '}
          {record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xác nhận xóa dự án?"
              description="Các công việc liên quan cũng sẽ bị xóa vĩnh viễn."
              onConfirm={() => handleDelete(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Quản lý Dự án</Title>
          <Text type="secondary">Theo dõi tiến độ, ngân sách và trạng thái các dự án của tổ chức</Text>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setCsvModalOpen(true)}>
            Nhập CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} id="btn-create-project">
            Tạo dự án
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="Tổng dự án"
              value={projectStats.total}
              prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="Đang thực hiện"
              value={projectStats.active}
              prefix={<SyncOutlined spin style={{ color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="Đã hoàn thành"
              value={projectStats.completed}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Toolbar / Filters */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên, mã hoặc mô tả..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Trạng thái"
              value={filters.status || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, status: val || '' }))}
              allowClear
              options={STATUS_OPTIONS}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Mức ưu tiên"
              value={filters.priority || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
              allowClear
              options={PRIORITY_OPTIONS}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadProjects} title="Tải lại" />
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng số ${total} dự án` }}
        />
      </Card>

      {/* Project Form Modal */}
      <Modal
        title={editingProject ? 'Cập nhật dự án' : 'Tạo dự án mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Tên dự án"
                rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
              >
                <Input placeholder="Ví dụ: Nâng cấp hệ thống Core Banking" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label="Mã dự án">
                <Input placeholder="VD: CB-2026" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả dự án">
            <TextArea rows={3} placeholder="Mô tả mục tiêu, phạm vi của dự án..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Mức ưu tiên" rules={[{ required: true }]}>
                <Select options={PRIORITY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="dateRange" label="Thời gian thực hiện">
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="budget" label="Ngân sách (VND)">
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label="Thẻ (Tags)" extra="Phân cách bằng dấu phẩy, ví dụ: AI, Backend, Web">
            <Input placeholder="AI, Fintech, Microservices" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingProject ? 'Lưu thay đổi' : 'Tạo dự án'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title="Nhập dự án từ file CSV"
        open={csvModalOpen}
        onCancel={() => setCsvModalOpen(false)}
        onOk={handleImportCSV}
        confirmLoading={submitting}
        okText="Bắt đầu nhập"
        cancelText="Hủy"
        width={600}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          Định dạng dữ liệu: <code>Tên dự án, Mã dự án, Mô tả, Trạng thái, Ưu tiên, Ngân sách, Ngày bắt đầu, Ngày kết thúc</code>
        </Paragraph>
        <TextArea
          rows={8}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder={`Hệ thống HRM, HRM-01, Quản lý nhân sự, in_progress, high, 500000000, 2026-01-01, 2026-06-30\nCổng thanh toán, PAY-02, Tích hợp Napas, planning, critical, 800000000, 2026-03-01, 2026-09-30`}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  );
}