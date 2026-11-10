import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, Space, Typography, Card, Divider, Alert, Row, Col, Button, message } from 'antd';
import { CopyOutlined, InfoCircleOutlined, CheckSquareOutlined } from '@ant-design/icons';
import taskService from '../../services/taskService';
import taskGroupService from '../../services/taskGroupService';
import projectService from '../../services/projectService';

const { Text, Title } = Typography;

export default function DuplicateTaskModal({ open, onClose, task, projects = [], onSuccess }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [projectList, setProjectList] = useState(projects);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (projects && projects.length > 0) {
      setProjectList(projects);
    } else if (open) {
      projectService.getAll().then((res) => {
        setProjectList(res.data?.projects || res.data || []);
      }).catch(() => {});
    }
  }, [open, projects]);

  useEffect(() => {
    if (open && task) {
      const currentProjId = task.project?._id || task.project;
      setSelectedProjectId(currentProjId);
      form.setFieldsValue({
        newTitle: `${task.title} (Bản sao)`,
        targetProjectId: currentProjId,
        targetTaskGroupId: task.taskGroup?._id || task.taskGroup || null,
        keepAssignee: true,
        keepDates: true,
        keepChecklist: true,
        keepSubtasks: true,
        keepFollowers: true,
        keepAttachments: true,
        keepCustomValues: true,
      });
      loadGroups(currentProjId);
    }
  }, [open, task, form]);

  const loadGroups = async (projectId) => {
    if (!projectId) {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    try {
      const res = await taskGroupService.getByProject(projectId);
      const list = res.data?.data?.groups || res.data?.groups || (Array.isArray(res.data) ? res.data : []);
      setGroups(Array.isArray(list) ? list : []);
    } catch {
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleProjectChange = (projId) => {
    setSelectedProjectId(projId);
    form.setFieldsValue({ targetTaskGroupId: null });
    loadGroups(projId);
  };

  const handleSubmit = async (values) => {
    if (!task) return;
    setSubmitting(true);
    try {
      const payload = {
        newTitle: values.newTitle?.trim(),
        targetProjectId: values.targetProjectId,
        targetTaskGroupId: values.targetTaskGroupId || undefined,
        keepAssignee: !!values.keepAssignee,
        keepDates: !!values.keepDates,
        keepChecklist: !!values.keepChecklist,
        keepSubtasks: !!values.keepSubtasks,
        keepFollowers: !!values.keepFollowers,
        keepAttachments: !!values.keepAttachments,
        keepCustomValues: !!values.keepCustomValues,
      };

      await taskService.duplicate(task._id, payload);
      message.success('Nhân bản công việc thành công!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể nhân bản công việc');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
      title={
        <Space>
          <CopyOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
          <span>Nhân bản công việc (Base Wework)</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="newTitle"
          label={<Text strong>Tiêu đề công việc mới</Text>}
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề mới' }]}
        >
          <Input placeholder="Nhập tiêu đề công việc mới..." />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="targetProjectId"
              label={<Text strong>Dự án / Phòng ban đích</Text>}
              rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
            >
              <Select
                placeholder="Chọn dự án"
                onChange={handleProjectChange}
                options={(projectList || []).map((p) => ({
                  value: p._id || p.id,
                  label: p.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="targetTaskGroupId"
              label={<Text strong>Nhóm công việc</Text>}
            >
              <Select
                placeholder="Chọn nhóm công việc"
                allowClear
                loading={loadingGroups}
                options={(Array.isArray(groups) ? groups : []).map((g) => ({
                  value: g._id,
                  label: g.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckSquareOutlined style={{ color: '#3b82f6' }} />
          <Text strong>Tùy chọn thông tin giữ lại (Base Wework - Bài 52):</Text>
        </div>

        <Card size="small" style={{ background: '#f8fafc', borderRadius: 8 }}>
          <Row gutter={[12, 8]}>
            <Col span={12}>
              <Form.Item name="keepAssignee" valuePropName="checked" noStyle>
                <Checkbox>Người thực hiện</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="keepDates" valuePropName="checked" noStyle>
                <Checkbox>Thời hạn (Start & Due Date)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="keepChecklist" valuePropName="checked" noStyle>
                <Checkbox>Danh sách kiểm tra (Checklist)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="keepSubtasks" valuePropName="checked" noStyle>
                <Checkbox>Công việc con (Subtasks)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="keepFollowers" valuePropName="checked" noStyle>
                <Checkbox>Thành viên theo dõi</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="keepAttachments" valuePropName="checked" noStyle>
                <Checkbox>Tệp tài liệu đính kèm</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="keepCustomValues" valuePropName="checked" noStyle>
                <Checkbox>Giá trị trường tùy chỉnh (Custom fields)</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Alert
          style={{ marginTop: 14 }}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Lưu ý theo quy tắc Base Wework: Người tạo bản sao sẽ là bạn. Các bình luận trao đổi và kết quả nghiệm thu cũ sẽ không được sao chép sang công việc mới.
            </Text>
          }
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Button onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<CopyOutlined />}>
            Nhân bản ngay
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
