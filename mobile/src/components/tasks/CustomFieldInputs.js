import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { sortedFields } from '../../utils/customFields.js';

const PLACEHOLDER = {
  text: 'Nhập nội dung',
  number: 'VD: 15.000.000',
  date: 'dd/mm/yyyy',
};

/**
 * Các ô trường tùy chỉnh của dự án trong form tạo/sửa công việc. Có kiểm soát: `inputs` là chuỗi
 * theo `key`, đổi qua `onChange(key, text)`. Đổi sang giá trị gửi server bằng `valuesFromInputs`
 * (utils/customFieldInputs.js). Chọn một là hàng pill: chạm lại lựa chọn đang chọn thì bỏ chọn.
 */
export default function CustomFieldInputs({ project, inputs = {}, onChange, disabled = false }) {
  const { theme } = useTheme();
  const fields = sortedFields(project);
  if (!fields.length) return null;

  return (
    <View testID="custom-field-inputs">
      {fields.map((field) => (
        <View key={field.key}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {field.name}
            {field.required ? ' *' : ''}
          </Text>
          {field.type === 'select' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(field.options || []).map((option) => {
                const selected = inputs[field.key] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${field.name}: ${option}`}
                    onPress={() => onChange(field.key, selected ? '' : option)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected ? theme.colors.primary : theme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                        borderColor: selected ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: selected ? '#ffffff' : theme.colors.text, fontWeight: selected ? '700' : '500' }]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <TextInput
              accessibilityLabel={field.name}
              editable={!disabled}
              value={inputs[field.key] ?? ''}
              onChangeText={(text) => onChange(field.key, text)}
              placeholder={PLACEHOLDER[field.type]}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType={field.type === 'number' ? 'decimal-pad' : field.type === 'date' ? 'numbers-and-punctuation' : 'default'}
              maxLength={field.type === 'text' ? 1000 : 30}
              style={[
                styles.input,
                { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12.5, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  pillText: { fontSize: 12 },
});
