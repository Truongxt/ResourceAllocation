/**
 * ============================================================================
 * THẺ QUẢN LÝ LỊCH NGHỈ PHÉP CÁ NHÂN (My Leaves Card Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép tất cả thành viên (kể cả role 'member') tự theo dõi danh sách ngày nghỉ
 *     và đăng ký các kỳ nghỉ phép / công tác sắp tới.
 *   - Khi có lịch nghỉ được đăng ký, thuật toán CSP Solver sẽ sử dụng ràng buộc cứng H3
 *     để tự động loại trừ, không phân công công việc vào các ngày nhân sự vắng mặt.
 *
 * Chức năng chính:
 *   - Bảng danh sách các kỳ nghỉ (Khoảng ngày, Số ngày, Lý do, Trạng thái).
 *   - Modal đăng ký kỳ nghỉ mới với DatePicker.RangePicker.
 *   - Hủy đăng ký kỳ nghỉ với xác nhận Popconfirm.
 */

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Alert,
  Modal,
  Form,
  DatePicker,
  Input,
  Popconfirm,
  message,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import resourceService from '../../services/resourceService';

const { Title, Text } = Typography;

export default function MyLeavesCard() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  /**
   * Tải danh sách các kỳ nghỉ phép của user hiện tại
   */
  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await resourceService.getMyLeaves();
      if (res.data?.success) {
        setLeaves(res.data.data?.leaves || []);
      }
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  /**
   * Đăng ký kỳ nghỉ phép mới
   * @param {Object} values - { dateRange: [dayjs, dayjs], reason: string }
   */
  const handleAddLeave = async (values) => {
    if (!values.dateRange || values.dateRange.length < 2) {
      message.error('Vui lòng chọn khoảng thời gian nghỉ phép');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        startDate: values.dateRange[0].startOf('day').toISOString(),
        endDate: values.dateRange[1].endOf('day').toISOString(),
        reason: values.reason?.trim() || 'Nghỉ phép',
      };
      const res = await resourceService.addMyLeave(payload);
      if (res.data?.success) {
        message.success('Đăng ký lịch nghỉ phép thành công');
        setModalOpen(false);
        form.resetFields();
        setLeaves(res.data.data?.leaves || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng ký nghỉ phép thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Hủy kỳ nghỉ phép đã đăng ký
   * @param {string} leaveId - ID kỳ nghỉ
   */
  const handleDeleteLeave = async (leaveId) => {
    try {
      const res = await resourceService.deleteMyLeave(leaveId);
      if (res.data?.success) {
        message.success('Đã hủy lịch nghỉ phép');
        setLeaves(res.data.data?.leaves || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Hủy lịch nghỉ phép thất bại');
    }
  };

  return (
    <div className="saas-card" style={{ padding: 24, marginTop: 24 }}>
      {/* Tiêu đề & Nút đăng ký */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            <CalendarOutlined style={{ marginRight: 8, color: '#06b6d4' }} />
            <span>Lịch Nghỉ Phép & Đăng Ký Vắng Mặt</span>
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Khai báo ngày nghỉ phép hoặc công tác để hệ thống tự động loại trừ khi phân công công việc
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Đăng ký nghỉ phép
        </Button>
      </div>

      {/* Thông điệp giải thích tính năng học thuật */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 8 }}
        message="Tích hợp Ràng buộc Cứng H3 (CSP Solver)"
        description="Khi bạn đăng ký lịch nghỉ phép, thuật toán phân bổ nguồn lực (CSP / Hybrid) sẽ đảm bảo 100% không giao bất kỳ công việc nào có thời gian trùng với khoảng thời gian bạn nghỉ."
      />

      {/* Bảng danh sách các kỳ nghỉ */}
      <Table
        dataSource={leaves}
        rowKey={(record) => record._id || `${record.startDate}_${record.endDate}`}
        loading={loading}
        pagination={{ pageSize: 5 }}
        size="middle"
        columns={[
          {
            title: 'Khoảng thời gian nghỉ',
            key: 'range',
            render: (_, r) => (
              <Space>
                <CalendarOutlined style={{ color: '#06b6d4' }} />
                <Text strong>
                  {dayjs(r.startDate).format('DD/MM/YYYY')} — {dayjs(r.endDate).format('DD/MM/YYYY')}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Thời lượng',
            key: 'days',
            render: (_, r) => {
              const days = Math.max(1, dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1);
              return <Tag color="blue">{days} ngày</Tag>;
            },
          },
          {
            title: 'Lý do / Ghi chú',
            dataIndex: 'reason',
            key: 'reason',
            render: (reason) => reason || 'Nghỉ phép',
          },
          {
            title: 'Trạng thái',
            key: 'status',
            render: (_, r) => {
              const now = dayjs();
              const start = dayjs(r.startDate).startOf('day');
              const end = dayjs(r.endDate).endOf('day');
              if (now.isAfter(start) && now.isBefore(end)) {
                return <Tag color="error">Đang trong kỳ nghỉ</Tag>;
              }
              if (now.isBefore(start)) {
                return <Tag color="warning">Sắp diễn ra</Tag>;
              }
              return <Tag color="default">Đã kết thúc</Tag>;
            },
          },
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'center',
            render: (_, r) => (
              <Popconfirm
                title="Hủy lịch nghỉ phép này?"
                description="Bạn có chắc chắn muốn hủy đăng ký kỳ nghỉ này?"
                onConfirm={() => handleDeleteLeave(r._id)}
                okText="Hủy lịch"
                cancelText="Giữ lại"
              >
                <Button type="text" danger icon={<DeleteOutlined />}>
                  Hủy
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      {/* Modal đăng ký nghỉ phép mới */}
      <Modal
        title={
          <Space size={8}>
            <CalendarOutlined style={{ color: '#06b6d4' }} />
            <span>Đăng ký Lịch Nghỉ Phép / Vắng Mặt</span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAddLeave} style={{ marginTop: 16 }}>
          <Form.Item
            name="dateRange"
            label="Khoảng thời gian nghỉ"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%', borderRadius: 8 }}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do nghỉ phép / vắng mặt"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input
              placeholder="VD: Nghỉ phép năm, việc gia đình, công tác..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                borderRadius: 8,
              }}
            >
              Xác nhận đăng ký
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
