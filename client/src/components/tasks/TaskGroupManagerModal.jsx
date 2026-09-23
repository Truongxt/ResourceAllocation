import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Input,
  Space,
  Tag,
  List,
  Popconfirm,
  message,
  Typography,
  Card,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import taskGroupService from '../../services/taskGroupService';
import { useTheme } from '../../context/ThemeContext';

const { Text } = Typography;

const COLOR_PRESETS = [
  { color: '#3b82f6', label: 'Xanh dương' },
  { color: '#6366f1', label: 'Tím chàm' },
  { color: '#10b981', label: 'Xanh lá' },
  { color: '#f59e0b', label: 'Hổ phách' },
  { color: '#ef4444', label: 'Đỏ' },
  { color: '#ec4899', label: 'Hồng' },
  { color: '#8b5cf6', label: 'Tím hoa cà' },
  { color: '#06b6d4', label: 'Xanh lơ' },
  { color: '#64748b', label: 'Xám chì' },
];

export default function TaskGroupManagerModal({
  open,
  onClose,
  projectId,
  projectName = '',
  onGroupsUpdated,
}) {
  const { isDark } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form tạo mới
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  // Trạng thái sửa đổi inline
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [savingEdit, setSavingEdit] = useState(false);

  // Tải danh sách nhóm
  const loadGroups = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await taskGroupService.getByProject(projectId);
      const list = res.data?.data?.groups || [];
      setGroups(list);
      if (onGroupsUpdated) onGroupsUpdated(list);
    } catch {
      message.error('Không thể tải danh sách nhóm công việc');
    } finally {
      setLoading(false);
    }
  }, [projectId, onGroupsUpdated]);

  useEffect(() => {
    if (open && projectId) {
      loadGroups();
      setNewName('');
      setNewColor('#3b82f6');
      setEditingId(null);
    }
  }, [open, projectId, loadGroups]);

  // Thêm nhóm mới
  const handleCreate = async () => {
    if (!newName.trim()) {
      message.warning('Vui lòng nhập tên nhóm công việc');
      return;
    }
    setCreating(true);
    try {
      await taskGroupService.create({
        name: newName.trim(),
        color: newColor,
        project: projectId,
      });
      message.success('Đã thêm nhóm công việc mới');
      setNewName('');
      loadGroups();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tạo nhóm công việc');
    } finally {
      setCreating(false);
    }
  };

  // Bắt đầu sửa inline
  const startEdit = (item) => {
    setEditingId(item._id);
    setEditName(item.name);
    setEditColor(item.color || '#3b82f6');
  };

  // Lưu sửa đổi
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      message.warning('Tên nhóm không được để trống');
      return;
    }
    setSavingEdit(true);
    try {
      await taskGroupService.update(editingId, {
        name: editName.trim(),
        color: editColor,
      });
      message.success('Đã cập nhật nhóm công việc');
      setEditingId(null);
      loadGroups();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật nhóm công việc');
    } finally {
      setSavingEdit(false);
    }
  };

  // Xóa nhóm
  const handleDelete = async (id) => {
    try {
      await taskGroupService.delete(id);
      message.success('Đã xóa nhóm công việc (các task sẽ chuyển về Chưa phân nhóm)');
      loadGroups();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa nhóm công việc');
    }
  };

  const subtleBg = isDark ? '#18181b' : '#f8fafc';
  const borderColor = isDark ? '#27272a' : '#e2e8f0';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      title={
        <Space>
          <AppstoreOutlined style={{ color: '#3b82f6' }} />
          <span>
            Quản lý Nhóm công việc {projectName ? `— ${projectName}` : ''}
          </span>
        </Space>
      }
      width={640}
      destroyOnHidden
    >
      <div style={{ padding: '8px 0' }}>
        {/* Khối tạo nhóm mới */}
        <Card
          size="small"
          style={{
            background: subtleBg,
            borderColor,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            + Thêm nhóm công việc mới vào dự án
          </Text>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <Input
              placeholder="VD: Giai đoạn 1: Thiết kế UI, Sprint 1, Kiểm thử QA..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPressEnter={handleCreate}
              style={{ flex: 1, borderRadius: 6 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              loading={creating}
              style={{ borderRadius: 6 }}
            >
              Thêm nhóm
            </Button>
          </div>

          {/* Preset màu sắc */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Màu nhận diện:</span>
            {COLOR_PRESETS.map((p) => (
              <button
                type="button"
                key={p.color}
                onClick={() => setNewColor(p.color)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: p.color,
                  border: newColor === p.color ? '2px solid #fff' : '2px solid transparent',
                  outline: newColor === p.color ? `2px solid ${p.color}` : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 120ms ease',
                  transform: newColor === p.color ? 'scale(1.15)' : 'scale(1)',
                }}
                title={p.label}
              />
            ))}
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{
                width: 24,
                height: 24,
                padding: 0,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
              }}
              title="Màu tùy chỉnh"
            />
            <Tag color={newColor} style={{ marginLeft: 6, borderRadius: 4, fontSize: 11 }}>
              Xem trước
            </Tag>
          </div>
        </Card>

        {/* Danh sách nhóm hiện có */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 13 }}>
            Danh sách nhóm công việc ({groups.length})
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Nhóm được hiển thị theo thứ tự phân loại trong công việc
          </Text>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin tip="Đang tải danh sách nhóm..." />
          </div>
        ) : groups.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Dự án này chưa có nhóm công việc nào. Bạn hãy thêm nhóm đầu tiên ở trên nhé!"
            style={{ margin: '24px 0' }}
          />
        ) : (
          <List
            size="small"
            dataSource={groups}
            renderItem={(item, index) => {
              const isEditing = editingId === item._id;

              if (isEditing) {
                return (
                  <List.Item
                    key={item._id}
                    style={{
                      background: subtleBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onPressEnter={handleSaveEdit}
                          style={{ flex: 1, borderRadius: 6 }}
                          autoFocus
                        />
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={handleSaveEdit}
                          loading={savingEdit}
                        >
                          Lưu
                        </Button>
                        <Button
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => setEditingId(null)}
                        >
                          Hủy
                        </Button>
                      </div>

                      {/* Chọn màu khi sửa */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Màu:</span>
                        {COLOR_PRESETS.map((p) => (
                          <button
                            type="button"
                            key={p.color}
                            onClick={() => setEditColor(p.color)}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              backgroundColor: p.color,
                              border: editColor === p.color ? '2px solid #fff' : '1px solid transparent',
                              outline: editColor === p.color ? `2px solid ${p.color}` : 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title={p.label}
                          />
                        ))}
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          style={{
                            width: 20,
                            height: 20,
                            padding: 0,
                            border: 'none',
                            cursor: 'pointer',
                            background: 'transparent',
                          }}
                        />
                      </div>
                    </div>
                  </List.Item>
                );
              }

              return (
                <List.Item
                  key={item._id}
                  style={{
                    background: isDark ? 'var(--surface-card)' : '#ffffff',
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, width: 18 }}>
                      {index + 1}.
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        backgroundColor: item.color || '#3b82f6',
                        flexShrink: 0,
                      }}
                    />
                    <Text strong style={{ fontSize: 13, color: item.color || '#3b82f6' }}>
                      {item.name}
                    </Text>
                  </Space>

                  <Space size={4}>
                    <Tooltip title="Chỉnh sửa tên & màu sắc">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startEdit(item)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Xóa nhóm công việc này?"
                      description="Các công việc thuộc nhóm này sẽ được chuyển thành 'Chưa phân nhóm'. Bạn có chắc muốn xóa?"
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(item._id)}
                    >
                      <Tooltip title="Xóa nhóm">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </Modal>
  );
}
