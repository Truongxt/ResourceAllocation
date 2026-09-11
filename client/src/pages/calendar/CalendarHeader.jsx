import React from 'react';
import { Button, Space, Typography, Segmented, Select } from 'antd';
import { LeftOutlined, RightOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function CalendarHeader({
    currentDate,
    viewMode,
    onViewModeChange,
    onPrev,
    onNext,
    onToday,
    selectedAssignee,
    onAssigneeChange,
    resources = [],
    userRole,
}) {
    // Format tiêu đề thời gian tuỳ theo chế độ xem
    const getHeaderTitle = () => {
        if (viewMode === 'month') return currentDate.format('MMMM, YYYY');
        if (viewMode === 'week') {
            const start = currentDate.startOf('week').format('DD/MM');
            const end = currentDate.endOf('week').format('DD/MM/YYYY');
            return `${start} - ${end}`;
        }
        return currentDate.format('dddd, DD/MM/YYYY');
    };

    return (
        <div
            className="saas-card"
            style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
            }}
        >
            {/* Cụm 1: Tiêu đề và nút Hôm nay, Prev, Next */}
            <Space size="middle" align="center">
                <Title level={4} style={{ margin: 0, textTransform: 'capitalize', minWidth: 180 }}>
                    {getHeaderTitle()}
                </Title>
                <Button onClick={onToday} style={{ borderRadius: 8, fontWeight: 600 }}>
                    Hôm nay
                </Button>
                <Space.Compact>
                    <Button icon={<LeftOutlined />} onClick={onPrev} style={{ borderRadius: '8px 0 0 8px' }} />
                    <Button icon={<RightOutlined />} onClick={onNext} style={{ borderRadius: '0 8px 8px 0' }} />
                </Space.Compact>
            </Space>

            {/* Cụm 2: Bộ lọc nhân sự (dành cho PM/Admin) & Bộ chuyển Ngày/Tuần/Tháng */}
            <Space size="middle" align="center">
                {userRole !== 'member' && (
                    <Select
                        allowClear
                        placeholder="Tất cả nhân viên"
                        style={{ width: 190 }}
                        value={selectedAssignee}
                        onChange={onAssigneeChange}
                        prefix={<UserOutlined style={{ color: '#6366f1' }} />}
                        options={resources.map((r) => ({
                            value: r.user?._id || r._id,
                            label: `${r.name || r.user?.name} (${r.position || 'Nhân sự'})`,
                        }))}
                    />
                )}

                <Segmented
                    value={viewMode}
                    onChange={onViewModeChange}
                    options={[
                        { label: 'Tháng', value: 'month' },
                        { label: 'Tuần', value: 'week' },
                        { label: 'Ngày', value: 'day' },
                    ]}
                    style={{ fontWeight: 600 }}
                />
            </Space>
        </div>
    );
}
