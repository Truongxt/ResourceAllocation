import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Descriptions,
  Empty,
  Input,
  Modal,
  Radio,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { SwapOutlined, CheckSquareOutlined, ProjectOutlined } from '@ant-design/icons';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';
import { taskStatusLabel } from '../../i18n/enums';

const { Text } = Typography;

/**
 * Tác vụ hàng loạt & Bàn giao nhân sự khi chuyển vị trí / nghỉ việc (Base Wework Bài 75).
 *
 * Hỗ trợ 2 phân hệ:
 *   1. Tab Công việc: Thay thế người nhận việc, người giao việc, thêm người theo dõi.
 *   2. Tab Dự án/Phòng ban: Thay thế quản lý (PM), hạ quyền xuống thành viên, thay thế thành viên, xóa khỏi dự án.
 */
export default function BulkReassignModal({ open, onClose, fromResource, resources = [], onDone }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [projects, setProjects] = useState([]);
  const [toUserId, setToUserId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [reason, setReason] = useState('');

  // Tab Tasks State
  const [taskAction, setTaskAction] = useState('replace_assignee'); // 'replace_assignee' | 'replace_creator' | 'add_follower'
  const [taskPreview, setTaskPreview] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Tab Projects State
  const [projectAction, setProjectAction] = useState('replace_manager'); // 'replace_manager' | 'demote_to_member' | 'replace_member' | 'remove_member'
  const [projectPreview, setProjectPreview] = useState(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const fromUserId = fromResource?.user?._id || fromResource?.user;
  const fromName = fromResource?.user?.name || fromResource?.position || '';

  // Load Task Preview
  const loadTaskPreview = useCallback(async () => {
    if (!fromUserId) return;
    setTasksLoading(true);
    try {
      const role = taskAction === 'replace_creator' ? 'creator' : taskAction === 'add_follower' ? 'follower' : 'assignee';
      const res = await taskService.reassignPreview({
        fromUserId,
        role,
        ...(projectId ? { projectId } : {}),
      });
      const data = res.data?.data;
      setTaskPreview(data);
      setSelectedTaskIds((data?.tasks || []).map((t) => t._id));
    } catch (err) {
      message.error(err.response?.data?.message || 'Không xem trước được danh sách công việc bàn giao');
      setTaskPreview(null);
    } finally {
      setTasksLoading(false);
    }
  }, [fromUserId, projectId, taskAction]);

  // Load Project Preview
  const loadProjectPreview = useCallback(async () => {
    if (!fromUserId) return;
    setProjectsLoading(true);
    try {
      const res = await projectService.previewReassign({ fromUserId });
      const data = res.data?.data;
      setProjectPreview(data);
      // Mặc định chọn tất cả dự án quản lý nếu action là replace_manager, hoặc tất cả
      if (projectAction === 'replace_manager' || projectAction === 'demote_to_member') {
        setSelectedProjectIds((data?.managedProjects || []).map((p) => p._id));
      } else {
        const allIds = [
          ...(data?.managedProjects || []).map((p) => p._id),
          ...(data?.memberProjects || []).map((p) => p._id),
        ];
        setSelectedProjectIds(allIds);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không xem trước được danh sách dự án');
      setProjectPreview(null);
    } finally {
      setProjectsLoading(false);
    }
  }, [fromUserId, projectAction]);

  useEffect(() => {
    if (open) {
      setToUserId(null);
      setReason('');
      loadTaskPreview();
      loadProjectPreview();
      projectService
        .getAll({ limit: 100 })
        .then((res) => setProjects(res.data?.data?.projects || []))
        .catch(() => setProjects([]));
    }
  }, [open, loadTaskPreview, loadProjectPreview]);

  // Submit Bulk Action
  const handleSubmit = async () => {
    if (activeTab === 'tasks') {
      if (!toUserId) {
        message.warning('Vui lòng chọn nhân sự mới tiếp nhận');
        return;
      }
      if (!selectedTaskIds.length) {
        message.warning('Không có công việc nào được chọn');
        return;
      }

      setSubmitting(true);
      try {
        const res = await taskService.bulkReassign({
          fromUserId,
          toUserId,
          ...(projectId ? { projectId } : {}),
          taskIds: selectedTaskIds,
          actionType: taskAction,
          reason: reason.trim(),
        });
        message.success(`Đã xử lý hàng loạt ${res.data?.data?.movedCount || selectedTaskIds.length} công việc`);
        if (onDone) onDone();
        onClose();
      } catch (err) {
        message.error(err.response?.data?.message || 'Thao tác không thành công');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Tab Projects
      if (['replace_manager', 'demote_to_member', 'replace_member'].includes(projectAction) && !toUserId) {
        message.warning('Vui lòng chọn nhân sự thay thế');
        return;
      }
      if (!selectedProjectIds.length) {
        message.warning('Không có dự án/phòng ban nào được chọn');
        return;
      }

      setSubmitting(true);
      try {
        const res = await projectService.bulkReassign({
          fromUserId,
          toUserId,
          projectIds: selectedProjectIds,
          actionType: projectAction,
          reason: reason.trim(),
        });
        message.success(res.data?.message || `Đã cập nhật ${selectedProjectIds.length} dự án/phòng ban`);
        if (onDone) onDone();
        onClose();
      } catch (err) {
        message.error(err.response?.data?.message || 'Cập nhật dự án không thành công');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const recipients = resources
    .filter((r) => String(r.user?._id || r.user) !== String(fromUserId))
    .map((r) => ({
      value: r.user?._id || r.user,
      label: `${r.user?.name || r.position}${r.position ? ` — ${r.position}` : ''}`,
    }))
    .filter((o) => o.value);

  // Projects list for table
  const displayedProjects = (projectAction === 'replace_manager' || projectAction === 'demote_to_member')
    ? (projectPreview?.managedProjects || []).map((p) => ({ ...p, userRole: 'Quản lý dự án (PM)' }))
    : [
        ...(projectPreview?.managedProjects || []).map((p) => ({ ...p, userRole: 'Quản lý dự án (PM)' })),
        ...(projectPreview?.memberProjects || []).map((p) => ({ ...p, userRole: 'Thành viên' })),
      ];

  const canSubmit = activeTab === 'tasks'
    ? (toUserId && selectedTaskIds.length > 0)
    : (selectedProjectIds.length > 0 && (projectAction === 'remove_member' || toUserId));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={820}
      okText="Thực hiện tác vụ hàng loạt"
      cancelText="Hủy"
      okButtonProps={{ loading: submitting, disabled: !canSubmit }}
      title={(
        <Space>
          <SwapOutlined style={{ color: '#3b82f6' }} />
          <span>Tác vụ hàng loạt & Bàn giao vai trò: {fromName} (Base Wework Bài 75)</span>
        </Space>
      )}
    >
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Nhân sự cần bàn giao / thay thế">{fromName}</Descriptions.Item>
          <Descriptions.Item label="Nhân sự mới tiếp nhận">
            <Select
              showSearch
              allowClear
              style={{ width: '100%' }}
              placeholder="Chọn người nhận..."
              value={toUserId}
              onChange={setToUserId}
              options={recipients}
              optionFilterProp="label"
            />
          </Descriptions.Item>
          {activeTab === 'tasks' && (
            <Descriptions.Item label="Lọc theo dự án" span={2}>
              <Select
                allowClear
                style={{ width: '100%' }}
                placeholder="Tất cả dự án"
                value={projectId}
                onChange={setProjectId}
                options={projects.map((p) => ({ value: p._id, label: p.name }))}
                optionFilterProp="label"
                showSearch
              />
            </Descriptions.Item>
          )}
        </Descriptions>

        <Input.TextArea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do bàn giao (ví dụ: nhân sự thôi việc, điều chuyển phòng ban, bổ nhiệm quản lý mới...)"
          maxLength={500}
        />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'tasks',
              label: (
                <Space>
                  <CheckSquareOutlined />
                  <span>Công việc ({taskPreview?.total || 0})</span>
                </Space>
              ),
              children: (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text strong style={{ fontSize: 13 }}>Hành động:</Text>
                    <Radio.Group value={taskAction} onChange={(e) => setTaskAction(e.target.value)}>
                      <Radio.Button value="replace_assignee">Thay thế người nhận việc</Radio.Button>
                      <Radio.Button value="replace_creator">Thay thế người giao việc</Radio.Button>
                      <Radio.Button value="add_follower">+ Thêm người theo dõi</Radio.Button>
                    </Radio.Group>
                  </div>

                  {tasksLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : !taskPreview || !taskPreview.tasks?.length ? (
                    <Empty description="Không có công việc nào phù hợp để thao tác" />
                  ) : (
                    <>
                      <Alert
                        type="info"
                        showIcon
                        message={`${taskPreview.total} công việc · ${taskPreview.totalEstimatedHours} giờ ước tính`}
                        description={taskPreview.excludedNote}
                      />
                      <Table
                        size="small"
                        rowKey="_id"
                        dataSource={taskPreview.tasks}
                        pagination={false}
                        scroll={{ y: 240 }}
                        rowSelection={{
                          selectedRowKeys: selectedTaskIds,
                          onChange: setSelectedTaskIds,
                        }}
                        columns={[
                          { title: 'Công việc', dataIndex: 'title', ellipsis: true },
                          {
                            title: 'Dự án',
                            dataIndex: ['project', 'name'],
                            width: 170,
                            ellipsis: true,
                          },
                          {
                            title: 'Trạng thái',
                            dataIndex: 'status',
                            width: 120,
                            render: (status) => <Tag>{taskStatusLabel(status)}</Tag>,
                          },
                          {
                            title: 'Giờ',
                            dataIndex: 'estimatedHours',
                            width: 65,
                            align: 'right',
                          },
                        ]}
                      />
                    </>
                  )}
                </Space>
              ),
            },
            {
              key: 'projects',
              label: (
                <Space>
                  <ProjectOutlined />
                  <span>Dự án & Phòng ban ({displayedProjects.length})</span>
                </Space>
              ),
              children: (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 13 }}>Hành động:</Text>
                    <Radio.Group value={projectAction} onChange={(e) => setProjectAction(e.target.value)}>
                      <Radio.Button value="replace_manager">Thay thế Quản lý (PM)</Radio.Button>
                      <Radio.Button value="demote_to_member">Hạ Quản lý xuống Thành viên</Radio.Button>
                      <Radio.Button value="replace_member">Thay thế Thành viên</Radio.Button>
                      <Radio.Button value="remove_member" danger>Xóa khỏi Dự án/Phòng ban</Radio.Button>
                    </Radio.Group>
                  </div>

                  {projectsLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : !displayedProjects.length ? (
                    <Empty description="Nhân sự này không tham gia quản lý hay thành viên trong dự án/phòng ban nào" />
                  ) : (
                    <>
                      <Alert
                        type="info"
                        showIcon
                        message={`Tìm thấy ${displayedProjects.length} dự án / phòng ban`}
                        description="Chọn các dự án bạn muốn áp dụng hành động hàng loạt ở trên."
                      />
                      <Table
                        size="small"
                        rowKey="_id"
                        dataSource={displayedProjects}
                        pagination={false}
                        scroll={{ y: 240 }}
                        rowSelection={{
                          selectedRowKeys: selectedProjectIds,
                          onChange: setSelectedProjectIds,
                        }}
                        columns={[
                          { title: 'Tên dự án / phòng ban', dataIndex: 'name', ellipsis: true },
                          {
                            title: 'Loại',
                            dataIndex: 'kind',
                            width: 120,
                            render: (kind) => (
                              <Tag color={kind === 'team' ? 'purple' : 'blue'}>
                                {kind === 'team' ? 'Phòng ban' : 'Dự án'}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Vai trò hiện tại',
                            dataIndex: 'userRole',
                            width: 170,
                            render: (role) => (
                              <Tag color={role.includes('PM') ? 'orange' : 'default'}>{role}</Tag>
                            ),
                          },
                          {
                            title: 'Tiến độ',
                            dataIndex: 'progress',
                            width: 80,
                            align: 'right',
                            render: (p, r) => (r.kind === 'team' ? '—' : `${p || 0}%`),
                          },
                        ]}
                      />
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Space>
    </Modal>
  );
}
