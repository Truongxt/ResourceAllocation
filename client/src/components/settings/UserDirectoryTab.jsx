/**
 * ============================================================================
 * PHÂN HỆ QUẢN LÝ THÀNH VIÊN & PHÂN QUYỀN OWNER / ADMIN (Base Account)
 * Tham chiếu tài liệu chính thức:
 * https://help.base.vn/support/solutions/articles/63000253291-base-account-cách-phân-quyền-tài-khoản-quản-trị-cấp-cao-quản-trị-hệ-thống
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Typography,
  message,
  Avatar,
  Popconfirm,
  Row,
  Col,
  Tooltip,
  Dropdown,
  Radio,
  Divider,
} from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  SearchOutlined,
  KeyOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  StarOutlined,
  StarFilled,
  MailOutlined,
  LockOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  ApartmentOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { roleLabel } from '../../i18n/enums';
import authService from '../../services/authService';
import departmentService from '../../services/departmentService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function UserDirectoryTab({ currentUser }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Filter state
  const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'admin', 'active', 'inactive'
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState(undefined);
  const [filterDept, setFilterDept] = useState(undefined);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [editManagerUser, setEditManagerUser] = useState(null);
  const [emailModalUser, setEmailModalUser] = useState(null);
  const [appAdminModalUser, setAppAdminModalUser] = useState(null);
  const [editProfileUser, setEditProfileUser] = useState(null);

  const [createForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [managerForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [editProfileForm] = Form.useForm();

  // App Admin delegation
  const [selectedApps, setSelectedApps] = useState([]);
  const [appsCatalog, setAppsCatalog] = useState([]);

  // Check if current logged-in user is Owner (Quản trị cấp cao - theo help.base.vn/articles/63000253291)
  const isCurrentOwner = Boolean(currentUser?.isOwner);

  useEffect(() => {
    loadUsers();
    loadDepartments();
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const res = await authService.getPermissionsMatrix();
      if (res.data?.catalog) {
        setAppsCatalog(res.data.catalog);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authService.getUsers();
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      message.error(err.response?.data?.message || 'Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.data?.departments || res.data?.departments || []);
    } catch (err) {
      console.error('Lỗi khi tải phòng ban:', err);
    }
  };

  // Thống kê
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const deactivated = total - active;
    const admins = users.filter((u) => u.isOwner || u.role === 'admin').length;
    return { total, active, deactivated, admins };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Quick filter
      if (quickFilter === 'admin' && !u.isOwner && u.role !== 'admin') return false;
      if (quickFilter === 'active' && u.isActive === false) return false;
      if (quickFilter === 'inactive' && u.isActive !== false) return false;

      // Dropdown filters
      if (filterRole && u.role !== filterRole) return false;
      if (filterDept && u.department !== filterDept) return false;

      // Search
      if (!searchText) return true;
      const s = searchText.toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(s) ||
        (u.email || '').toLowerCase().includes(s) ||
        (u.jobTitle || '').toLowerCase().includes(s) ||
        (u.phone || '').includes(s)
      );
    });
  }, [users, quickFilter, searchText, filterRole, filterDept]);

  // 1. Phân quyền Quản trị cấp cao (Owner)
  const handlePromoteOwner = async (record, isOwner) => {
    try {
      await authService.updateUserOwnerStatus(record._id, isOwner);
      message.success(
        isOwner
          ? `Đã phân quyền Quản trị cấp cao (Owner) cho ${record.name}`
          : `Đã hủy quyền Quản trị cấp cao của ${record.name}`
      );
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật quyền Owner');
    }
  };

  // 2. Phân quyền Quản trị hệ thống (Admin) hoặc Thành viên (Member)
  const handleChangeRole = async (record, newRole) => {
    try {
      // Nếu đang là Owner mà chuyển về vai trò khác, bỏ cờ isOwner
      if (record.isOwner && newRole !== 'admin') {
        await authService.updateUserOwnerStatus(record._id, false);
      }
      await authService.updateUserRole(record._id, newRole);
      message.success(`Đã cập nhật vai trò của ${record.name} thành ${roleLabel(newRole)}`);
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật vai trò');
    }
  };

  // 3. Khóa / Kích hoạt lại
  const handleToggleStatus = async (record) => {
    try {
      const newStatus = !record.isActive;
      await authService.updateUserStatus(record._id, newStatus);
      message.success(newStatus ? 'Đã kích hoạt lại tài khoản' : 'Đã vô hiệu hóa tài khoản');
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // 4. Đổi Email (Owner only)
  const handleSaveEmail = async (values) => {
    if (!emailModalUser) return;
    try {
      await authService.updateUserEmail(emailModalUser._id, values.email);
      message.success(`Đã cập nhật email cho ${emailModalUser.name} thành công!`);
      setEmailModalUser(null);
      emailForm.resetFields();
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật email');
    }
  };

  // 5. Vô hiệu hóa 2FA
  const handleDisable2FA = async (record) => {
    try {
      await authService.disableUser2FA(record._id);
      message.success(`Đã vô hiệu hóa bảo mật 2 lớp cho ${record.name}`);
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi vô hiệu hóa 2FA');
    }
  };

  // 6. Đổi mật khẩu
  const handleResetPassword = async (values) => {
    if (!resetPasswordUser) return;
    try {
      await authService.adminResetPassword(resetPasswordUser._id, values.newPassword);
      message.success(`Đã đổi mật khẩu cho ${resetPasswordUser.name} thành công!`);
      setResetPasswordUser(null);
      resetPasswordForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi đổi mật khẩu');
    }
  };

  // 7. Gán quản lý
  const handleSaveManager = async (values) => {
    if (!editManagerUser) return;
    try {
      await authService.updateUserManager(editManagerUser._id, values.managerId);
      message.success('Đã cập nhật quản lý trực tiếp thành công!');
      setEditManagerUser(null);
      managerForm.resetFields();
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật quản lý');
    }
  };

  // 7b. Chỉnh sửa thông tin cơ bản của thành viên (Admin / Owner - help.base.vn)
  const handleEditProfile = (record) => {
    setEditProfileUser(record);
    editProfileForm.setFieldsValue({
      name: record.name,
      phone: record.phone,
      jobTitle: record.jobTitle,
      department: record.department,
      companyName: record.companyName,
    });
  };

  const handleSaveProfile = async (values) => {
    if (!editProfileUser) return;
    try {
      await authService.adminUpdateUserProfile(editProfileUser._id, values);
      message.success(`Đã cập nhật thông tin thành viên ${editProfileUser.name} thành công!`);
      setEditProfileUser(null);
      editProfileForm.resetFields();
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật thông tin thành viên');
    }
  };

  // 8. Tạo tài khoản mới
  const handleCreateUser = async (values) => {
    try {
      await authService.createUser(values);
      message.success('Đã tạo tài khoản thành công!');
      setCreateModalOpen(false);
      createForm.resetFields();
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tạo tài khoản');
    }
  };

  // 9. Cấp quyền App Admin
  const handleSaveAppAdmin = async () => {
    if (!appAdminModalUser) return;
    try {
      await authService.updateUserAppAdmin(appAdminModalUser._id, selectedApps);
      message.success(`Đã cập nhật quyền App Admin cho ${appAdminModalUser.name}`);
      setAppAdminModalUser(null);
      loadUsers();
    } catch (err) {
      message.error('Lỗi khi phân quyền App Admin');
    }
  };

  // Xuất CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      message.warning('Không có dữ liệu tài khoản để xuất');
      return;
    }
    const headers = ['Mã định danh', 'Họ tên', 'Email', 'Số điện thoại', 'Vị trí', 'Phòng ban', 'Vai trò', 'Owner', 'Trạng thái'];
    const rows = filteredUsers.map((u) => [
      u._id,
      `"${u.name || ''}"`,
      u.email,
      `"${u.phone || ''}"`,
      `"${u.jobTitle || ''}"`,
      `"${u.department || ''}"`,
      u.role,
      u.isOwner ? 'Owner' : 'No',
      u.isActive !== false ? 'Hoạt động' : 'Vô hiệu hóa',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `base_account_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Menu Dropdown "..." chuẩn Base.vn cho từng người dùng (theo help.base.vn/articles/63000253291)
  const getUserActionMenuItems = (record) => {
    const isSelf = record._id === currentUser?._id;

    return [
      {
        key: 'header',
        label: (
          <div style={{ padding: '4px 6px' }}>
            <Text strong style={{ fontSize: 13 }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>{record.email}</Text>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'contact',
        icon: <MailOutlined />,
        label: 'Gửi email / liên hệ',
        onClick: () => window.open(`mailto:${record.email}`),
      },
      {
        key: 'edit_profile',
        icon: <EditOutlined style={{ color: '#2563eb' }} />,
        label: 'Sửa thông tin tài khoản',
        onClick: () => handleEditProfile(record),
      },
      {
        key: 'manager',
        icon: <UserOutlined />,
        label: 'Chỉnh sửa quản lý trực tiếp',
        onClick: () => {
          setEditManagerUser(record);
          managerForm.setFieldsValue({ managerId: record.manager?._id });
        },
      },
      { type: 'divider' },

      // NHÓM PHÂN QUYỀN OWNER / ADMIN (Chuẩn theo help.base.vn/articles/63000253291)
      ...(isCurrentOwner
        ? [
            {
              key: 'promote_admin',
              icon: <StarOutlined style={{ color: '#7c3aed' }} />,
              label: record.role === 'admin' && !record.isOwner ? 'Hủy quyền Quản trị hệ thống' : 'Chọn làm Quản trị hệ thống (Admin)',
              disabled: isSelf,
              onClick: () => handleChangeRole(record, record.role === 'admin' && !record.isOwner ? 'member' : 'admin'),
            },
            {
              key: 'promote_owner',
              icon: <StarFilled style={{ color: '#dc2626' }} />,
              label: record.isOwner ? 'Hủy quyền Quản trị cấp cao' : 'Chọn làm Quản trị cấp cao (Owner)',
              disabled: isSelf,
              onClick: () => handlePromoteOwner(record, !record.isOwner),
            },
            {
              key: 'promote_pm',
              icon: <StarOutlined style={{ color: '#2563eb' }} />,
              label: 'Chọn làm Quản lý (PM)',
              disabled: isSelf || (record.role === 'project_manager' && !record.isOwner),
              onClick: () => handleChangeRole(record, 'project_manager'),
            },
            {
              key: 'promote_member',
              icon: <StarOutlined />,
              label: 'Chọn làm Thành viên thông thường',
              disabled: isSelf || (record.role === 'member' && !record.isOwner),
              onClick: () => handleChangeRole(record, 'member'),
            },
            { type: 'divider' },
            {
              key: 'app_admin',
              icon: <AppstoreOutlined style={{ color: '#0891b2' }} />,
              label: 'Cấp quyền quản trị ứng dụng (App Admin)',
              onClick: () => {
                setAppAdminModalUser(record);
                setSelectedApps(record.appAdmins || []);
              },
            },
            {
              key: 'change_email',
              icon: <MailOutlined style={{ color: '#f59e0b' }} />,
              label: 'Thay đổi email tài khoản',
              onClick: () => {
                setEmailModalUser(record);
                emailForm.setFieldsValue({ email: record.email });
              },
            },
            {
              key: 'reset_2fa',
              icon: <LockOutlined style={{ color: '#64748b' }} />,
              label: 'Vô hiệu bảo mật 02 lớp (2FA)',
              disabled: !record.twoFactorEnabled,
              onClick: () => handleDisable2FA(record),
            },
            { type: 'divider' },
          ]
        : []),

      {
        key: 'reset_pw',
        icon: <KeyOutlined />,
        label: 'Đặt lại mật khẩu',
        onClick: () => {
          setResetPasswordUser(record);
          resetPasswordForm.resetFields();
        },
      },
      {
        key: 'toggle_status',
        icon: record.isActive !== false ? <StopOutlined /> : <CheckCircleOutlined />,
        danger: record.isActive !== false,
        disabled: isSelf,
        label: record.isActive !== false ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt lại tài khoản',
        onClick: () => handleToggleStatus(record),
      },
    ];
  };

  const columns = [
    {
      title: 'HỌ & TÊN',
      key: 'name',
      width: 280,
      render: (_, record) => {
        const username = record.email ? `@${record.email.split('@')[0]}` : '@user';
        return (
          <Space align="start" size={12}>
            <Avatar
              size={40}
              src={record.avatar}
              icon={<UserOutlined />}
              style={{
                backgroundColor: record.isOwner
                  ? '#dc2626'
                  : record.role === 'admin'
                  ? '#7c3aed'
                  : record.role === 'project_manager'
                  ? '#2563eb'
                  : '#64748b',
                fontWeight: 700,
              }}
            >
              {record.name?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 13.5 }}>
                  {record.name}
                </Text>

                {/* Badge chuẩn Base: Owner có badge đỏ đậm, Admin tím, PM xanh */}
                {record.isOwner && (
                  <Tag color="#dc2626" style={{ fontWeight: 700, borderRadius: 10, fontSize: 10.5, margin: 0 }}>
                    ★ Quản trị cấp cao
                  </Tag>
                )}
                {!record.isOwner && record.role === 'admin' && (
                  <Tag color="purple" style={{ fontWeight: 600, borderRadius: 10, fontSize: 10.5, margin: 0 }}>
                    Quản trị hệ thống
                  </Tag>
                )}
                {record.role === 'project_manager' && (
                  <Tag color="blue" style={{ fontWeight: 600, borderRadius: 10, fontSize: 10.5, margin: 0 }}>
                    Quản lý (PM)
                  </Tag>
                )}
                {record.role === 'member' && !record.isOwner && (
                  <Tag style={{ borderRadius: 10, fontSize: 10.5, margin: 0 }}>
                    Thành viên
                  </Tag>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                <span>{username}</span>
                {record.jobTitle && <span> • {record.jobTitle}</span>}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'THÔNG TIN LIÊN LẠC',
      key: 'contact',
      width: 260,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 500 }}>
            {record.email}
          </div>
          <div style={{ fontSize: 12, color: record.phone ? '#64748b' : '#94a3b8', marginTop: 2 }}>
            {record.phone ? record.phone : 'Chưa nhập số điện thoại'}
          </div>
          <Tag color="cyan" style={{ fontSize: 11, marginTop: 4, borderRadius: 4 }}>
            {record.department || 'Chưa gán phòng ban'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'QUẢN LÝ TRỰC TIẾP',
      key: 'manager',
      width: 210,
      render: (_, record) => {
        if (!record.manager) {
          return (
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>Chưa thiết lập</Text>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setEditManagerUser(record);
                  managerForm.setFieldsValue({ managerId: undefined });
                }}
              >
                Gán
              </Button>
            </Space>
          );
        }
        return (
          <Space align="center" size={8}>
            <Avatar size={28} src={record.manager.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#2563eb' }}>
              {record.manager.name?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                {record.manager.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.manager.jobTitle || 'Quản lý'}
              </Text>
            </div>
            <Tooltip title="Chỉnh sửa quản lý trực tiếp">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ fontSize: 11, color: '#3b82f6' }} />}
                onClick={() => {
                  setEditManagerUser(record);
                  managerForm.setFieldsValue({ managerId: record.manager?._id });
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive) => (
        <Tag
          color={isActive !== false ? 'success' : 'error'}
          style={{ borderRadius: 10, fontSize: 11.5, fontWeight: 600 }}
        >
          {isActive !== false ? '● Đang hoạt động' : '✕ Đã vô hiệu hóa'}
        </Tag>
      ),
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Dropdown menu={{ items: getUserActionMenuItems(record) }} trigger={['click']}>
          <Button
            shape="circle"
            icon={<EllipsisOutlined style={{ fontSize: 18 }} />}
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
              background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
            }}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Thông tin Tổ chức / Doanh nghiệp theo mô hình Multi-tenant Base.vn */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '14px 18px',
          borderRadius: 12,
          background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        }}
      >
        <Space size={12} align="center">
          <Avatar
            size={40}
            style={{ backgroundColor: '#2563eb', verticalAlign: 'middle', fontWeight: 700 }}
          >
            {(currentUser?.companyName || 'Công ty Công nghệ RAO').charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 15, color: isDark ? '#f8fafc' : '#0f172a' }}>
                Danh bạ tài khoản: <span style={{ color: '#2563eb' }}>{currentUser?.companyName || 'Công ty Công nghệ RAO'}</span>
              </Text>
              <Tag color="cyan" style={{ borderRadius: 6, fontSize: 11, margin: 0 }}>
                Độc lập theo công ty
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Mỗi doanh nghiệp sở hữu quản trị viên hệ thống & danh bạ nhân sự riêng biệt.
            </div>
          </div>
        </Space>
        <Tag
          color={isCurrentOwner ? 'gold' : 'blue'}
          style={{ borderRadius: 12, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
        >
          {isCurrentOwner ? '★ Quản trị cấp cao (Owner)' : (currentUser?.role === 'admin' ? '🛡 Admin hệ thống' : 'Thành viên')}
        </Tag>
      </div>

      {/* 4 Thẻ KPI Thống Kê Chuẩn Base Account */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '16px 20px',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>Tổng tài khoản</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6', marginTop: 4 }}>{stats.total}</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '16px 20px',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>Đang hoạt động</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4 }}>{stats.active}</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '16px 20px',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>Đã vô hiệu hóa</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{stats.deactivated}</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '16px 20px',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>Quản trị viên (Owner/Admin)</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>{stats.admins}</div>
          </div>
        </Col>
      </Row>

      {/* Toolbar lọc chuẩn Base Account: Tabs trạng thái + Search + Thêm tài khoản */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Quick Filter Tabs kiểu Base.vn */}
          <Radio.Group
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="all">TẤT CẢ ({stats.total})</Radio.Button>
            <Radio.Button value="admin">QUẢN TRỊ ({stats.admins})</Radio.Button>
            <Radio.Button value="active">ĐANG HOẠT ĐỘNG ({stats.active})</Radio.Button>
            <Radio.Button value="inactive">VÔ HIỆU HOÁ ({stats.deactivated})</Radio.Button>
          </Radio.Group>

          {/* Ô tìm kiếm */}
          <Input
            placeholder="Nhấn enter để tìm kiếm..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />

          {/* Lọc phòng ban */}
          <Select
            placeholder="Phòng ban"
            allowClear
            value={filterDept}
            onChange={setFilterDept}
            style={{ width: 170 }}
          >
            {departments.map((d) => (
              <Option key={d._id} value={d.name}>
                {d.name}
              </Option>
            ))}
          </Select>
        </div>

        {/* Nút hành động */}
        <Space size={10}>
          <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>
            Làm mới
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
            Xuất CSV
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
            onClick={() => setCreateModalOpen(true)}
          >
            + Thêm tài khoản
          </Button>
        </Space>
      </div>

      {/* Bảng Danh bạ Thành viên */}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="middle"
      />

      {/* Modal 1: Thay Đổi Email (Dành riêng cho Owner) */}
      <Modal
        title={`Thay Đổi Email Đăng Nhập: ${emailModalUser?.name || ''}`}
        open={Boolean(emailModalUser)}
        onCancel={() => setEmailModalUser(null)}
        footer={null}
        width={480}
      >
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Theo quy chuẩn Base Account, chỉ <strong>Quản trị cấp cao (Owner)</strong> hoặc App Admin được phân quyền chìa khóa 🔑 mới có thể thay đổi email đăng nhập của nhân sự.
        </Paragraph>
        <Form form={emailForm} layout="vertical" onFinish={handleSaveEmail} style={{ marginTop: 16 }}>
          <Form.Item
            name="email"
            label="Địa chỉ Email mới"
            rules={[
              { required: true, message: 'Vui lòng nhập email mới' },
              { type: 'email', message: 'Email không đúng định dạng' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="email.moi@doanhnghiep.com" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button onClick={() => setEmailModalUser(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#2563eb' }}>
              Lưu thay đổi email
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal 2: Cấp Quyền App Admin */}
      <Modal
        title={`Cấp Quyền Quản Trị Ứng Dụng (App Admin): ${appAdminModalUser?.name || ''}`}
        open={Boolean(appAdminModalUser)}
        onCancel={() => setAppAdminModalUser(null)}
        onOk={handleSaveAppAdmin}
        okText="Lưu quyền App Admin"
        cancelText="Hủy"
        width={520}
      >
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Chọn các ứng dụng mà nhân sự này sẽ giữ vai trò <strong>Quản trị ứng dụng (App Admin)</strong>:
        </Paragraph>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {appsCatalog.map((app) => {
            const isChecked = selectedApps.includes(app.key);
            return (
              <div
                key={app.key}
                onClick={() => {
                  if (isChecked) {
                    setSelectedApps(selectedApps.filter((k) => k !== app.key));
                  } else {
                    setSelectedApps([...selectedApps, app.key]);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: isChecked ? `1.5px solid ${app.color}` : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  background: isChecked ? `${app.color}10` : undefined,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{app.name}</div>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>{app.tagline}</Text>
                </div>
                {isChecked ? <Tag color="success">Đã chọn</Tag> : <Tag>Chưa cấp</Tag>}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Modal 3: Đặt Lại Mật Khẩu */}
      <Modal
        title={`Đặt lại mật khẩu cho: ${resetPasswordUser?.name || ''}`}
        open={Boolean(resetPasswordUser)}
        onCancel={() => setResetPasswordUser(null)}
        footer={null}
        width={440}
      >
        <Form form={resetPasswordForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button onClick={() => setResetPasswordUser(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#2563eb' }}>
              Xác nhận đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal 4: Chỉnh Sửa Quản Lý Trực Tiếp */}
      <Modal
        title={`Chỉ định Quản lý trực tiếp cho: ${editManagerUser?.name || ''}`}
        open={Boolean(editManagerUser)}
        onCancel={() => setEditManagerUser(null)}
        footer={null}
        width={460}
      >
        <Form form={managerForm} layout="vertical" onFinish={handleSaveManager} style={{ marginTop: 16 }}>
          <Form.Item name="managerId" label="Người quản lý trực tiếp (Direct Manager)">
            <Select
              placeholder="Chọn người quản lý..."
              allowClear
              showSearch
              optionFilterProp="label"
              options={users
                .filter((u) => u._id !== editManagerUser?._id)
                .map((u) => ({
                  value: u._id,
                  label: `${u.name} (${u.jobTitle || roleLabel(u.role)})`,
                }))}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button onClick={() => setEditManagerUser(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#2563eb' }}>
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal 5: Tạo Tài Khoản Mới */}
      <Modal
        title="Thêm Tài Khoản Nhân Sự Mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={560}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateUser} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email đăng nhập"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="a.nguyen@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="0912 345 678" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="jobTitle" label="Vị trí / Chức danh">
                <Input placeholder="Kỹ sư phần mềm, Designer..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="department" label="Phòng ban trực thuộc">
                <Select placeholder="Chọn phòng ban...">
                  {departments.map((d) => (
                    <Option key={d._id} value={d.name}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="role" label="Vai trò ban đầu" initialValue="member">
                <Select>
                  <Option value="member">Thành viên (Member)</Option>
                  <Option value="project_manager">Quản lý (PM)</Option>
                  {isCurrentOwner && <Option value="admin">Quản trị hệ thống (Admin)</Option>}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label="Mật khẩu khởi tạo"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Tối thiểu 6 ký tự' },
                ]}
                initialValue="123123"
              >
                <Input.Password placeholder="Mật khẩu ban đầu" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Thuộc công ty / tổ chức">
                <Input
                  disabled
                  value={currentUser?.companyName || 'Công ty Công nghệ RAO'}
                  prefix={<ApartmentOutlined style={{ color: '#94a3b8' }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#10b981', borderColor: '#10b981' }}>
              Tạo tài khoản
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal 6: Sửa Thông Tin Tài Khoản (Admin / Owner - help.base.vn) */}
      <Modal
        title={`Chỉnh sửa thông tin tài khoản: ${editProfileUser?.name || ''}`}
        open={Boolean(editProfileUser)}
        onCancel={() => setEditProfileUser(null)}
        footer={null}
        width={540}
      >
        <Form form={editProfileForm} layout="vertical" onFinish={handleSaveProfile} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="jobTitle" label="Vị trí / Chức danh">
                <Input placeholder="Kỹ sư phần mềm, Designer..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="department" label="Phòng ban trực thuộc">
                <Select placeholder="Chọn phòng ban..." allowClear>
                  {departments.map((d) => (
                    <Option key={d._id} value={d.name}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="companyName" label="Tên công ty / Chi nhánh">
            <Input placeholder="Tên công ty / Doanh nghiệp" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button onClick={() => setEditProfileUser(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#2563eb' }}>
              Lưu thông tin
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
