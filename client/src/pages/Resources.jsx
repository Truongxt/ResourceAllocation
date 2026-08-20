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
import resourceService from '../services/resourceService';
import departmentService from '../services/departmentService';
import { AVAILABILITY_OPTIONS, ROLES } from '../constants';
import {
  availabilityLabel,
  availabilityOptions,
  requiredSkillLevelOptions,
} from '../i18n/enums';
import { formatNumber } from '../i18n/format';

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
                {/* Stats Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic title={t('reports.stats.totalResources')} value={stats.total} prefix={<TeamOutlined style={{ color: '#6366f1' }} />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic title={t('enums.availability.available')} value={stats.available} prefix={<UserOutlined style={{ color: '#10b981' }} />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic title={t('reports.avgUtilShort')} value={stats.avgUtil} suffix="%" />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic
                        title={t('resources.overloaded')}
                        value={stats.overloaded}
                        valueStyle={{ color: stats.overloaded > 0 ? '#ef4444' : '#10b981' }}
                        prefix={<WarningOutlined style={{ color: stats.overloaded > 0 ? '#ef4444' : '#10b981' }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Filters */}
                <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={10}>
                      <Input
                        prefix={<SearchOutlined />}
                        placeholder={t('resources.searchPlaceholder')}
                        value={filters.search}
                        onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                        allowClear
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder={t('resources.allDepartments')}
                        value={filters.department || undefined}
                        onChange={(val) => setFilters((p) => ({ ...p, department: val || '' }))}
                        allowClear
                        options={activeDepartments.map((d) => ({ value: d.name, label: d.name }))}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder={t('resources.allStatuses')}
                        value={filters.availability || undefined}
                        onChange={(val) => setFilters((p) => ({ ...p, availability: val || '' }))}
                        allowClear
                        options={availabilityOptions()}
                      />
                    </Col>
                    <Col xs={24} md={2} style={{ textAlign: 'right' }}>
                      <Button icon={<ReloadOutlined />} onClick={loadResources} title={t('common.reload')} />
                    </Col>
                  </Row>
                </Card>

                {/* Table */}
                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    columns={resourceColumns}
                    dataSource={resources}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (count) => t('resources.totalCount', { count }),
                    }}
                  />
                </Card>
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

      {/* Resource Modal */}
      <Modal
        title={editingResource ? t('resources.editTitle') : t('resources.createTitle')}
        open={resourceModalOpen}
        onCancel={() => setResourceModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={resourceForm} layout="vertical" onFinish={handleResourceSubmit} style={{ marginTop: 16 }}>
          {!editingResource && (
            <Card title={t('resources.account')} size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="newUserName"
                    label={t('auth.name')}
                    rules={[{ required: true, message: t('auth.required.name') }]}
                  >
                    <Input placeholder={t('auth.namePlaceholder')} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="newUserEmail"
                    label={t('settings.loginEmail')}
                    rules={[
                      { required: true, message: t('auth.required.email') },
                      { type: 'email', message: t('auth.required.emailInvalid') },
                    ]}
                  >
                    <Input placeholder="user@rao.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="newUserPassword"
                    label={t('resources.initialPassword')}
                    rules={[{ required: true, min: 6, message: t('settings.minChars') }]}
                  >
                    <Input.Password placeholder="••••••••" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="newUserRole" label={t('projectDetail.role')}>
                    <Select
                      options={[
                        { value: ROLES.MEMBER, label: t('enums.role.member') },
                        { value: ROLES.PM, label: t('enums.role.project_manager') },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position"
                label={t('resources.position')}
                rules={[{ required: true, message: t('resources.positionRequired') }]}
              >
                <Input placeholder={t('resources.positionPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label={t('reports.columns.department')}
                rules={[{ required: true, message: t('resources.deptRequired') }]}
              >
                <Select
                  placeholder={t('resources.pickDepartment')}
                  options={activeDepartments.map((d) => ({ value: d.name, label: d.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="maxCapacity" label={t('resources.capacityLabel')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fte" label="FTE (0-1)">
                <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hourlyRate" label={t('resources.hourlyRateLabel')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setResourceModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingResource ? t('common.saveChanges') : t('resources.add')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Skill Matrix Modal */}
      <Modal
        title={`Skill Matrix — ${editingResource?.user?.name || editingResource?.position}`}
        open={skillsModalOpen}
        onCancel={() => setSkillsModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={skillsForm} layout="vertical" onFinish={handleSkillsSubmit} style={{ marginTop: 16 }}>
          <Form.List name="skills">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: t('tasks.form.skillNameRequired') }]}
                      style={{ width: 180 }}
                    >
                      <Input placeholder={t('tasks.form.skillNamePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'level']}
                      rules={[{ required: true }]}
                      style={{ width: 190 }}
                    >
                      <Select options={skillLevelOptions} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'yearsOfExperience']}
                      style={{ width: 100 }}
                    >
                      <InputNumber
                        min={0}
                        placeholder={t('resources.yearsShort')}
                        addonAfter={t('resources.yearsUnit')}
                      />
                    </Form.Item>

                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    {t('resources.addSkill')}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setSkillsModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {t('resources.saveMatrix')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Lịch nghỉ / Unavailable Periods */}
      <Modal
        title={`${t('resources.leaveTitle')} — ${editingResource?.user?.name || editingResource?.position}`}
        open={leaveModalOpen}
        onCancel={() => setLeaveModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message={t('resources.leaveNotice.title')}
          description={t('resources.leaveNotice.body')}
        />

        <Form form={leaveForm} layout="vertical" onFinish={handleLeaveSubmit} style={{ marginTop: 16 }}>
          <Form.List name="periods">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'range']}
                      rules={[{ required: true, message: t('resources.leaveRangeRequired') }]}
                      style={{ width: 280, marginBottom: 0 }}
                    >
                      <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'reason']}
                      style={{ width: 240, marginBottom: 0 }}
                    >
                      <Input placeholder={t('resources.leaveReasonPlaceholder')} maxLength={200} />
                    </Form.Item>

                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                  </Space>
                ))}
                <Form.Item style={{ marginTop: 12 }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    {t('resources.addLeave')}
                  </Button>
                </Form.Item>
                {fields.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('resources.noLeave')}
                  </Text>
                )}
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setLeaveModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {t('resources.saveLeave')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title={t('resources.csvTitle')}
        open={csvModalOpen}
        onCancel={() => setCsvModalOpen(false)}
        onOk={handleImportCSV}
        confirmLoading={submitting}
        okText={t('projects.csvStart')}
        cancelText={t('common.cancel')}
        width={600}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          {t('projects.csvFormat')} <code>{t('resources.csvColumns')}</code>
        </Paragraph>
        <TextArea
          rows={8}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder={t('resources.csvExample')}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  );
}
