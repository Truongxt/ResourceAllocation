import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, DatePicker, Form, Input, Modal, message } from 'antd';
import dayjs from 'dayjs';
import projectService from '../../services/projectService';

/**
 * Một modal cho ba thao tác cùng gọi `POST /projects/:id/duplicate`:
 *   - `duplicate`     nhân bản dự án thường
 *   - `saveTemplate`  lưu thành mẫu (`asTemplate: true`)
 *   - `fromTemplate`  tạo dự án từ một mẫu
 *
 * Server dời mọi ngày theo ngày bắt đầu mới và bỏ người thực hiện; modal chỉ hỏi tên
 * và ngày bắt đầu. Mẫu không có ngày riêng nên không hỏi ngày khi lưu thành mẫu.
 */
export default function ProjectDuplicateModal({ mode, source, onClose, onDone }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const open = Boolean(mode && source);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: mode === 'fromTemplate' ? '' : t(`projects.lifecycle.${mode === 'saveTemplate' ? 'templateName' : 'copyName'}`, { name: source.name }),
      startDate: mode === 'fromTemplate' ? dayjs() : source.startDate ? dayjs(source.startDate) : dayjs(),
    });
  }, [open, mode, source, form, t]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await projectService.duplicate(source._id, {
        name: values.name,
        ...(mode !== 'saveTemplate' && values.startDate ? { startDate: values.startDate.format('YYYY-MM-DD') } : {}),
        asTemplate: mode === 'saveTemplate',
      });
      message.success(res.data?.message || t('projects.lifecycle.duplicated'));
      onDone?.(res.data?.data?.project);
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.lifecycle.duplicateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode ? t(`projects.lifecycle.title.${mode}`) : ''}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText={t(`projects.lifecycle.ok.${mode || 'duplicate'}`)}
      destroyOnHidden
    >
      <Alert type="info" showIcon style={{ marginBottom: 16 }} title={t('projects.lifecycle.copyHint')} />
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t('projects.lifecycle.name')}
          rules={[{ required: true, whitespace: true, message: t('projects.lifecycle.nameRequired') }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        {mode !== 'saveTemplate' && (
          <Form.Item name="startDate" label={t('projects.lifecycle.startDate')} extra={t('projects.lifecycle.startHint')}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} allowClear={false} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
