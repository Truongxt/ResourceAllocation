import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Progress,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Tabs,
  Avatar,
  Switch,
  Divider,
  DatePicker,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
  ApartmentOutlined,
  ThunderboltOutlined,
  MinusCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import resourceService from '../../services/resourceService';
import departmentService from '../../services/departmentService';
import { AVAILABILITY_OPTIONS, ROLES } from '../../constants';
import {
  availabilityLabel,
  availabilityOptions,
  requiredSkillLevelOptions,
} from '../../i18n/enums';
import { formatNumber } from '../../i18n/format';
import { useTheme } from '../../context/ThemeContext';
import ResourceFormModal from '../../components/resources/ResourceFormModal';
import SkillsMatrixModal from '../../components/resources/SkillsMatrixModal';
import ResourceLeaveModal from '../../components/resources/ResourceLeaveModal';
import CsvImportModal from '../../components/resources/CsvImportModal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/** Kỳ nghỉ đang diễn ra hôm nay, nếu có. */
function currentLeave(resource) {
  const today = dayjs();
  return (resource.unavailablePeriods || []).find(
    (p) => today.isAfter(dayjs(p.startDate).startOf('day')) && today.isBefore(dayjs(p.endDate).endOf('day'))
  );
}

/** Kỳ nghỉ gần nhất trong tương lai, nếu có. */
function nextLeave(resource) {
  const today = dayjs();
  return (resource.unavailablePeriods || [])
    .filter((p) => dayjs(p.startDate).isAfter(today))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
}

export default function Resources() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [filters, setFilters] = useState({ search: '', department: '', availability: '' });

  // Modals state
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [csvContent, setCsvContent] = useState('');

  const [resourceForm] = Form.useForm();
  const [skillsForm] = Form.useForm();
  const [leaveForm] = Form.useForm();
  const [departmentForm] = Form.useForm();

  // Thang level của Resource là enum 1-4 ở schema; dùng chung nguồn nhãn với ô
  // chọn kỹ năng yêu cầu trong form Task để hai nơi không bao giờ nói khác nhau.
  // Phải dựng trong render chứ không phải ở cấp module: hằng số cấp module chỉ
  // chạy một lần lúc import nên nhãn sẽ đứng nguyên ở ngôn ngữ ban đầu.
  const skillLevelOptions = useMemo(() => requiredSkillLevelOptions(), [t]);

  // Load resources & departments
  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await resourceService.getAll(params);
      setResources(res.data.data.resources || []);
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.data.departments || []);
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.deptLoadFailed'));
    }
  }, [t]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timer = setTimeout(loadResources, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadResources, filters.department, filters.availability]);

  const activeDepartments = useMemo(() => departments.filter((d) => d.isActive), [departments]);

  const stats = useMemo(() => {
    const total = resources.length;
    const available = resources.filter((r) => r.availability === 'available').length;
    const overloaded = resources.filter((r) => r.isOverloaded).length;
    const avgUtil =
      total > 0
        ? Math.round(resources.reduce((sum, r) => sum + (r.utilizationRate || 0), 0) / total)
        : 0;
    return { total, available, overloaded, avgUtil };
  }, [resources]);

  // Handlers for Resource
  const openCreateResource = () => {
    setEditingResource(null);
    resourceForm.resetFields();
    resourceForm.setFieldsValue({
      newUserRole: ROLES.MEMBER,
      maxCapacity: 40,
      fte: 1,
      hourlyRate: 0,
      department: activeDepartments[0]?.name || '',
    });
    setResourceModalOpen(true);
  };

  const openEditResource = (res) => {
    setEditingResource(res);
    resourceForm.setFieldsValue({
      employeeId: res.employeeId || '',
      position: res.position || '',
      department: res.department || '',
      maxCapacity: res.maxCapacity || 40,
      fte: res.fte || 1,
      hourlyRate: res.hourlyRate || 0,
    });
    setResourceModalOpen(true);
  };

  const openSkillsModal = (res) => {
    setEditingResource(res);
    skillsForm.setFieldsValue({
      skills: (res.skills || []).map((s) => ({
        name: s.name,
        level: s.level || 2,
        yearsOfExperience: s.yearsOfExperience || 0,
      })),
    });
    setSkillsModalOpen(true);
  };

  const openLeaveModal = (res) => {
    setEditingResource(res);
    leaveForm.setFieldsValue({
      periods: (res.unavailablePeriods || [])
        .slice()
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .map((p) => ({
          range: [dayjs(p.startDate), dayjs(p.endDate)],
          reason: p.reason || '',
        })),
    });
    setLeaveModalOpen(true);
  };

  const handleLeaveSubmit = async (values) => {
    if (!editingResource) return;
    setSubmitting(true);
    try {
      const unavailablePeriods = (values.periods || [])
        .filter((p) => p?.range?.length === 2)
        .map((p) => ({
          startDate: p.range[0].startOf('day').toISOString(),
          endDate: p.range[1].endOf('day').toISOString(),
          reason: p.reason?.trim() || '',
        }));

      await resourceService.update(editingResource._id, { unavailablePeriods });
      message.success(t('resources.leaveSaved'));
      setLeaveModalOpen(false);
      await loadResources();
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.leaveSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResourceSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        position: values.position,
        department: values.department,
        maxCapacity: Number(values.maxCapacity),
        fte: Number(values.fte),
        hourlyRate: Number(values.hourlyRate),
      };

      if (editingResource) {
        await resourceService.update(editingResource._id, payload);
        message.success(t('resources.updated'));
      } else {
        payload.newUser = {
          name: values.newUserName,
          email: values.newUserEmail,
          password: values.newUserPassword,
          role: values.newUserRole,
        };
        await resourceService.create(payload);
        message.success(t('resources.createdWithAccount'));
      }
      setResourceModalOpen(false);
      await loadResources();
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillsSubmit = async (values) => {
    if (!editingResource) return;
    setSubmitting(true);
    try {
      await resourceService.updateSkills(editingResource._id, values.skills || []);
      message.success(t('resources.skillsSaved'));
      setSkillsModalOpen(false);
      await loadResources();
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.skillsSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (id) => {
    try {
      await resourceService.remove(id);
      message.success(t('resources.deleted'));
      await loadResources();
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.deleteFailed'));
    }
  };

  // Department Handlers
  const handleDepartmentSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = { ...values };
      if (!payload.code) delete payload.code;

      if (editingDepartment) {
        await departmentService.update(editingDepartment._id, payload);
        message.success(t('resources.deptUpdated'));
      } else {
        await departmentService.create(payload);
        message.success(t('resources.deptCreated'));
      }
      departmentForm.resetFields();
      setEditingDepartment(null);
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.deptSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDepartment = (dept) => {
    setEditingDepartment(dept);
    departmentForm.setFieldsValue({
      name: dept.name,
      code: dept.code,
      managerName: dept.managerName,
      description: dept.description,
      isActive: dept.isActive !== false,
    });
  };

  const handleDeleteDepartment = async (id) => {
    try {
      await departmentService.remove(id);
      message.success(t('resources.deptDeleted'));
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || t('resources.deptDeleteFailed'));
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      message.warning(t('projects.csvEmpty'));
      return;
    }
    setSubmitting(true);
    let count = 0;
    const lines = csvContent.trim().split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.toLowerCase().includes('email'))) continue;
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (!parts[0] || !parts[1] || !parts[3]) continue;

      try {
        await resourceService.create({
          newUser: {
            name: parts[0],
            email: parts[1],
            password: parts[2] || 'password123',
            role: ROLES.MEMBER,
          },
          position: parts[3],
          department: parts[4] || '',
          fte: Number(parts[5]) || 1,
          maxCapacity: Number(parts[6]) || 40,
          hourlyRate: Number(parts[7]) || 0,
        });
        count++;
      } catch {
        /* skip error row */
      }
    }

    message.success(t('resources.csvImported', { count }));
    setSubmitting(false);
    setCsvModalOpen(false);
    setCsvContent('');
    await loadResources();
    await loadDepartments();
  };

  const resourceColumns = [
    {
      title: t('reports.columns.resource'),
      key: 'name',
      render: (_, record) => (
        <Space orientation="horizontal" size="middle">
          <Avatar
            style={{ backgroundColor: '#6366f1' }}
            icon={<UserOutlined />}
            size="large"
          >
            {(record.user?.name || record.position || 'U')[0].toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 14 }}>{record.user?.name || t('resources.noUser')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.position}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('reports.columns.department'),
      dataIndex: 'department',
      key: 'department',
      render: (dept) => dept ? <Tag color="blue">{dept}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: t('common.status'),
      dataIndex: 'availability',
      key: 'availability',
      render: (avail, record) => {
        const now = currentLeave(record);
        const next = nextLeave(record);
        return (
          <Space direction="vertical" size={2}>
            <Tag
              color={AVAILABILITY_OPTIONS.find((a) => a.value === avail)?.color || 'default'}
              style={{ margin: 0 }}
            >
              {availabilityLabel(avail)}
            </Tag>
            {now && (
              <Tooltip title={now.reason || t('resources.noReason')}>
                <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
                  {t('resources.onLeaveUntil', { date: dayjs(now.endDate).format('DD/MM') })}
                </Tag>
              </Tooltip>
            )}
            {!now && next && (
              <Tooltip title={next.reason || t('resources.noReason')}>
                <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
                  {t('resources.leaveFrom', { date: dayjs(next.startDate).format('DD/MM') })}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: t('resources.workloadColumn'),
      key: 'workload',
      width: 220,
      render: (_, record) => {
        const util = record.utilizationRate || 0;
        const color = util > 100 ? '#ef4444' : util > 80 ? '#f59e0b' : '#10b981';
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.currentWorkload || 0}h / {record.capacity || record.maxCapacity * record.fte}h
              </Text>
              <Text strong style={{ color, fontSize: 12 }}>{util}%</Text>
            </div>
            <Progress percent={Math.min(util, 100)} showInfo={false} strokeColor={color} size="small" />
          </div>
        );
      },
    },
    {
      title: 'Skill Matrix',
      key: 'skills',
      render: (_, record) => {
        const skills = record.skills || [];
        return (
          <Space wrap size={[4, 4]}>
            {skills.slice(0, 3).map((s, idx) => (
              <Tag key={idx} color="purple" style={{ fontSize: 11 }}>
                {s.name} (Lv.{s.level})
              </Tag>
            ))}
            {skills.length > 3 && <Tag>+{skills.length - 3}</Tag>}
            <Button
              type="dashed"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => openSkillsModal(record)}
            >
              {t('resources.matrixButton', { count: skills.length })}
            </Button>
          </Space>
        );
      },
    },
    {
      title: t('resources.rateColumn'),
      key: 'rate',
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          FTE: {record.fte || 1} •{' '}
          {record.hourlyRate ? t('resources.perHour', { amount: formatNumber(record.hourlyRate) }) : '—'}
        </Text>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={t('resources.leaveTooltip', {
              count: (record.unavailablePeriods || []).length,
            })}
          >
            <Button
              type="text"
              icon={<CalendarOutlined />}
              onClick={() => openLeaveModal(record)}
              style={(record.unavailablePeriods || []).length ? { color: '#f59e0b' } : undefined}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditResource(record)} />
          </Tooltip>
          <Tooltip title={t('resources.delete')}>
            <Popconfirm
              title={t('resources.deleteConfirm')}
              onConfirm={() => handleDeleteResource(record._id)}
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

  const departmentColumns = [
    {
      title: t('resources.dept.name'),
      key: 'name',
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.name}</Text>
          {record.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '2px 0 0' }}>
              {record.description}
            </Paragraph>
          )}
        </div>
      ),
    },
    {
      title: t('resources.dept.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code) => code ? <Tag color="cyan">{code}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: t('resources.dept.manager'),
      dataIndex: 'managerName',
      key: 'managerName',
      render: (manager) => manager || <Text type="secondary">—</Text>,
    },
    {
      title: t('resources.dept.headcount'),
      dataIndex: 'resourceCount',
      key: 'resourceCount',
      render: (count = 0) => <Tag color="blue">{t('reports.peopleCount', { count })}</Tag>,
    },
    {
      title: t('common.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? t('resources.dept.active') : t('resources.dept.hidden')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.edit')}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditDepartment(record)} />
          </Tooltip>
          <Tooltip title={t('resources.dept.delete')}>
            <Popconfirm
              title={t('resources.dept.deleteConfirm')}
              description={t('resources.dept.deleteWarning')}
              onConfirm={() => handleDeleteDepartment(record._id)}
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
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>{t('resources.title')}</Title>
          <Text type="secondary">{t('resources.subtitle')}</Text>
        </div>
        {activeTab === 'resources' && (
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setCsvModalOpen(true)}>
              {t('projects.importCsv')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateResource} id="btn-create-resource">
              {t('resources.add')}
            </Button>
          </Space>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'resources',
            label: (
              <span>
                <TeamOutlined /> {t('nav.resources')} ({resources.length})
              </span>
            ),
            children: (
              <>
      {/* 4 Top Metric KPI Chips */}
      {activeTab === 'resources' && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-chip icon-chip-primary">
                <TeamOutlined />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('reports.stats.totalResources') || 'Tổng nhân sự'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                  {stats.total}
                </div>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-chip icon-chip-success">
                <UserOutlined />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('enums.availability.available') || 'Sẵn sàng'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }} className="tabular-nums">
                  {stats.available}
                </div>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-chip icon-chip-info">
                <ThunderboltOutlined />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('reports.avgUtilShort') || 'Utilization TB'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#06b6d4' }} className="tabular-nums">
                  {stats.avgUtil}%
                </div>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className={`icon-chip ${stats.overloaded > 0 ? 'icon-chip-danger' : 'icon-chip-primary'}`}>
                <WarningOutlined />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('resources.overloaded') || 'Quá tải'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, color: stats.overloaded > 0 ? '#ef4444' : isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                  {stats.overloaded}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

                {/* Filters */}
                <div className="saas-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
                  <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} md={10}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                        placeholder={t('resources.searchPlaceholder') || 'Tìm theo tên, vị trí nhân sự...'}
                        value={filters.search}
                        onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                        allowClear
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder={t('resources.allDepartments') || 'Tất cả phòng ban'}
                        value={filters.department || undefined}
                        onChange={(val) => setFilters((p) => ({ ...p, department: val || '' }))}
                        allowClear
                        options={activeDepartments.map((d) => ({ value: d.name, label: d.name }))}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder={t('resources.allStatuses') || 'Tất cả trạng thái'}
                        value={filters.availability || undefined}
                        onChange={(val) => setFilters((p) => ({ ...p, availability: val || '' }))}
                        allowClear
                        options={availabilityOptions()}
                      />
                    </Col>
                    <Col xs={24} md={2} style={{ textAlign: 'right' }}>
                      <Button icon={<ReloadOutlined />} onClick={loadResources} title={t('common.reload') || 'Tải lại'} />
                    </Col>
                  </Row>
                </div>

                {/* Table */}
                <div className="saas-card" style={{ overflow: 'hidden' }}>
                  <Table
                    columns={resourceColumns}
                    dataSource={resources}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (count) => t('resources.totalCount', { count }) || `Tổng số: ${count} nhân sự`,
                    }}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'departments',
            label: (
              <span>
                <ApartmentOutlined /> {t('resources.dept.tab')} ({departments.length})
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                {/* Department Form */}
                <Col xs={24} lg={8}>
                  <Card title={editingDepartment ? t('resources.dept.editTitle') : t('resources.dept.createTitle')}>
                    <Form
                      form={departmentForm}
                      layout="vertical"
                      onFinish={handleDepartmentSubmit}
                      initialValues={{ isActive: true }}
                    >
                      <Form.Item
                        name="name"
                        label={t('resources.dept.name')}
                        rules={[{ required: true, message: t('resources.dept.nameRequired') }]}
                      >
                        <Input placeholder={t('settings.departmentPlaceholder')} />
                      </Form.Item>

                      <Form.Item name="code" label={t('resources.dept.code')}>
                        <Input placeholder={t('resources.dept.codePlaceholder')} />
                      </Form.Item>

                      <Form.Item name="managerName" label={t('resources.dept.manager')}>
                        <Input placeholder={t('auth.namePlaceholder')} />
                      </Form.Item>

                      <Form.Item name="description" label={t('resources.dept.description')}>
                        <TextArea rows={3} placeholder={t('resources.dept.descriptionPlaceholder')} />
                      </Form.Item>

                      <Form.Item name="isActive" label={t('resources.dept.activeLabel')} valuePropName="checked">
                        <Switch
                          checkedChildren={t('resources.dept.active')}
                          unCheckedChildren={t('resources.dept.hidden')}
                        />
                      </Form.Item>

                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        {editingDepartment && (
                          <Button
                            onClick={() => {
                              setEditingDepartment(null);
                              departmentForm.resetFields();
                            }}
                          >
                            {t('resources.dept.cancelEdit')}
                          </Button>
                        )}
                        <Button type="primary" htmlType="submit" loading={submitting}>
                          {editingDepartment ? t('resources.dept.save') : t('resources.dept.add')}
                        </Button>
                      </Space>
                    </Form>
                  </Card>
                </Col>

                {/* Department List */}
                <Col xs={24} lg={16}>
                  <Card title={t('resources.dept.list')} styles={{ body: { padding: 0 } }}>
                    <Table
                      columns={departmentColumns}
                      dataSource={departments}
                      rowKey="_id"
                      pagination={false}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* 1. Modal Thêm / Chỉnh sửa hồ sơ nhân sự */}
      <ResourceFormModal
        open={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        editingResource={editingResource}
        form={resourceForm}
        onSubmit={handleResourceSubmit}
        submitting={submitting}
        activeDepartments={activeDepartments}
        t={t}
      />

      {/* 2. Modal Ma trận kỹ năng nhân sự */}
      <SkillsMatrixModal
        open={skillsModalOpen}
        onClose={() => setSkillsModalOpen(false)}
        resource={editingResource}
        skillLevelOptions={skillLevelOptions}
        onSubmit={handleSkillsSubmit}
        submitting={submitting}
        t={t}
      />

      {/* 3. Modal Lịch nghỉ phép / vắng mặt (Ràng buộc H3 CSP) */}
      <ResourceLeaveModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        resource={editingResource}
        onSubmit={handleLeaveSubmit}
        submitting={submitting}
        t={t}
      />

      {/* 4. Modal Nhập danh sách nhân sự từ CSV */}
      <CsvImportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        content={csvContent}
        setContent={setCsvContent}
        onImport={handleImportCSV}
        submitting={submitting}
        t={t}
      />
    </div>
  );
}
