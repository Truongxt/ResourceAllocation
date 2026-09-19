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
  Tabs,
  Avatar,
  Badge,
  Collapse,
  Radio,
  Divider,
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
  ApartmentOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  EyeOutlined,
  CrownOutlined,
  FolderOutlined,
  BgColorsOutlined,
  GlobalOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import projectService from '../../services/projectService';
import departmentService from '../../services/departmentService';
import companySettingService from '../../services/companySettingService';
import authService from '../../services/authService';
import DepartmentModal from '../../components/departments/DepartmentModal';
import QuickEditProjectModal from '../../components/projects/QuickEditProjectModal';
import { PROJECT_STATUSES, PRIORITY_OPTIONS } from '../../constants';
import {
  projectStatusLabel,
  projectStatusOptions,
  priorityLabel,
  priorityOptions,
} from '../../i18n/enums';
import { formatCurrency } from '../../i18n/format';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './Projects.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const BASE_PROJECT_COLORS = [
  { label: 'Tím Indigo', value: '#6366f1' },
  { label: 'Xanh ngọc (Cyan)', value: '#06b6d4' },
  { label: 'Xanh dương', value: '#3b82f6' },
  { label: 'Tím hoa cà', value: '#8b5cf6' },
  { label: 'Xanh ngọc lục', value: '#10b981' },
  { label: 'Vàng hổ phách', value: '#f59e0b' },
  { label: 'Cam san hô', value: '#f97316' },
  { label: 'Hồng Rose', value: '#f43f5e' },
];

export default function Projects() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab State: 'projects' | 'departments'
  const [activeTab, setActiveTab] = useState('projects');

  // Projects State
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', department: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [csvContent, setCsvContent] = useState('');
  const [form] = Form.useForm();

  // Quick Edit Modal State
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [selectedQuickProject, setSelectedQuickProject] = useState(null);

  // Departments State
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [companySettings, setCompanySettings] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);

  useEffect(() => {
    companySettingService
      .getSettings()
      .then((res) => {
        if (res.data?.data?.settings) setCompanySettings(res.data.data.settings);
      })
      .catch(() => {});

    authService
      .getCompanyManagers()
      .then((res) => {
        if (res.data?.managers) setCompanyUsers(res.data.managers);
      })
      .catch(() => {});
  }, []);

  const isSystemAdmin = user?.role === 'admin' || Boolean(user?.isOwner);
  const isWeworkAdmin = Boolean(user?.appAdmins?.includes('work'));
  const isPM = user?.role === 'project_manager';

  const canCreateDepartment =
    isSystemAdmin ||
    isWeworkAdmin ||
    companySettings?.createDepartmentPermission === 'all_members';

  const canCreateProject =
    isSystemAdmin ||
    isWeworkAdmin ||
    isPM ||
    companySettings?.createProjectPermission === 'all_members';

  const canManageDepartment = canCreateDepartment;

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

  const loadDepartments = async () => {
    setLoadingDepts(true);
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.data?.departments || res.data?.departments || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingDepts(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadProjects, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.priority, filters.department]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === 'in_progress').length;
    const completed = projects.filter((project) => project.status === 'completed').length;
    return { total, active, completed };
  }, [projects]);

  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const q = deptSearch.toLowerCase();
    return departments.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [departments, deptSearch]);

  const openCreate = () => {
    setEditingProject(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      code: '',
      department: filters.department && filters.department !== 'unassigned' ? filters.department : null,
      manager: user?._id || undefined,
      members: user?._id ? [user._id] : [],
      projectType: 'internal',
      template: 'blank',
      color: '#6366f1',
      status: 'planning',
      priority: 'medium',
      budget: 0,
      description: '',
      tags: '',
    });
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name || '',
      code: project.code || '',
      description: project.description || '',
      department: project.department?._id || project.department || null,
      manager: project.manager?._id || project.manager || undefined,
      members: Array.isArray(project.members)
        ? project.members.map((m) => m.user?._id || m.user || m).filter(Boolean)
        : [],
      projectType: project.projectType || 'internal',
      template: project.template || 'blank',
      color: project.color || '#6366f1',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      dateRange: project.startDate && project.endDate ? [dayjs(project.startDate), dayjs(project.endDate)] : undefined,
      budget: project.budget || 0,
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
    });
    setModalOpen(true);
  };

  const openQuickEdit = (project) => {
    setSelectedQuickProject(project);
    setQuickEditOpen(true);
  };

  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        code: values.code || undefined,
        description: values.description,
        department: values.department || null,
        manager: values.manager || undefined,
        members: Array.isArray(values.members) ? values.members : [],
        projectType: values.projectType || 'internal',
        template: values.template === 'blank' ? null : values.template,
        color: values.color || '#6366f1',
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
      await loadDepartments();
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
      await loadDepartments();
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.deleteFailed') || 'Lỗi khi xóa dự án');
    }
  };

  const handleDeleteDepartment = async (id) => {
    try {
      await departmentService.remove(id);
      message.success('Đã xóa Department thành công');
      await loadDepartments();
      await loadProjects();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa Department');
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

    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length < 1 || !parts[0]) continue;

      const [name, code, description, status, priority, budget, startDate, endDate] = parts;
      try {
        await projectService.create({
          name,
          code: code || undefined,
          description: description || '',
          status: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'].includes(status) ? status : 'planning',
          priority: ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium',
          budget: Number(budget) || 0,
          startDate: startDate || today,
          endDate: endDate || nextMonth,
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

  // Table Columns for Projects
  const columns = [
    {
      title: t('common.project') || 'Dự án',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: record.color || '#6366f1',
                boxShadow: `0 0 6px ${(record.color || '#6366f1')}60`,
              }}
              title={`Màu nhận diện: ${record.color || '#6366f1'}`}
            />
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontSize: 14, fontWeight: 700, color: isDark ? '#a5b4fc' : '#4f46e5' }}
              onClick={() => navigate(`/projects/${record._id}`)}
            >
              {text}
            </Button>
            {record.projectType === 'client' ? (
              <Tag color="orange" style={{ borderRadius: 10, fontSize: 10, fontWeight: 600, margin: 0 }}>
                <GlobalOutlined style={{ marginRight: 3 }} /> Khách hàng
              </Tag>
            ) : (
              <Tag color="blue" style={{ borderRadius: 10, fontSize: 10, fontWeight: 600, margin: 0 }}>
                <TeamOutlined style={{ marginRight: 3 }} /> Nội bộ
              </Tag>
            )}
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
            {record.department && (
              <Tag
                style={{
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: `${record.department.color || '#6366f1'}20`,
                  color: record.department.color || '#6366f1',
                  fontWeight: 600,
                  fontSize: 11,
                  margin: 0,
                }}
              >
                <ApartmentOutlined style={{ marginRight: 4 }} />
                {record.department.name}
              </Tag>
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
      title: 'Quản trị (PM)',
      dataIndex: 'manager',
      key: 'manager',
      width: 170,
      render: (pm) =>
        pm ? (
          <Space size={6}>
            <Avatar size={22} src={pm.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{pm.name || pm.email}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{pm.jobTitle || pm.role}</div>
            </div>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>— Chưa gán —</Text>
        ),
    },
    {
      title: 'Thành viên',
      dataIndex: 'members',
      key: 'members',
      width: 130,
      render: (members = []) => {
        if (!members || members.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        return (
          <Avatar.Group maxCount={3} size="small">
            {members.map((m, idx) => (
              <Tooltip title={m.user?.name || m.user?.email || 'Thành viên'} key={m.user?._id || idx}>
                <Avatar src={m.user?.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
              </Tooltip>
            ))}
          </Avatar.Group>
        );
      },
    },
    {
      title: 'Phân nhóm Department',
      dataIndex: 'department',
      key: 'department',
      width: 170,
      render: (dept) =>
        dept ? (
          <Tag
            style={{
              borderRadius: 10,
              border: 'none',
              backgroundColor: `${dept.color || '#6366f1'}20`,
              color: dept.color || '#6366f1',
              fontWeight: 600,
            }}
          >
            <ApartmentOutlined style={{ marginRight: 4 }} />
            {dept.name}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>— Chưa phân nhóm —</Text>
        ),
    },
    {
      title: t('common.status') || 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const option = PROJECT_STATUSES.find((o) => o.value === status);
        return <Tag color={option?.color || 'default'} style={{ borderRadius: 10 }}>{projectStatusLabel(status)}</Tag>;
      },
    },
    {
      title: t('common.priority') || 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (priority) => {
        const option = PRIORITY_OPTIONS.find((o) => o.value === priority);
        return <Tag color={option?.color || 'default'} style={{ borderRadius: 10 }}>{priorityLabel(priority)}</Tag>;
      },
    },
    {
      title: t('gantt.progress') || 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} strokeColor="#6366f1" />
      ),
    },
    {
      title: t('projects.budget') || 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      width: 130,
      render: (budget) => <Text strong className="tabular-nums">{formatCurrency(budget)}</Text>,
    },
    {
      title: t('gantt.period') || 'Thời gian',
      key: 'dates',
      width: 170,
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
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa nhanh (Base Wework)">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#6366f1' }} />}
              onClick={() => openQuickEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.edit') || 'Chỉnh sửa toàn bộ'}>
            <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => openEdit(record)} />
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

  // Table Columns for Departments
  const deptColumns = [
    {
      title: 'Tên Department / Phân nhóm',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space align="center" size={10}>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: record.color || '#6366f1',
              boxShadow: `0 0 8px ${record.color || '#6366f1'}60`,
            }}
          />
          <div>
            <Text strong style={{ fontSize: 14 }}>{text}</Text>
            {record.code && (
              <Tag color="purple" style={{ marginLeft: 8, borderRadius: 4, fontSize: 11 }}>
                {record.code}
              </Tag>
            )}
            {record.description && (
              <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '2px 0 0' }}>
                {record.description}
              </Paragraph>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Quản lý Department',
      dataIndex: 'managers',
      key: 'managers',
      width: 240,
      render: (managers = [], record) => {
        if (!managers || managers.length === 0) {
          return record.managerName ? (
            <Text type="secondary">{record.managerName}</Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>Chưa thiết lập</Text>
          );
        }
        return (
          <Space wrap size={4}>
            {managers.map((m) => (
              <Tag key={m._id || m} style={{ borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Avatar size={18} src={m.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                <span>{m.name || m.email}</span>
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Dự án trực thuộc',
      dataIndex: 'projectCount',
      key: 'projectCount',
      width: 150,
      align: 'center',
      render: (count = 0, record) => (
        <Tooltip title={`Bấm để xem ${count} dự án thuộc ${record.name}`}>
          <Button
            type="dashed"
            size="small"
            style={{ borderRadius: 12, fontWeight: 700, color: '#6366f1' }}
            onClick={() => {
              setFilters((prev) => ({ ...prev, department: record._id }));
              setActiveTab('projects');
            }}
          >
            <ProjectOutlined /> {count} dự án
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Nhân sự',
      dataIndex: 'resourceCount',
      key: 'resourceCount',
      width: 120,
      align: 'center',
      render: (count = 0) => (
        <Tag color="blue" style={{ borderRadius: 10, fontWeight: 600 }}>
          <TeamOutlined /> {count} nhân sự
        </Tag>
      ),
    },
    {
      title: t('common.actions') || 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem các dự án trong Department">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#06b6d4' }} />}
              onClick={() => {
                setFilters((prev) => ({ ...prev, department: record._id }));
                setActiveTab('projects');
              }}
            />
          </Tooltip>
          {canManageDepartment && (
            <>
              <Tooltip title="Chỉnh sửa Department">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#6366f1' }} />}
                  onClick={() => {
                    setEditingDepartment(record);
                    setDeptModalOpen(true);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="Xác nhận xóa Department?"
                description="Các dự án thuộc Department này sẽ được chuyển về Chưa phân nhóm."
                onConfirm={() => handleDeleteDepartment(record._id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {activeTab === 'projects' ? (t('pageTitle./projects') || 'Dự án & Phòng ban') : 'Phòng ban (Departments)'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {activeTab === 'projects'
              ? 'Quản lý danh sách dự án, phân nhóm theo Department và theo dõi tiến độ công việc'
              : 'Quản lý các khối, phòng ban cấp cha và các dự án trực thuộc theo chuẩn Base Wework'}
          </Text>
        </div>

        <Space size="small" wrap>
          {activeTab === 'projects' && (
            <>
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
            </>
          )}

          {/* Nút Tạo Department chuẩn Base Wework - xuất hiện ở cả 2 nơi */}
          {canManageDepartment && (
            <Button
              icon={<ApartmentOutlined />}
              onClick={() => {
                setEditingDepartment(null);
                setDeptModalOpen(true);
              }}
              style={{
                borderColor: '#6366f1',
                color: '#6366f1',
                fontWeight: 600,
              }}
            >
              Tạo Department
            </Button>
          )}

          {activeTab === 'projects' && canCreateProject && (
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
          )}
        </Space>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'projects',
            label: (
              <span style={{ fontWeight: 600 }}>
                <ProjectOutlined style={{ marginRight: 6 }} />
                Dự án & phòng ban ({projects.length})
              </span>
            ),
          },
          {
            key: 'departments',
            label: (
              <span style={{ fontWeight: 600 }}>
                <ApartmentOutlined style={{ marginRight: 6 }} />
                Phòng ban (Departments) ({departments.length})
              </span>
            ),
          },
        ]}
      />

      {/* TAB 1: DỰ ÁN & PHÒNG BAN */}
      {activeTab === 'projects' && (
        <>
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
              <Col xs={24} md={8}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                  placeholder={t('projects.searchPlaceholder') || 'Tìm theo tên, mã hoặc mô tả...'}
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  allowClear
                />
              </Col>
              <Col xs={12} md={5}>
                {/* Bộ lọc Phân nhóm Department */}
                <Select
                  style={{ width: '100%' }}
                  placeholder="Tất cả Department"
                  value={filters.department || undefined}
                  onChange={(val) => setFilters((p) => ({ ...p, department: val || '' }))}
                  allowClear
                  options={[
                    { value: '', label: 'Tất cả Department' },
                    { value: 'unassigned', label: '— Chưa phân nhóm —' },
                    ...departments.map((d) => ({
                      value: d._id,
                      label: (
                        <Space>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: d.color || '#6366f1',
                            }}
                          />
                          <span>{d.name}</span>
                        </Space>
                      ),
                    })),
                  ]}
                />
              </Col>
              <Col xs={12} md={5}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('common.status') || 'Tất cả trạng thái'}
                  value={filters.status || undefined}
                  onChange={(val) => setFilters((p) => ({ ...p, status: val || '' }))}
                  allowClear
                  options={projectStatusOptions()}
                />
              </Col>
              <Col xs={12} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('common.priority') || 'Tất cả độ ưu tiên'}
                  value={filters.priority || undefined}
                  onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
                  allowClear
                  options={priorityOptions()}
                />
              </Col>
              <Col xs={12} md={2} style={{ textAlign: 'right' }}>
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
                          borderLeft: `4px solid ${proj.color || '#6366f1'}`,
                        }}
                      >
                        <div>
                          {/* Top Header Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {proj.projectType === 'client' ? (
                                <Tag color="orange" style={{ borderRadius: 10, margin: 0, fontSize: 11, fontWeight: 600 }}>
                                  <GlobalOutlined style={{ marginRight: 4 }} />
                                  Khách hàng
                                </Tag>
                              ) : (
                                <Tag color="blue" style={{ borderRadius: 10, margin: 0, fontSize: 11, fontWeight: 600 }}>
                                  <TeamOutlined style={{ marginRight: 4 }} />
                                  Nội bộ
                                </Tag>
                              )}
                              {proj.department && (
                                <Tag
                                  style={{
                                    borderRadius: 10,
                                    margin: 0,
                                    fontSize: 11,
                                    border: 'none',
                                    backgroundColor: `${proj.department.color || '#6366f1'}20`,
                                    color: proj.department.color || '#6366f1',
                                    fontWeight: 600,
                                  }}
                                >
                                  <ApartmentOutlined style={{ marginRight: 4 }} />
                                  {proj.department.name}
                                </Tag>
                              )}
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
                              style={{ fontSize: 12, minHeight: 36, marginBottom: 12 }}
                            >
                              {proj.description || t('projects.noDescription') || 'Chưa có mô tả dự án.'}
                            </Paragraph>
                          </div>

                          {/* PM & Members Row */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                              marginBottom: 14,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CrownOutlined style={{ color: '#f59e0b', fontSize: 13 }} />
                              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>PM:</Text>
                              <Avatar size={20} src={proj.manager?.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                              <Text strong style={{ fontSize: 12 }}>
                                {proj.manager?.name || 'Chưa gán'}
                              </Text>
                            </div>

                            {proj.members?.length > 0 && (
                              <Avatar.Group maxCount={3} size={20}>
                                {proj.members.map((m, idx) => (
                                  <Tooltip title={m.user?.name || m.user?.email || 'Thành viên'} key={m.user?._id || idx}>
                                    <Avatar src={m.user?.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                                  </Tooltip>
                                ))}
                              </Avatar.Group>
                            )}
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
                              strokeColor={progressVal === 100 ? '#10b981' : (proj.color || '#6366f1')}
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
                            <Tooltip title="Chỉnh sửa nhanh (Base Wework)">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined style={{ color: '#6366f1' }} />}
                                onClick={() => openQuickEdit(proj)}
                              />
                            </Tooltip>
                            <Tooltip title={t('common.edit') || 'Chỉnh sửa toàn bộ'}>
                              <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => openEdit(proj)} />
                            </Tooltip>
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
        </>
      )}

      {/* TAB 2: PHÒNG BAN (DEPARTMENTS) */}
      {activeTab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Department Search bar */}
          <div className="saas-card" style={{ padding: '14px 18px' }}>
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              <Col xs={24} sm={12} md={8}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                  placeholder="Tìm kiếm Department theo tên hoặc mã..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  allowClear
                />
              </Col>
              <Col>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadDepartments} title="Tải lại">
                    Tải lại
                  </Button>
                  {canManageDepartment && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingDepartment(null);
                        setDeptModalOpen(true);
                      }}
                      size="middle"
                    >
                      Tạo Department
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </div>

          {/* Department List Table */}
          <div className="saas-card" style={{ overflow: 'hidden' }}>
            <Table
              columns={deptColumns}
              dataSource={filteredDepartments}
              rowKey="_id"
              loading={loadingDepts}
              pagination={{
                pageSize: 10,
                hideOnSinglePage: true,
                showTotal: (total) => `Tổng số: ${total} Department`,
              }}
            />
          </div>
        </div>
      )}

      {/* Project Form Modal (Create / Full Edit) - Chuẩn Base Wework */}
      <Modal
        title={
          <Space>
            <ProjectOutlined style={{ color: '#6366f1' }} />
            <span style={{ fontWeight: 700 }}>
              {editingProject ? 'Chỉnh sửa dự án (Base Wework)' : 'Tạo mới dự án (Base Wework)'}
            </span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          {/* 1. Tên dự án */}
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>{t('projects.form.name') || 'Tên dự án'}</span>}
            rules={[{ required: true, message: t('projects.form.nameRequired') || 'Vui lòng nhập tên dự án' }]}
            extra="Đặt tên rõ ràng theo mục tiêu hoặc chiến dịch (VD: Phát triển Ứng dụng Mobile, Chiến dịch Marketing Q4...)"
          >
            <Input placeholder="Ví dụ: Chiến dịch Marketing Q4 / Triển khai ERP" size="large" />
          </Form.Item>

          <Row gutter={16}>
            {/* 2. Phân nhóm Department */}
            <Col xs={24} md={12}>
              <Form.Item
                name="department"
                label={
                  <Space>
                    <ApartmentOutlined style={{ color: '#6366f1' }} />
                    <span style={{ fontWeight: 600 }}>Phân nhóm Department</span>
                  </Space>
                }
                extra="Phòng ban / khối quản lý trực tiếp dự án"
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
                              width: 8,
                              height: 8,
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
            </Col>

            {/* 3. Quản trị dự án (PM) */}
            <Col xs={24} md={12}>
              <Form.Item
                name="manager"
                label={
                  <Space>
                    <CrownOutlined style={{ color: '#f59e0b' }} />
                    <span style={{ fontWeight: 600 }}>Quản trị dự án (PM)</span>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng chọn Quản trị dự án (PM)' }]}
                extra="PM có toàn quyền thiết lập, giao việc và nghiệm thu"
              >
                <Select
                  showSearch
                  placeholder="Chọn Quản trị dự án (@username)..."
                  filterOption={(input, option) =>
                    (option?.searchKey || '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={companyUsers.map((u) => ({
                    value: u._id,
                    searchKey: `${u.name} ${u.email} ${u.jobTitle || ''}`,
                    label: (
                      <Space>
                        <Avatar size={18} src={u.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                        <span style={{ fontWeight: 600 }}>{u.name || u.email}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          ({u.jobTitle || u.department || u.role})
                        </span>
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 4. Thành viên thực hiện dự án */}
          <Form.Item
            name="members"
            label={
              <Space>
                <TeamOutlined style={{ color: '#6366f1' }} />
                <span style={{ fontWeight: 600 }}>Thành viên thực hiện dự án</span>
              </Space>
            }
            extra="Gắn thẻ các thành viên tham gia thực hiện dự án ngay từ đầu (có thể bổ sung thêm bất kỳ lúc nào)"
          >
            <Select
              mode="multiple"
              showSearch
              placeholder="Gắn thẻ thành viên tham gia (@username)..."
              filterOption={(input, option) =>
                (option?.searchKey || '').toLowerCase().includes(input.toLowerCase())
              }
              options={companyUsers.map((u) => ({
                value: u._id,
                searchKey: `${u.name} ${u.email} ${u.jobTitle || ''}`,
                label: (
                  <Space size={6}>
                    <Avatar size={18} src={u.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                    <span>{u.name || u.email}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          {/* 5. Phân loại dự án */}
          <Form.Item
            name="projectType"
            label={<span style={{ fontWeight: 600 }}>Phân loại dự án (Project Type)</span>}
            rules={[{ required: true, message: 'Vui lòng chọn loại dự án' }]}
            extra="Dự án nội bộ chỉ dành cho nhân sự công ty. Dự án với khách hàng cho phép thêm tài khoản Khách (Guest)."
          >
            <Radio.Group style={{ width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                  }}
                >
                  <Radio value="internal">
                    <Space align="start">
                      <TeamOutlined style={{ color: '#3b82f6', fontSize: 16, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>Dự án nội bộ (Internal)</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Dành riêng cho nhân sự công ty, dữ liệu bảo mật nội bộ
                        </div>
                      </div>
                    </Space>
                  </Radio>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                  }}
                >
                  <Radio value="client">
                    <Space align="start">
                      <GlobalOutlined style={{ color: '#f97316', fontSize: 16, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>Dự án với khách hàng</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Cho phép mời tài khoản Khách (Guest) tham gia theo dõi
                        </div>
                      </div>
                    </Space>
                  </Radio>
                </div>
              </div>
            </Radio.Group>
          </Form.Item>

          {/* 6. Mẫu dự án (khi tạo mới) */}
          {!editingProject && (
            <Form.Item
              name="template"
              label={
                <Space>
                  <AppstoreAddOutlined style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 600 }}>Mẫu dự án (Template)</span>
                </Space>
              }
              extra="Tự động khởi tạo nhóm công việc có sẵn theo quy trình chuẩn của Base Wework"
            >
              <Select
                options={[
                  {
                    value: 'blank',
                    label: 'Dự án trống — Tự thiết lập cấu trúc nhóm công việc tùy ý',
                  },
                  {
                    value: 'agile_scrum',
                    label: 'Mẫu Agile / Scrum (6 nhóm: Backlog, Sprint Planning, In Progress, Code Review, Testing, Done)',
                  },
                  {
                    value: 'marketing',
                    label: 'Mẫu Chiến dịch Marketing (4 nhóm: Brief ý tưởng, Content & Media, Thực thi Ads, Đánh giá)',
                  },
                  {
                    value: 'standard',
                    label: 'Mẫu Tiêu chuẩn 3 Giai đoạn (Chuẩn bị, Triển khai thực hiện, Nghiệm thu & Bàn giao)',
                  },
                ]}
              />
            </Form.Item>
          )}

          {/* 7. Cài đặt nâng cao (Collapse Panel) */}
          <Collapse
            ghost
            style={{ marginTop: 8, marginBottom: 16, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8 }}
            items={[
              {
                key: 'advanced',
                label: (
                  <Space>
                    <SettingOutlined style={{ color: '#6366f1' }} />
                    <span style={{ fontWeight: 600, color: '#6366f1' }}>
                      Cài đặt nâng cao (Mã dự án, màu sắc nhận diện, thời gian, ngân sách, mô tả...)
                    </span>
                  </Space>
                ),
                children: (
                  <div style={{ paddingTop: 8 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="code" label={t('projects.form.code') || 'Mã dự án'}>
                          <Input placeholder="Ví dụ: PJ-2026" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="color" label="Bảng màu nhận diện">
                          <Select
                            options={BASE_PROJECT_COLORS.map((c) => ({
                              value: c.value,
                              label: (
                                <Space>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      backgroundColor: c.value,
                                    }}
                                  />
                                  <span>{c.label}</span>
                                </Space>
                              ),
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

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

                    <Form.Item name="description" label={t('projects.form.description') || 'Mô tả dự án'}>
                      <TextArea rows={3} placeholder="Mô tả mục tiêu, phạm vi và yêu cầu của dự án..." />
                    </Form.Item>

                    <Form.Item name="tags" label={t('projects.form.tags') || 'Tags (phân cách bằng dấu phẩy)'}>
                      <Input placeholder="AI, Fintech, Logistics, High-Priority" />
                    </Form.Item>
                  </div>
                ),
              },
            ]}
          />

          <div style={{ textAlign: 'right', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>{t('common.cancel') || 'Hủy'}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                  fontWeight: 600,
                  padding: '0 24px',
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

      {/* Department Modal (Create / Edit) */}
      <DepartmentModal
        open={deptModalOpen}
        department={editingDepartment}
        onCancel={() => setDeptModalOpen(false)}
        onSuccess={async () => {
          setDeptModalOpen(false);
          await loadDepartments();
          await loadProjects();
        }}
      />

      {/* Quick Edit Project Modal (Base Wework) */}
      <QuickEditProjectModal
        open={quickEditOpen}
        project={selectedQuickProject}
        onCancel={() => setQuickEditOpen(false)}
        onSuccess={async () => {
          setQuickEditOpen(false);
          await loadProjects();
          await loadDepartments();
        }}
      />
    </div>
  );
}