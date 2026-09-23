import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import taskApi from '../../api/taskApi';
import {
  formatDate,
  formatDateTime,
  formatTimeAgo,
  STATUS_MAP,
  PRIORITY_MAP,
} from '../../utils/formatters';

const TABS = [
  { key: 'info', label: 'Thông tin' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'workflow', label: 'Quy trình' },
  { key: 'comments', label: 'Bình luận' },
];

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId, title } = route.params;
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Checklist state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Modals state
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [actualHours, setActualHours] = useState('');
  const [deliverableLink, setDeliverableLink] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [submittingFail, setSubmittingFail] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      const res = await taskApi.getById(taskId);
      setTask(res.data?.data?.task || res.data?.data || null);
    } catch (err) {
      console.log('Error loading task detail:', err);
      Alert.alert('Lỗi', 'Không thể tải chi tiết công việc');
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

  // Checklist actions
  const handleToggleChecklist = async (itemId) => {
    try {
      await taskApi.toggleChecklist(taskId, itemId);
      setTask((prev) => {
        if (!prev) return prev;
        const updated = (prev.checklist || []).map((item) =>
          item._id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
        );
        return { ...prev, checklist: updated };
      });
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật mục checklist');
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    setAddingChecklist(true);
    try {
      await taskApi.addChecklist(taskId, newChecklistTitle.trim());
      setNewChecklistTitle('');
      await loadTask();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể thêm mục checklist');
    } finally {
      setAddingChecklist(false);
    }
  };

  const handleDeleteChecklist = async (itemId) => {
    try {
      await taskApi.deleteChecklist(taskId, itemId);
      setTask((prev) => {
        if (!prev) return prev;
        const updated = (prev.checklist || []).filter((item) => item._id !== itemId);
        return { ...prev, checklist: updated };
      });
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể xóa mục checklist');
    }
  };

  // Comment action
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await taskApi.addComment(taskId, newComment.trim());
      setNewComment('');
      await loadTask();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    } finally {
      setSendingComment(false);
    }
  };

  // Workflow actions
  const handleUpdateStatus = async (status, extra = {}) => {
    setUpdatingStatus(true);
    try {
      await taskApi.updateStatus(taskId, status, extra);
      setStatusModalOpen(false);
      await loadTask();
      Alert.alert('Thành công', 'Đã cập nhật trạng thái');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReportResult = async () => {
    setSubmittingResult(true);
    try {
      await taskApi.reportResult(taskId, {
        actualHours: Number(actualHours) || 0,
        deliverableLinks: deliverableLink.trim()
          ? [{ title: 'Sản phẩm đầu ra', url: deliverableLink.trim() }]
          : [],
      });
      setResultModalOpen(false);
      setActualHours('');
      setDeliverableLink('');
      await loadTask();
      Alert.alert('Thành công', 'Đã nộp báo cáo kết quả và chuyển sang chờ duyệt');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể nộp báo cáo');
    } finally {
      setSubmittingResult(false);
    }
  };

  const handleApprove = async () => {
    try {
      await taskApi.review(taskId, 'approved', 'Đã phê duyệt hoàn thành');
      await loadTask();
      Alert.alert('Thành công', 'Đã phê duyệt hoàn thành công việc');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể phê duyệt');
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do trả lại');
      return;
    }
    setSubmittingReject(true);
    try {
      await taskApi.review(taskId, 'rejected', rejectComment.trim());
      setRejectModalOpen(false);
      setRejectComment('');
      await loadTask();
      Alert.alert('Thành công', 'Đã trả lại công việc yêu cầu làm lại');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Lỗi khi trả lại');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleMarkFailed = async () => {
    if (!failReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do thất bại');
      return;
    }
    setSubmittingFail(true);
    try {
      await taskApi.updateStatus(taskId, 'failed', { failureReason: failReason.trim() });
      setFailModalOpen(false);
      setFailReason('');
      await loadTask();
      Alert.alert('Thành công', 'Đã đánh dấu công việc thất bại');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Lỗi khi đánh dấu thất bại');
    } finally {
      setSubmittingFail(false);
    }
  };

  const checklistProgress = useMemo(() => {
    const list = task?.checklist || [];
    if (!list.length) return { total: 0, done: 0, percent: 0 };
    const done = list.filter((item) => item.isCompleted).length;
    return { total: list.length, done, percent: Math.round((done / list.length) * 100) };
  }, [task?.checklist]);

  const sMeta = STATUS_MAP[task?.status] || STATUS_MAP.todo;
  const pMeta = PRIORITY_MAP[task?.priority] || PRIORITY_MAP.medium;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={title || 'Chi tiết công việc'}
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={[styles.statusChangeBtn, { backgroundColor: sMeta.bg }]}
            onPress={() => setStatusModalOpen(true)}
          >
            <Text style={[styles.statusChangeBtnText, { color: sMeta.color }]}>
              {sMeta.label} ▾
            </Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !task ? (
        <View style={styles.centerContainer}>
          <Text style={{ color: theme.colors.textSecondary }}>Không tìm thấy công việc</Text>
        </View>
      ) : (
        <>
          {/* Tabs bar */}
          <View style={[styles.tabsBar, { borderBottomColor: theme.colors.border }]}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              const count =
                tab.key === 'checklist'
                  ? `(${task.checklist?.length || 0})`
                  : tab.key === 'comments'
                  ? `(${task.comments?.length || 0})`
                  : '';
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    styles.tabItem,
                    active && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? theme.colors.primary : theme.colors.textSecondary,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label} {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {/* TAB 1: THÔNG TIN TỔNG QUAN */}
            {activeTab === 'info' && (
              <View>
                <Card style={styles.mainCard}>
                  <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
                    {task.title}
                  </Text>

                  {/* Badges row: Project, TaskGroup, Priority */}
                  <View style={styles.badgeRow}>
                    {task.project && (
                      <Badge
                        label={task.project.code || task.project.name}
                        color="#8b5cf6"
                        bg="rgba(139, 92, 246, 0.12)"
                        size="sm"
                      />
                    )}

                    {task.taskGroup && (
                      <Badge
                        label={`📁 ${task.taskGroup.name}`}
                        color={task.taskGroup.color || '#3b82f6'}
                        bg={`${task.taskGroup.color || '#3b82f6'}20`}
                        size="sm"
                      />
                    )}

                    <Badge
                      label={pMeta.label}
                      color={pMeta.color}
                      bg={pMeta.bg}
                      size="sm"
                    />
                  </View>

                  {/* Description */}
                  <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
                    MÔ TẢ
                  </Text>
                  <Text style={[styles.description, { color: theme.colors.text }]}>
                    {task.description || 'Không có mô tả chi tiết.'}
                  </Text>
                </Card>

                {/* Key metadata grid */}
                <Card style={styles.metaCard}>
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />
                    <Text style={[styles.metaKey, { color: theme.colors.textSecondary }]}>
                      Người thực hiện:
                    </Text>
                    <Text style={[styles.metaVal, { color: theme.colors.text }]}>
                      {task.assignee?.name || 'Chưa phân công'}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
                    <Text style={[styles.metaKey, { color: theme.colors.textSecondary }]}>
                      Thời hạn:
                    </Text>
                    <Text style={[styles.metaVal, { color: theme.colors.text }]}>
                      {formatDate(task.startDate)} → {formatDate(task.endDate)}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
                    <Text style={[styles.metaKey, { color: theme.colors.textSecondary }]}>
                      Giờ dự kiến / Thực tế:
                    </Text>
                    <Text style={[styles.metaVal, { color: theme.colors.text }]}>
                      {task.estimatedHours || 0}h / {task.actualHours || 0}h
                    </Text>
                  </View>

                  {task.progress !== undefined && (
                    <View style={styles.metaRow}>
                      <Ionicons name="trending-up-outline" size={18} color={theme.colors.textMuted} />
                      <Text style={[styles.metaKey, { color: theme.colors.textSecondary }]}>
                        Tiến độ hoàn thành:
                      </Text>
                      <Text style={[styles.metaVal, { color: theme.colors.primary, fontWeight: '700' }]}>
                        {task.progress}%
                      </Text>
                    </View>
                  )}
                </Card>

                {/* Status-specific banners */}
                {task.status === 'review' && (
                  <View style={[styles.alertBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#f59e0b' }]}>
                    <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                    <Text style={[styles.alertText, { color: '#f59e0b' }]}>
                      Công việc đang chờ đánh giá và nghiệm thu.
                    </Text>
                  </View>
                )}

                {task.status === 'failed' && (
                  <View style={[styles.alertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#ef4444' }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertText, { color: '#ef4444', fontWeight: '700' }]}>
                        Công việc đã bị đánh dấu Thất bại
                      </Text>
                      <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 2 }}>
                        Lý do: {task.failureReason || 'Không ghi rõ lý do'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: CHECKLIST */}
            {activeTab === 'checklist' && (
              <View>
                <Card style={styles.checklistCard}>
                  <View style={styles.checklistProgressHeader}>
                    <Text style={[styles.checklistHeading, { color: theme.colors.text }]}>
                      Tiến độ mục kiểm tra
                    </Text>
                    <Text style={[styles.checklistProgressText, { color: theme.colors.primary }]}>
                      {checklistProgress.done}/{checklistProgress.total} ({checklistProgress.percent}%)
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${checklistProgress.percent}%`,
                          backgroundColor: checklistProgress.percent === 100 ? '#10b981' : theme.colors.primary,
                        },
                      ]}
                    />
                  </View>

                  {/* Checklist items */}
                  {(task.checklist || []).map((item) => (
                    <View key={item._id} style={[styles.checklistItem, { borderBottomColor: theme.colors.border }]}>
                      <TouchableOpacity
                        style={styles.checkboxTouch}
                        onPress={() => handleToggleChecklist(item._id)}
                      >
                        <Ionicons
                          name={item.isCompleted ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={item.isCompleted ? '#10b981' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.checklistTitle,
                            {
                              color: item.isCompleted ? theme.colors.textMuted : theme.colors.text,
                              textDecorationLine: item.isCompleted ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {item.title}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteChecklist(item._id)}
                        style={styles.deleteChecklistBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add checklist input */}
                  <View style={styles.addChecklistRow}>
                    <TextInput
                      style={[
                        styles.addChecklistInput,
                        {
                          backgroundColor: theme.colors.inputBg,
                          borderColor: theme.colors.inputBorder,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="Thêm mục checklist mới..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={newChecklistTitle}
                      onChangeText={setNewChecklistTitle}
                      onSubmitEditing={handleAddChecklist}
                    />
                    <TouchableOpacity
                      onPress={handleAddChecklist}
                      disabled={addingChecklist || !newChecklistTitle.trim()}
                      style={[
                        styles.addChecklistBtn,
                        {
                          backgroundColor: newChecklistTitle.trim() ? theme.colors.primary : '#94a3b8',
                        },
                      ]}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </Card>
              </View>
            )}

            {/* TAB 3: QUY TRÌNH & ĐÁNH GIÁ (WORKFLOW) */}
            {activeTab === 'workflow' && (
              <View>
                {/* Result report card */}
                {task.resultReport ? (
                  <Card style={styles.workflowCard}>
                    <Text style={[styles.workflowHeading, { color: theme.colors.text }]}>
                      Báo cáo kết quả công việc
                    </Text>
                    <Text style={[styles.workflowSub, { color: theme.colors.textSecondary }]}>
                      Đã ghi nhận: {task.resultReport.actualHours || task.actualHours || 0} giờ thực tế
                    </Text>
                    {task.resultReport.deliverableLinks?.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                          Liên kết sản phẩm:
                        </Text>
                        {task.resultReport.deliverableLinks.map((link, idx) => (
                          <Text key={idx} style={{ color: '#3b82f6', marginTop: 4, textDecorationLine: 'underline' }}>
                            {link.url}
                          </Text>
                        ))}
                      </View>
                    )}
                  </Card>
                ) : (
                  <Card style={styles.workflowCard}>
                    <Text style={[styles.workflowHeading, { color: theme.colors.text }]}>
                      Báo cáo nghiệm thu & Hoàn thành
                    </Text>
                    <Text style={[styles.workflowSub, { color: theme.colors.textSecondary }]}>
                      Khi hoàn thành công việc, hãy nộp số giờ làm việc thực tế và liên kết kết quả để chuyển sang bước nghiệm thu.
                    </Text>
                    <Button
                      title="Nộp báo cáo kết quả"
                      onPress={() => setResultModalOpen(true)}
                      size="md"
                      style={{ marginTop: 12 }}
                    />
                  </Card>
                )}

                {/* Reviewer / Manager actions */}
                {task.status === 'review' && (
                  <Card style={[styles.workflowCard, { marginTop: 12 }]}>
                    <Text style={[styles.workflowHeading, { color: theme.colors.text }]}>
                      Duyệt & Đánh giá công việc
                    </Text>
                    <View style={styles.reviewBtnsRow}>
                      <Button
                        title="✓ Phê duyệt"
                        onPress={handleApprove}
                        style={{ flex: 1, backgroundColor: '#10b981' }}
                      />
                      <Button
                        title="✕ Trả lại"
                        onPress={() => setRejectModalOpen(true)}
                        style={{ flex: 1, backgroundColor: '#ef4444' }}
                      />
                    </View>
                  </Card>
                )}

                {/* Mark as failed action */}
                <Card style={[styles.workflowCard, { marginTop: 12 }]}>
                  <Text style={[styles.workflowHeading, { color: theme.colors.text }]}>
                    Trường hợp khẩn cấp / Rủi ro
                  </Text>
                  <Button
                    title="Đánh dấu Thất bại (Failed)"
                    onPress={() => setFailModalOpen(true)}
                    variant="outline"
                    style={{ marginTop: 8, borderColor: '#ef4444' }}
                    textStyle={{ color: '#ef4444' }}
                  />
                </Card>
              </View>
            )}

            {/* TAB 4: BÌNH LUẬN & THẢO LUẬN */}
            {activeTab === 'comments' && (
              <View>
                <Card style={styles.commentsCard}>
                  {/* Comments list */}
                  {(task.comments || []).length === 0 ? (
                    <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                      Chưa có bình luận nào. Hãy bắt đầu thảo luận!
                    </Text>
                  ) : (
                    (task.comments || []).map((cmt) => (
                      <View key={cmt._id} style={[styles.commentBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentAuthor, { color: theme.colors.primary }]}>
                            {cmt.user?.name || 'Người dùng'}
                          </Text>
                          <Text style={[styles.commentTime, { color: theme.colors.textMuted }]}>
                            {formatTimeAgo(cmt.createdAt)}
                          </Text>
                        </View>
                        <Text style={[styles.commentContent, { color: theme.colors.text }]}>
                          {cmt.content}
                        </Text>
                      </View>
                    ))
                  )}

                  {/* Add comment input */}
                  <View style={[styles.addCommentWrap, { borderTopColor: theme.colors.border }]}>
                    <TextInput
                      style={[
                        styles.commentInput,
                        {
                          backgroundColor: theme.colors.inputBg,
                          borderColor: theme.colors.inputBorder,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="Viết bình luận hoặc trao đổi..."
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                      value={newComment}
                      onChangeText={setNewComment}
                    />
                    <TouchableOpacity
                      onPress={handleAddComment}
                      disabled={sendingComment || !newComment.trim()}
                      style={[
                        styles.sendCommentBtn,
                        { backgroundColor: newComment.trim() ? theme.colors.primary : '#94a3b8' },
                      ]}
                    >
                      <Ionicons name="send" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </Card>
              </View>
            )}
          </ScrollView>

          {/* Modal 1: Nộp báo cáo kết quả */}
          <Modal visible={resultModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Nộp kết quả công việc
                  </Text>
                  <TouchableOpacity onPress={() => setResultModalOpen(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Số giờ thực tế làm việc (giờ)
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                  placeholder="VD: 8"
                  keyboardType="numeric"
                  value={actualHours}
                  onChangeText={setActualHours}
                />

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Liên kết sản phẩm đầu ra (URL / Drive / GitHub)
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                  placeholder="https://..."
                  value={deliverableLink}
                  onChangeText={setDeliverableLink}
                />

                <Button
                  title="Xác nhận nộp & Báo xong"
                  onPress={handleReportResult}
                  loading={submittingResult}
                  style={{ marginTop: 12 }}
                />
              </View>
            </View>
          </Modal>

          {/* Modal 2: Trả lại công việc */}
          <Modal visible={rejectModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Yêu cầu làm lại (Trả lại)
                  </Text>
                  <TouchableOpacity onPress={() => setRejectModalOpen(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Lý do yêu cầu làm lại *
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text, height: 90, textAlignVertical: 'top' }]}
                  placeholder="Nêu rõ điểm chưa đạt cần chỉnh sửa..."
                  multiline
                  value={rejectComment}
                  onChangeText={setRejectComment}
                />

                <Button
                  title="Xác nhận trả lại"
                  onPress={handleReject}
                  loading={submittingReject}
                  style={{ marginTop: 12, backgroundColor: '#ef4444' }}
                />
              </View>
            </View>
          </Modal>

          {/* Modal 3: Đánh dấu thất bại */}
          <Modal visible={failModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: '#ef4444' }]}>
                    Đánh dấu công việc Thất bại
                  </Text>
                  <TouchableOpacity onPress={() => setFailModalOpen(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Lý do công việc thất bại *
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text, height: 90, textAlignVertical: 'top' }]}
                  placeholder="Ghi rõ trở ngại khách quan hoặc lý do không hoàn thành..."
                  multiline
                  value={failReason}
                  onChangeText={setFailReason}
                />

                <Button
                  title="Đánh dấu thất bại"
                  onPress={handleMarkFailed}
                  loading={submittingFail}
                  style={{ marginTop: 12, backgroundColor: '#ef4444' }}
                />
              </View>
            </View>
          </Modal>

          {/* Modal 4: Đổi trạng thái nhanh */}
          <Modal visible={statusModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Cập nhật trạng thái
                  </Text>
                  <TouchableOpacity onPress={() => setStatusModalOpen(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.statusOptionsList}>
                  {Object.entries(STATUS_MAP).map(([sKey, sVal]) => (
                    <TouchableOpacity
                      key={sKey}
                      style={[
                        styles.statusSelectRow,
                        {
                          backgroundColor: task.status === sKey ? sVal.bg : 'transparent',
                          borderColor: sVal.color,
                        },
                      ]}
                      onPress={() => {
                        if (sKey === 'failed') {
                          setStatusModalOpen(false);
                          setFailModalOpen(true);
                        } else {
                          handleUpdateStatus(sKey);
                        }
                      }}
                    >
                      <View style={[styles.statusDot, { backgroundColor: sVal.color }]} />
                      <Text style={[styles.statusSelectLabel, { color: theme.colors.text }]}>
                        {sVal.label}
                      </Text>
                      {task.status === sKey && (
                        <Ionicons name="checkmark" size={18} color={sVal.color} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 13,
  },
  mainCard: {
    padding: 16,
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaCard: {
    padding: 16,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaKey: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 13,
    flex: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  alertText: {
    fontSize: 13,
    flex: 1,
  },
  checklistCard: {
    padding: 16,
  },
  checklistProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  checklistProgressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checklistTitle: {
    fontSize: 14,
    flex: 1,
  },
  deleteChecklistBtn: {
    padding: 4,
  },
  addChecklistRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  addChecklistInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addChecklistBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowCard: {
    padding: 16,
  },
  workflowHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  workflowSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewBtnsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  commentsCard: {
    padding: 16,
  },
  noCommentsText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  commentBubble: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
  },
  commentContent: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  addCommentWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 90,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendCommentBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
  },
  statusOptionsList: {
    gap: 8,
  },
  statusSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusSelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
