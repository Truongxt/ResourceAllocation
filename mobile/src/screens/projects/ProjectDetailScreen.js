import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import projectApi from '../../api/projectApi';
import taskApi from '../../api/taskApi';
import taskGroupApi from '../../api/taskGroupApi';
import {
  formatDate,
  formatCurrency,
  PROJECT_STATUS_MAP,
  STATUS_MAP,
  PRIORITY_MAP,
} from '../../utils/formatters';

const PRIORITIES = [
  { key: 'low', label: 'Thấp', color: '#64748b' },
  { key: 'medium', label: 'Trung bình', color: '#3b82f6' },
  { key: 'high', label: 'Cao', color: '#f59e0b' },
  { key: 'critical', label: 'Khẩn cấp', color: '#ef4444' },
];

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId, title } = route.params;
  const { theme, isDark } = useTheme();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskGroups, setTaskGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'members'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Project Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Create Task in Project Modal
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskGroup, setTaskGroup] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskHours, setTaskHours] = useState('8');
  const [taskDesc, setTaskDesc] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  const loadProjectData = useCallback(async () => {
    try {
      const [pRes, tRes, gRes] = await Promise.all([
        projectApi.getById(projectId),
        taskApi.getAll({ project: projectId }),
        taskGroupApi.getByProject(projectId).catch(() => ({ data: { data: [] } })),
      ]);
      const projectData = pRes.data?.data?.project || pRes.data?.data || null;
      const rawTasks = tRes.data?.data?.tasks || tRes.data?.tasks || (Array.isArray(tRes.data?.data) ? tRes.data.data : []);
      const rawGroups = gRes.data?.data?.groups || gRes.data?.groups || (Array.isArray(gRes.data?.data) ? gRes.data.data : []);
      setProject(projectData);
      setTasks(Array.isArray(rawTasks) ? rawTasks : []);
      setTaskGroups(Array.isArray(rawGroups) ? rawGroups : []);
    } catch (e) {
      console.log('Error loading project detail:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjectData();
    setRefreshing(false);
  };

  const handleSaveProject = async () => {
    if (!editName.trim()) {
      Alert.alert('Thông báo', 'Tên dự án không được để trống');
      return;
    }
    setSavingProject(true);
    try {
      await projectApi.update(projectId, {
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        budget: Number(editBudget) || 0,
        description: editDesc.trim(),
      });
      setEditModalOpen(false);
      await loadProjectData();
      Alert.alert('Thành công', 'Đã cập nhật thông tin dự án');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu dự án');
    } finally {
      setSavingProject(false);
    }
  };

  const handleCreateTaskInProject = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên công việc');
      return;
    }
    setCreatingTask(true);
    try {
      await taskApi.create({
        title: taskTitle.trim(),
        project: projectId,
        taskGroup: taskGroup || undefined,
        priority: taskPriority,
        estimatedHours: Number(taskHours) || 8,
        description: taskDesc.trim(),
      });
      setCreateTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskGroup('');
      await loadProjectData();
      Alert.alert('Thành công', 'Đã thêm công việc vào dự án');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo công việc');
    } finally {
      setCreatingTask(false);
    }
  };

  const statusMeta = project
    ? PROJECT_STATUS_MAP[project.status] || PROJECT_STATUS_MAP.planning
    : PROJECT_STATUS_MAP.planning;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Header
        title={title || 'Chi tiết dự án'}
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.editBtnHeader}
            onPress={() => {
              if (project) {
                setEditName(project.name || '');
                setEditCode(project.code || '');
                setEditBudget(String(project.budget || ''));
                setEditDesc(project.description || '');
                setEditModalOpen(true);
              }
            }}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

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
        {project && (
          <>
            {/* Overview Card */}
            <Card style={styles.overviewCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleWrap}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>
                    {project.name}
                  </Text>
                  {project.code && (
                    <Badge
                      label={project.code}
                      color={theme.colors.primaryLight}
                      size="sm"
                    />
                  )}
                </View>

                <Badge
                  label={statusMeta.label}
                  color={statusMeta.color}
                  bg={statusMeta.bg}
                />
              </View>

              <Text
                style={[styles.desc, { color: theme.colors.textSecondary }]}
              >
                {project.description || 'Không có mô tả chi tiết.'}
              </Text>

              {/* Progress */}
              <View style={styles.progressWrap}>
                <View style={styles.progressLabels}>
                  <Text
                    style={[
                      styles.metaLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Tiến độ hoàn thành
                  </Text>
                  <Text
                    style={[
                      styles.progressVal,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {project.progress || 0}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.track,
                    {
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.08)'
                        : '#e2e8f0',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${project.progress || 0}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Stats Grid */}
              <View
                style={[
                  styles.metaGrid,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.metaCol}>
                  <Text
                    style={[
                      styles.metaLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Ngân sách
                  </Text>
                  <Text
                    style={[styles.metaVal, { color: theme.colors.text }]}
                  >
                    {formatCurrency(project.budget)}
                  </Text>
                </View>

                <View style={styles.metaCol}>
                  <Text
                    style={[
                      styles.metaLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Thời gian
                  </Text>
                  <Text
                    style={[styles.metaVal, { color: theme.colors.text }]}
                  >
                    {formatDate(project.startDate)} → {formatDate(project.endDate)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Tabs Switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                onPress={() => setActiveTab('tasks')}
                style={[
                  styles.tabItem,
                  activeTab === 'tasks' && {
                    borderBottomColor: theme.colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabTitle,
                    {
                      color:
                        activeTab === 'tasks'
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                      fontWeight: activeTab === 'tasks' ? '700' : '500',
                    },
                  ]}
                >
                  Công việc ({(Array.isArray(tasks) ? tasks : []).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('members')}
                style={[
                  styles.tabItem,
                  activeTab === 'members' && {
                    borderBottomColor: theme.colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabTitle,
                    {
                      color:
                        activeTab === 'members'
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                      fontWeight: activeTab === 'members' ? '700' : '500',
                    },
                  ]}
                >
                  Thành viên ({project.members?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            {activeTab === 'tasks' ? (
              <View>
                <View style={styles.tasksActionBar}>
                  <Text style={[styles.taskGroupsCount, { color: theme.colors.textSecondary }]}>
                    {taskGroups.length > 0 ? `📁 ${taskGroups.length} nhóm việc` : ''}
                  </Text>
                  <TouchableOpacity
                    style={[styles.addTaskMiniBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setCreateTaskModalOpen(true)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addTaskMiniText}>Thêm việc</Text>
                  </TouchableOpacity>
                </View>

                {(Array.isArray(tasks) ? tasks : []).length === 0 ? (
                  <EmptyState
                    icon="checkbox-outline"
                    title="Chưa có công việc"
                    description="Bấm 'Thêm việc' để bắt đầu giao việc cho dự án này."
                  />
                ) : (
                  (Array.isArray(tasks) ? tasks : []).map((task) => {
                    const sMeta = STATUS_MAP[task.status] || STATUS_MAP.todo;
                    const pMeta = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                    return (
                      <Card
                        key={task._id}
                        style={styles.taskCard}
                        onPress={() =>
                          navigation.navigate('TaskDetail', { taskId: task._id, title: task.title })
                        }
                      >
                        <View style={styles.taskHeader}>
                          <Text
                            style={[styles.taskTitle, { color: theme.colors.text }]}
                            numberOfLines={1}
                          >
                            {task.title}
                          </Text>
                          <Badge
                            label={sMeta.label}
                            color={sMeta.color}
                            bg={sMeta.bg}
                            size="sm"
                          />
                        </View>

                        <View style={styles.taskMetaRow}>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <Badge
                              label={pMeta.label}
                              color={pMeta.color}
                              bg={pMeta.bg}
                              size="sm"
                            />
                            {task.taskGroup && (
                              <Badge
                                label={`📁 ${task.taskGroup.name}`}
                                color={task.taskGroup.color || '#3b82f6'}
                                bg={`${task.taskGroup.color || '#3b82f6'}20`}
                                size="sm"
                              />
                            )}
                          </View>
                          <View style={styles.assigneeWrap}>
                            <Ionicons
                              name="person"
                              size={12}
                              color={theme.colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.assigneeText,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {task.assignee?.name || 'Chưa gán'}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            ) : (
              project.members?.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="Chưa có thành viên"
                  description="Dự án chưa có nhân sự được thêm vào."
                />
              ) : (
                project.members?.map((m) => {
                  const memberName = m.user?.name || m.resource?.name || 'Nhân sự';
                  const memberInitial = (memberName || 'U').charAt(0).toUpperCase();
                  return (
                    <Card key={m._id || m.resource?._id || m.user?._id} style={styles.memberCard}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.avatarText}>
                          {memberInitial}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text
                          style={[styles.memberName, { color: theme.colors.text }]}
                        >
                          {memberName}
                        </Text>
                        <Text
                          style={[
                            styles.memberRole,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {m.role || 'Thành viên'} · Phân bổ: {m.allocation || 100}%
                        </Text>
                      </View>
                    </Card>
                  );
                })
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Modal 1: Sửa thông tin dự án */}
      <Modal visible={editModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Chỉnh sửa dự án
              </Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Tên dự án *
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mã dự án (Code)
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                value={editCode}
                onChangeText={setEditCode}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Ngân sách (VND)
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                keyboardType="numeric"
                value={editBudget}
                onChangeText={setEditBudget}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mô tả dự án
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text, height: 80, textAlignVertical: 'top' }]}
                multiline
                value={editDesc}
                onChangeText={setEditDesc}
              />

              <Button
                title="Lưu thay đổi"
                onPress={handleSaveProject}
                loading={savingProject}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Tạo công việc mới trực tiếp trong dự án */}
      <Modal visible={createTaskModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Thêm công việc cho dự án
              </Text>
              <TouchableOpacity onPress={() => setCreateTaskModalOpen(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Tiêu đề công việc *
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                placeholder="VD: Kiểm thử chức năng thanh toán"
                placeholderTextColor={theme.colors.textMuted}
                value={taskTitle}
                onChangeText={setTaskTitle}
              />

              {/* Task Groups */}
              {taskGroups.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Nhóm công việc (Task Group)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <TouchableOpacity
                      onPress={() => setTaskGroup('')}
                      style={[
                        styles.groupPill,
                        {
                          backgroundColor: !taskGroup ? theme.colors.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                        },
                      ]}
                    >
                      <Text style={[styles.groupPillText, { color: !taskGroup ? '#fff' : theme.colors.text }]}>
                        Không phân nhóm
                      </Text>
                    </TouchableOpacity>
                    {taskGroups.map((g) => {
                      const isSel = taskGroup === g._id;
                      return (
                        <TouchableOpacity
                          key={g._id}
                          onPress={() => setTaskGroup(g._id)}
                          style={[
                            styles.groupPill,
                            {
                              backgroundColor: isSel ? (g.color || theme.colors.primary) : (theme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                            },
                          ]}
                        >
                          <Text style={[styles.groupPillText, { color: isSel ? '#fff' : theme.colors.text }]}>
                            📁 {g.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Priority */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mức ưu tiên
              </Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((pr) => {
                  const isSel = taskPriority === pr.key;
                  return (
                    <TouchableOpacity
                      key={pr.key}
                      onPress={() => setTaskPriority(pr.key)}
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor: isSel
                            ? pr.color
                            : theme.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#f1f5f9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          {
                            color: isSel ? '#ffffff' : theme.colors.text,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {pr.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Giờ ước tính (h)
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                keyboardType="numeric"
                value={taskHours}
                onChangeText={setTaskHours}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mô tả
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text, height: 70, textAlignVertical: 'top' }]}
                multiline
                value={taskDesc}
                onChangeText={setTaskDesc}
              />

              <Button
                title="Tạo công việc"
                onPress={handleCreateTaskInProject}
                loading={creatingTask}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  editBtnHeader: {
    padding: 6,
  },
  overviewCard: {
    padding: 18,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
  desc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  progressWrap: {
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  metaGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metaCol: {
    flex: 1,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabTitle: {
    fontSize: 14,
  },
  tasksActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskGroupsCount: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  addTaskMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addTaskMiniText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  taskCard: {
    marginBottom: 10,
    padding: 14,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assigneeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assigneeText: {
    fontSize: 11,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 12,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  groupPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 8,
  },
  groupPillText: {
    fontSize: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityPillText: {
    fontSize: 12,
  },
});
