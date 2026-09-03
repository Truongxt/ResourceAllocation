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
} from '@ant-design/icons';
import {
  taskStatusOptions,
  priorityOptions,
  requiredSkillLevelOptions,
} from '../../../i18n/enums';

const { TextArea } = Input;

export default function TaskFormModal({
  open,
  onClose,
  editingTask,
  form,
  canManageTasks = false,
  projects = [],
  resources = [],
  knownSkillOptions = [],
  dependencyOptions = [],
  selectedProject,
  onSubmit,
  submitting = false,
  t,
}) {
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
      destroyOnClose
    >
      {!canManageTasks && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message={t('tasks.memberNotice.title') || 'Thông báo phân quyền'}
          description={
            t('tasks.memberNotice.body') ||
            'Bạn đang đăng nhập với quyền thành viên. Bạn chỉ có thể cập nhật tiến độ công việc được giao.'
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
          <Input placeholder="Thiết kế giao diện bảng Kanban..." disabled={!canManageTasks} />
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

        {/* Phân công nhân sự & Độ ưu tiên */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="assignee" label={t('projectDetail.assignee') || 'Phân công nhân sự'}>
              <Select
                placeholder={t('tasks.form.assigneePlaceholder') || 'Chọn nhân sự phụ trách...'}
                allowClear
                disabled={!canManageTasks}
                options={resources.map((r) => ({
                  value: r.user?._id || r.userId || r._id,
                  label: (
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                      <span>{r.user?.name || r.userName || r.position}</span>
                      <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{r.position}</Tag>
                    </Space>
                  ),
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label={t('common.priority') || 'Độ ưu tiên'} rules={[{ required: true }]}>
              <Select options={priorityOptions()} disabled={!canManageTasks} />
            </Form.Item>
          </Col>
        </Row>

        {/* Mô tả chi tiết */}
        <Form.Item name="description" label={t('tasks.form.description') || 'Mô tả chi tiết'}>
          <TextArea rows={3} placeholder="Mô tả công việc..." disabled={!canManageTasks} />
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

        {/* Công việc tiền nhiệm (CSP Dependency H2) */}
        {canManageTasks && (
          <Form.Item
            name="dependencies"
            label={t('tasks.form.dependencies') || 'Công việc tiền nhiệm (CSP Dependency)'}
            extra={
              selectedProject
                ? 'Công việc này chỉ có thể bắt đầu sau khi các công việc tiền nhiệm hoàn thành'
                : 'Vui lòng chọn dự án trước'
            }
          >
            <Select
              mode="multiple"
              allowClear
              disabled={!selectedProject}
              placeholder="Chọn công việc tiền nhiệm..."
              options={dependencyOptions}
              optionFilterProp="label"
            />
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

        {/* Khoảng ngày thực hiện */}
        <Form.Item name="dateRange" label={t('projects.form.dateRange') || 'Thời gian thực hiện'}>
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabled={!canManageTasks}
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
