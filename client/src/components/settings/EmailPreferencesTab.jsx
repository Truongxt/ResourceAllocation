import React, { useState, useEffect } from 'react';
import {
  Typography,
  Switch,
  Button,
  message,
  Row,
  Col,
  Tag,
  Alert,
  Divider,
  Card,
  Space,
} from 'antd';
import {
  MailOutlined,
  CheckCircleFilled,
  SendOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  FolderOpenOutlined,
  ScheduleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

export default function EmailPreferencesTab({ user }) {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [prefs, setPrefs] = useState({
    task_assigned: true,
    task_review: true,
    task_failed: true,
    task_deadline: true,
    optimization_applied: true,
    project_member_added: true,
    daily_digest: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const res = await authService.getEmailPreferences();
      if (res.success && res.data?.emailPreferences) {
        setPrefs((prev) => ({
          ...prev,
          ...res.data.emailPreferences,
        }));
      }
    } catch (err) {
      console.error('Lỗi khi tải tùy chọn email:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key, checked) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authService.updateEmailPreferences(prefs);
      if (res.success) {
        message.success(res.message || 'Đã lưu tùy chọn nhận email thành công!');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể lưu tùy chọn email');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    try {
      const res = await authService.sendTestEmail();
      if (res.success) {
        if (res.simulated) {
          message.info(res.message);
        } else {
          message.success(res.message);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể gửi email thử nghiệm');
    } finally {
      setSendingTest(false);
    }
  };

  const items = [
    {
      key: 'task_assigned',
      title: 'Phân công công việc mới',
      desc: 'Nhận thông báo khi bạn được giao một công việc hoặc nhiệm vụ mới trong dự án.',
      icon: <NotificationOutlined style={{ color: '#2563eb', fontSize: 18 }} />,
      badge: 'Khuyên dùng',
    },
    {
      key: 'task_review',
      title: 'Yêu cầu & Kết quả phê duyệt nghiệm thu',
      desc: 'Nhận thông báo khi có việc chờ bạn đánh giá, hoặc khi kết quả công việc của bạn được duyệt / bị từ chối.',
      icon: <CheckCircleFilled style={{ color: '#10b981', fontSize: 18 }} />,
      badge: 'Khuyên dùng',
    },
    {
      key: 'task_failed',
      title: 'Cảnh báo công việc thất bại',
      desc: 'Nhận email cảnh báo khẩn khi công việc trong dự án của bạn bị đánh dấu thất bại.',
      icon: <WarningOutlined style={{ color: '#ef4444', fontSize: 18 }} />,
      badge: 'Quan trọng',
    },
    {
      key: 'task_deadline',
      title: 'Thay đổi hạn chót (Deadline)',
      desc: 'Nhận thông báo khi ngày đến hạn của công việc bạn tham gia bị dời hoặc đẩy sớm.',
      icon: <ClockCircleOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />,
    },
    {
      key: 'optimization_applied',
      title: 'Áp dụng phân bổ tối ưu hóa',
      desc: 'Nhận email khi kết quả thuật toán tối ưu (GA/CSP) được áp dụng làm thay đổi phân công.',
      icon: <ThunderboltOutlined style={{ color: '#0284c7', fontSize: 18 }} />,
    },
    {
      key: 'project_member_added',
      title: 'Gia nhập dự án mới',
      desc: 'Nhận email thông báo khi bạn được ban quản lý thêm vào danh sách thành viên một dự án.',
      icon: <FolderOpenOutlined style={{ color: '#059669', fontSize: 18 }} />,
    },
    {
      key: 'daily_digest',
      title: 'Bản tin công việc đầu ngày (Daily Digest)',
      desc: 'Gửi 1 email tóm tắt vào mỗi buổi sáng gồm các công việc cần hoàn thành hôm nay, công việc quá hạn và việc chờ duyệt.',
      icon: <ScheduleOutlined style={{ color: '#d97706', fontSize: 18 }} />,
      badge: 'Mới',
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Thẻ giới thiệu & kiểm tra SMTP */}
      <div
        className="saas-card"
        style={{
          padding: 24,
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          borderRadius: 14,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={5} style={{ margin: '0 0 6px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MailOutlined style={{ color: '#2563eb' }} />
              <span>Hộp Thư Thông Báo Cá Nhân</span>
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tất cả email sẽ được gửi tự động tới địa chỉ: <strong style={{ color: isDark ? '#93c5fd' : '#1d4ed8' }}>{user?.email}</strong>
            </Text>
          </div>

          <Button
            icon={<SendOutlined />}
            onClick={handleSendTestEmail}
            loading={sendingTest}
            style={{ borderRadius: 8 }}
          >
            Gửi email thử nghiệm
          </Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Chính sách chống ngập hòm thư"
            description="Các thao tác thảo luận nhỏ (bình luận, tạo subtask, đổi trạng thái phụ) chỉ hiển thị trong thông báo ứng dụng để giữ hộp thư của bạn luôn gọn gàng và chỉ chứa các sự kiện thực sự cần hành động."
            style={{ borderRadius: 8, fontSize: 12.5 }}
          />
        </div>
      </div>

      {/* Danh sách các công tắc tùy chỉnh */}
      <div
        className="saas-card"
        style={{
          padding: 24,
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          borderRadius: 14,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700 }}>
            Tùy Chọn Sự Kiện Gửi Email
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Bật hoặc tắt từng loại email thông báo theo nhu cầu công việc của bạn
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
                borderRadius: 12,
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', maxWidth: '80%' }}>
                <div style={{ marginTop: 2 }}>{item.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {item.title}
                    </Text>
                    {item.badge && (
                      <Tag color={item.badge === 'Quan trọng' ? 'error' : item.badge === 'Mới' ? 'gold' : 'blue'} style={{ fontSize: 11 }}>
                        {item.badge}
                      </Tag>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12.5, lineHeight: 1.5, display: 'block' }}>
                    {item.desc}
                  </Text>
                </div>
              </div>

              <Switch
                checked={Boolean(prefs[item.key])}
                onChange={(checked) => handleToggle(item.key, checked)}
                loading={loading}
              />
            </div>
          ))}
        </div>

        <Divider style={{ margin: '24px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={loadPreferences} disabled={saving || loading}>
            Khôi phục mặc định
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={saving}
            style={{
              background: '#2563eb',
              height: 40,
              padding: '0 24px',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Lưu tùy chọn
          </Button>
        </div>
      </div>
    </div>
  );
}

