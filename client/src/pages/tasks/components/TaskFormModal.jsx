/**
 * ============================================================================
 * MODAL TẠO MỚI / CHỈNH SỬA CÔNG VIỆC (Task Form Modal Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép nhập đầy đủ thông số cho một công việc trong dự án:
 *     1. Tiêu đề, Dự án, Trạng thái, Độ ưu tiên, Người thực hiện.
 *     2. Kỹ năng yêu cầu (Required Skills) kèm trọng số (dùng cho thuật toán GA / CSP).
 *     3. Ràng buộc công việc tiền nhiệm (Dependencies - Ràng buộc cứng H2 của CSP).
 *     4. Giờ ước tính, giờ thực tế, tiến độ (%), và khoảng thời gian thực hiện (RangePicker).
 */

import { useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Row,
  Col,
  Select,
  Avatar,
  Tag,
  Space,
  AutoComplete,
  InputNumber,
  Button,
  DatePicker,
  Alert,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import {
  taskStatusOptions,
  priorityOptions,
  requiredSkillLevelOptions,
} from '../../../i18n/enums';
import { getTaskPermissions } from '../../../utils/taskPermissions';

const { TextArea } = Input;

const DEPENDENCY_TYPE_OPTIONS = [
  { value: 'finish_to_start', label: 'FS — xong trước, mới bắt đầu' },
  { value: 'start_to_start', label: 'SS — bắt đầu cùng lúc' },
  { value: 'finish_to_finish', label: 'FF — kết thúc cùng lúc' },
  { value: 'start_to_finish', label: 'SF — bắt đầu trước, mới kết thúc' },
];

const TASK_DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '🟢 Dễ (Lv.1 — Junior)' },
  { value: 'medium', label: '🟡 Vừa (Lv.2 — Tiêu chuẩn)' },
  { value: 'hard', label: '🟠 Khó (Lv.3 — Senior)' },
  { value: 'expert', label: '🔴 Rất khó (Lv.4 — Chuyên gia)' },
];

export default function TaskFormModal({
  open,
  onClose,
  editingTask,
  form,
  canManageTasks = false,
  currentUser = null,
  projects = [],
  resources = [],
  knownSkillOptions = [],
  dependencyOptions = [],
  selectedProject,
  taskGroups = [],
  onManageTaskGroups,
  onSubmit,
  submitting = false,
  t,
}) {
  const selectedAssigneeId = Form.useWatch('assignee', form);
  const selectedDifficulty = Form.useWatch('difficulty', form) || 'medium';

  const currentProj = useMemo(() => {
    const projId = selectedProject || editingTask?.project?._id || editingTask?.project;
    return (projects || []).find((p) => (p._id || p.id) === projId) || editingTask?.project;
  }, [selectedProject, editingTask, projects]);

  const taskPerms = useMemo(() => {
    if (!editingTask) return null;
    return getTaskPermissions(editingTask, currentProj, currentUser);
  }, [editingTask, currentProj, currentUser]);

  const canEditDeadline = canManageTasks || (taskPerms?.canEditDeadline ?? false);
  const canEditTitleDesc = canManageTasks || (taskPerms?.canEditDetails ?? false);
  const canChangeAssignee = canManageTasks || (taskPerms?.canChangeAssignee ?? false);

  const assigneeResource = useMemo(() => {
    if (!selectedAssigneeId) return null;
    return (
      resources.find(
        (r) => (r.user?._id || r.userId || r._id)?.toString() === selectedAssigneeId.toString()
      ) || null
    );
  }, [selectedAssigneeId, resources]);

  const difficultyMap = { easy: 1, medium: 2, hard: 3, expert: 4 };
  const diffLevel = difficultyMap[selectedDifficulty] || 2;

  const competencyAssessment = useMemo(() => {
    if (!assigneeResource) return null;
    const skills = assigneeResource.skills || [];
    const maxSkillLevel = Math.max(1, ...skills.map((s) => s.managerLevel || s.level || 1));
    const isOverloaded =
      assigneeResource.isOverloaded ||
      (assigneeResource.utilizationRate && assigneeResource.utilizationRate > 100);

    let type = 'success';
    let message = '🟢 Năng lực phù hợp với độ khó công việc';

    if (isOverloaded) {
      type = 'error';
      message = `🔴 Cảnh báo Quá tải: Nhân sự này đang hoạt động ở mức ${assigneeResource.utilizationRate || '>100'}% công suất. Đề xuất san tải hoặc chọn nhân sự khác đang rảnh!`;
    } else if (diffLevel > maxSkillLevel + 1) {
      type = 'warning';
      message = `⚠️ Cảnh báo Năng lực: Độ khó công việc (Level ${diffLevel}) vượt mức kỹ năng cao nhất của nhân sự (Level ${maxSkillLevel}). Cần người có kinh nghiệm kèm cặp!`;
    } else if (maxSkillLevel >= diffLevel) {
      type = 'success';
      message = `🟢 Phù hợp lý tưởng: Trình độ kỹ năng (Level ${maxSkillLevel}) đáp ứng trọn vẹn độ khó công việc (Level ${diffLevel}).`;
    }

    return { type, message, isOverloaded };
  }, [assigneeResource, diffLevel]);

  const permissionFeatures = [];
  if (canEditDeadline) permissionFeatures.push('Gia hạn / Sửa thời hạn');
  if (canEditTitleDesc) permissionFeatures.push('Sửa tiêu đề & mô tả');
  if (canChangeAssignee) permissionFeatures.push('Bàn giao công việc');

  return (
    <Modal
      title={
        editingTask
          ? t('tasks.editTitle') || 'Chỉnh sửa công việc'
          : t('tasks.createTitle') || 'Tạo công việc mới'
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      {!canManageTasks && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message={t('tasks.memberNotice.title') || 'Thông báo phân quyền'}
          description={
            editingTask
              ? `Bạn đang cập nhật công việc với vai trò ${taskPerms?.roleLabel || 'Thành viên'}. Quyền hạn được cấp trong dự án: Tiến độ & giờ thực tế${permissionFeatures.length > 0 ? `, ${permissionFeatures.join(', ')}` : ''}.`
              : (t('tasks.memberNotice.body') || 'Bạn đang đăng nhập với quyền thành viên. Bạn chỉ có thể cập nhật tiến độ công việc được giao.')
          }
        />
      )}

      <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 16 }}>
        {/* Tiêu đề công việc */}
        <Form.Item
          name="title"
          label={t('tasks.form.title') || 'Tiêu đề công việc'}
          rules={[{ required: true, message: t('tasks.form.titleRequired') || 'Vui lòng nhập tiêu đề' }]}
        >
          <Input placeholder="Thiết kế giao diện bảng Kanban..." disabled={!canEditTitleDesc} />
        </Form.Item>

        {/* Dự án & Trạng thái */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="project"
              label={t('common.project') || 'Thuộc dự án'}
              rules={[{ required: true, message: t('tasks.form.projectRequired') || 'Vui lòng chọn dự án' }]}
            >
              <Select
                placeholder={t('tasks.form.projectPlaceholder') || 'Chọn dự án...'}
                disabled={!canManageTasks}
                options={projects.map((p) => ({
                  value: p._id,
                  label: `${p.code ? p.code + ' - ' : ''}${p.name}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label={t('common.status') || 'Trạng thái'} rules={[{ required: true }]}>
              <Select options={taskStatusOptions().map((s) => ({ value: s.key, label: s.label }))} />
            </Form.Item>
          </Col>
        </Row>

        {/* Phân công nhân sự, Độ ưu tiên & Độ khó công việc */}
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item name="assignee" label={t('projectDetail.assignee') || 'Phân công nhân sự'}>
              <Select
                placeholder={t('tasks.form.assigneePlaceholder') || 'Chọn nhân sự phụ trách...'}
                allowClear
                disabled={!canChangeAssignee}
                options={resources.map((r) => ({
                  value: r.user?._id || r.userId || r._id,
                  label: (
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: r.isOverloaded ? '#ef4444' : '#6366f1' }} />
                      <span>{r.user?.name || r.userName || r.position}</span>
                      <Tag color={r.isOverloaded ? 'error' : 'blue'} style={{ fontSize: 10, margin: 0 }}>
                        {r.position} {r.utilizationRate ? `(${r.utilizationRate}%)` : ''}
                      </Tag>
                    </Space>
                  ),
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="priority" label={t('common.priority') || 'Độ ưu tiên'} rules={[{ required: true }]}>
              <Select options={priorityOptions()} disabled={!canManageTasks} />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="difficulty" label="Độ khó công việc" initialValue="medium">
              <Select options={TASK_DIFFICULTY_OPTIONS} disabled={!canManageTasks} />
            </Form.Item>
          </Col>
        </Row>

        {/* Cảnh báo tương thích Năng lực & Quá tải (Competency Fit Indicator) */}
        {competencyAssessment && (
          <Alert
            type={competencyAssessment.type}
            showIcon
            message={competencyAssessment.message}
            style={{ marginBottom: 14, fontSize: 12.5, borderRadius: 8 }}
          />
        )}

        {/* Base Wework: Nhóm công việc & Công việc cha */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="taskGroup"
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>Nhóm công việc (Task Group)</span>
                  {selectedProject && onManageTaskGroups && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, height: 'auto', fontSize: 12, fontWeight: 500 }}
                      onClick={(e) => {
                        e.preventDefault();
                        onManageTaskGroups(selectedProject);
                      }}
                    >
                      + Quản lý nhóm
                    </Button>
                  )}
                </div>
              }
              extra={
                !selectedProject
                  ? 'Chọn dự án trước để chọn nhóm công việc'
                  : taskGroups.length === 0
                  ? 'Dự án này chưa có nhóm nào. Bấm "+ Quản lý nhóm" ở trên để tạo.'
                  : undefined
              }
            >
              <Select
                placeholder={taskGroups.length === 0 ? 'Chưa có nhóm nào...' : 'Chọn nhóm công việc...'}
                allowClear
                disabled={!canManageTasks || !selectedProject}
                options={(taskGroups || []).map((g) => ({
                  value: g._id,
                  label: (
                    <span style={{ color: g.color || '#3b82f6', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FolderOutlined /> {g.name}
                    </span>
                  ),
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="parentTask"
              label="Công việc cha (Nếu là việc con)"
              extra={selectedProject ? undefined : 'Chọn dự án trước'}
            >
              <Select
                placeholder="Chọn công việc cha (Subtask)..."
                allowClear
                disabled={!canManageTasks || !selectedProject}
                options={dependencyOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Base Wework: Người theo dõi (Followers) */}
        <Form.Item
          name="followers"
          label="Người theo dõi (Followers)"
          extra="Những người nhận thông báo khi có bình luận hoặc tiến độ cập nhật"
        >
          <Select
            mode="multiple"
            placeholder="Chọn người theo dõi..."
            allowClear
            maxTagCount="responsive"
            options={resources.map((r) => ({
              value: r.user?._id || r.userId || r._id,
              label: r.user?.name || r.userName || r.position,
            }))}
          />
        </Form.Item>

        {/* Mô tả chi tiết */}
        <Form.Item name="description" label={t('tasks.form.description') || 'Mô tả chi tiết'}>
          <TextArea rows={3} placeholder="Mô tả công việc..." disabled={!canEditTitleDesc} />
        </Form.Item>

        {/* Kỹ năng yêu cầu cho thuật toán tối ưu */}
        <Form.Item
          label={t('tasks.form.requiredSkills') || 'Kỹ năng yêu cầu cho thuật toán phân bổ AI'}
          extra={
            t('tasks.form.requiredSkillsHint') ||
            'Thuật toán GA / CSP sẽ dựa vào kỹ năng này để tìm nhân sự phù hợp nhất'
          }
          style={{ marginBottom: 12 }}
        >
          <Form.List name="requiredSkills">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: t('tasks.form.skillNameRequired') || 'Nhập tên kỹ năng' }]}
                      style={{ width: 210, marginBottom: 0 }}
                    >
                      <AutoComplete
                        placeholder="React, Nodejs, SQL..."
                        options={knownSkillOptions}
                        filterOption={(input, option) =>
                          option.value.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'level']}
                      style={{ width: 210, marginBottom: 0 }}
                    >
                      <Select
                        options={requiredSkillLevelOptions()}
                        placeholder="Cấp độ yêu cầu"
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'weight']}
                      style={{ width: 130, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        max={1}
                        step={0.1}
                        addonBefore="Trọng số"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ level: 3, weight: 1 })}
                  block
                  icon={<PlusOutlined />}
                >
                  {t('tasks.form.addSkill') || 'Thêm kỹ năng'}
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        {/* Công việc tiền nhiệm + loại quan hệ (CSP H4 và đường găng) */}
        {canManageTasks && (
          <Form.Item
            label={t('tasks.form.dependencies') || 'Công việc tiền nhiệm'}
            extra={
              selectedProject
                ? 'Loại quan hệ quyết định mốc nào phải xảy ra trước mốc nào — ảnh hưởng tới đường găng trên sơ đồ Gantt'
                : 'Vui lòng chọn dự án trước'
            }
          >
            <Form.List name="dependencies">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'task']}
                        rules={[{ required: true, message: 'Chọn công việc tiền nhiệm' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          style={{ width: 300 }}
                          disabled={!selectedProject}
                          placeholder="Công việc tiền nhiệm..."
                          options={dependencyOptions}
                          optionFilterProp="label"
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'type']}
                        initialValue="finish_to_start"
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          style={{ width: 210 }}
                          options={DEPENDENCY_TYPE_OPTIONS}
                        />
                      </Form.Item>
                      <Button type="text" danger onClick={() => remove(field.name)}>Xóa</Button>
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ type: 'finish_to_start' })}
                    disabled={!selectedProject}
                    style={{ width: '100%' }}
                  >
                    Thêm công việc tiền nhiệm
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}

        {/* Tiến độ & Giờ công */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="progress" label={t('tasks.form.progress') || 'Tiến độ (%)'}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="estimatedHours" label={t('tasks.form.estimatedHours') || 'Giờ ước tính'}>
              <InputNumber min={0} style={{ width: '100%' }} disabled={!canManageTasks} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="actualHours" label={t('tasks.form.actualHours') || 'Giờ thực tế'}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* Khoảng ngày thực hiện kèm giờ */}
        <Form.Item name="dateRange" label={t('projects.form.dateRange') || 'Thời gian thực hiện'}>
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            style={{ width: '100%' }}
            disabled={!canEditDeadline}
            placeholder={['Ngày & giờ bắt đầu', 'Hạn chót & giờ hoàn thành']}
          />
        </Form.Item>

        {/* Nút hành động */}
        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            <Button onClick={onClose}>{t('common.cancel') || 'Hủy'}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              }}
            >
              {editingTask
                ? t('common.saveChanges') || 'Lưu thay đổi'
                : t('tasks.create') || 'Tạo công việc'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
