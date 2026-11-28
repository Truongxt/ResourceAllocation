import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Tag,
  Typography,
  Space,
  Tooltip,
  Avatar,
  Empty,
  Spin,
  Segmented,
  Input,
  Alert,
} from 'antd';
import {
  TeamOutlined,
  ApartmentOutlined,
  SwapOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import WorkloadBreakdown from './WorkloadBreakdown';

const { Text, Paragraph } = Typography;

/**
 * Bảng màu kỷ luật cho thanh tải công việc:
 * - Quá tải (>100%): Đỏ cảnh báo (#dc2626)
 * - Tiệm cận định mức (86% - 100%): Cam hổ phách (#d97706)
 * - Tải cân bằng (60% - 85%): Xanh lá (#059669)
 * - Còn nhiều công suất (<60%): Xanh lam trầm (#2563eb) — tránh tô màu cam cảnh báo khắp màn hình khi nhân sự đang rảnh
 */
function resolveBarColor(item) {
  const rate = item?.utilizationRate || 0;
  if (item?.statusCode === 'red' || rate > 100) return '#dc2626';
  if (item?.statusCode === 'green' || (rate >= 60 && rate <= 85)) return '#059669';
  if (rate > 85) return '#d97706';
  return '#2563eb';
}

export default function WorkloadProductivityChart({
  productivityData,
  loading,
  error,
  onReassign,
  onRefresh,
}) {
  const [viewMode, setViewMode] = useState('personnel'); // 'personnel' | 'department'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'red' | 'yellow' | 'green'
  const [searchText, setSearchText] = useState('');
  const [selection, setSelection] = useState(null);

  const summary = productivityData?.summary || {
    totalPersonnel: 0,
    totalDepartments: 0,
    redCount: 0,
    yellowCount: 0,
    greenCount: 0,
    avgUtilization: 0,
  };
  const period = productivityData?.period;

  const personnel = useMemo(() => productivityData?.personnel || [], [productivityData]);
  const departments = useMemo(() => productivityData?.departments || [], [productivityData]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.statusCode === statusFilter;
      const q = searchText.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.position?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q) ||
        p.employeeId?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [personnel, statusFilter, searchText]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.statusCode === statusFilter;
      const q = searchText.trim().toLowerCase();
      const matchSearch = !q || d.name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [departments, statusFilter, searchText]);

  if (loading && !productivityData) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không tải được dữ liệu năng suất và cân bằng tải"
        action={onRefresh && <Button onClick={onRefresh}>Thử lại</Button>}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. HƯỚNG DẪN ĐỌC & ĐIỀU PHỐI TẢI (Criterion 2: Đẩy nội dung hướng dẫn rõ ràng) */}
      <div className="workspace-guide-banner">
        <div className="workspace-guide-content">
          <div className="workspace-guide-header">
            <span className="workspace-guide-badge">Hướng dẫn điều phối</span>
            <span className="workspace-guide-title">
              {period
                ? `Kỳ tính tải đang chọn: ${period.from} → ${period.to}`
                : 'Quy tắc tính tải & cân bằng công suất đội ngũ'}
            </span>
          </div>
          <ul className="workspace-guide-steps">
            <li>
              <span className="workspace-guide-step-num">1</span>
              <span>
                <strong>Phạm vi giờ tải:</strong> Chỉ cộng giờ kế hoạch của việc đang mở trong kỳ (trừ lịch nghỉ & nhân hệ số FTE); việc đã hoàn thành không còn chiếm tải.
              </span>
            </li>
            <li>
              <span className="workspace-guide-step-num">2</span>
              <span>
                <strong>Xem công thức chi tiết:</strong> Bấm vào liên kết <strong>Số giờ / Định mức · Chi tiết</strong> trên từng dòng để mở bảng giải trình từng công việc.
              </span>
            </li>
            <li>
              <span className="workspace-guide-step-num">3</span>
              <span>
                <strong>San tải tức thời:</strong> Nhân sự vượt vạch chuẩn <strong>100%</strong> sẽ hiển thị cảnh báo đỏ — bấm <strong>San tải việc / Chuyển việc</strong> để bàn giao bớt.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 2. DẢI CHỈ SỐ TỔNG HỢP (Unified Ledger Strip — Không dùng 4 thẻ cầu vồng lòe loẹt) */}
      <section className="metric-strip" aria-label="Tổng hợp trạng thái tải nguồn lực">
        <div className="metric-cell">
          <span>Tổng quy mô nguồn lực</span>
          <div>
            <strong>{summary.totalPersonnel}</strong>
            <small style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
              nhân sự / {summary.totalDepartments} phòng
            </small>
          </div>
        </div>

        <div className={summary.redCount > 0 ? 'metric-cell metric-cell-danger' : 'metric-cell'}>
          <span>Quá tải (Cần san tải)</span>
          <div>
            <strong>{summary.redCount}</strong>
            <small style={{ marginLeft: 6, fontSize: 12, color: summary.redCount > 0 ? 'var(--status-danger)' : 'var(--text-tertiary)' }}>
              nhân sự (&gt;100% tải)
            </small>
          </div>
        </div>

        <div className="metric-cell">
          <span>Tải cân bằng</span>
          <div>
            <strong>{summary.greenCount}</strong>
            <small style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
              nhân sự (60% – 85% tải)
            </small>
          </div>
        </div>

        <div className="metric-cell">
          <span>Cần chú ý / Còn công suất</span>
          <div>
            <strong>{summary.yellowCount}</strong>
            <small style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
              nhân sự (&lt;60% hoặc 86–100%)
            </small>
          </div>
        </div>
      </section>

      {/* 3. THANH CÔNG CỤ CHUYỂN CHẾ ĐỘ XEM & LỌC TRẠNG THÁI */}
      <div className="work-toolbar" style={{ marginBottom: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space wrap size={12}>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  label: (
                    <Space size={6}>
                      <TeamOutlined />
                      <span>Theo Nhân sự ({personnel.length})</span>
                    </Space>
                  ),
                  value: 'personnel',
                },
                {
                  label: (
                    <Space size={6}>
                      <ApartmentOutlined />
                      <span>Theo Phòng ban ({departments.length})</span>
                    </Space>
                  ),
                  value: 'department',
                },
              ]}
            />
          </Space>

          <Space wrap size={8} align="center">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              Lọc trạng thái:
            </Text>
            {[
              { key: 'all', label: 'Tất cả', dot: null },
              { key: 'red', label: `Quá tải (${summary.redCount})`, dot: '#dc2626' },
              { key: 'yellow', label: `Cần chú ý (${summary.yellowCount})`, dot: '#d97706' },
              { key: 'green', label: `Tải cân bằng (${summary.greenCount})`, dot: '#059669' },
            ].map((item) => {
              const active = statusFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  aria-pressed={active}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 11px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    border: active ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                    background: active ? 'var(--brand-primary)' : 'var(--surface-card)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 140ms var(--ease-out)',
                  }}
                >
                  {item.dot && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: active ? '#ffffff' : item.dot,
                      }}
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </Space>

          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            placeholder="Tìm nhân viên, vị trí, phòng ban..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 230 }}
          />
        </div>
      </div>

      {/* 4. BẢNG GIẢI TRÌNH PHÉP TÍNH GIỜ KHI BẤM CHI TIẾT */}
      <WorkloadBreakdown selection={selection} period={period} onClose={() => setSelection(null)} />

      {/* 5. DANH SÁCH TRỌNG TÂM: BIỂU ĐỒ TẢI THEO NHÂN SỰ / PHÒNG BAN */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              {viewMode === 'personnel'
                ? 'Tải việc đang mở theo Nhân sự'
                : 'Tải việc đang mở theo Phòng ban'}
            </span>
            <Tooltip title="Vạch chuẩn 100% biểu thị định mức công suất khả dụng trong kỳ (sau khi nhân FTE và trừ ngày nghỉ). Thanh vượt qua vạch 100% là quá tải.">
              <InfoCircleOutlined style={{ color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13 }} />
            </Tooltip>
          </div>
        }
        extra={
          <Space size={16} wrap>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb' }} />
              Còn công suất (&lt;60%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669' }} />
              Tải cân bằng (60% – 85%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#d97706' }} />
              Tiệm cận (86% – 100%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#dc2626' }} />
              Quá tải (&gt;100%)
            </span>
          </Space>
        }
        styles={{ body: { padding: '16px 20px' } }}
      >
        {viewMode === 'personnel' ? (
          <div>
            {filteredPersonnel.length === 0 ? (
              <Empty description="Không có nhân sự nào khớp bộ lọc" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredPersonnel.map((person) => {
                  const utilPercent = person.utilizationRate || 0;
                  const barFillPercent = Math.min(100, (utilPercent / 130) * 100);
                  const isRed = person.statusCode === 'red';
                  const barColor = resolveBarColor(person);
                  const metaParts = [person.employeeId, person.position, person.department].filter(Boolean);

                  return (
                    <div
                      key={person._id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: isRed ? '1px solid #fca5a5' : '1px solid var(--border-subtle)',
                        borderLeft: isRed ? '3px solid #dc2626' : '1px solid var(--border-subtle)',
                        background: isRed ? 'var(--status-danger-bg)' : 'var(--surface-card)',
                        transition: 'border-color 140ms var(--ease-out)',
                      }}
                    >
                      {/* Hàng 1: Định danh nhân sự (Trái) & Số giờ + Thao tác điều phối (Phải) */}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <Avatar
                            src={person.avatar}
                            icon={<UserOutlined />}
                            size={32}
                            style={{
                              backgroundColor: isRed ? '#fee2e2' : 'var(--surface-sunken)',
                              color: isRed ? '#dc2626' : 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              fontWeight: 600,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {person.name?.charAt(0)?.toUpperCase()}
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                              <Text strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                                {person.name}
                              </Text>
                              {metaParts.length > 0 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {metaParts.join(' · ')}
                                </Text>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: '0 4px', fontWeight: 600 }}
                            onClick={() => setSelection({ name: person.name, people: [person] })}
                          >
                            {person.workload}h / {person.capacity}h · Chi tiết
                          </Button>

                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 5,
                              background: isRed ? '#fee2e2' : 'var(--surface-sunken)',
                              color: isRed ? '#dc2626' : 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {person.noCapacity ? 'Không có công suất' : `${person.utilizationRate}% tải`}
                          </span>

                          {isRed ? (
                            <Button
                              type="primary"
                              danger
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => onReassign && onReassign(person)}
                            >
                              San tải việc
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => onReassign && onReassign(person)}
                            >
                              Chuyển việc
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Hàng 2: Thanh công suất trực quan (Trọng tâm thị giác) */}
                      <div
                        style={{
                          position: 'relative',
                          height: 16,
                          background: 'var(--surface-sunken)',
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {/* Vạch định mức 100% */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: 1.5,
                            background: 'var(--text-secondary)',
                            zIndex: 3,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: 1,
                            fontSize: 9,
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            zIndex: 4,
                            transform: 'translateX(-115%)',
                          }}
                        >
                          100%
                        </div>

                        <div
                          style={{
                            width: `${barFillPercent}%`,
                            height: '100%',
                            background: barColor,
                            transition: 'width 0.4s var(--ease-out)',
                          }}
                        />
                      </div>

                      {person.workload === 0 && person.doneTasks > 0 && (
                        <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 12 }}>
                          0h là không có giờ kế hoạch của việc đang mở trong kỳ. Kết quả đã hoàn thành vẫn được ghi nhận bên dưới.
                        </Paragraph>
                      )}

                      {/* Hàng 3: Thông tin phụ trợ đặt gọn bằng chữ trung tính */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <Space size={14} wrap>
                          <span>
                            Việc đang mở: <strong style={{ color: 'var(--text-secondary)' }}>{person.activeTasks} việc</strong>
                          </span>
                          <span>
                            Đã hoàn thành: <strong style={{ color: 'var(--text-secondary)' }}>{person.doneTasks}/{person.totalTasks} việc</strong>
                          </span>
                          <span>
                            Đúng hạn (lịch sử):{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>
                              {person.productivityScore === null ? 'Chưa đủ dữ liệu' : `${person.productivityScore}%`}
                            </strong>
                          </span>
                          {person.unscheduledWorkload > 0 && (
                            <span style={{ color: 'var(--status-warning)', fontWeight: 500 }}>
                              {person.unscheduledWorkload}h chưa xếp lịch
                            </span>
                          )}
                        </Space>
                        <span
                          style={{
                            fontWeight: 600,
                            color: isRed ? 'var(--status-danger)' : 'var(--text-secondary)',
                          }}
                        >
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
          <div>
            {filteredDepartments.length === 0 ? (
              <Empty description="Không có phòng ban nào khớp bộ lọc" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredDepartments.map((dept) => {
                  const utilPercent = dept.utilizationRate || 0;
                  const barFillPercent = Math.min(100, (utilPercent / 130) * 100);
                  const isRed = dept.statusCode === 'red';
                  const barColor = resolveBarColor(dept);

                  return (
                    <div
                      key={dept.name}
                      style={{
                        padding: '14px 18px',
                        borderRadius: 8,
                        border: isRed ? '1px solid #fca5a5' : '1px solid var(--border-subtle)',
                        borderLeft: isRed ? '3px solid #dc2626' : '1px solid var(--border-subtle)',
                        background: isRed ? 'var(--status-danger-bg)' : 'var(--surface-card)',
                      }}
                    >
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
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 7,
                              background: 'var(--surface-sunken)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ApartmentOutlined style={{ fontSize: 16, color: isRed ? '#dc2626' : 'var(--text-primary)' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {dept.name}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Quy mô: {dept.personnelCount} nhân sự · {dept.totalActiveTasks || 0} việc đang mở
                            </Text>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: '0 4px', fontWeight: 600 }}
                            onClick={() =>
                              setSelection({
                                name: dept.name,
                                people: personnel.filter((person) => person.department === dept.name),
                              })
                            }
                          >
                            {dept.totalWorkload}h / {dept.totalCapacity}h · Chi tiết
                          </Button>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 5,
                              background: isRed ? '#fee2e2' : 'var(--surface-sunken)',
                              color: isRed ? '#dc2626' : 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {dept.totalCapacity === 0 ? 'Không có công suất' : `${dept.utilizationRate}% tải phòng`}
                          </span>
                          {isRed && (
                            <Tag color="error" style={{ margin: 0 }}>
                              {dept.overloadedCount} nhân sự quá tải
                            </Tag>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          position: 'relative',
                          height: 16,
                          background: 'var(--surface-sunken)',
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: 1.5,
                            background: 'var(--text-secondary)',
                            zIndex: 3,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(100 / 130) * 100}%`,
                            top: 1,
                            fontSize: 9,
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            zIndex: 4,
                            transform: 'translateX(-115%)',
                          }}
                        >
                          100%
                        </div>
                        <div
                          style={{
                            width: `${barFillPercent}%`,
                            height: '100%',
                            background: barColor,
                            transition: 'width 0.4s var(--ease-out)',
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 8,
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span>
                            Đúng hạn TB (lịch sử):{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>
                              {dept.avgProductivity === null ? 'Chưa đủ dữ liệu' : `${dept.avgProductivity}%`}
                            </strong>
                          </span>
                          {dept.members?.length > 0 && (
                            <Avatar.Group max={{ count: 5 }} size="small">
                              {dept.members.map((m) => (
                                <Tooltip key={m._id} title={`${m.name} (${m.utilizationRate}% tải)`}>
                                  <Avatar
                                    src={m.avatar}
                                    style={{
                                      backgroundColor: 'var(--surface-sunken)',
                                      color: 'var(--text-primary)',
                                      border: m.statusCode === 'red' ? '1.5px solid #dc2626' : '1px solid var(--border-subtle)',
                                      fontSize: 11,
                                    }}
                                  >
                                    {m.name?.charAt(0)}
                                  </Avatar>
                                </Tooltip>
                              ))}
                            </Avatar.Group>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                          <span>Cân bằng: <strong style={{ color: 'var(--text-secondary)' }}>{dept.optimalCount || 0}</strong></span>
                          <span>Còn công suất: <strong style={{ color: 'var(--text-secondary)' }}>{dept.underloadedCount || 0}</strong></span>
                          <span>Tiệm cận: <strong style={{ color: 'var(--text-secondary)' }}>{dept.nearCapacityCount || 0}</strong></span>
                          <span style={{ color: dept.overloadedCount > 0 ? 'var(--status-danger)' : undefined }}>
                            Quá tải: <strong>{dept.overloadedCount || 0}</strong>
                          </span>
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
