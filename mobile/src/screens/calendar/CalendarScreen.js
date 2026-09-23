import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import taskApi from '../../api/taskApi';
import projectApi from '../../api/projectApi';
import taskGroupApi from '../../api/taskGroupApi';
import { STATUS_MAP, PRIORITY_MAP } from '../../utils/formatters';

dayjs.extend(isBetween);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 32 - 12) / 7);

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function CalendarScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [projectGroups, setProjectGroups] = useState([]);
  const [selectedTaskGroup, setSelectedTaskGroup] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newHours, setNewHours] = useState('8');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Load project task groups
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

  // Load tasks for current month view
  const loadTasks = useCallback(async () => {
    try {
      const from = currentMonth.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
      const to = currentMonth.endOf('month').add(7, 'day').format('YYYY-MM-DD');

      const [tRes, pRes] = await Promise.all([
        taskApi.getAll({ from, to, limit: 100 }),
        projectApi.getAll({ limit: 50 }),
      ]);

      const rawTasks = tRes.data?.data?.tasks || tRes.data?.tasks || (Array.isArray(tRes.data?.data) ? tRes.data.data : []);
      const rawProjects = pRes.data?.data?.projects || pRes.data?.projects || (Array.isArray(pRes.data?.data) ? pRes.data.data : []);

      setTasks(Array.isArray(rawTasks) ? rawTasks : []);
      setProjects(Array.isArray(rawProjects) ? rawProjects : []);
    } catch (err) {
      console.log('Error loading calendar tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // Month Grid Days calculation
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');

    // Monday is index 0 in Vietnam
    const startDayOfWeek = (startOfMonth.day() + 6) % 7;
    const startDate = startOfMonth.subtract(startDayOfWeek, 'day');

    const days = [];
    let d = startDate;
    // 35 or 42 grid cells to fill complete weeks
    const totalDays = startDayOfWeek + endOfMonth.date() > 35 ? 42 : 35;

    for (let i = 0; i < totalDays; i++) {
      days.push(d);
      d = d.add(1, 'day');
    }
    return days;
  }, [currentMonth]);

  // Week Strip Days calculation
  const weekDays = useMemo(() => {
    const startOfWeek = selectedDate.subtract((selectedDate.day() + 6) % 7, 'day');
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, 'day'));
    }
    return days;
  }, [selectedDate]);

  // Check if a task falls on a specific date
  const isTaskOnDate = useCallback((task, date) => {
    const dStr = date.format('YYYY-MM-DD');
    const start = task.startDate ? dayjs(task.startDate).format('YYYY-MM-DD') : null;
    const end = task.endDate ? dayjs(task.endDate).format('YYYY-MM-DD') : null;

    if (start && end) {
      return dStr >= start && dStr <= end;
    }
    if (end) {
      return dStr === end;
    }
    if (start) {
      return dStr === start;
    }
    // Fallback to createdAt
    return task.createdAt ? dayjs(task.createdAt).format('YYYY-MM-DD') === dStr : false;
  }, []);

  // Filter tasks for currently selected date
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((t) => isTaskOnDate(t, selectedDate));
  }, [tasks, selectedDate, isTaskOnDate]);

  // Quick Status change
  const handleQuickStatus = async (taskId, nextStatus) => {
    try {
      await taskApi.updateStatus(taskId, nextStatus);
      await loadTasks();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể đổi trạng thái');
    }
  };

  // Quick Create Task for selected date
  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề công việc');
      return;
    }
    if (!newProject) {
      Alert.alert('Thông báo', 'Vui lòng chọn dự án');
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
        startDate: selectedDate.startOf('day').toISOString(),
        endDate: selectedDate.endOf('day').toISOString(),
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setSelectedTaskGroup('');
      await loadTasks();
      Alert.alert('Thành công', 'Đã thêm công việc vào lịch');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo công việc');
    } finally {
      setCreating(false);
    }
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => prev.subtract(1, 'month'));
    } else {
      setSelectedDate((prev) => prev.subtract(1, 'week'));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => prev.add(1, 'month'));
    } else {
      setSelectedDate((prev) => prev.add(1, 'week'));
    }
  };

  const handleToday = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <Header
        title="Lịch biểu công việc"
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            onPress={handleToday}
            style={[
              styles.todayBtn,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            ]}
          >
            <Text style={[styles.todayBtnText, { color: theme.colors.primaryLight }]}>
              Hôm nay
            </Text>
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
        {/* Navigation & View Toggle Bar */}
        <View style={styles.topControlBar}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrev} style={styles.arrowBtn}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToday}>
              <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
                {viewMode === 'month'
                  ? `Tháng ${currentMonth.format('MM / YYYY')}`
                  : `Tuần ${selectedDate.format('DD/MM')} - ${selectedDate.add(6, 'day').format('DD/MM')}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} style={styles.arrowBtn}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Toggle View Mode: Month vs Week */}
          <View
            style={[
              styles.modeToggle,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
            ]}
          >
            <TouchableOpacity
              onPress={() => setViewMode('month')}
              style={[
                styles.modeBtn,
                viewMode === 'month' && [styles.modeBtnActive, { backgroundColor: theme.colors.surface }],
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  { color: viewMode === 'month' ? theme.colors.primary : theme.colors.textMuted },
                  viewMode === 'month' && styles.modeBtnTextActive,
                ]}
              >
                Tháng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('week')}
              style={[
                styles.modeBtn,
                viewMode === 'week' && [styles.modeBtnActive, { backgroundColor: theme.colors.surface }],
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  { color: viewMode === 'week' ? theme.colors.primary : theme.colors.textMuted },
                  viewMode === 'week' && styles.modeBtnTextActive,
                ]}
              >
                Tuần
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Month View Grid */}
        {viewMode === 'month' ? (
          <Card style={styles.calendarCard}>
            {/* Weekday Labels */}
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w, idx) => (
                <View key={idx} style={styles.weekdayCell}>
                  <Text
                    style={[
                      styles.weekdayText,
                      { color: idx >= 5 ? '#ef4444' : theme.colors.textMuted },
                    ]}
                  >
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((d, idx) => {
                const isCurrentMonth = d.month() === currentMonth.month();
                const isSelected = d.isSame(selectedDate, 'day');
                const isToday = d.isSame(dayjs(), 'day');

                // Tasks active on this day
                const dayTasks = tasks.filter((t) => isTaskOnDate(t, d));

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setSelectedDate(d);
                      if (!isCurrentMonth) {
                        setCurrentMonth(d);
                      }
                    }}
                    style={[
                      styles.dayCell,
                      isSelected && [styles.dayCellSelected, { borderColor: theme.colors.primary }],
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          color: isSelected
                            ? theme.colors.primary
                            : isToday
                            ? '#3b82f6'
                            : isCurrentMonth
                            ? theme.colors.text
                            : theme.colors.textMuted,
                          fontWeight: isSelected || isToday ? '700' : '500',
                          opacity: isCurrentMonth ? 1 : 0.35,
                        },
                      ]}
                    >
                      {d.date()}
                    </Text>

                    {/* Task Indicators (Dots) */}
                    <View style={styles.dotsRow}>
                      {dayTasks.slice(0, 3).map((t, tIdx) => {
                        const dotColor =
                          t.status === 'done'
                            ? '#10b981'
                            : t.status === 'in_progress'
                            ? '#3b82f6'
                            : t.status === 'review'
                            ? '#f59e0b'
                            : '#94a3b8';
                        return (
                          <View
                            key={tIdx}
                            style={[styles.taskDot, { backgroundColor: dotColor }]}
                          />
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <View style={[styles.taskDotPlus, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.taskDotPlusText}>+</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        ) : (
          /* 2. Week View Strip */
          <Card style={styles.weekCard}>
            <View style={styles.weekStrip}>
              {weekDays.map((d, idx) => {
                const isSelected = d.isSame(selectedDate, 'day');
                const isToday = d.isSame(dayjs(), 'day');
                const dayTasks = tasks.filter((t) => isTaskOnDate(t, d));

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedDate(d)}
                    style={[
                      styles.weekDayBtn,
                      isSelected && [
                        styles.weekDayBtnActive,
                        { backgroundColor: theme.colors.primary },
                      ],
                      isToday && !isSelected && [
                        styles.weekDayBtnToday,
                        { borderColor: theme.colors.primary },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDayLabel,
                        {
                          color: isSelected ? '#ffffff' : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {WEEKDAYS[idx]}
                    </Text>
                    <Text
                      style={[
                        styles.weekDayNum,
                        {
                          color: isSelected ? '#ffffff' : theme.colors.text,
                          fontWeight: isSelected || isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {d.date()}
                    </Text>

                    {/* Badge count */}
                    {dayTasks.length > 0 ? (
                      <View
                        style={[
                          styles.weekTaskPill,
                          {
                            backgroundColor: isSelected
                              ? 'rgba(255,255,255,0.25)'
                              : theme.isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#e2e8f0',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.weekTaskPillText,
                            { color: isSelected ? '#ffffff' : theme.colors.primaryLight },
                          ]}
                        >
                          {dayTasks.length}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Selected Date Header */}
        <View style={styles.agendaHeader}>
          <View style={styles.agendaTitleWrap}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.agendaTitle, { color: theme.colors.text }]}>
              {selectedDate.isSame(dayjs(), 'day')
                ? `Hôm nay, ${selectedDate.format('DD/MM/YYYY')}`
                : `Ngày ${selectedDate.format('DD/MM/YYYY')}`}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Text style={[styles.countBadgeText, { color: '#8b5cf6' }]}>
                {selectedDateTasks.length} việc
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.addBtnSmall, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.addBtnSmallText}>Thêm việc</Text>
          </TouchableOpacity>
        </View>

        {/* Tasks for Selected Date */}
        {selectedDateTasks.length === 0 ? (
          <EmptyState
            icon="checkbox-outline"
            title="Không có công việc nào"
            description={`Chưa có công việc nào được lên lịch vào ngày ${selectedDate.format('DD/MM')}.`}
          />
        ) : (
          selectedDateTasks.map((item) => {
            const sMeta = STATUS_MAP[item.status] || STATUS_MAP.todo;
            const pMeta = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;
            const assigneeName = item.assignee?.name || 'Chưa phân công';
            const initial = (assigneeName || 'U').charAt(0).toUpperCase();

            return (
              <Card
                key={item._id}
                style={styles.taskCard}
                onPress={() =>
                  navigation.navigate('TaskDetail', {
                    taskId: item._id,
                    title: item.title,
                  })
                }
              >
                <View style={styles.cardTop}>
                  <View style={styles.badgesWrap}>
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
                  <Badge
                    label={sMeta.label}
                    color={sMeta.color}
                    bg={sMeta.bg}
                    size="sm"
                  />
                </View>

                <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>

                {item.description ? (
                  <Text
                    style={[styles.taskDesc, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View style={[styles.cardBottom, { borderTopColor: theme.colors.border }]}>
                  <View style={styles.assigneeWrap}>
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

                  <View style={styles.timeInfo}>
                    <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                    <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                      {item.estimatedHours || 0}h
                    </Text>
                  </View>
                </View>

                {/* Quick Workflow Action */}
                {item.status === 'todo' && (
                  <TouchableOpacity
                    onPress={() => handleQuickStatus(item._id, 'in_progress')}
                    style={[
                      styles.quickStatusBtn,
                      { backgroundColor: 'rgba(59, 130, 246, 0.08)' },
                    ]}
                  >
                    <Text style={[styles.quickStatusBtnText, { color: '#3b82f6' }]}>
                      Bắt đầu làm ➔
                    </Text>
                  </TouchableOpacity>
                )}

                {item.status === 'in_progress' && (
                  <TouchableOpacity
                    onPress={() => handleQuickStatus(item._id, 'review')}
                    style={[
                      styles.quickStatusBtn,
                      { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
                    ]}
                  >
                    <Text style={[styles.quickStatusBtnText, { color: '#f59e0b' }]}>
                      Nộp đánh giá ➔
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

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
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Lên lịch công việc mới
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                  Ngày: {selectedDate.format('DD/MM/YYYY')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                placeholder="VD: Kiểm thử chức năng thanh toán"
                placeholderTextColor={theme.colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

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
                        {p.code || p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mức độ ưu tiên
              </Text>
              <View style={styles.priorityRow}>
                {['low', 'medium', 'high', 'critical'].map((pk) => {
                  const isSel = newPriority === pk;
                  const pMeta = PRIORITY_MAP[pk];
                  return (
                    <TouchableOpacity
                      key={pk}
                      onPress={() => setNewPriority(pk)}
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor: isSel
                            ? pMeta.bg
                            : theme.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#f1f5f9',
                          borderColor: isSel ? pMeta.color : 'transparent',
                          borderWidth: isSel ? 1 : 0,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          {
                            color: isSel ? pMeta.color : theme.colors.textSecondary,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {pMeta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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

              <Button
                title="Lên lịch công việc"
                onPress={handleCreateTask}
                loading={creating}
                size="lg"
                style={{ marginTop: 14, marginBottom: 16 }}
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
    paddingBottom: 36,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthTitle: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modeBtnTextActive: {
    fontWeight: '700',
  },
  calendarCard: {
    padding: 12,
    marginBottom: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  weekdayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'space-around',
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dayNumber: {
    fontSize: 13,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 4,
    alignItems: 'center',
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  taskDotPlus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDotPlusText: {
    color: '#fff',
    fontSize: 6,
    fontWeight: '900',
    lineHeight: 7,
  },
  weekCard: {
    padding: 10,
    marginBottom: 14,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  weekDayBtnActive: {},
  weekDayBtnToday: {
    borderWidth: 1,
  },
  weekDayLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  weekDayNum: {
    fontSize: 14,
    marginBottom: 4,
  },
  weekTaskPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  weekTaskPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  agendaTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agendaTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnSmallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  taskCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  assigneeWrap: {
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
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  assigneeName: {
    fontSize: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11.5,
  },
  quickStatusBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatusBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
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
  modalSub: {
    fontSize: 12,
    marginTop: 2,
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
    gap: 6,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityPillText: {
    fontSize: 11.5,
  },
});
