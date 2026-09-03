/**
 * ============================================================================
 * MODAL THÊM MỚI / CHỈNH SỬA HỒ SƠ NHÂN SỰ (Resource Form Modal Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép Quản lý dự án / Admin tạo mới hoặc cập nhật hồ sơ nhân sự:
 *     1. Khi tạo mới: Đồng thời tạo tài khoản đăng nhập (Họ tên, Email, Mật khẩu khởi tạo, Quyền).
 *     2. Vị trí công tác (Position), Phòng ban (Department).
 *     3. Định mức giờ làm tối đa (Max Capacity), Tỷ lệ FTE (0-1), và Mức lương giờ (Hourly Rate).
 *
 * Props:
 *   - @param {boolean} open - Trạng thái hiển thị modal
 *   - @param {Function} onClose - Hàm đóng modal
 *   - @param {Object} editingResource - Bản ghi nhân sự đang chỉnh sửa (null nếu tạo mới)
 *   - @param {Object} form - Ant Design Form instance
 *   - @param {Function} onSubmit - Hàm gửi dữ liệu lên server
 *   - @param {boolean} submitting - Trạng thái đang lưu
 *   - @param {Array} activeDepartments - Danh sách phòng ban đang hoạt động
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import {
  Modal,
  Form,
  Card,
  Row,
  Col,
  Input,
  Select,
  InputNumber,
  Space,
  Button,
} from 'antd';
import { ROLES } from '../../constants';

export default function ResourceFormModal({
  open,
  onClose,
  editingResource,
  form,
  onSubmit,
  submitting = false,
  activeDepartments = [],
  t,
}) {
  return (
    <Modal
      title={
        editingResource
          ? t('resources.editTitle') || 'Chỉnh sửa nhân sự'
          : t('resources.createTitle') || 'Thêm nhân sự mới'
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 16 }}>
        {/* Phần khởi tạo tài khoản đăng nhập (Chỉ hiển thị khi tạo mới) */}
        {!editingResource && (
          <Card
            title={t('resources.account') || 'Khởi tạo tài khoản người dùng'}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="newUserName"
                  label={t('auth.name') || 'Họ và tên'}
                  rules={[{ required: true, message: t('auth.required.name') || 'Vui lòng nhập họ và tên' }]}
                >
                  <Input placeholder={t('auth.namePlaceholder') || 'VD: Nguyễn Văn A'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="newUserEmail"
                  label={t('settings.loginEmail') || 'Email đăng nhập'}
                  rules={[
                    { required: true, message: t('auth.required.email') || 'Vui lòng nhập email' },
                    { type: 'email', message: t('auth.required.emailInvalid') || 'Email không hợp lệ' },
                  ]}
                >
                  <Input placeholder="user@rao.com" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="newUserPassword"
                  label={t('resources.initialPassword') || 'Mật khẩu khởi tạo'}
                  rules={[{ required: true, min: 6, message: t('settings.minChars') || 'Tối thiểu 6 ký tự' }]}
                >
                  <Input.Password placeholder="••••••••" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="newUserRole" label={t('projectDetail.role') || 'Vai trò hệ thống'}>
                  <Select
                    options={[
                      { value: ROLES.MEMBER, label: t('enums.role.member') || 'Thành viên (Member)' },
                      { value: ROLES.PM, label: t('enums.role.project_manager') || 'Quản lý dự án (PM)' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        {/* Thông tin vị trí & Phòng ban */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="position"
              label={t('resources.position') || 'Vị trí chuyên môn'}
              rules={[{ required: true, message: t('resources.positionRequired') || 'Vui lòng nhập vị trí' }]}
            >
              <Input placeholder={t('resources.positionPlaceholder') || 'VD: Frontend Developer'} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="department"
              label={t('reports.columns.department') || 'Phòng ban'}
              rules={[{ required: true, message: t('resources.deptRequired') || 'Vui lòng chọn phòng ban' }]}
            >
              <Select
                placeholder={t('resources.pickDepartment') || 'Chọn phòng ban'}
                options={activeDepartments.map((d) => ({ value: d.name, label: d.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Thông số năng suất (Capacity, FTE, Mức lương) */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="maxCapacity" label={t('resources.capacityLabel') || 'Định mức (giờ/tuần)'}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="fte" label="FTE (0 - 1)">
              <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="hourlyRate" label={t('resources.hourlyRateLabel') || 'Lương theo giờ (₫)'}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* Nút thao tác */}
        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            <Button onClick={onClose}>{t('common.cancel') || 'Hủy'}</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingResource
                ? t('common.saveChanges') || 'Lưu thay đổi'
                : t('resources.add') || 'Thêm mới'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
