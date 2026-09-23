import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Radio,
  Space,
  Typography,
  Tooltip,
  Input,
  Badge,
  Empty,
  Avatar,
} from 'antd';
import {
  TeamOutlined,
  ApartmentOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

export default function WorkloadProductivityChart({
  productivityData,
  loading = false,
  onReassign,
  onRefresh,
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('personnel'); // 'personnel' | 'department'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'red' | 'yellow' | 'green'
  const [search, setSearch] = useState('');

  const personnel = productivityData?.personnel || [];
  const departments = productivityData?.departments || [];
  const summary = productivityData?.summary || {
    totalPersonnel: personnel.length,
    totalDepartments: departments.length,
    greenCount: personnel.filter((p) => p.statusCode === 'green').length,
    yellowCount: personnel.filter((p) => p.statusCode === 'yellow').length,
    redCount: personnel.filter((p) => p.statusCode === 'red').length,
    avgUtilization: 0,
  };

  // Filter personnel list
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.statusCode === statusFilter;
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.department && p.department.toLowerCase().includes(search.toLowerCase())) ||
        (p.position && p.position.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [personnel, statusFilter, search]);

  // Filter department list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.statusCode === statusFilter;
      const matchSearch = !search.trim() || d.name.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [departments, statusFilter, search]);

  return (
    <div style={{ marginTop: 12 }}>
      {/* 1. Header & Summary KPI Strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              borderRadius: 12,
              borderLeft: '4px solid #6366f1',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Tổng quy mô nguồn lực
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                  {summary.totalPersonnel}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>
                    nhân sự / {summary.totalDepartments} phòng
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TeamOutlined style={{ fontSize: 22, color: '#6366f1' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              borderRadius: 12,
              borderLeft: '4px solid #ef4444',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
              background: summary.redCount > 0 ? '#fef2f2' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, color: '#991b1b' }}>
                  Quá tải (Cần san tải ⚠️)
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                  {summary.redCount}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#b91c1c' }}>
                    nhân sự (&gt;100% tải)
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WarningOutlined style={{ fontSize: 22, color: '#ef4444' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              borderRadius: 12,
              borderLeft: '4px solid #10b981',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, color: '#065f46' }}>
                  Năng suất tối ưu
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                  {summary.greenCount}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#047857' }}>
                    nhân sự (60% - 85%)
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleOutlined style={{ fontSize: 22, color: '#10b981' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              borderRadius: 12,
              borderLeft: '4px solid #f59e0b',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>
                  Nhàn rỗi / Chú ý
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                  {summary.yellowCount}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#b45309' }}>
                    nhân sự (&lt;50% hoặc &gt;85%)
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ThunderboltOutlined style={{ fontSize: 22, color: '#f59e0b' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2. Controls & Filter Bar */}
      <Card
        styles={{ body: { padding: '14px 20px' } }}
        style={{
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Switch View Mode */}
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="personnel">
              <TeamOutlined /> Theo Nhân sự ({personnel.length})
            </Radio.Button>
            <Radio.Button value="department">
              <ApartmentOutlined /> Theo Phòng ban ({departments.length})
            </Radio.Button>
          </Radio.Group>

          {/* Status Color Filters */}
          <Space wrap size={8}>
            <Text type="secondary" style={{ fontSize: 13, marginRight: 4 }}>
              Lọc trạng thái:
            </Text>
            <Tag.CheckableTag
              checked={statusFilter === 'all'}
              onChange={() => setStatusFilter('all')}
              style={{ borderRadius: 14, padding: '2px 12px' }}
            >
              Tất cả
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={statusFilter === 'red'}
              onChange={() => setStatusFilter('red')}
              style={{
                borderRadius: 14,
                padding: '2px 12px',
                background: statusFilter === 'red' ? '#ef4444' : undefined,
                color: statusFilter === 'red' ? '#fff' : '#ef4444',
                borderColor: '#ef4444',
              }}
            >
              🔴 Quá tải ({summary.redCount})
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={statusFilter === 'yellow'}
              onChange={() => setStatusFilter('yellow')}
              style={{
                borderRadius: 14,
                padding: '2px 12px',
                background: statusFilter === 'yellow' ? '#f59e0b' : undefined,
                color: statusFilter === 'yellow' ? '#fff' : '#d97706',
                borderColor: '#f59e0b',
              }}
            >
              🟡 Nhàn rỗi / Chạm trần ({summary.yellowCount})
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={statusFilter === 'green'}
              onChange={() => setStatusFilter('green')}
              style={{
                borderRadius: 14,
                padding: '2px 12px',
                background: statusFilter === 'green' ? '#10b981' : undefined,
                color: statusFilter === 'green' ? '#fff' : '#059669',
                borderColor: '#10b981',
              }}
            >
              🟢 Năng suất tối ưu ({summary.greenCount})
            </Tag.CheckableTag>
          </Space>

          {/* Search Box */}
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder={viewMode === 'personnel' ? 'Tìm nhân viên, vị trí, phòng...' : 'Tìm phòng ban...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220, borderRadius: 8 }}
            allowClear
          />
        </div>
      </Card>

      {/* 3. Visual Bar Chart Section */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {viewMode === 'personnel'
                ? '📊 Sơ đồ Cột Tải trọng & Năng suất theo Nhân sự'
                : '🏢 Sơ đồ Cột Tải trọng & Năng suất theo Phòng ban'}
            </span>
            <Tooltip title="Vạch chuẩn 100% biểu thị công suất tuần chuẩn (40h/tuần). Cột vượt quá vạch này sẽ chuyển sang màu đỏ báo động quá tải. Bấm nút 'San tải việc' để điều chuyển công việc tức thời.">
              <InfoCircleOutlined style={{ color: '#6366f1', cursor: 'pointer' }} />
            </Tooltip>
          </div>
        }
        extra={
          <Space size={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981' }} />
              <Text type="secondary">🟢 Tối ưu (60% - 85%)</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f59e0b' }} />
              <Text type="secondary">🟡 Chú ý (&lt;50% hoặc &gt;85%)</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444' }} />
              <Text type="secondary">🔴 Quá tải (&gt;100%)</Text>
            </div>
          </Space>
        }
        styles={{ body: { padding: '20px 24px' } }}
        style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
      >
        {viewMode === 'personnel' ? (
          // ================= PERSONNEL BAR CHARTS =================
          <div>
            {filteredPersonnel.length === 0 ? (
              <Empty description="Không có nhân sự nào khớp bộ lọc" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredPersonnel.map((person) => {
                  const utilPercent = person.utilizationRate || 0;
                  const barFillPercent = Math.min(100, (utilPercent / 130) * 100);
                  const isRed = person.statusCode === 'red';

                  return (
                    <div
                      key={person._id}
                      style={{
                        padding: '14px 18px',
                        borderRadius: 10,
                        border: isRed ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                        background: isRed ? '#fff5f5' : '#ffffff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top Info Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar
                            src={person.avatar}
                            icon={<UserOutlined />}
                            style={{
                              backgroundColor: isRed ? '#ef4444' : '#6366f1',
                              fontWeight: 600,
                            }}
                          >
                            {person.name?.charAt(0)?.toUpperCase()}
                          </Avatar>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text strong style={{ fontSize: 14 }}>
                                {person.name}
                              </Text>
                              <Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>
                                {person.employeeId}
                              </Tag>
                              <Tag color="purple" style={{ fontSize: 11, borderRadius: 4 }}>
                                {person.position}
                              </Tag>
                              <Tag style={{ fontSize: 11, borderRadius: 4 }}>
                                📁 {person.department}
                              </Tag>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Button for Overloaded Personnel */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Tooltip title={`Tải: ${person.workload}h / Định mức: ${person.capacity}h/tuần`}>
                            <Tag
                              color={person.color}
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: 12,
                              }}
                            >
                              {person.utilizationRate}% Công suất
                            </Tag>
                          </Tooltip>

                          <Tooltip title="Điểm năng suất kết hợp tỷ lệ hoàn thành đúng hạn và đánh giá của quản lý">
                            <Tag color="cyan" style={{ fontSize: 12, borderRadius: 12 }}>
                              ⭐ Năng suất: {person.productivityScore}/100
                            </Tag>
                          </Tooltip>

                          {/* San tải việc button */}
                          {isRed ? (
                            <Button
                              type="primary"
                              danger
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => onReassign && onReassign(person)}
                              style={{
                                borderRadius: 6,
                                fontWeight: 600,
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                              }}
                            >
                              San tải việc ➔
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => onReassign && onReassign(person)}
                              style={{ borderRadius: 6, fontSize: 12 }}
                            >
                              Chuyển việc
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Bar Visualization Container */}
                      <div style={{ position: 'relative', height: 26, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                        {/* 100% capacity guideline */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: '#475569',
                            zIndex: 3,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: -1,
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#475569',
                            zIndex: 4,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          100%
                        </div>

                        {/* Filled Workload Bar */}
                        <div
                          style={{
                            width: `${barFillPercent}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${person.color}dd, ${person.color})`,
                            borderRadius: '6px 0 0 6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: 8,
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          {barFillPercent > 18 && (
                            <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                              {person.workload}h
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Metrics Details */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 6,
                          fontSize: 11.5,
                          color: '#64748b',
                        }}
                      >
                        <Space size={14}>
                          <span>
                            📋 Đang nhận: <strong>{person.activeTasks} task</strong> ({person.totalTasks} tổng cộng)
                          </span>
                          <span>
                            🎯 Đúng hạn: <strong>{person.onTimeRate}%</strong>
                          </span>
                          {person.unscheduledWorkload > 0 && (
                            <span style={{ color: '#d97706' }}>
                              ⚠️ {person.unscheduledWorkload}h chưa xếp lịch
                            </span>
                          )}
                        </Space>
                        <span style={{ fontWeight: 600, color: person.color }}>
                          {person.statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // ================= DEPARTMENT BAR CHARTS =================
          <div>
            {filteredDepartments.length === 0 ? (
              <Empty description="Không có phòng ban nào khớp bộ lọc" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {filteredDepartments.map((dept) => {
                  const utilPercent = dept.utilizationRate || 0;
                  const barFillPercent = Math.min(100, (utilPercent / 130) * 100);
                  const isRed = dept.statusCode === 'red';

                  return (
                    <div
                      key={dept.name}
                      style={{
                        padding: '16px 20px',
                        borderRadius: 12,
                        border: isRed ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                        background: isRed ? '#fff5f5' : '#ffffff',
                      }}
                    >
                      {/* Dept Top Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              background: isRed ? '#fee2e2' : '#e0e7ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ApartmentOutlined style={{ fontSize: 20, color: isRed ? '#ef4444' : '#4338ca' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                              {dept.name}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Quy mô: {dept.personnelCount} nhân sự • {dept.totalActiveTasks} task đang làm
                            </Text>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Tag
                            color={dept.color}
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              padding: '4px 12px',
                              borderRadius: 12,
                            }}
                          >
                            {dept.utilizationRate}% Tải Phòng
                          </Tag>

                          <Tag color="cyan" style={{ fontSize: 12, borderRadius: 12 }}>
                            ⭐ Năng suất TB: {dept.avgProductivity}/100
                          </Tag>

                          {isRed && (
                            <Tag color="error" style={{ borderRadius: 6, fontWeight: 600 }}>
                              ⚠️ {dept.overloadedCount} nhân viên quá tải!
                            </Tag>
                          )}
                        </div>
                      </div>

                      {/* Bar Visualization Container */}
                      <div style={{ position: 'relative', height: 28, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                        {/* 100% capacity guideline */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: '#475569',
                            zIndex: 3,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: -1,
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#475569',
                            zIndex: 4,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          100%
                        </div>

                        {/* Filled Workload Bar */}
                        <div
                          style={{
                            width: `${barFillPercent}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${dept.color}dd, ${dept.color})`,
                            borderRadius: '6px 0 0 6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: 10,
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          {barFillPercent > 18 && (
                            <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                              {dept.totalWorkload}h / {dept.totalCapacity}h
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Member Avatars & Status Breakdown */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 10,
                          fontSize: 12,
                          color: '#64748b',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text type="secondary">Nhân sự:</Text>
                          <Avatar.Group maxCount={5} size="small">
                            {dept.members.map((m) => (
                              <Tooltip key={m._id} title={`${m.name} (${m.utilizationRate}% tải - ${m.statusLabel})`}>
                                <Avatar
                                  src={m.avatar}
                                  style={{
                                    backgroundColor: m.color,
                                    border: m.statusCode === 'red' ? '2px solid #ef4444' : undefined,
                                  }}
                                >
                                  {m.name?.charAt(0)}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </Avatar.Group>
                        </div>

                        <div style={{ display: 'flex', gap: 12, fontWeight: 600 }}>
                          <span style={{ color: '#10b981' }}>🟢 {dept.optimalCount} Tối ưu</span>
                          <span style={{ color: '#f59e0b' }}>🟡 {dept.underloadedCount} Nhàn rỗi</span>
                          <span style={{ color: '#ef4444' }}>🔴 {dept.overloadedCount} Quá tải</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
