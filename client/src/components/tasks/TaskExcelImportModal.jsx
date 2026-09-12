import { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Select,
  Typography,
  Space,
  Table,
  Tag,
  Alert,
  Divider,
  Steps,
  message,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import taskService from '../../services/taskService';

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

export default function TaskExcelImportModal({ open, onClose, projects = [], onImportSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [previewItems, setPreviewItems] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  // Tải file mẫu Excel
  const handleDownloadTemplate = async () => {
    try {
      const res = await taskService.downloadExcelTemplate();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Mau_Cong_Viec_Base_Wework.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Đã tải xuống file Excel mẫu chuẩn Base Wework');
    } catch {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  // Upload và xem nhanh dữ liệu
  const handleUploadFile = async (file) => {
    if (!file) return false;
    setLoadingPreview(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await taskService.previewExcel(formData);
      setPreviewItems(res.data.data.items || []);
      setFileList([file]);
      setCurrentStep(1);
      message.success(`Đã phân tích ${res.data.data.count} dòng công việc!`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể phân tích file Excel');
      setFileList([]);
    } finally {
      setLoadingPreview(false);
    }
    return false; // Ngăn Ant Design tự submit mặc định
  };

  // Thực hiện import
  const handleConfirmImport = async () => {
    if (!selectedProject) {
      message.warning('Vui lòng chọn dự án tiếp nhận công việc!');
      return;
    }
    if (!fileList[0]) {
      message.warning('Vui lòng tải file Excel lên trước!');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('projectId', selectedProject);

    try {
      const res = await taskService.importExcel(formData);
      message.success(res.data.message || 'Đã nhập công việc thành công!');
      handleClose();
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi nhập công việc từ Excel');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFileList([]);
    setPreviewItems([]);
    setSelectedProject(null);
    onClose();
  };

  const columns = [
    {
      title: 'Dòng',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 65,
      render: (v) => <Text type="secondary">#{v}</Text>,
    },
    {
      title: 'Nhóm công việc',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 140,
      render: (v) => <Tag color="blue">{v || 'Chung'}</Tag>,
    },
    {
      title: 'Phân cấp',
      key: 'level',
      width: 110,
      render: (_, r) => {
        if (r.subtaskLevel === 2) return <Tag color="purple">Việc con cấp 2</Tag>;
        if (r.subtaskLevel === 1) return <Tag color="cyan">Việc con cấp 1</Tag>;
        return <Tag color="geekblue">Việc cha</Tag>;
      },
    },
    {
      title: 'Tiêu đề công việc',
      dataIndex: 'title',
      key: 'title',
      render: (v, r) => (
        <span style={{ paddingLeft: r.subtaskLevel * 14, fontWeight: r.isSubtask ? 400 : 600 }}>
          {r.subtaskLevel > 0 ? '↳ ' : ''}
          {v}
        </span>
      ),
    },
    {
      title: 'Người làm',
      dataIndex: 'assigneeEmail',
      key: 'assigneeEmail',
      width: 150,
      render: (v) => v || <Text type="secondary" italic>(Chưa gán)</Text>,
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (v) => {
        const colors = { critical: 'red', high: 'orange', medium: 'blue', low: 'default' };
        return <Tag color={colors[v] || 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Giờ ước tính',
      dataIndex: 'estimatedHours',
      key: 'estimatedHours',
      width: 90,
      render: (v) => `${v}h`,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#10b981', fontSize: 22 }} />
          <span>Nhập công việc từ file Excel (.xlsx) — Chuẩn Base Wework</span>
        </Space>
      }
      width={860}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        onChange={setCurrentStep}
        style={{ marginBottom: 20, marginTop: 8 }}
        items={[
          { title: 'Tải file mẫu & Hướng dẫn' },
          { title: 'Xem trước dữ liệu' },
        ]}
      />

      {currentStep === 0 && (
        <div>
          <Alert
            type="info"
            showIcon
            message="Quy chuẩn định dạng file Excel Base Wework"
            description={
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 13 }}>
                <li>
                  <strong>Nhóm công việc:</strong> Dòng văn bản in đậm, kết thúc bằng dấu <code>:</code> (Ví dụ: <code>Thiết kế UI/UX:</code>).
                </li>
                <li>
                  <strong>Công việc con (Subtasks):</strong> Đặt ngay dưới công việc cha, có tiền tố <code># </code> cho việc con cấp 1 và <code>## </code> cho việc con cấp 2.
                </li>
                <li>
                  <strong>Người thực hiện & Người theo dõi:</strong> Điền chính xác Email hoặc Họ tên nhân sự trong hệ thống.
                </li>
              </ul>
            }
            style={{ marginBottom: 16 }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
              padding: '14px 18px',
              borderRadius: 8,
              border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
              marginBottom: 16,
            }}
          >
            <div>
              <Text strong style={{ fontSize: 14 }}>File mẫu chuẩn Base Wework (.xlsx)</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tải file template đã cấu hình sẵn các cột dữ liệu để điền nhanh
                </Text>
              </div>
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Tải file mẫu
            </Button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Tải file Excel công việc của bạn lên:
            </Text>
            <Dragger
              accept=".xlsx,.xls"
              beforeUpload={handleUploadFile}
              fileList={fileList}
              showUploadList={false}
              disabled={loadingPreview}
              style={{ padding: '24px 0' }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#6366f1', fontSize: 44 }} />
              </p>
              <p className="ant-upload-text" style={{ fontWeight: 600 }}>
                Kéo thả file Excel vào đây hoặc click để chọn file
              </p>
              <p className="ant-upload-hint" style={{ color: '#888' }}>
                Hỗ trợ định dạng .xlsx, .xls (Dung lượng tối đa 10MB)
              </p>
            </Dragger>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Chọn dự án tiếp nhận công việc (*):
              </Text>
              <Select
                placeholder="Chọn dự án..."
                style={{ width: '100%' }}
                value={selectedProject}
                onChange={setSelectedProject}
                options={projects.map((p) => ({
                  value: p._id,
                  label: `${p.name} (${p.code || 'PRJ'})`,
                }))}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                Tổng số dòng phân tích được:
              </Text>
              <Tag color="success" style={{ fontSize: 14, padding: '4px 10px' }}>
                {previewItems.length} công việc
              </Tag>
            </div>
          </div>

          <Table
            dataSource={previewItems}
            columns={columns}
            rowKey="rowIndex"
            pagination={{ pageSize: 6 }}
            size="small"
            scroll={{ x: 750 }}
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={() => setCurrentStep(0)}>Quay lại tải file khác</Button>
            <Space>
              <Button onClick={handleClose}>Đóng</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={importing}
                disabled={!selectedProject || previewItems.length === 0}
                onClick={handleConfirmImport}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  fontWeight: 600,
                }}
              >
                Tiến hành Nhập công việc
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Modal>
  );
}
