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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import projectApi from '../../api/projectApi';
import {
  formatDate,
  formatCurrency,
  PROJECT_STATUS_MAP,
} from '../../utils/formatters';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'in_progress', label: 'Đang làm' },
  { key: 'planning', label: 'Lập KH' },
  { key: 'completed', label: 'Hoàn thành' },
];

export default function ProjectsScreen({ navigation }) {
  const { theme } = useTheme();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await projectApi.getAll(params);
      setProjects(res.data?.data || []);
    } catch (err) {
      console.log('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const handleCreateProject = async () => {
    if (!name.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên dự án');
      return;
    }

    setCreating(true);
    try {
      await projectApi.create({
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        budget: Number(budget) || 0,
        description: description.trim(),
        status: 'planning',
      });
      Alert.alert('Thành công', 'Đã tạo dự án mới');
      setShowCreateModal(false);
      setName('');
      setCode('');
      setBudget('');
      setDescription('');
      await loadProjects();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo dự án');
    } finally {
      setCreating(false);
    }
  };

  const renderProjectItem = ({ item }) => {
    const statusMeta =
      PROJECT_STATUS_MAP[item.status] || PROJECT_STATUS_MAP.planning;
    const progress = item.progress || 0;

    return (
      <Card
        style={styles.projectCard}
        onPress={() =>
          navigation.navigate('ProjectDetail', {
            projectId: item._id,
            title: item.name,
          })
        }
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={[styles.projectTitle, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            {item.code && (
              <Badge
                label={item.code}
                color={theme.colors.primaryLight}
                size="sm"
                style={styles.codeBadge}
              />
            )}
          </View>
          <Badge
            label={statusMeta.label}
            color={statusMeta.color}
            bg={statusMeta.bg}
          />
        </View>

        {/* Description */}
        <Text
          style={[styles.desc, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description || 'Chưa có mô tả dự án'}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressMeta}>
            <Text
              style={[
                styles.progressLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Tiến độ
            </Text>
            <Text
              style={[styles.progressPercent, { color: theme.colors.primary }]}
            >
              {progress}%
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#e2e8f0',
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Footer Meta */}
        <View
          style={[
            styles.cardFooter,
            { borderTopColor: theme.colors.border },
          ]}
        >
          <View style={styles.footerItem}>
            <Ionicons
              name="cash-outline"
              size={14}
              color={theme.colors.textMuted}
            />
            <Text
              style={[styles.footerText, { color: theme.colors.textSecondary }]}
            >
              {formatCurrency(item.budget)}
            </Text>
          </View>

          <View style={styles.footerItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={theme.colors.textMuted}
            />
            <Text
              style={[styles.footerText, { color: theme.colors.textSecondary }]}
            >
              {formatDate(item.startDate)} → {formatDate(item.endDate)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search & Action Bar */}
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
              placeholder="Tìm theo tên hoặc mã dự án..."
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

          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Status Pills */}
        <View style={styles.filtersRow}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setStatusFilter(f.key)}
                style={[
                  styles.filterPill,
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
                    styles.filterText,
                    {
                      color: isActive ? '#ffffff' : theme.colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Project List */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item._id}
        renderItem={renderProjectItem}
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
              icon="folder-open-outline"
              title="Không tìm thấy dự án"
              description="Thử thay đổi từ khóa tìm kiếm hoặc bấm '+' để tạo dự án mới."
            />
          ) : null
        }
      />

      {/* Create Project Modal */}
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
                Tạo dự án mới
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Tên dự án *
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
                placeholder="VD: Nâng cấp hệ thống Core Banking"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mã dự án (Code)
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
                placeholder="VD: CB-2026"
                placeholderTextColor={theme.colors.textMuted}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Ngân sách (VND)
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
                placeholder="VD: 500000000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Mô tả dự án
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
                placeholder="Mô tả mục tiêu và phạm vi dự án..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Button
                title="Tạo dự án"
                onPress={handleCreateProject}
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
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  projectCard: {
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
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
    marginRight: 10,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  codeBadge: {
    marginLeft: 4,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  createModalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
});
