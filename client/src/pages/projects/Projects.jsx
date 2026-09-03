import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Card,
  Row,
  Col,
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
  Segmented,
  Empty,
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
  AppstoreOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  DollarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import projectService from '../../services/projectService';
import { PROJECT_STATUSES, PRIORITY_OPTIONS } from '../../constants';
import {
  projectStatusLabel,
  projectStatusOptions,
  priorityLabel,
  priorityOptions,
} from '../../i18n/enums';
import { formatCurrency } from '../../i18n/format';
import { useTheme } from '../../context/ThemeContext';
import './Projects.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function Projects() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
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
      message.error(error.response?.data?.message || t('projects.loadFailed') || 'Không thể tải danh sách dự án');
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
        message.success(t('projects.updated') || 'Đã cập nhật dự án');
      } else {
        await projectService.create(payload);
        message.success(t('projects.created') || 'Đã tạo dự án thành công');
      }
      setModalOpen(false);
      await loadProjects();
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.saveFailed') || 'Lỗi khi lưu dự án');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await projectService.remove(id, true);
      message.success(t('projects.deleted') || 'Đã xóa dự án');
      await loadProjects();
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.deleteFailed') || 'Lỗi khi xóa dự án');
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      message.warning(t('projects.csvEmpty') || 'Nội dung CSV trống');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    const lines = csvContent.trim().split('\n');
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
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
        /* skip invalid */
      }
    }

    message.success(t('projects.csvImported', { count: successCount }) || `Đã nhập thành công ${successCount} dự án`);
    setSubmitting(false);
    setCsvModalOpen(false);
    setCsvContent('');
    await loadProjects();
  };

  const columns = [
    {
      title: t('common.project') || 'Dự án',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontSize: 14, fontWeight: 700, color: isDark ? '#a5b4fc' : '#4f46e5' }}
              onClick={() => navigate(`/projects/${record._id}`)}
            >
              {text}
            </Button>
            {record.code && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              >
                {record.code}
              </span>
            )}
          </div>
          {record.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '2px 0 0' }}>
              {record.description}
            </Paragraph>
          )}
        </div>
      ),
    },
    {
      title: t('common.status') || 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const option = PROJECT_STATUSES.find((o) => o.value === status);
        return <Tag color={option?.color || 'default'} style={{ borderRadius: 10 }}>{projectStatusLabel(status)}</Tag>;
      },
    },
    {
      title: t('common.priority') || 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => {
        const option = PRIORITY_OPTIONS.find((o) => o.value === priority);
        return <Tag color={option?.color || 'default'} style={{ borderRadius: 10 }}>{priorityLabel(priority)}</Tag>;
      },
    },
    {
      title: t('gantt.progress') || 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 160,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} strokeColor="#6366f1" />
      ),
    },
    {
      title: t('projects.budget') || 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      width: 140,
      render: (budget) => <Text strong className="tabular-nums">{formatCurrency(budget)}</Text>,
    },
    {
      title: t('gantt.period') || 'Thời gian',
      key: 'dates',
      width: 180,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }} className="tabular-nums">
          {record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '—'}
          {' → '}
          {record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: t('common.actions') || 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.edit') || 'Chỉnh sửa'}>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title={t('common.delete') || 'Xóa'}>
            <Popconfirm
              title={t('projects.deleteConfirm') || 'Xác nhận xóa dự án?'}
              description={t('projects.deleteWarning') || 'Hành động này sẽ xóa toàn bộ công việc liên quan.'}
              onConfirm={() => handleDelete(record._id)}
              okText={t('common.delete') || 'Xóa'}
              cancelText={t('common.cancel') || 'Hủy'}
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {t('pageTitle./projects') || 'Quản lý Dự án'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('projects.subtitle') || 'Theo dõi tiến độ, ngân sách và trạng thái các dự án trong tổ chức'}
          </Text>
        </div>

        <Space size="small">
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'grid', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <UnorderedListOutlined /> },
            ]}
          />
          <Button icon={<UploadOutlined />} onClick={() => setCsvModalOpen(true)}>
            {t('projects.importCsv') || 'Nhập CSV'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            id="btn-create-project"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              fontWeight: 600,
            }}
          >
            {t('projects.create') || 'Tạo dự án'}
          </Button>
        </Space>
      </div>

      {/* 3 Metric Chips */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-primary">
              <ProjectOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('projects.stats.total') || 'Tổng số dự án'}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                {projectStats.total}
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-info">
              <SyncOutlined spin />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('enums.projectStatus.in_progress') || 'Đang thực hiện'}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#06b6d4' }} className="tabular-nums">
                {projectStats.active}
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-success">
              <CheckCircleOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('reports.columns.completed') || 'Đã hoàn thành'}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }} className="tabular-nums">
                {projectStats.completed}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Toolbar / Filters */}
      <div className="saas-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: '#64748b' }} />}
              placeholder={t('projects.searchPlaceholder') || 'Tìm theo tên, mã hoặc mô tả...'}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('common.status') || 'Tất cả trạng thái'}
              value={filters.status || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, status: val || '' }))}
              allowClear
              options={projectStatusOptions()}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('common.priority') || 'Tất cả độ ưu tiên'}
              value={filters.priority || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
              allowClear
              options={priorityOptions()}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadProjects} title={t('common.reload') || 'Tải lại'} />
          </Col>
        </Row>
      </div>

      {/* Main Content: Grid vs Table */}
      {viewMode === 'grid' ? (
        projects.length === 0 && !loading ? (
          <div className="saas-card" style={{ padding: '48px 0', textAlign: 'center' }}>
            <Empty description={t('projects.noProjects') || 'Chưa có dự án nào'} />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {projects.map((proj) => {
              const statusOpt = PROJECT_STATUSES.find((s) => s.value === proj.status);
              const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === proj.priority);
              const progressVal = proj.progress || 0;

              return (
                <Col xs={24} md={12} lg={8} key={proj._id}>
                  <div
                    className="saas-card saas-card-interactive"
                    style={{
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                    }}
                  >
                    <div>
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {proj.code && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                              }}
                            >
                              {proj.code}
                            </span>
                          )}
                          <Tag color={statusOpt?.color || 'default'} style={{ borderRadius: 10, margin: 0, fontSize: 11 }}>
                            {projectStatusLabel(proj.status)}
                          </Tag>
                        </div>
                        <Tag color={priorityOpt?.color || 'default'} style={{ borderRadius: 10, margin: 0, fontSize: 11 }}>
                          {priorityLabel(proj.priority)}
                        </Tag>
                      </div>

                      {/* Title & Description */}
                      <div
                        onClick={() => navigate(`/projects/${proj._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Title level={5} style={{ margin: '0 0 6px 0', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                          {proj.name}
                        </Title>
                        <Paragraph
                          type="secondary"
                          ellipsis={{ rows: 2 }}
                          style={{ fontSize: 12, minHeight: 36, marginBottom: 16 }}
                        >
                          {proj.description || t('projects.noDescription') || 'Chưa có mô tả dự án.'}
                        </Paragraph>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('gantt.progress') || 'Tiến độ'}</span>
                          <span style={{ fontWeight: 700, color: progressVal === 100 ? '#10b981' : '#818cf8' }}>
                            {progressVal}%
                          </span>
                        </div>
                        <Progress
                          percent={progressVal}
                          strokeColor={progressVal === 100 ? '#10b981' : '#6366f1'}
                          trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
                          showInfo={false}
                          size="small"
                        />
                      </div>

                      {/* Meta Information Chips */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                        {proj.budget > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
                            <DollarOutlined style={{ color: '#10b981' }} />
                            <span>Ngân sách: <strong>{formatCurrency(proj.budget)}</strong></span>
                          </div>
                        )}
                        {(proj.startDate || proj.endDate) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                            <CalendarOutlined />
                            <span>
                              {proj.startDate ? dayjs(proj.startDate).format('DD/MM/YYYY') : '—'}
                              {' → '}
                              {proj.endDate ? dayjs(proj.endDate).format('DD/MM/YYYY') : '—'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 12,
                        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
                      }}
                    >
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/projects/${proj._id}`)}
                        style={{ padding: 0, fontWeight: 600, color: '#818cf8' }}
                      >
                        {t('common.viewDetails') || 'Chi tiết dự án'} →
                      </Button>

                      <Space size="small">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(proj)} />
                        <Popconfirm
                          title={t('projects.deleteConfirm') || 'Xác nhận xóa dự án?'}
                          onConfirm={() => handleDelete(proj._id)}
                          okButtonProps={{ danger: true }}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )
      ) : (
        <div className="saas-card" style={{ overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (count) => t('projects.totalCount', { count }) || `Tổng số: ${count} dự án`,
            }}
          />
        </div>
      )}

      {/* Project Form Modal */}
      <Modal
        title={editingProject ? (t('projects.editTitle') || 'Chỉnh sửa dự án') : (t('projects.createTitle') || 'Tạo dự án mới')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label={t('projects.form.name') || 'Tên dự án'}
                rules={[{ required: true, message: t('projects.form.nameRequired') || 'Vui lòng nhập tên dự án' }]}
              >
                <Input placeholder="Hệ thống Quản lý Logistics" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label={t('projects.form.code') || 'Mã dự án'}>
                <Input placeholder="LOGI-2026" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t('projects.form.description') || 'Mô tả dự án'}>
            <TextArea rows={3} placeholder="Mô tả mục tiêu, phạm vi và yêu cầu..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label={t('common.status') || 'Trạng thái'} rules={[{ required: true }]}>
                <Select options={projectStatusOptions()} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label={t('common.priority') || 'Độ ưu tiên'} rules={[{ required: true }]}>
                <Select options={priorityOptions()} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="dateRange" label={t('projects.form.dateRange') || 'Thời gian thực hiện'}>
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="budget" label={t('projects.form.budget') || 'Ngân sách (VNĐ)'}>
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label={t('projects.form.tags') || 'Tags (phân cách bằng dấu phẩy)'}>
            <Input placeholder="AI, Fintech, Logistics, High-Priority" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>{t('common.cancel') || 'Hủy'}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                }}
              >
                {editingProject ? (t('common.saveChanges') || 'Lưu thay đổi') : (t('projects.create') || 'Tạo dự án')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title={t('projects.csvTitle') || 'Nhập dữ liệu dự án từ CSV'}
        open={csvModalOpen}
        onCancel={() => setCsvModalOpen(false)}
        onOk={handleImportCSV}
        confirmLoading={submitting}
        okText={t('projects.csvStart') || 'Bắt đầu nhập'}
        cancelText={t('common.cancel') || 'Hủy'}
        width={600}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          {t('projects.csvFormat') || 'Định dạng các cột:'} <code>name, code, description, status, priority, budget, startDate, endDate</code>
        </Paragraph>
        <TextArea
          rows={8}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder="E-commerce App, ECO-01, Nền tảng bán lẻ, in_progress, high, 50000000, 2026-09-01, 2026-12-31"
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  );
}