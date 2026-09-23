import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import taskApi from '../../api/taskApi';
import projectApi from '../../api/projectApi';
import taskGroupApi from '../../api/taskGroupApi';
import {
  STATUS_MAP,
  PRIORITY_MAP,
} from '../../utils/formatters';

const SCOPE_TABS = [
  { key: 'all', label: 'Tất cả việc' },
  { key: 'my_tasks', label: 'Việc của tôi' },
  { key: 'assigned_by_me', label: 'Tôi giao' },
  { key: 'following', label: 'Theo dõi' },
];

const TIME_TABS = [
  { key: 'all', label: 'Mọi hạn' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'this_week', label: 'Tuần này' },
  { key: 'overdue', label: 'Quá hạn ⚠️' },
];

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'todo', label: 'Cần làm' },
  { key: 'in_progress', label: 'Đang làm' },
  { key: 'review', label: 'Đánh giá' },
  { key: 'done', label: 'Hoàn thành' },
];

const PRIORITIES = [
  { key: 'low', label: 'Thấp', color: '#64748b' },
  { key: 'medium', label: 'Trung bình', color: '#3b82f6' },
  { key: 'high', label: 'Cao', color: '#f59e0b' },
  { key: 'critical', label: 'Khẩn cấp', color: '#ef4444' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KANBAN_COL_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

const KANBAN_COLUMNS = [
  {
    key: 'todo',
    label: 'Cần làm',
    icon: 'clipboard-outline',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    nextStatus: 'in_progress',
    nextLabel: 'Bắt đầu làm ➔',
  },
  {
    key: 'in_progress',
    label: 'Đang làm',
    icon: 'flash-outline',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    nextStatus: 'review',
    nextLabel: 'Nộp duyệt ➔',
  },
  {
    key: 'review',
    label: 'Đánh giá',
    icon: 'eye-outline',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    nextStatus: 'done',
    nextLabel: 'Duyệt xong ✓',
  },
  {
    key: 'done',
    label: 'Hoàn thành',
    icon: 'checkmark-circle-outline',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
];

export default function TasksScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Filters
  const [scopeFilter, setScopeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [projectGroups, setProjectGroups] = useState([]);
  const [selectedTaskGroup, setSelectedTaskGroup] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newHours, setNewHours] = useState('8');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Load project task groups when selected project changes
  useEffect(() => {
    if (newProject) {
      taskGroupApi
        .getByProject(newProject)
        .then((res) => setProjectGroups(res.data?.data?.groups || res.data?.data || []))
        .catch(() => setProjectGroups([]));
    } else {
      setProjectGroups([]);
      setSelectedTaskGroup('');
    }
  }, [newProject]);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (viewMode === 'list' && statusFilter !== 'all') params.status = statusFilter;
      if (scopeFilter !== 'all') params.scope = scopeFilter;
      if (timeFilter !== 'all') params.timeFilter = timeFilter;

      const [tRes, pRes] = await Promise.all([
        taskApi.getAll(params),
        projectApi.getAll({ limit: 50 }),
      ]);
      const rawTasks = tRes.data?.data?.tasks || tRes.data?.tasks || (Array.isArray(tRes.data?.data) ? tRes.data.data : []);
      const rawProjects = pRes.data?.data?.projects || pRes.data?.projects || (Array.isArray(pRes.data?.data) ? pRes.data.data : []);
      setTasks(Array.isArray(rawTasks) ? rawTasks : []);
      setProjects(Array.isArray(rawProjects) ? rawProjects : []);
    } catch (err) {
      console.log('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, scopeFilter, timeFilter, viewMode]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề công việc');
      return;
    }
    if (!newProject) {
      Alert.alert('Thông báo', 'Vui lòng chọn dự án cho công việc');
      return;
    }

    setCreating(true);
    try {
      await taskApi.create({
        title: newTitle.trim(),
        project: newProject,
        taskGroup: selectedTaskGroup || undefined,
        priority: newPriority,
        estimatedHours: Number(newHours) || 8,
        description: newDesc.trim(),
      });
      Alert.alert('Thành công', 'Tạo công việc mới thành công');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setSelectedTaskGroup('');
      await loadTasks();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo công việc');
    } finally {
      setCreating(false);
    }
  };

  const renderTaskItem = ({ item }) => {
    const sMeta = STATUS_MAP[item.status] || STATUS_MAP.todo;
    const pMeta = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;

    // Chạm vào thẻ mở màn chi tiết (checklist, bình luận); còn đổi trạng thái
    // vẫn giữ lối tắt riêng ở nhãn trạng thái, vì đó là thao tác hay dùng nhất
    // và không đáng phải đi qua thêm một màn.
    return (
      <Card
        style={styles.taskCard}
        onPress={() =>
          navigation.navigate('TaskDetail', { taskId: item._id, title: item.title })
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.titleWrap}>
            <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <View style={styles.badgesInline}>
              {item.project && (
                <Badge
                  label={item.project.code || item.project.name}
                  color="#8b5cf6"
                  bg="rgba(139, 92, 246, 0.12)"
                  size="sm"
                />
              )}
              {item.taskGroup && (
                <Badge
                  label={`📁 ${item.taskGroup.name}`}
                  color={item.taskGroup.color || '#3b82f6'}
                  bg={`${item.taskGroup.color || '#3b82f6'}20`}
                  size="sm"
                />
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => setSelectedTask(item)}>
            <Badge
              label={sMeta.label}
              color={sMeta.color}
              bg={sMeta.bg}
            />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text
            style={[styles.taskDesc, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Required Skills */}
        {item.requiredSkills?.length > 0 && (
          <View style={styles.skillsRow}>
            {item.requiredSkills.map((sk, idx) => (
              <View
                key={idx}
                style={[
                  styles.skillChip,
                  {
                    backgroundColor: theme.isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.skillText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {sk.name} (Lv.{sk.level})
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Card Footer */}
        <View
          style={[
            styles.cardFooter,
            { borderTopColor: theme.colors.border },
          ]}
        >
          <View style={styles.assigneeContainer}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>
                {(item.assignee?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text
              style={[
                styles.assigneeName,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.assignee?.name || 'Chưa phân công'}
            </Text>
          </View>

          <View style={styles.hoursWrap}>
            <Ionicons
              name="time-outline"
              size={13}
              color={theme.colors.textMuted}
            />
            <Text
              style={[styles.hoursText, { color: theme.colors.textSecondary }]}
            >
              {item.estimatedHours || 0}h
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const handleQuickStatus = async (taskId, nextStatus) => {
    try {
      await taskApi.updateStatus(taskId, nextStatus);
      await loadTasks();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể chuyển trạng thái');
    }
  };

  const renderKanbanCard = (item, col) => {
    const pMeta = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;
    const assigneeName = item.assignee?.name || 'Chưa phân công';
    const initial = (assigneeName || 'U').charAt(0).toUpperCase();

    return (
      <Card
        key={item._id}
        style={styles.kanbanCard}
        onPress={() =>
          navigation.navigate('TaskDetail', {
            taskId: item._id,
            title: item.title,
          })
        }
      >
        {/* Top Badges */}
        <View style={styles.kanbanCardTop}>
          <Badge
            label={pMeta.label}
            color={pMeta.color}
            bg={pMeta.bg}
            size="sm"
          />
          {item.project && (
            <Badge
              label={item.project.code || item.project.name}
              color="#8b5cf6"
              bg="rgba(139, 92, 246, 0.12)"
              size="sm"
            />
          )}
        </View>

        {/* Task Title */}
        <Text
          style={[styles.kanbanCardTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Task Group if available */}
        {item.taskGroup && (
          <Text
            style={[
              styles.kanbanGroupText,
              { color: item.taskGroup.color || theme.colors.primaryLight },
            ]}
            numberOfLines={1}
          >
            📁 {item.taskGroup.name}
          </Text>
        )}

        {/* Description snippet */}
        {item.description ? (
          <Text
            style={[styles.kanbanDesc, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Card Footer: Assignee & Hours */}
        <View
          style={[
            styles.kanbanCardFooter,
            { borderTopColor: theme.colors.border },
          ]}
        >
          <View style={styles.assigneeContainer}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{initial}</Text>
            </View>
            <Text
              style={[styles.assigneeName, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {assigneeName}
            </Text>
          </View>

          <View style={styles.hoursWrap}>
            <Ionicons
              name="time-outline"
              size={12}
              color={theme.colors.textMuted}
            />
            <Text
              style={[styles.hoursText, { color: theme.colors.textSecondary }]}
            >
              {item.estimatedHours || 0}h
            </Text>
          </View>
        </View>

        {/* Quick Action Button to advance status */}
        {col.nextStatus ? (
          <TouchableOpacity
            onPress={() => handleQuickStatus(item._id, col.nextStatus)}
            style={[
              styles.kanbanActionBtn,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9',
                borderColor: theme.isDark
                  ? 'rgba(255,255,255,0.1)'
                  : '#e2e8f0',
              },
            ]}
          >
            <Text
              style={[
                styles.kanbanActionBtnText,
                { color: theme.colors.primaryLight },
              ]}
            >
              {col.nextLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.kanbanDoneBadge}>
            <Ionicons name="checkmark-done" size={14} color="#10b981" />
            <Text style={styles.kanbanDoneText}>Đã hoàn tất</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Search & Action Bar */}
      <View
        style={[styles.topSection, { borderBottomColor: theme.colors.border }]}
      >
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.colors.inputBg,
                borderColor: theme.colors.inputBorder,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Tìm kiếm công việc..."
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Toggle View Mode: Kanban vs List */}
          <View
            style={[
              styles.toggleWrap,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#e2e8f0',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setViewMode('kanban')}
              style={[
                styles.toggleIconBtn,
                viewMode === 'kanban' && [
                  styles.toggleIconBtnActive,
                  { backgroundColor: theme.colors.surface },
                ],
              ]}
            >
              <Ionicons
                name="grid"
                size={16}
                color={
                  viewMode === 'kanban'
                    ? theme.colors.primary
                    : theme.colors.textMuted
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={[
                styles.toggleIconBtn,
                viewMode === 'list' && [
                  styles.toggleIconBtnActive,
                  { backgroundColor: theme.colors.surface },
                ],
              ]}
            >
              <Ionicons
                name="list"
                size={16}
                color={
                  viewMode === 'list'
                    ? theme.colors.primary
                    : theme.colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>

          {/* Calendar View Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CalendarScreen')}
            style={[
              styles.calendarNavBtn,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#e2e8f0',
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          {/* Add Task Button */}
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 1. Scope Filter Tabs (Không gian làm việc) */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SCOPE_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item: tab }) => {
            const isActive = scopeFilter === tab.key;
            return (
              <TouchableOpacity
                onPress={() => setScopeFilter(tab.key)}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : theme.isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    {
                      color: isActive ? '#ffffff' : theme.colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* 2. Status Filter Tabs (Only in List View) */}
        {viewMode === 'list' && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_TABS}
            keyExtractor={(item) => item.key}
            contentContainerStyle={[styles.tabsList, { marginTop: 6 }]}
            renderItem={({ item: tab }) => {
              const isActive = statusFilter === tab.key;
              return (
                <TouchableOpacity
                  onPress={() => setStatusFilter(tab.key)}
                  style={[
                    styles.tabPill,
                    styles.tabPillSmall,
                    {
                      backgroundColor: isActive
                        ? '#3b82f6'
                        : theme.isDark
                        ? 'rgba(255,255,255,0.04)'
                        : '#f8fafc',
                      borderColor: isActive ? '#3b82f6' : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPillSmallText,
                      {
                        color: isActive ? '#ffffff' : theme.colors.textSecondary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* 3. Time Filter Tabs (Hạn thời gian) */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TIME_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.tabsList, { marginTop: 6 }]}
          renderItem={({ item: tab }) => {
            const isActive = timeFilter === tab.key;
            const isOverdue = tab.key === 'overdue';
            return (
              <TouchableOpacity
                onPress={() => setTimeFilter(tab.key)}
                style={[
                  styles.tabPill,
                  styles.tabPillSmall,
                  {
                    backgroundColor: isActive
                      ? isOverdue
                        ? '#ef4444'
                        : theme.colors.primary
                      : isOverdue
                      ? 'rgba(239, 68, 68, 0.1)'
                      : theme.isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#f8fafc',
                    borderColor: isActive ? (isOverdue ? '#ef4444' : theme.colors.primary) : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillSmallText,
                    {
                      color: isActive ? '#ffffff' : isOverdue ? '#ef4444' : theme.colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Kanban Board View or List View */}
      {viewMode === 'kanban' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kanbanBoardScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = (Array.isArray(tasks) ? tasks : []).filter(
              (t) => (t.status || 'todo') === col.key
            );

            return (
              <View
                key={col.key}
                style={[
                  styles.kanbanCol,
                  {
                    backgroundColor: theme.isDark
                      ? 'rgba(255,255,255,0.03)'
                      : '#f8fafc',
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Column Header */}
                <View style={styles.kanbanColHeader}>
                  <View style={styles.kanbanColTitleWrap}>
                    <View
                      style={[styles.colDot, { backgroundColor: col.color }]}
                    />
                    <Text
                      style={[styles.kanbanColTitle, { color: theme.colors.text }]}
                    >
                      {col.label}
                    </Text>
                    <View
                      style={[styles.colCountBadge, { backgroundColor: col.bg }]}
                    >
                      <Text
                        style={[styles.colCountText, { color: col.color }]}
                      >
                        {colTasks.length}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setNewTitle('');
                      setShowCreateModal(true);
                    }}
                    style={styles.colAddBtn}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Column Tasks List */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.kanbanColScroll}
                >
                  {colTasks.length === 0 ? (
                    <View
                      style={[
                        styles.kanbanEmptyCard,
                        { borderColor: theme.colors.border },
                      ]}
                    >
                      <Ionicons
                        name={col.icon}
                        size={24}
                        color={theme.colors.textMuted}
                        style={{ marginBottom: 6 }}
                      />
                      <Text
                        style={[
                          styles.kanbanEmptyText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Không có việc
                      </Text>
                    </View>
                  ) : (
                    colTasks.map((t) => renderKanbanCard(t, col))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* Task List (Vertical FlatList) */
        <FlatList
          data={Array.isArray(tasks) ? tasks : []}
          keyExtractor={(item) => item._id}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="checkbox-outline"
                title="Không tìm thấy công việc"
                description="Thử thay đổi bộ lọc hoặc bấm '+' để tạo công việc mới."
              />
            ) : null
          }
        />
      )}

      {/* Quick Create Task Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.createModalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Tạo công việc mới
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Tiêu đề công việc *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.inputBorder,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="VD: Thiết kế cơ sở dữ liệu"
                placeholderTextColor={theme.colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Project Select */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Dự án *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.projectScroll}
              >
                {(Array.isArray(projects) ? projects : []).map((p) => {
                  const isSel = newProject === p._id;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      onPress={() => setNewProject(p._id)}
                      style={[
                        styles.projectPill,
                        {
                          backgroundColor: isSel
                            ? theme.colors.primary
                            : theme.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#f1f5f9',
                          borderColor: isSel ? theme.colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.projectPillText,
                          {
                            color: isSel ? '#ffffff' : theme.colors.text,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Task Group Select (if available) */}
              {projectGroups.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Nhóm công việc (Task Group)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.projectScroll}
                  >
                    <TouchableOpacity
                      onPress={() => setSelectedTaskGroup('')}
                      style={[
                        styles.projectPill,
                        {
                          backgroundColor: !selectedTaskGroup
                            ? theme.colors.primary
                            : theme.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#f1f5f9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.projectPillText,
                          { color: !selectedTaskGroup ? '#fff' : theme.colors.text },
                        ]}
                      >
                        Không phân nhóm
                      </Text>
                    </TouchableOpacity>
                    {projectGroups.map((g) => {
                      const isSel = selectedTaskGroup === g._id;
                      return (
                        <TouchableOpacity
                          key={g._id}
                          onPress={() => setSelectedTaskGroup(g._id)}
                          style={[
                            styles.projectPill,
                            {
                              backgroundColor: isSel
                                ? g.color || theme.colors.primary
                                : theme.isDark
                                ? 'rgba(255,255,255,0.06)'
                                : '#f1f5f9',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.projectPillText,
                              { color: isSel ? '#fff' : theme.colors.text },
                            ]}
                          >
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
                  const isSel = newPriority === pr.key;
                  return (
                    <TouchableOpacity
                      key={pr.key}
                      onPress={() => setNewPriority(pr.key)}
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

              {/* Hours */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Giờ ước tính (h)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.inputBorder,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="VD: 8"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={newHours}
                onChangeText={setNewHours}
              />

              {/* Description */}
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mô tả chi tiết
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.inputBorder,
                    color: theme.colors.text,
                    height: 80,
                    textAlignVertical: 'top',
                  },
                ]}
                placeholder="Mô tả yêu cầu và đầu ra..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <Button
                title="Tạo công việc"
                onPress={handleCreateTask}
                loading={creating}
                size="lg"
                style={{ marginTop: 12, marginBottom: 12 }}
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
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsList: {
    gap: 6,
    paddingVertical: 2,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabPillText: {
    fontSize: 12,
  },
  tabPillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tabPillSmallText: {
    fontSize: 11,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  taskCard: {
    marginBottom: 10,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleWrap: {
    flex: 1,
    marginRight: 8,
  },
  badgesInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  taskDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 8,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  skillChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 10.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 2,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  assigneeName: {
    fontSize: 12,
  },
  hoursWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hoursText: {
    fontSize: 11.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  createModalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    maxHeight: '88%',
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
  formInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  projectScroll: {
    marginBottom: 4,
  },
  projectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  projectPillText: {
    fontSize: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
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
  toggleWrap: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
  },
  toggleIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  kanbanBoardScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  kanbanCol: {
    width: KANBAN_COL_WIDTH,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    maxHeight: '100%',
  },
  kanbanColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  kanbanColTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kanbanColTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  colCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  colCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colAddBtn: {
    padding: 4,
  },
  kanbanColScroll: {
    paddingBottom: 16,
    gap: 10,
  },
  kanbanCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  kanbanCardTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  kanbanCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  kanbanGroupText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  kanbanDesc: {
    fontSize: 11.5,
    lineHeight: 15,
    marginBottom: 8,
  },
  kanbanCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 2,
  },
  kanbanActionBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanbanActionBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  kanbanDoneBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  kanbanDoneText: {
    color: '#10b981',
    fontSize: 11.5,
    fontWeight: '600',
  },
  kanbanEmptyCard: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  kanbanEmptyText: {
    fontSize: 12,
  },
});
