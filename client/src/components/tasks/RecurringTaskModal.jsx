import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Checkbox,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Card,
  Popconfirm,
  List,
  Alert,
  message,
} from 'antd';
import {
  SyncOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import recurringTaskService from '../../services/recurringTaskService';

const { Text } = Typography;
const { TextArea } = Input;

export default function RecurringTaskModal({ open, onClose, projects = [], resources = [], onTaskGenerated }) {
  const [activeTab, setActiveTab] = useState('list');
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewDates, setPreviewDates] = useState([]);
  const [form] = Form.useForm();

  const frequencyVal = Form.useWatch('frequency', form);
  const selectedProject = Form.useWatch('project', form);

  const loadRecurringTasks = async () => {
    setLoading(true);
    try {
      const res = await recurringTaskService.getAll();
      setRecurringTasks(res.data.data.recurringTasks || []);
    } catch {
      message.error('Lỗi khi tải danh sách công việc lặp lại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRecurringTasks();
      form.setFieldsValue({
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1], // Thứ 2 mặc định
        dayOfMonth: 1,
        durationHours: 8,
        priority: 'medium',
        estimatedHours: 8,
        startDate: dayjs(),
      });
      setPreviewDates([]);
    }
  }, [open, form]);

  // Cập nhật xem trước 10 lần sinh kế tiếp
  const handleCalculatePreview = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        frequency: values.frequency,
        interval: Number(values.interval) || 1,
        daysOfWeek: values.daysOfWeek || [],
        dayOfMonth: Number(values.dayOfMonth) || 1,
        startDate: values.startDate ? values.startDate.toISOString() : new Date().toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : null,
      };
      const res = await recurringTaskService.preview(payload);
      setPreviewDates(res.data.data.dates || []);
    } catch (err) {
      // Form validation error
    }
  };

  const handleCreateSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : new Date().toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : null,
      };

      await recurringTaskService.create(payload);
      message.success('Đã thiết lập công việc lặp lại thành công!');
      form.resetFields();
      setActiveTab('list');
      loadRecurringTasks();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi lưu cấu hình lặp lại');
    } finally {
      setSubmitting(false);
    }
  };

  // Kích hoạt sinh ngay lập tức
  const handleRunNow = async (id) => {
    try {
      const res = await recurringTaskService.runNow(id);
      message.success(res.data.message || 'Đã sinh công việc mới thành công!');
      loadRecurringTasks();
      if (onTaskGenerated) onTaskGenerated();
    } catch {
      message.error('Lỗi kích hoạt sinh công việc');
    }
  };

  // Xóa cấu hình
  const handleDelete = async (id) => {
    try {
      await recurringTaskService.remove(id);
      message.success('Đã xóa cấu hình lặp lại');
      loadRecurringTasks();
    } catch {
      message.error('Lỗi xóa cấu hình');
    }
  };

  const listColumns = [
    {
      title: 'Tên công việc',
      dataIndex: 'title',
      key: 'title',
      render: (v) => <strong>{v}</strong>,
    },
    {
      title: 'Dự án',
      dataIndex: 'project',
      key: 'project',
      render: (p) => p?.name || '---',
    },
    {
      title: 'Chu kỳ',
      key: 'frequency',
      render: (_, r) => {
        const map = {
          daily: 'Hàng ngày',
          weekly: `Hàng tuần (${r.daysOfWeek?.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ') || 'T2'})`,
          monthly: `Hàng tháng (ngày ${r.dayOfMonth})`,
          quarterly: `Hàng quý (ngày ${r.dayOfMonth})`,
          yearly: `Hàng năm`,
        };
        return <Tag color="blue">{map[r.frequency] || r.frequency}</Tag>;
      },
    },
    {
      title: 'Người làm',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (a) => a?.name || <Text type="secondary">(Chưa gán)</Text>,
    },
    {
      title: 'Lần sinh tiếp theo',
      dataIndex: 'nextRunDate',
      key: 'nextRunDate',
      render: (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : <Text type="secondary">Hết hạn</Text>),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        <Space size="middle">
          <Button
            size="small"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRunNow(r._id)}
          >
            Sinh ngay
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa cấu hình này?"
            onConfirm={() => handleDelete(r._id)}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Space>
          <SyncOutlined style={{ color: '#6366f1', fontSize: 20 }} />
          <span>Quản lý Công việc Lặp lại (Recurring Tasks) — Chuẩn Base Wework</span>
        </Space>
      }
      width={840}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: (
              <Space>
                <UnorderedListOutlined />
                <span>Danh sách đã thiết lập ({recurringTasks.length})</span>
              </Space>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setActiveTab('create')}
                    style={{ background: '#6366f1' }}
                  >
                    Thêm công việc lặp lại
                  </Button>
                </div>
                <Table
                  dataSource={recurringTasks}
                  columns={listColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </div>
            ),
          },
          {
            key: 'create',
            label: (
              <Space>
                <PlusOutlined />
                <span>Thiết lập chu kỳ mới</span>
              </Space>
            ),
            children: (
              <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
                <Form.Item
                  name="title"
                  label={<span style={{ fontWeight: 600 }}>Tên công việc lặp lại (*)</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}
                >
                  <Input placeholder="VD: Báo cáo tổng kết khảo sát hàng tuần" />
                </Form.Item>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item
                    name="project"
                    label={<span style={{ fontWeight: 600 }}>Dự án (*)</span>}
                    rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
                  >
                    <Select
                      placeholder="Chọn dự án..."
                      options={projects.map((p) => ({ value: p._id, label: p.name }))}
                    />
                  </Form.Item>

                  <Form.Item name="assignee" label={<span style={{ fontWeight: 600 }}>Người thực hiện</span>}>
                    <Select
                      allowClear
                      placeholder="Chọn người phụ trách..."
                      options={resources.map((r) => ({
                        value: r.user?._id || r.userId || r._id,
                        label: r.user?.name || r.userName || r.position,
                      }))}
                    />
                  </Form.Item>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <Form.Item name="frequency" label={<span style={{ fontWeight: 600 }}>Chu kỳ lặp</span>}>
                    <Select
                      options={[
                        { value: 'daily', label: 'Hàng ngày' },
                        { value: 'weekly', label: 'Hàng tuần' },
                        { value: 'monthly', label: 'Hàng tháng' },
                        { value: 'quarterly', label: 'Hàng quý' },
                        { value: 'yearly', label: 'Hàng năm' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    name="interval"
                    label={<span style={{ fontWeight: 600 }}>Vòng lặp (mỗi N chu kỳ)</span>}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    name="durationHours"
                    label={<span style={{ fontWeight: 600 }}>Thời hạn sau khi sinh (giờ)</span>}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 8" />
                  </Form.Item>
                </div>

                {frequencyVal === 'weekly' && (
                  <Form.Item
                    name="daysOfWeek"
                    label={<span style={{ fontWeight: 600 }}>Các ngày lặp lại trong tuần</span>}
                  >
                    <Checkbox.Group
                      options={[
                        { label: 'Thứ 2', value: 1 },
                        { label: 'Thứ 3', value: 2 },
                        { label: 'Thứ 4', value: 3 },
                        { label: 'Thứ 5', value: 4 },
                        { label: 'Thứ 6', value: 5 },
                        { label: 'Thứ 7', value: 6 },
                        { label: 'Chủ nhật', value: 0 },
                      ]}
                    />
                  </Form.Item>
                )}

                {['monthly', 'quarterly'].includes(frequencyVal) && (
                  <Form.Item
                    name="dayOfMonth"
                    label={<span style={{ fontWeight: 600 }}>Ngày trong tháng (1 - 31)</span>}
                  >
                    <InputNumber min={1} max={31} style={{ width: '100%' }} />
                  </Form.Item>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item
                    name="startDate"
                    label={<span style={{ fontWeight: 600 }}>Ngày bắt đầu chu kỳ (*)</span>}
                    rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item name="endDate" label={<span style={{ fontWeight: 600 }}>Ngày kết thúc chu kỳ (tuỳ chọn)</span>}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Không bắt buộc" />
                  </Form.Item>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Button icon={<CalendarOutlined />} onClick={handleCalculatePreview}>
                    Xem trước 10 lần sinh sắp tới
                  </Button>
                </div>

                {previewDates.length > 0 && (
                  <Card
                    size="small"
                    title={<span style={{ fontSize: 13, color: '#6366f1' }}>Lịch trình 10 lần sinh tự động tiếp theo:</span>}
                    style={{ marginBottom: 16, background: 'var(--bg-secondary)' }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {previewDates.map((d, i) => (
                        <Tag key={i} color="geekblue" style={{ padding: '4px 8px' }}>
                          #{i + 1}: {dayjs(d).format('DD/MM/YYYY')} (07:00)
                        </Tag>
                      ))}
                    </div>
                  </Card>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <Button onClick={() => setActiveTab('list')}>Quay lại</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    style={{ background: '#6366f1' }}
                  >
                    Lưu thiết lập lặp lại
                  </Button>
                </div>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
}
