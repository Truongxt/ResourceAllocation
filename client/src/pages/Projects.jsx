import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { PROJECT_STATUSES, PRIORITY_OPTIONS } from '../constants';
import {
  projectStatusLabel,
  projectStatusOptions,
  priorityLabel,
  priorityOptions,
} from '../i18n/enums';
import { formatCurrency } from '../i18n/format';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      message.error(error.response?.data?.message || t('projects.loadFailed'));
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
          ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
      };

      if (values.dateRange && values.dateRange.length === 2) {
        payload.startDate = values.dateRange[0].toISOString();
        payload.endDate = values.dateRange[1].toISOString();
      }

      if (editingProject) {
        await projectService.update(editingProject._id, payload);
        message.success(t('projects.updated'));
      } else {
        await projectService.create(payload);
        message.success(t('projects.created'));
      }
      setModalOpen(false);
      await loadProjects();
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await projectService.remove(id, true);
      message.success(t('projects.deleted'));
      await loadProjects();
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.deleteFailed'));
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      message.warning(t('projects.csvEmpty'));
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    const lines = csvContent.trim().split('\n');
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Dòng đầu là tiêu đề thì bỏ qua. Nhận cả hai ngôn ngữ vì file mẫu người
      // dùng dán vào có thể xuất từ giao diện tiếng Việt lẫn tiếng Anh.
      const looksLikeHeader = /(^|,)\s*"?(tên|name)\b/i.test(line);
      if (!line || (i === 0 && looksLikeHeader)) continue;

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

    message.success(t('projects.csvImported', { count: successCount }));
    setSubmitting(false);
    setCsvModalOpen(false);
    setCsvContent('');
    await loadProjects();
  };

  const columns = [
    {
      title: t('common.project'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Button
            type="link"
            style={{ padding: 0, height: 'auto', fontSize: 14, fontWeight: 600 }}
            onClick={() => navigate(`/projects/${record._id}`)}
          >
            {text}
          </Button>
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
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const option = PROJECT_STATUSES.find((o) => o.value === status);
        return <Tag color={option?.color || 'default'}>{projectStatusLabel(status)}</Tag>;
      },
    },
    {
      title: t('common.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => {
        const option = PRIORITY_OPTIONS.find((o) => o.value === priority);
        return <Tag color={option?.color || 'default'}>{priorityLabel(priority)}</Tag>;
      },
    },
    {
      title: t('gantt.progress'),
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
      ),
    },
    {
      title: t('projects.budget'),
      dataIndex: 'budget',
      key: 'budget',
      width: 140,
      render: (budget) => <Text>{formatCurrency(budget)}</Text>,
    },
    {
      title: t('gantt.period'),
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
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.edit')}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Popconfirm
              title={t('projects.deleteConfirm')}
              description={t('projects.deleteWarning')}
              onConfirm={() => handleDelete(record._id)}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
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
          <Title level={3} style={{ marginBottom: 4 }}>{t('pageTitle./projects')}</Title>
          <Text type="secondary">{t('projects.subtitle')}</Text>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setCsvModalOpen(true)}>
            {t('projects.importCsv')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} id="btn-create-project">
            {t('projects.create')}
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title={t('projects.stats.total')}
              value={projectStats.total}
              prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title={t('enums.projectStatus.in_progress')}
              value={projectStats.active}
              prefix={<SyncOutlined spin style={{ color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title={t('reports.columns.completed')}
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
              placeholder={t('projects.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('common.status')}
              value={filters.status || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, status: val || '' }))}
              allowClear
              options={projectStatusOptions()}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('common.priority')}
              value={filters.priority || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
              allowClear
              options={priorityOptions()}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadProjects} title={t('common.reload')} />
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
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (count) => t('projects.totalCount', { count }),
          }}
        />
      </Card>

      {/* Project Form Modal */}
      <Modal
        title={editingProject ? t('projects.editTitle') : t('projects.createTitle')}
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
                label={t('projects.form.name')}
                rules={[{ required: true, message: t('projects.form.nameRequired') }]}
              >
                <Input placeholder={t('projects.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label={t('projects.form.code')}>
                <Input placeholder={t('projects.form.codePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t('projects.form.description')}>
            <TextArea rows={3} placeholder={t('projects.form.descriptionPlaceholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label={t('common.status')} rules={[{ required: true }]}>
                <Select options={projectStatusOptions()} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label={t('common.priority')} rules={[{ required: true }]}>
                <Select options={priorityOptions()} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="dateRange" label={t('projects.form.dateRange')}>
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="budget" label={t('projects.form.budget')}>
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label={t('projects.form.tags')} extra={t('projects.form.tagsHint')}>
            <Input placeholder="AI, Fintech, Microservices" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingProject ? t('common.saveChanges') : t('projects.create')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title={t('projects.csvTitle')}
        open={csvModalOpen}
        onCancel={() => setCsvModalOpen(false)}
        onOk={handleImportCSV}
        confirmLoading={submitting}
        okText={t('projects.csvStart')}
        cancelText={t('common.cancel')}
        width={600}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          {t('projects.csvFormat')} <code>{t('projects.csvColumns')}</code>
        </Paragraph>
        <TextArea
          rows={8}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder={t('projects.csvExample')}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  );
}