import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { AVAILABILITY_OPTIONS, ROLES, SKILL_LEVEL_LABELS } from '../constants';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Thang level của Resource là enum 1-4 ở schema; nhãn lấy từ constants để trang này
// và ô chọn kỹ năng yêu cầu trong form Task không bao giờ nói hai kiểu khác nhau.
const SKILL_LEVELS = Object.entries(SKILL_LEVEL_LABELS).map(([value, label]) => ({
  value: Number(value),
  label: `${label} (Lv.${value})`,
}));

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

  // Load resources & departments
  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await resourceService.getAll(params);
      setResources(res.data.data.resources || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách nhân sự');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.data.departments || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách phòng ban');
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const t = setTimeout(loadResources, filters.search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadResources, filters.department, filters.availability]);

  const activeDepartments = useMemo(() => departments.filter((d) => d.isActive), [departments]);

  const stats = useMemo(() => {
    const total = resources.length;
    const available = resources.filter((r) => r.availability === 'available').length;
    const overloaded = resources.filter((r) => r.isOverloaded).length;
    const avgUtil =
      total > 0 ? Math.round(resources.reduce((s, r) => s + (r.utilizationRate || 0), 0) / total) : 0;
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
      message.success('Cập nhật lịch nghỉ thành công');
      setLeaveModalOpen(false);
      await loadResources();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật lịch nghỉ');
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
        message.success('Cập nhật nhân sự thành công');
      } else {
        payload.newUser = {
          name: values.newUserName,
          email: values.newUserEmail,
          password: values.newUserPassword,
          role: values.newUserRole,
        };
        await resourceService.create(payload);
        message.success('Thêm nhân sự và tạo tài khoản thành công');
      }
      setResourceModalOpen(false);
      await loadResources();
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu nhân sự');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillsSubmit = async (values) => {
    if (!editingResource) return;
    setSubmitting(true);
    try {
      await resourceService.updateSkills(editingResource._id, values.skills || []);
      message.success('Cập nhật Skill Matrix thành công');
      setSkillsModalOpen(false);
      await loadResources();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật kỹ năng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (id) => {
    try {
      await resourceService.remove(id);
      message.success('Xóa nhân sự thành công');
      await loadResources();
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa nhân sự');
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
        message.success('Cập nhật phòng ban thành công');
      } else {
        await departmentService.create(payload);
        message.success('Thêm phòng ban mới thành công');
      }
      departmentForm.resetFields();
      setEditingDepartment(null);
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể lưu phòng ban');
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
      message.success('Xóa phòng ban thành công');
      await loadDepartments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa phòng ban');
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      message.warning('Vui lòng nhập dữ liệu CSV');
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

    message.success(`Đã nhập thành công ${count} nhân sự từ CSV`);
    setSubmitting(false);
    setCsvModalOpen(false);
    setCsvContent('');
    await loadResources();
    await loadDepartments();
  };

  const resourceColumns = [
    {
      title: 'Nhân sự',
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
            <Text strong style={{ fontSize: 14 }}>{record.user?.name || 'Chưa gán user'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.position}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      render: (dept) => dept ? <Tag color="blue">{dept}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'availability',
      key: 'availability',
      render: (avail, record) => {
        const opt = AVAILABILITY_OPTIONS.find((a) => a.value === avail) || { label: avail, color: 'default' };
        const now = currentLeave(record);
        const next = nextLeave(record);
        return (
          <Space direction="vertical" size={2}>
            <Tag color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
            {now && (
              <Tooltip title={now.reason || 'Không ghi lý do'}>
                <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
                  Đang nghỉ tới {dayjs(now.endDate).format('DD/MM')}
                </Tag>
              </Tooltip>
            )}
            {!now && next && (
              <Tooltip title={next.reason || 'Không ghi lý do'}>
                <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
                  Nghỉ từ {dayjs(next.startDate).format('DD/MM')}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Công suất (Workload)',
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
              Matrix ({skills.length})
            </Button>
          </Space>
        );
      },
    },
    {
      title: 'FTE / Lương (h)',
      key: 'rate',
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          FTE: {record.fte || 1} • {record.hourlyRate ? `${record.hourlyRate.toLocaleString('vi-VN')} đ/h` : '—'}
        </Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={`Lịch nghỉ (${(record.unavailablePeriods || []).length} kỳ)`}>
            <Button
              type="text"
              icon={<CalendarOutlined />}
              onClick={() => openLeaveModal(record)}
              style={(record.unavailablePeriods || []).length ? { color: '#f59e0b' } : undefined}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa thông tin">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditResource(record)} />
          </Tooltip>
          <Tooltip title="Xóa nhân sự">
            <Popconfirm
              title="Xác nhận xóa nhân sự?"
              onConfirm={() => handleDeleteResource(record._id)}
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

  const departmentColumns = [
    {
      title: 'Tên phòng ban',
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
      title: 'Mã phòng ban',
      dataIndex: 'code',
      key: 'code',
      render: (code) => code ? <Tag color="cyan">{code}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Người quản lý',
      dataIndex: 'managerName',
      key: 'managerName',
      render: (manager) => manager || <Text type="secondary">—</Text>,
    },
    {
      title: 'Số nhân sự',
      dataIndex: 'resourceCount',
      key: 'resourceCount',
      render: (count = 0) => <Tag color="blue">{count} nhân sự</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>{active ? 'Hoạt động' : 'Tạm ẩn'}</Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditDepartment(record)} />
          </Tooltip>
          <Tooltip title="Xóa phòng ban">
            <Popconfirm
              title="Xác nhận xóa phòng ban?"
              description="Không thể xóa phòng ban nếu vẫn còn nhân sự."
              onConfirm={() => handleDeleteDepartment(record._id)}
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
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Quản lý Nhân sự & Phòng ban</Title>
          <Text type="secondary">Quản lý đội ngũ nhân sự, ma trận kỹ năng và phân bổ phòng ban</Text>
        </div>
        {activeTab === 'resources' && (
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setCsvModalOpen(true)}>
              Nhập CSV
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateResource} id="btn-create-resource">
              Thêm nhân sự
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
                <TeamOutlined /> Nhân sự ({resources.length})
              </span>
            ),
            children: (
              <>
                {/* Stats Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic title="Tổng nhân sự" value={stats.total} prefix={<TeamOutlined style={{ color: '#6366f1' }} />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic title="Sẵn sàng" value={stats.available} prefix={<UserOutlined style={{ color: '#10b981' }} />} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic title="Utilization TB" value={stats.avgUtil} suffix="%" />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable>
                      <Statistic
                        title="Quá tải"
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
                        placeholder="Tìm theo tên, vị trí nhân sự..."
                        value={filters.search}
                        onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                        allowClear
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Tất cả phòng ban"
                        value={filters.department || undefined}
                        onChange={(val) => setFilters((p) => ({ ...p, department: val || '' }))}
                        allowClear
                        options={activeDepartments.map((d) => ({ value: d.name, label: d.name }))}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Tất cả trạng thái"
                        value={filters.availability || undefined}
                        onChange={(val) => setFilters((p) => ({ ...p, availability: val || '' }))}
                        allowClear
                        options={AVAILABILITY_OPTIONS}
                      />
                    </Col>
                    <Col xs={24} md={2} style={{ textAlign: 'right' }}>
                      <Button icon={<ReloadOutlined />} onClick={loadResources} title="Tải lại" />
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
                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng số ${total} nhân sự` }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'departments',
            label: (
              <span>
                <ApartmentOutlined /> Phòng ban ({departments.length})
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                {/* Department Form */}
                <Col xs={24} lg={8}>
                  <Card title={editingDepartment ? 'Cập nhật phòng ban' : 'Thêm phòng ban mới'}>
                    <Form
                      form={departmentForm}
                      layout="vertical"
                      onFinish={handleDepartmentSubmit}
                      initialValues={{ isActive: true }}
                    >
                      <Form.Item
                        name="name"
                        label="Tên phòng ban"
                        rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban' }]}
                      >
                        <Input placeholder="Ví dụ: Engineering, Design, QA" />
                      </Form.Item>

                      <Form.Item name="code" label="Mã phòng ban">
                        <Input placeholder="Ví dụ: ENG, DES, QA" />
                      </Form.Item>

                      <Form.Item name="managerName" label="Trưởng phòng (Quản lý)">
                        <Input placeholder="Ví dụ: Nguyễn Văn A" />
                      </Form.Item>

                      <Form.Item name="description" label="Mô tả chức năng">
                        <TextArea rows={3} placeholder="Phạm vi công việc của phòng ban..." />
                      </Form.Item>

                      <Form.Item name="isActive" label="Trạng thái hoạt động" valuePropName="checked">
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm ẩn" />
                      </Form.Item>

                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        {editingDepartment && (
                          <Button
                            onClick={() => {
                              setEditingDepartment(null);
                              departmentForm.resetFields();
                            }}
                          >
                            Hủy sửa
                          </Button>
                        )}
                        <Button type="primary" htmlType="submit" loading={submitting}>
                          {editingDepartment ? 'Lưu phòng ban' : 'Thêm phòng ban'}
                        </Button>
                      </Space>
                    </Form>
                  </Card>
                </Col>

                {/* Department List */}
                <Col xs={24} lg={16}>
                  <Card title="Danh sách phòng ban" styles={{ body: { padding: 0 } }}>
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
        title={editingResource ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}
        open={resourceModalOpen}
        onCancel={() => setResourceModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={resourceForm} layout="vertical" onFinish={handleResourceSubmit} style={{ marginTop: 16 }}>
          {!editingResource && (
            <Card title="Tài khoản đăng nhập" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="newUserName"
                    label="Họ và tên"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                  >
                    <Input placeholder="Nguyễn Văn A" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="newUserEmail"
                    label="Email đăng nhập"
                    rules={[
                      { required: true, message: 'Vui lòng nhập email' },
                      { type: 'email', message: 'Email không hợp lệ' },
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
                    label="Mật khẩu khởi tạo"
                    rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}
                  >
                    <Input.Password placeholder="••••••••" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="newUserRole" label="Vai trò">
                    <Select
                      options={[
                        { value: ROLES.MEMBER, label: 'Thành viên (Member)' },
                        { value: ROLES.PM, label: 'Project Manager' },
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
                label="Vị trí chuyên môn"
                rules={[{ required: true, message: 'Vui lòng nhập vị trí' }]}
              >
                <Input placeholder="VD: Senior React Developer" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="Phòng ban"
                rules={[{ required: true, message: 'Vui lòng chọn phòng ban' }]}
              >
                <Select
                  placeholder="Chọn phòng ban"
                  options={activeDepartments.map((d) => ({ value: d.name, label: d.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="maxCapacity" label="Capacity (h/tuần)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fte" label="FTE (0-1)">
                <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hourlyRate" label="Lương/giờ (VND)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setResourceModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingResource ? 'Lưu thay đổi' : 'Thêm nhân sự'}
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
                      rules={[{ required: true, message: 'Nhập tên kỹ năng' }]}
                      style={{ width: 180 }}
                    >
                      <Input placeholder="Tên kỹ năng (VD: React)" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'level']}
                      rules={[{ required: true }]}
                      style={{ width: 190 }}
                    >
                      <Select options={SKILL_LEVELS} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'yearsOfExperience']}
                      style={{ width: 100 }}
                    >
                      <InputNumber min={0} placeholder="Năm KN" addonAfter="năm" />
                    </Form.Item>

                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Thêm kỹ năng
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setSkillsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Lưu Skill Matrix
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Lịch nghỉ / Unavailable Periods */}
      <Modal
        title={`Lịch nghỉ — ${editingResource?.user?.name || editingResource?.position}`}
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
          message="Lịch nghỉ ảnh hưởng trực tiếp tới kết quả tối ưu hóa"
          description="CSP Solver loại nhân sự khỏi những công việc có thời gian giao với kỳ nghỉ (ràng buộc H3). Các kỳ nghỉ không được chồng lên nhau."
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
                      rules={[{ required: true, message: 'Chọn khoảng thời gian nghỉ' }]}
                      style={{ width: 280, marginBottom: 0 }}
                    >
                      <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'reason']}
                      style={{ width: 240, marginBottom: 0 }}
                    >
                      <Input placeholder="Lý do (nghỉ phép, công tác…)" maxLength={200} />
                    </Form.Item>

                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                  </Space>
                ))}
                <Form.Item style={{ marginTop: 12 }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Thêm kỳ nghỉ
                  </Button>
                </Form.Item>
                {fields.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Chưa có kỳ nghỉ nào — nhân sự này khả dụng trong toàn bộ thời gian.
                  </Text>
                )}
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setLeaveModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Lưu lịch nghỉ
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title="Nhập nhân sự từ file CSV"
        open={csvModalOpen}
        onCancel={() => setCsvModalOpen(false)}
        onOk={handleImportCSV}
        confirmLoading={submitting}
        okText="Bắt đầu nhập"
        cancelText="Hủy"
        width={600}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          Định dạng: <code>Họ tên, Email, Mật khẩu, Vị trí, Phòng ban, FTE, Max Capacity, Lương theo giờ</code>
        </Paragraph>
        <TextArea
          rows={8}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder={`Nguyễn Văn A, vana@rao.com, password123, Senior React Dev, Engineering, 1, 40, 250000\nTrần Thị B, thib@rao.com, password123, QA Engineer, QA, 1, 40, 180000`}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  );
}
