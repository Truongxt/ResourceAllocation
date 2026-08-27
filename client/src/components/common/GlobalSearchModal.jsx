import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Typography, Tag, Space, Empty } from 'antd';
import {
  SearchOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  SettingOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import projectService from '../../services/projectService';
import taskService from '../../services/taskService';
import resourceService from '../../services/resourceService';

const { Text } = Typography;

export default function GlobalSearchModal({ open, onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const staticPages = [
    { title: 'Tổng quan Dashboard', path: '/dashboard', icon: <DashboardOutlined style={{ color: '#6366f1' }} />, category: 'Trang hệ thống' },
    { title: 'Quản lý Dự án', path: '/projects', icon: <ProjectOutlined style={{ color: '#06b6d4' }} />, category: 'Trang hệ thống' },
    { title: 'Bảng Công việc Kanban', path: '/tasks', icon: <CheckSquareOutlined style={{ color: '#10b981' }} />, category: 'Trang hệ thống' },
    { title: 'Quản lý Nhân sự & Kỹ năng', path: '/resources', icon: <TeamOutlined style={{ color: '#8b5cf6' }} />, category: 'Trang hệ thống' },
    { title: 'Tối ưu hóa Phân bổ (GA + CSP)', path: '/optimization', icon: <ThunderboltOutlined style={{ color: '#f59e0b' }} />, category: 'Trang hệ thống' },
    { title: 'Benchmark Studio Thực nghiệm', path: '/benchmark', icon: <ExperimentOutlined style={{ color: '#ec4899' }} />, category: 'Trang hệ thống' },
    { title: 'Sơ đồ Gantt & CPM', path: '/gantt', icon: <BarChartOutlined style={{ color: '#3b82f6' }} />, category: 'Trang hệ thống' },
    { title: 'Báo cáo & Phân tích Tải', path: '/reports', icon: <FileTextOutlined style={{ color: '#14b8a6' }} />, category: 'Trang hệ thống' },
    { title: 'Cài đặt Tài khoản', path: '/settings', icon: <SettingOutlined style={{ color: '#64748b' }} />, category: 'Trang hệ thống' },
  ];

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    pages: staticPages,
    projects: [],
    tasks: [],
    resources: [],
  });

  // Fetch projects, tasks, resources when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, taskRes, resRes] = await Promise.allSettled([
        projectService.getAll(),
        taskService.getAll(),
        resourceService.getAll(),
      ]);

      const projects = projRes.status === 'fulfilled' && projRes.value?.data ? (Array.isArray(projRes.value.data) ? projRes.value.data : projRes.value.data.data?.projects || projRes.value.data.projects || []) : [];
      const tasks = taskRes.status === 'fulfilled' && taskRes.value?.data ? (Array.isArray(taskRes.value.data) ? taskRes.value.data : taskRes.value.data.data?.tasks || taskRes.value.data.tasks || []) : [];
      const resources = resRes.status === 'fulfilled' && resRes.value?.data ? (Array.isArray(resRes.value.data) ? resRes.value.data : resRes.value.data.data?.resources || resRes.value.data.resources || []) : [];

      setData({
        pages: staticPages,
        projects,
        tasks,
        resources,
      });
    } catch (err) {
      console.error('Error fetching global search data', err);
    } finally {
      setLoading(false);
    }
  };

  const cleanQuery = query.trim().toLowerCase();

  const filteredPages = cleanQuery
    ? data.pages.filter((p) => p.title.toLowerCase().includes(cleanQuery))
    : data.pages;

  const filteredProjects = cleanQuery
    ? data.projects.filter((p) => (p.name || '').toLowerCase().includes(cleanQuery) || (p.code || '').toLowerCase().includes(cleanQuery))
    : data.projects.slice(0, 4);

  const filteredTasks = cleanQuery
    ? data.tasks.filter((t) => (t.title || '').toLowerCase().includes(cleanQuery) || (t.name || '').toLowerCase().includes(cleanQuery))
    : data.tasks.slice(0, 4);

  const filteredResources = cleanQuery
    ? data.resources.filter((r) => (r.name || '').toLowerCase().includes(cleanQuery) || (r.role || '').toLowerCase().includes(cleanQuery))
    : data.resources.slice(0, 4);

  const totalResults =
    filteredPages.length +
    filteredProjects.length +
    filteredTasks.length +
    filteredResources.length;

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={620}
      style={{ top: 80 }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          background: isDark ? '#101726' : '#ffffff',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* Search Bar Input */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: isDark ? '#0c121e' : '#f8fafc',
        }}
      >
        <SearchOutlined style={{ fontSize: 18, color: '#6366f1' }} />
        <input
          autoFocus
          placeholder="Tìm nhanh trang, dự án, công việc, nhân sự... (Nhập từ khóa)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 15,
            fontWeight: 500,
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
        />
        <Tag
          style={{
            margin: 0,
            fontSize: 11,
            borderRadius: 6,
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            color: isDark ? '#94a3b8' : '#64748b',
            border: 'none',
            fontWeight: 600,
          }}
        >
          ESC để đóng
        </Tag>
      </div>

      {/* Search Results List */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '12px 14px' }}>
        {totalResults === 0 && !loading ? (
          <Empty
            description="Không tìm thấy kết quả phù hợp"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '32px 0' }}
          />
        ) : (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            {/* Pages Section */}
            {filteredPages.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#64748b' : '#94a3b8',
                    padding: '4px 8px 6px',
                  }}
                >
                  Trang & Tính năng
                </div>
                {filteredPages.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelect(p.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      background: isDark ? 'transparent' : 'transparent',
                    }}
                    className="search-result-item"
                    onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.12)' : '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 16 }}>{p.icon}</div>
                      <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {p.title}
                      </Text>
                    </div>
                    <ArrowRightOutlined style={{ fontSize: 12, color: '#94a3b8' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Projects Section */}
            {filteredProjects.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#64748b' : '#94a3b8',
                    padding: '4px 8px 6px',
                  }}
                >
                  Dự án
                </div>
                {filteredProjects.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => handleSelect(`/projects/${p._id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.12)' : '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ProjectOutlined style={{ color: '#06b6d4', fontSize: 15 }} />
                      <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {p.name}
                      </Text>
                      {p.code && <Tag color="blue">{p.code}</Tag>}
                    </div>
                    <Tag color={p.status === 'active' ? 'success' : 'default'} style={{ margin: 0 }}>
                      {p.status || 'Active'}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks Section */}
            {filteredTasks.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#64748b' : '#94a3b8',
                    padding: '4px 8px 6px',
                  }}
                >
                  Công việc (Tasks)
                </div>
                {filteredTasks.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => handleSelect('/tasks')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.12)' : '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckSquareOutlined style={{ color: '#10b981', fontSize: 15 }} />
                      <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {t.title || t.name}
                      </Text>
                    </div>
                    <Tag color="purple" style={{ margin: 0 }}>
                      {t.status || 'todo'}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            {/* Resources Section */}
            {filteredResources.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#64748b' : '#94a3b8',
                    padding: '4px 8px 6px',
                  }}
                >
                  Nhân sự (Team)
                </div>
                {filteredResources.map((r) => (
                  <div
                    key={r._id}
                    onClick={() => handleSelect('/resources')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.12)' : '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <TeamOutlined style={{ color: '#8b5cf6', fontSize: 15 }} />
                      <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {r.name}
                      </Text>
                      {r.role && <span style={{ fontSize: 12, color: '#94a3b8' }}>· {r.role}</span>}
                    </div>
                    <Tag color="cyan" style={{ margin: 0 }}>
                      {r.skills?.length || 0} kỹ năng
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </Space>
        )}
      </div>

      {/* Footer Helper */}
      <div
        style={{
          padding: '10px 20px',
          background: isDark ? '#090d16' : '#f8fafc',
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: isDark ? '#64748b' : '#94a3b8',
        }}
      >
        <span>
          Điều hướng: <kbd style={{ padding: '1px 5px', borderRadius: 4, background: isDark ? '#1e293b' : '#e2e8f0' }}>↑</kbd> <kbd style={{ padding: '1px 5px', borderRadius: 4, background: isDark ? '#1e293b' : '#e2e8f0' }}>↓</kbd>
        </span>
        <span>
          Chọn: <kbd style={{ padding: '1px 5px', borderRadius: 4, background: isDark ? '#1e293b' : '#e2e8f0' }}>Enter</kbd>
        </span>
      </div>
    </Modal>
  );
}
