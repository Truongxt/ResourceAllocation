import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { sortedFields } from '../../utils/customFields';

/** `customValues` của công việc → giá trị cho Form (ngày thành dayjs). */
export function toFormCustomValues(project, values = {}) {
  const form = {};
  sortedFields(project).forEach((field) => {
    const value = values?.[field.key];
    if (value === undefined || value === null) return;
    // Ngày lưu là nửa đêm UTC: lấy phần YYYY-MM-DD, đừng để múi giờ máy dời sang hôm trước.
    form[field.key] = field.type === 'date' ? dayjs(String(value).slice(0, 10)) : value;
  });
  return form;
}

/**
 * Giá trị Form → `customValues` gửi server. Chỉ các trường của dự án đang chọn (đổi dự án giữa
 * chừng thì ô của dự án cũ còn trong state của form); ô trống gửi `null` để xóa giá trị cũ.
 */
export function fromFormCustomValues(project, formValues = {}) {
  const values = {};
  sortedFields(project).forEach((field) => {
    const value = formValues?.[field.key];
    if (value === undefined || value === null || value === '') values[field.key] = null;
    else values[field.key] = field.type === 'date' ? dayjs(value).format('YYYY-MM-DD') : value;
  });
  return values;
}

/** Các ô trường tùy chỉnh của dự án trong form tạo/sửa công việc. */
export default function CustomFieldInputs({ project, disabled = false }) {
  const fields = sortedFields(project);
  if (!fields.length) return null;

  return (
    <div data-testid="custom-field-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', columnGap: 16 }}>
      {fields.map((field) => (
        <Form.Item
          key={field.key}
          name={['customValues', field.key]}
          label={field.name}
          rules={field.required ? [{ required: true, message: `Chưa điền "${field.name}"` }] : []}
        >
          {field.type === 'number' ? (
            <InputNumber style={{ width: '100%' }} disabled={disabled} />
          ) : field.type === 'date' ? (
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled={disabled} />
          ) : field.type === 'select' ? (
            <Select allowClear disabled={disabled} options={field.options.map((o) => ({ value: o, label: o }))} />
          ) : (
            <Input maxLength={1000} disabled={disabled} />
          )}
        </Form.Item>
      ))}
    </div>
  );
}
