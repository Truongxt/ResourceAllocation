/**
 * ============================================================================
 * TRUNG TÂM PHÂN QUYỀN THAO TÁC BASE ACCOUNT (Base.vn Official Standard)
 * Tham chiếu bài viết: https://help.base.vn/support/solutions/articles/63000273376
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Tag,
  Input,
  Radio,
  Select,
  Button,
  Typography,
  Card,
  Row,
  Col,
  Space,
  Badge,
  Tabs,
  Modal,
  Form,
  message,
  Tooltip,
  Divider,
} from 'antd';
import {
  SafetyCertificateOutlined,
  KeyOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  LockOutlined,
  SettingOutlined,
  ProjectOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  PlusOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  ApartmentOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function AppPermissionsTab() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  // State
  const [activeSubTab, setActiveSubTab] = useState('matrix');
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState([]);
  const [appsCatalog, setAppsCatalog] = useState([]);
  const [selectedModule, setSelectedModule] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // App Admin delegation state
  const [users, setUsers] = useState([]);
  const [appAdminModalOpen, setAppAdminModalOpen] = useState(false);
  const [selectedUserForAppAdmin, setSelectedUserForAppAdmin] = useState(null);
  const [selectedApps, setSelectedApps] = useState([]);
  const [savingAppAdmin, setSavingAppAdmin] = useState(false);

  // Guest accounts state
  const [guests, setGuests] = useState([]);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestForm] = Form.useForm();
  const [creatingGuest, setCreatingGuest] = useState(false);

  // Load matrix & catalog
  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await authService.getPermissionsMatrix();
      if (res.data) {
        setMatrixData(res.data.matrix || []);
        setAppsCatalog(res.data.catalog || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải ma trận phân quyền:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load users for App Admin assignment
  const loadUsersAndGuests = async () => {
    try {
      const [uRes, gRes] = await Promise.all([
        authService.getUsers({ limit: 100 }).catch(() => ({ data: { users: [] } })),
        authService.getGuests().catch(() => ({ data: { guests: [] } })),
      ]);
      setUsers(uRes.data?.users || []);
      setGuests(gRes.data?.guests || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu người dùng:', err);
    }
  };

  useEffect(() => {
    loadMatrix();
    loadUsersAndGuests();
  }, []);

  // Filter matrix data
  const filteredMatrix = useMemo(() => {
    return matrixData.filter((item) => {
      const matchModule = selectedModule === 'all' || item.module === selectedModule;
      const matchSearch =
        !searchTerm ||
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.moduleName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchModule && matchSearch;
    });
  }, [matrixData, selectedModule, searchTerm]);

  // Render badge helper for permission status
  const renderPermissionBadge = (val) => {
    if (val === 'yes') {
      return (
        <Tag
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          <CheckCircleFilled style={{ marginRight: 4 }} />
          Có quyền
        </Tag>
      );
    }
    if (val === 'no') {
      return (
        <Tag
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 6,
            fontWeight: 500,
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          <CloseCircleFilled style={{ marginRight: 4 }} />
          Không
        </Tag>
      );
    }
    if (val === 'key') {
      return (
        <Tooltip title="Được làm nếu được Owner phân quyền đặc biệt (Chìa khóa 🔑)">
          <Tag
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              padding: '2px 8px',
              cursor: 'help',
            }}
          >
            <KeyOutlined style={{ marginRight: 4 }} />
            Phân quyền (🔑)
          </Tag>
        </Tooltip>
      );
    }
    if (val === 'self') {
      return (
        <Tag
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          Chính mình
        </Tag>
      );
    }
    if (val === 'group_owner') {
      return (
        <Tag
          style={{
            background: 'rgba(6, 182, 212, 0.12)',
            color: '#06b6d4',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          Là owner nhóm đó
        </Tag>
      );
    }
    return <Text type="secondary">-</Text>;
  };

  // Matrix table columns
  const columns = [
    {
      title: 'Thao tác nghiệp vụ',
      dataIndex: 'action',
      key: 'action',
      width: 280,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: isDark ? '#f8fafc' : '#0f172a' }}>
            {text}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
            {record.description}
          </Text>
          <Tag color="default" style={{ fontSize: 10.5, marginTop: 4, borderRadius: 4 }}>
            {record.moduleName}
          </Tag>
        </div>
      ),
    },
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#9333ea' }}>Quản trị cấp cao</div>
          <Text type="secondary" style={{ fontSize: 11 }}>(Owner)</Text>
        </div>
      ),
      dataIndex: 'owner',
      key: 'owner',
      width: 140,
      align: 'center',
      render: renderPermissionBadge,
    },
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#2563eb' }}>Quản trị ứng dụng</div>
          <Text type="secondary" style={{ fontSize: 11 }}>(App Admin)</Text>
        </div>
      ),
      dataIndex: 'appAdmin',
      key: 'appAdmin',
      width: 150,
      align: 'center',
      render: renderPermissionBadge,
    },
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#0891b2' }}>Quản lý</div>
          <Text type="secondary" style={{ fontSize: 11 }}>(Admin / PM)</Text>
        </div>
      ),
      dataIndex: 'admin',
      key: 'admin',
      width: 160,
      align: 'center',
      render: renderPermissionBadge,
    },
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#64748b' }}>Thành viên</div>
          <Text type="secondary" style={{ fontSize: 11 }}>(Member)</Text>
        </div>
      ),
      dataIndex: 'member',
      key: 'member',
      width: 130,
      align: 'center',
      render: renderPermissionBadge,
    },
  ];

  // Open App Admin Modal for a specific user
  const handleOpenAppAdminModal = (user) => {
    setSelectedUserForAppAdmin(user);
    setSelectedApps(user.appAdmins || []);
    setAppAdminModalOpen(true);
  };

  // Save App Admin changes
  const handleSaveAppAdmin = async () => {
    if (!selectedUserForAppAdmin) return;
    setSavingAppAdmin(true);
    try {
      await authService.updateUserAppAdmin(selectedUserForAppAdmin._id, selectedApps);
      message.success(`Đã cập nhật quyền App Admin cho ${selectedUserForAppAdmin.name}`);
      setAppAdminModalOpen(false);
      loadUsersAndGuests();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi khi phân quyền App Admin');
    } finally {
      setSavingAppAdmin(false);
    }
  };

  // Toggle special grant (🔑)
  const handleToggleSpecialGrant = async (user, grantKey) => {
    const currentGrants = user.specialGrants || [];
    const hasGrant = currentGrants.includes(grantKey);
    const newGrants = hasGrant
      ? currentGrants.filter((g) => g !== grantKey)
      : [...currentGrants, grantKey];
    try {
      await authService.updateUserSpecialGrants(user._id, newGrants);
      message.success(`Đã ${hasGrant ? 'thu hồi' : 'cấp'} quyền đặc biệt cho ${user.name}`);
      loadUsersAndGuests();
    } catch (err) {
      message.error('Không thể cập nhật quyền');
    }
  };

  // Create Guest Account
  const handleCreateGuest = async (values) => {
    setCreatingGuest(true);
    try {
      await authService.createGuest(values);
      message.success('Đã tạo tài khoản khách thành công!');
      guestForm.resetFields();
      setGuestModalOpen(false);
      loadUsersAndGuests();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi khi tạo tài khoản khách');
    } finally {
      setCreatingGuest(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Overview Banner: 4 Cấp độ Vai trò Chuẩn Base.vn */}
      <div
        className="saas-card"
        style={{
          padding: '20px 24px',
          marginBottom: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #bae6fd',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SafetyCertificateOutlined style={{ color: '#2563eb' }} />
              Phân Quyền Thao Tác Trong Base Account
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Hệ thống phân quyền chuẩn Base Enterprise: 4 vai trò quản trị trên 6 phân hệ và 41+ thao tác chi tiết
            </Text>
          </div>
          <Tag color="blue" style={{ borderRadius: 12, padding: '3px 12px', fontWeight: 600, margin: 0 }}>
            Tài liệu: help.base.vn/articles/63000273376
          </Tag>
        </div>

        {/* 4 Cột Định nghĩa Vai trò */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(147, 51, 234, 0.1)' : '#faf5ff',
                border: isDark ? '1px solid rgba(147, 51, 234, 0.25)' : '1px solid #e9d5ff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Badge color="#9333ea" />
                <Text strong style={{ color: '#9333ea', fontSize: 13 }}>
                  1. Quản trị cấp cao (Owner)
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Toàn quyền tuyệt đối trên mọi ứng dụng, tài khoản, dữ liệu tổ chức và bảo mật.
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff',
                border: isDark ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid #bfdbfe',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Badge color="#2563eb" />
                <Text strong style={{ color: '#2563eb', fontSize: 13 }}>
                  2. Quản trị ứng dụng (App Admin)
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Quản lý chuyên sâu các app được giao (Work+, Schedule+), quản lý thành viên app.
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(8, 145, 178, 0.1)' : '#ecfeff',
                border: isDark ? '1px solid rgba(8, 145, 178, 0.25)' : '1px solid #a5f3fc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Badge color="#0891b2" />
                <Text strong style={{ color: '#0891b2', fontSize: 13 }}>
                  3. Quản lý (Admin / PM)
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Tạo tài khoản, quản lý nhóm trực thuộc, điều phối công việc và phân bổ thành viên.
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(100, 116, 139, 0.1)' : '#f8fafc',
                border: isDark ? '1px solid rgba(100, 116, 139, 0.25)' : '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Badge color="#64748b" />
                <Text strong style={{ color: '#64748b', fontSize: 13 }}>
                  4. Thành viên (Member)
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Thực thi công việc được giao, quản lý hồ sơ và lịch làm việc của chính mình.
              </Text>
            </div>
          </Col>
        </Row>
      </div>

      {/* Sub-Tabs điều hướng phân quyền */}
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        type="card"
        items={[
          {
            key: 'matrix',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <AppstoreOutlined />
                <span>Ma trận Phân quyền Thao tác (41 Thao tác)</span>
              </span>
            ),
            children: (
              <div>
                {/* Thanh công cụ: Bộ lọc theo phân hệ & Ô tìm kiếm */}
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
                  <Space wrap size={8}>
                    <Text strong style={{ fontSize: 13, marginRight: 4 }}>
                      Phân hệ:
                    </Text>
                    <Radio.Group
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      buttonStyle="solid"
                      size="small"
                    >
                      <Radio.Button value="all">Tất cả (41)</Radio.Button>
                      <Radio.Button value="account">Tài khoản (15)</Radio.Button>
                      <Radio.Button value="groups">Nhóm (8)</Radio.Button>
                      <Radio.Button value="guest">TK khách (7)</Radio.Button>
                      <Radio.Button value="apps">Ứng dụng (2)</Radio.Button>
                      <Radio.Button value="advanced">Tùy chỉnh (6)</Radio.Button>
                      <Radio.Button value="security">Bảo mật (7)</Radio.Button>
                    </Radio.Group>
                  </Space>

                  <Input
                    placeholder="Tìm kiếm thao tác..."
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    style={{ width: 260 }}
                  />
                </div>

                {/* Bảng Ma trận 41 Thao tác */}
                <Table
                  columns={columns}
                  dataSource={filteredMatrix}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15, showSizeChanger: true }}
                  size="middle"
                  bordered
                />

                {/* Chú giải chuẩn Base.vn (Legend) */}
                <div
                  style={{
                    marginTop: 16,
                    padding: '14px 18px',
                    borderRadius: 10,
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                  }}
                >
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                    📌 Chú giải ký hiệu phân quyền (Theo Base Account Standard):
                  </Text>
                  <Space size={20} wrap>
                    <Space size={6}>
                      <Tag style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid #10b981', fontWeight: 600 }}>
                        <CheckCircleFilled style={{ marginRight: 4 }} /> Có quyền
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>: Mặc định có quyền thao tác</Text>
                    </Space>

                    <Space size={6}>
                      <Tag style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid #ef4444', fontWeight: 500 }}>
                        <CloseCircleFilled style={{ marginRight: 4 }} /> Không
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>: Mặc định không có quyền</Text>
                    </Space>

                    <Space size={6}>
                      <Tag style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid #d97706', fontWeight: 700 }}>
                        <KeyOutlined style={{ marginRight: 4 }} /> Phân quyền (🔑)
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>: Được làm nếu được Owner phân quyền đặc biệt</Text>
                    </Space>

                    <Space size={6}>
                      <Tag style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid #3b82f6', fontWeight: 600 }}>
                        Chính mình
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>: Chỉ thao tác với chính tài khoản của cá nhân</Text>
                    </Space>

                    <Space size={6}>
                      <Tag style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', border: '1px solid #06b6d4', fontWeight: 600 }}>
                        Là owner nhóm đó
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>: Có quyền trong phạm vi nhóm mà mình phụ trách</Text>
                    </Space>
                  </Space>
                </div>
              </div>
            ),
          },
          {
            key: 'app_admin',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <TeamOutlined />
                <span>Quản trị Ứng dụng (App Admin)</span>
              </span>
            ),
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700 }}>
                    Danh Sách Quản Trị Ứng Dụng (App Admins)
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Chỉ định nhân sự làm App Admin cho từng ứng dụng cụ thể trong hệ sinh thái
                  </Text>
                </div>

                <Row gutter={[16, 16]}>
                  {appsCatalog.map((app) => {
                    const assignedUsers = users.filter((u) => u.appAdmins?.includes(app.key));
                    return (
                      <Col xs={24} md={12} lg={8} key={app.key}>
                        <Card
                          size="small"
                          style={{
                            borderRadius: 12,
                            background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                            height: '100%',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: `${app.color}15`,
                                border: `1px solid ${app.color}35`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: app.color,
                                fontSize: 18,
                              }}
                            >
                              {app.key === 'work' && <ProjectOutlined />}
                              {app.key === 'schedule' && <CalendarOutlined />}
                              {app.key === 'optimize' && <ThunderboltOutlined />}
                              {app.key === 'analytics' && <BarChartOutlined />}
                              {app.key === 'resource' && <TeamOutlined />}
                            </div>
                            <div>
                              <Text strong style={{ fontSize: 14 }}>
                                {app.name}
                              </Text>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{app.code}</div>
                            </div>
                          </div>

                          <Paragraph
                            type="secondary"
                            style={{ fontSize: 12, minHeight: 36, marginBottom: 12 }}
                          >
                            {app.tagline}
                          </Paragraph>

                          <Divider style={{ margin: '8px 0' }} />

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <Text strong style={{ fontSize: 12 }}>
                                App Admins ({assignedUsers.length}):
                              </Text>
                            </div>

                            {assignedUsers.length === 0 ? (
                              <Text type="secondary" style={{ fontSize: 11.5, fontStyle: 'italic', display: 'block', marginBottom: 12 }}>
                                Chưa có App Admin riêng (Do Owner quản lý)
                              </Text>
                            ) : (
                              <Space wrap size={4} style={{ marginBottom: 12 }}>
                                {assignedUsers.map((u) => (
                                  <Tag
                                    key={u._id}
                                    color="blue"
                                    style={{ borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                                    onClick={() => handleOpenAppAdminModal(u)}
                                  >
                                    <UserOutlined style={{ marginRight: 4 }} />
                                    {u.name}
                                  </Tag>
                                ))}
                              </Space>
                            )}
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>

                {/* Bảng danh sách tài khoản & gán quyền App Admin */}
                <div style={{ marginTop: 24 }}>
                  <Title level={5} style={{ margin: '0 0 12px 0', fontWeight: 700 }}>
                    Ủy quyền App Admin theo Tài khoản
                  </Title>
                  <Table
                    size="small"
                    rowKey="_id"
                    dataSource={users}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: 'Tài khoản nhân sự',
                        dataIndex: 'name',
                        key: 'name',
                        render: (name, record) => (
                          <div>
                            <Text strong style={{ fontSize: 13 }}>{name}</Text>
                            <Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>
                              {record.email} • {record.jobTitle || record.department || 'Nhân sự'}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Vai trò hệ thống',
                        dataIndex: 'role',
                        key: 'role',
                        width: 140,
                        render: (role) => (
                          <Tag color={role === 'admin' ? 'purple' : role === 'project_manager' ? 'blue' : 'default'}>
                            {role === 'admin' ? 'Owner / Admin' : role === 'project_manager' ? 'Quản lý (PM)' : 'Thành viên'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Ứng dụng làm App Admin',
                        dataIndex: 'appAdmins',
                        key: 'appAdmins',
                        render: (appAdmins = []) => {
                          if (!appAdmins || appAdmins.length === 0) {
                            return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                          }
                          return (
                            <Space wrap size={4}>
                              {appAdmins.map((k) => (
                                <Tag key={k} color="cyan" style={{ borderRadius: 4, fontSize: 11 }}>
                                  {appsCatalog.find((a) => a.key === k)?.name || k}
                                </Tag>
                              ))}
                            </Space>
                          );
                        },
                      },
                      {
                        title: 'Quyền chìa khóa 🔑',
                        dataIndex: 'specialGrants',
                        key: 'specialGrants',
                        width: 180,
                        render: (grants = [], record) => {
                          const hasEmailKey = grants.includes('can_change_email');
                          return (
                            <Button
                              size="small"
                              type={hasEmailKey ? 'primary' : 'default'}
                              icon={<KeyOutlined />}
                              style={{
                                fontSize: 11.5,
                                background: hasEmailKey ? '#d97706' : undefined,
                                borderColor: hasEmailKey ? '#d97706' : undefined,
                              }}
                              onClick={() => handleToggleSpecialGrant(record, 'can_change_email')}
                            >
                              {hasEmailKey ? 'Được đổi Email' : 'Cấp quyền đổi Email'}
                            </Button>
                          );
                        },
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 130,
                        align: 'center',
                        render: (_, record) => (
                          <Button
                            size="small"
                            type="link"
                            icon={<SettingOutlined />}
                            onClick={() => handleOpenAppAdminModal(record)}
                          >
                            Phân quyền
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'guests',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <IdcardOutlined />
                <span>Tài khoản Khách (Guest Accounts)</span>
                <Badge count={guests.length} style={{ backgroundColor: '#10b981', fontSize: 10 }} />
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700 }}>
                      Quản Lý Tài Khoản Khách (Guest Accounts)
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Tài khoản dành riêng cho đối tác, khách hàng bên ngoài theo dõi tiến độ dự án
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#2563eb' }}
                    onClick={() => setGuestModalOpen(true)}
                  >
                    + Tạo tài khoản khách
                  </Button>
                </div>

                <Table
                  size="small"
                  rowKey="_id"
                  dataSource={guests}
                  columns={[
                    {
                      title: 'Họ tên & Email',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name, record) => (
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{name}</Text>
                          <Tag color="cyan" style={{ marginLeft: 8, fontSize: 10 }}>Guest</Tag>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            {record.email}
                          </Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Công ty / Tổ chức',
                      dataIndex: 'companyName',
                      key: 'companyName',
                      render: (val) => val || 'Khách hàng đối tác',
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'isActive',
                      key: 'isActive',
                      render: (isActive) => (
                        <Tag color={isActive ? 'success' : 'error'}>
                          {isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Quyền truy cập',
                      key: 'perm',
                      render: () => (
                        <Tag color="blue">Truy cập dự án (Base Work+)</Tag>
                      ),
                    },
                  ]}
                  locale={{ emptyText: 'Chưa có tài khoản khách nào. Bấm nút tạo mới để thêm.' }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Modal: Chỉ định App Admin cho Người dùng */}
      <Modal
        title={`Phân quyền Quản trị Ứng dụng cho: ${selectedUserForAppAdmin?.name || ''}`}
        open={appAdminModalOpen}
        onCancel={() => setAppAdminModalOpen(false)}
        onOk={handleSaveAppAdmin}
        confirmLoading={savingAppAdmin}
        okText="Lưu quyền App Admin"
        cancelText="Hủy"
        width={560}
      >
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Chọn các ứng dụng mà <strong>{selectedUserForAppAdmin?.name}</strong> sẽ giữ vai trò <strong>Quản trị ứng dụng (App Admin)</strong>:
        </Paragraph>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
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
                  padding: '12px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: isChecked
                    ? `1.5px solid ${app.color}`
                    : isDark
                    ? '1px solid #334155'
                    : '1px solid #e2e8f0',
                  background: isChecked
                    ? `${app.color}10`
                    : isDark
                    ? 'rgba(15, 23, 42, 0.5)'
                    : '#ffffff',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: isChecked ? app.color : undefined }}>
                    {app.name}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{app.tagline}</Text>
                </div>

                {isChecked ? (
                  <Tag color="success" style={{ fontWeight: 600 }}>Đã chọn</Tag>
                ) : (
                  <Tag style={{ opacity: 0.6 }}>Chưa cấp</Tag>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Modal: Tạo tài khoản khách (Guest Account) */}
      <Modal
        title="Tạo Tài Khoản Khách Mới (Guest Account)"
        open={guestModalOpen}
        onCancel={() => setGuestModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={guestForm} layout="vertical" onFinish={handleCreateGuest} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Họ và tên khách / Đối tác"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="VD: Nguyễn Văn Đối Tác" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email đăng nhập"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<GlobalOutlined style={{ color: '#94a3b8' }} />} placeholder="guest@partner.com" />
          </Form.Item>

          <Form.Item
            name="companyName"
            label="Công ty / Tổ chức đối tác"
            rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
          >
            <Input prefix={<ApartmentOutlined style={{ color: '#94a3b8' }} />} placeholder="VD: Công ty TNHH Đối Tác Alpha" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu khởi tạo"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu tối thiểu 6 ký tự', min: 6 }]}
          >
            <Input.Password placeholder="Mật khẩu tối thiểu 6 ký tự" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button onClick={() => setGuestModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creatingGuest} style={{ background: '#2563eb' }}>
              Tạo tài khoản khách
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
