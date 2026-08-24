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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import taskApi from '../../api/taskApi';
import {
  formatDate,
  STATUS_MAP,
  PRIORITY_MAP,
} from '../../utils/formatters';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'todo', label: 'Cần làm' },
  { key: 'in_progress', label: 'Đang làm' },
  { key: 'review', label: 'Đánh giá' },
  { key: 'done', label: 'Hoàn thành' },
];

export default function TasksScreen() {
  const { theme } = useTheme();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected task for status update modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await taskApi.getAll(params);
      setTasks(res.data?.data || []);
    } catch (err) {
      console.log('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTask) return;
    setUpdating(true);
    try {
      await taskApi.updateStatus(selectedTask._id, newStatus);
      setSelectedTask(null);
      await loadTasks();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const renderTaskItem = ({ item }) => {
    const sMeta = STATUS_MAP[item.status] || STATUS_MAP.todo;
    const pMeta = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;

    return (
      <Card
        style={styles.taskCard}
        onPress={() => setSelectedTask(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.titleWrap}>
            <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
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
          />
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Search & Filter Bar */}
      <View
        style={[styles.topSection, { borderBottomColor: theme.colors.border }]}
      >
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

        {/* Horizontal Status Filter Tabs */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item: tab }) => {
            const isActive = statusFilter === tab.key;
            return (
              <TouchableOpacity
                onPress={() => setStatusFilter(tab.key)}
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
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
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
              description="Thử thay đổi từ khóa hoặc bộ lọc trạng thái."
            />
          ) : null
        }
      />

      {/* Task Detail & Status Updater Modal */}
      <Modal
        visible={!!selectedTask}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Cập nhật trạng thái
              </Text>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <Ionicons
                  name="close"
                  size={22}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {selectedTask && (
              <View>
                <Text
                  style={[
                    styles.modalTaskName,
                    { color: theme.colors.primaryLight },
                  ]}
                >
                  {selectedTask.title}
                </Text>

                <Text
                  style={[
                    styles.statusPrompt,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Chọn trạng thái mới cho công việc này:
                </Text>

                <View style={styles.statusOptions}>
                  {Object.entries(STATUS_MAP).map(([stKey, stMeta]) => {
                    const isSelected = selectedTask.status === stKey;
                    return (
                      <TouchableOpacity
                        key={stKey}
                        onPress={() => handleUpdateStatus(stKey)}
                        disabled={updating}
                        style={[
                          styles.statusBtn,
                          {
                            backgroundColor: isSelected
                              ? stMeta.color
                              : theme.isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#f1f5f9',
                            borderColor: stMeta.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            {
                              color: isSelected
                                ? '#ffffff'
                                : theme.colors.text,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {stMeta.label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#ffffff"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  tabsList: {
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabPillText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  taskCard: {
    marginBottom: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '500',
  },
  hoursWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hoursText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalTaskName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  statusPrompt: {
    fontSize: 13,
    marginBottom: 12,
  },
  statusOptions: {
    gap: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBtnText: {
    fontSize: 14,
  },
});
