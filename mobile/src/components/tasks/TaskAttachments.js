import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../common/Card';
import attachmentApi from '../../api/attachmentApi';
import { formatTimeAgo } from '../../utils/formatters';
import {
  MAX_ATTACHMENT_SIZE,
  formatFileSize,
  canWriteAttachments,
  canDeleteAttachment,
} from '../../utils/attachmentRules.js';

/**
 * Tab "Tệp" của màn chi tiết công việc — như tab cùng tên bên web. Quy tắc quyền nằm ở
 * `utils/attachmentRules.js`, bản chép nguyên của web; server kiểm lại tất cả.
 */
export default function TaskAttachments({ task }) {
  const { theme, isDark } = useTheme();
  const { user, canManageModule } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [error, setError] = useState('');

  const taskId = task?._id;
  const archived = Boolean(task?.project?.isArchived);
  const canManageTasks = canManageModule ? canManageModule('tasks') : true;
  const canWrite = canWriteAttachments(task, canManageTasks);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      setItems(await attachmentApi.list(taskId));
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được danh sách tệp');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    const asset = !picked.canceled && picked.assets?.[0];
    if (!asset) return;
    if (asset.size > MAX_ATTACHMENT_SIZE) {
      setError('Tệp vượt quá 10 MB');
      return;
    }
    setUploading(true);
    try {
      const created = await attachmentApi.upload(taskId, asset);
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải tệp lên được');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (att) => {
    setError('');
    setOpeningId(att._id);
    try {
      const uri = await attachmentApi.download(taskId, att);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: att.mimeType, dialogTitle: att.originalName });
      } else {
        Alert.alert('Đã tải về', 'Thiết bị này không mở được bảng chia sẻ để lưu hoặc mở tệp.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải tệp về được');
    } finally {
      setOpeningId(null);
    }
  };

  const confirmDelete = (att) => {
    Alert.alert('Xóa tệp', `Xóa "${att.originalName}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa tệp',
        style: 'destructive',
        onPress: async () => {
          setError('');
          try {
            await attachmentApi.remove(taskId, att._id);
            setItems((prev) => prev.filter((a) => a._id !== att._id));
          } catch (err) {
            setError(err.response?.data?.message || 'Không xóa được tệp');
          }
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Tối đa 10 MB mỗi tệp, 20 tệp mỗi công việc.
        </Text>
        {canWrite && (
          <TouchableOpacity
            onPress={handleUpload}
            disabled={uploading}
            style={[styles.uploadBtn, { backgroundColor: theme.colors.primary, opacity: uploading ? 0.6 : 1 }]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            )}
            <Text style={styles.uploadText}>Tải tệp lên</Text>
          </TouchableOpacity>
        )}
      </View>

      {archived && (
        <Text style={[styles.notice, { color: theme.colors.textSecondary }]}>
          Dự án đã lưu trữ — chỉ xem và tải tệp về.
        </Text>
      )}
      {!!error && <Text style={[styles.notice, { color: theme.colors.danger }]}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      ) : items.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Chưa có tệp đính kèm</Text>
      ) : (
        items.map((att) => (
          <View
            key={att._id}
            testID="attachment-item"
            style={[styles.item, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}
          >
            <Ionicons name="document-attach-outline" size={20} color={theme.colors.textMuted} />
            <TouchableOpacity style={styles.itemBody} onPress={() => handleOpen(att)} disabled={openingId === att._id}>
              <Text style={[styles.itemName, { color: theme.colors.primary }]}>{att.originalName}</Text>
              <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>
                {formatFileSize(att.size)} · {att.uploadedBy?.name || 'Không rõ'} · {formatTimeAgo(att.createdAt)}
              </Text>
            </TouchableOpacity>
            {openingId === att._id && <ActivityIndicator size="small" color={theme.colors.primary} />}
            {canDeleteAttachment(att, task, user, canManageTasks) && (
              <TouchableOpacity
                accessibilityLabel={`Xóa ${att.originalName}`}
                onPress={() => confirmDelete(att)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  hint: { fontSize: 11, flex: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  uploadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  notice: { fontSize: 12, marginBottom: 10 },
  loading: { marginVertical: 16 },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, marginBottom: 8 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 4 },
});
