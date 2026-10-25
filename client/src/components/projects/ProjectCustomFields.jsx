import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import projectService from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';
import { sortedFields } from '../../utils/customFields';

const { Text } = Typography;

const TYPE_OPTIONS = [
  { value: 'text', label: 'Văn bản' },
  { value: 'number', label: 'Số' },
  { value: 'date', label: 'Ngày' },
  { value: 'select', label: 'Chọn một' },
];
const typeLabel = (type) => TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

const idOf = (value) => String((value && value._id) || value || '');
let draftSeq = 0;
const toDraft = (field) => ({ ...field, options: field.options || [], draftId: field.key || `new-${(draftSeq += 1)}` });

/**
 * Tab "Trường tùy chỉnh" của chi tiết dự án: khai thêm trường cho công việc của dự án.
 *
 * Sửa trên bản nháp rồi lưu một lần (`PUT /projects/:id/custom-fields` thay cả danh sách). Quyền
 * theo đúng server: admin/Owner hoặc quản lý của chính dự án này; dự án lưu trữ chỉ xem.
 * Kiểu của trường đã lưu không đổi được — server từ chối, vì giá trị cũ sẽ sai nghĩa.
 */
export default function ProjectCustomFields({ project, onSaved }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(sortedFields(project).map(toDraft));
  }, [project]);

  const canEdit = Boolean(user)
    && !project?.isArchived
    && (user.isOwner || user.role === 'admin' || idOf(project?.manager) === idOf(user._id));

  const removedFields = useMemo(() => {
    const kept = new Set(draft.map((f) => f.key).filter(Boolean));
    return sortedFields(project).filter((f) => !kept.has(f.key));
  }, [draft, project]);

  const update = (draftId, patch) => setDraft((prev) => prev.map((f) => (f.draftId === draftId ? { ...f, ...patch } : f)));
  const move = (index, delta) => setDraft((prev) => {
    const next = [...prev];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    return next;
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fields = draft.map(({ key, name, type, options, required }) => ({
        key,
        name,
        type,
        options: type === 'select' ? options : [],
        required: Boolean(required),
      }));
      const res = await projectService.updateCustomFields(project._id, fields);
      onSaved?.(res.data.data.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Không lưu được trường tùy chỉnh');
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    const fields = sortedFields(project);
    return fields.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Dự án chưa có trường tùy chỉnh" />
    ) : (
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        dataSource={fields}
        columns={[
          { title: 'Tên trường', dataIndex: 'name', key: 'name' },
          { title: 'Kiểu', dataIndex: 'type', key: 'type', render: typeLabel },
          { title: 'Lựa chọn', dataIndex: 'options', key: 'options', render: (options) => (options || []).map((o) => <Tag key={o}>{o}</Tag>) },
          { title: 'Bắt buộc', dataIndex: 'required', key: 'required', render: (required) => (required ? 'Có' : '') },
        ]}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Trường thêm cho mọi công việc của dự án. Tối đa 20 trường. Đổi tên không mất dữ liệu; muốn đổi kiểu
        thì xóa rồi tạo trường mới.
      </Text>

      {draft.map((field, index) => (
        <div
          key={field.draftId}
          data-testid="custom-field-row"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: 10, border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: 8 }}
        >
          <Input
            placeholder="Tên trường"
            value={field.name}
            maxLength={60}
            onChange={(e) => update(field.draftId, { name: e.target.value })}
            style={{ width: 200 }}
          />
          <Select
            data-testid="custom-field-type"
            value={field.type}
            options={TYPE_OPTIONS}
            disabled={Boolean(field.key)}
            onChange={(type) => update(field.draftId, { type })}
            style={{ width: 120 }}
          />
          {field.type === 'select' && (
            <Select
              mode="tags"
              placeholder="Gõ lựa chọn rồi Enter"
              value={field.options}
              onChange={(options) => update(field.draftId, { options })}
              style={{ minWidth: 220, flex: 1 }}
              tokenSeparators={[',']}
              open={false}
            />
          )}
          <Checkbox checked={Boolean(field.required)} onChange={(e) => update(field.draftId, { required: e.target.checked })}>
            Bắt buộc
          </Checkbox>
          <Space size={2} style={{ marginLeft: 'auto' }}>
            <Tooltip title="Đưa lên">
              <Button size="small" type="text" icon={<ArrowUpOutlined />} aria-label="Đưa lên" disabled={index === 0} onClick={() => move(index, -1)} />
            </Tooltip>
            <Tooltip title="Đưa xuống">
              <Button size="small" type="text" icon={<ArrowDownOutlined />} aria-label="Đưa xuống" disabled={index === draft.length - 1} onClick={() => move(index, 1)} />
            </Tooltip>
            <Tooltip title="Xóa trường">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="Xóa trường"
                onClick={() => setDraft((prev) => prev.filter((f) => f.draftId !== field.draftId))}
              />
            </Tooltip>
          </Space>
        </div>
      ))}

      {draft.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trường nào" />}

      {removedFields.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`Lưu lại sẽ xóa ${removedFields.map((f) => `"${f.name}"`).join(', ')} và giá trị của nó trên mọi công việc của dự án.`}
        />
      )}
      {error && <Alert type="error" showIcon title={error} closable onClose={() => setError('')} />}

      <Space>
        <Button
          icon={<PlusOutlined />}
          disabled={draft.length >= 20}
          onClick={() => setDraft((prev) => [...prev, toDraft({ name: '', type: 'text', options: [], required: false })])}
        >
          Thêm trường
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Lưu trường
        </Button>
      </Space>
    </div>
  );
}
