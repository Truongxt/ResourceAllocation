import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import taskApi from '../../api/taskApi';
import {
  STATUS_MAP,
  PRIORITY_MAP,
  formatDate,
  formatTimeAgo,
} from '../../utils/formatters';

/**
 * Chi tiết công việc: checklist và bình luận.
 *
 * Đây là hai thứ dùng nhiều nhất trên điện thoại — đánh dấu xong một mục, hỏi
 * một câu — nhưng trước đây mobile không có cả hai, dù API đã sẵn từ lâu.
 *
 * Cả hai khối đều tải lại toàn bộ task sau mỗi thao tác thay vì tự sửa state:
 * server còn tính thêm `progress` và các quy tắc trạng thái, đoán lại ở client
 * là mở đường cho hai bên nói hai con số khác nhau.
 */
export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params || {};
  const { theme } = useTheme();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      const res = await taskApi.getById(taskId);
      setTask(res.data?.data || null);
    } catch (e) {
      console.log('Error loading task:', e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTask();
    setRefreshing(false);
  };

  /**
   * Mọi thao tác đi chung một đường: gọi API, tải lại, báo lỗi bằng đúng câu
   * server trả về. Không tự chế thông điệp ở client vì server phân biệt khá
   * nhiều ca từ chối khác nhau — nói lại bằng lời mình là nói sai.
   */
  const run = async (fn, onDone) => {
    try {
      await fn();
      await loadTask();
      if (onDone) onDone();
    } catch (e) {
      Alert.alert(
        'Không thực hiện được',
        e.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.'
      );
    }
  };

  const handleToggleItem = (itemId) =>
    run(() => taskApi.toggleChecklistItem(taskId, itemId));

  const handleAddItem = async () => {
    const title = newItem.trim();
    if (!title) return;
    setAddingItem(true);
    await run(
      () => taskApi.addChecklistItem(taskId, title),
      () => setNewItem('')
    );
    setAddingItem(false);
  };

  const handleRemoveItem = (itemId) =>
    Alert.alert('Xóa mục này?', 'Thao tác không hoàn tác được.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => run(() => taskApi.removeChecklistItem(taskId, itemId)),
      },
    ]);

  const handleSendComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    setSending(true);
    await run(
      () => taskApi.addComment(taskId, content),
      () => setNewComment('')
    );
    setSending(false);
  };

  const handleDeleteComment = (commentId) =>
    Alert.alert('Xóa bình luận?', 'Thao tác không hoàn tác được.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => run(() => taskApi.deleteComment(taskId, commentId)),
      },
    ]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Chi tiết công việc" showBack onBack={() => navigation.goBack()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Không mở được công việc"
          description="Công việc có thể đã bị xóa hoặc bạn không có quyền xem."
        />
      </View>
    );
  }

  const status = STATUS_MAP[task.status] || STATUS_MAP.todo;
  const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
  const checklist = task.checklist || [];
  const doneCount = checklist.filter((i) => i.isCompleted).length;
  const comments = task.comments || [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Chi tiết công việc" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card style={styles.block}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{task.title}</Text>
          <View style={styles.badgeRow}>
            <Badge label={status.label} color={status.color} bg={status.bg} size="sm" />
            <Badge label={priority.label} color={priority.color} bg={priority.bg} size="sm" />
          </View>

          {!!task.description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {task.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
              Phụ trách: {task.assignee?.name || 'Chưa giao'}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
              Hạn: {formatDate(task.endDate)}
            </Text>
          </View>
        </Card>

        {/* ── Checklist ── */}
        <Card style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: theme.colors.text }]}>
              Checklist
            </Text>
            {checklist.length > 0 && (
              <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
                {doneCount}/{checklist.length}
              </Text>
            )}
          </View>

          {checklist.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
              Chưa có mục nào.
            </Text>
          ) : (
            checklist.map((item) => (
              <View key={item._id} style={styles.checkRow}>
                <TouchableOpacity
                  style={styles.checkTap}
                  onPress={() => handleToggleItem(item._id)}
                >
                  <Ionicons
                    name={item.isCompleted ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={item.isCompleted ? theme.colors.success : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checkText,
                      {
                        color: item.isCompleted
                          ? theme.colors.textMuted
                          : theme.colors.text,
                        textDecorationLine: item.isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveItem(item._id)}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              placeholder="Thêm mục mới…"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleAddItem}
              disabled={addingItem || !newItem.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: newItem.trim()
                    ? theme.colors.primary
                    : theme.colors.textMuted,
                },
              ]}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Bình luận ── */}
        <Card style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: theme.colors.text }]}>
              Bình luận
            </Text>
            {comments.length > 0 && (
              <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
                {comments.length}
              </Text>
            )}
          </View>

          {comments.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
              Chưa có bình luận nào.
            </Text>
          ) : (
            comments.map((c) => {
              // Server chỉ cho xóa bình luận của chính mình, hoặc admin xóa mọi
              // bình luận. Giấu nút ở những trường hợp còn lại để không bày ra
              // thao tác chắc chắn bị từ chối.
              const authorId = c.user?._id || c.user;
              const canDelete =
                String(authorId) === String(user?._id) || user?.role === 'admin';

              return (
                <View key={c._id} style={styles.comment}>
                  <View style={styles.commentHead}>
                    <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
                      {c.user?.name || 'Người dùng'}
                    </Text>
                    <View style={styles.commentHeadRight}>
                      <Text style={[styles.commentTime, { color: theme.colors.textMuted }]}>
                        {formatTimeAgo(c.createdAt)}
                      </Text>
                      {canDelete && (
                        <TouchableOpacity onPress={() => handleDeleteComment(c._id)}>
                          <Ionicons
                            name="close"
                            size={16}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.commentBody, { color: theme.colors.textSecondary }]}>
                    {c.content}
                  </Text>
                </View>
              );
            })
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Viết bình luận…"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={sending || !newComment.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: newComment.trim()
                    ? theme.colors.primary
                    : theme.colors.textMuted,
                },
              ]}
            >
              <Ionicons name="send" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  block: { marginBottom: 12, padding: 14 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12 },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  blockTitle: { fontSize: 15, fontWeight: '700' },
  counter: { fontSize: 12, fontWeight: '600' },
  empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  checkTap: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  checkText: { fontSize: 14, flex: 1 },
  comment: { paddingVertical: 8 },
  commentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 13, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
