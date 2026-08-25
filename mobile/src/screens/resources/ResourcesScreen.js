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
import WorkloadMeter from '../../components/common/WorkloadMeter';
import EmptyState from '../../components/common/EmptyState';
import resourceApi from '../../api/resourceApi';
import departmentApi from '../../api/departmentApi';

export default function ResourcesScreen() {
  const { theme } = useTheme();

  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Create Resource Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('40');
  const [creating, setCreating] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();

      const [rRes, dRes] = await Promise.all([
        resourceApi.getAll(params),
        departmentApi.getAll(),
      ]);
      setResources(rRes.data?.data || []);
      setDepartments(dRes.data?.data || []);
    } catch (err) {
      console.log('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResources();
    setRefreshing(false);
  };

  const handleCreateResource = async () => {
    if (!name.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ tên nhân sự');
      return;
    }
    if (!department) {
      Alert.alert('Thông báo', 'Vui lòng chọn phòng ban');
      return;
    }

    setCreating(true);
    try {
      await resourceApi.create({
        name: name.trim(),
        email: email.trim() || undefined,
        position: position.trim() || 'Software Engineer',
        department,
        maxCapacity: Number(maxCapacity) || 40,
        fte: 1,
      });
      Alert.alert('Thành công', 'Đã thêm nhân sự mới');
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPosition('');
      await loadResources();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo nhân sự');
    } finally {
      setCreating(false);
    }
  };

  const renderResourceItem = ({ item }) => {
    const workload = item.currentWorkload || 0;
    const capacity = item.maxCapacity || 40;
    const util = capacity > 0 ? Math.round((workload / capacity) * 100) : 0;

    return (
      <Card style={styles.resourceCard}>
        {/* Header Profile */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {item.name}
              </Text>
              {util > 100 && (
                <Badge
                  label="Quá tải"
                  color={theme.colors.danger}
                  bg="rgba(239, 68, 68, 0.15)"
                  size="sm"
                />
              )}
            </View>
            <Text
              style={[styles.position, { color: theme.colors.textSecondary }]}
            >
              {item.position || 'Nhân sự'} · {item.department?.name || 'Phòng ban'}
            </Text>
            {item.email && (
              <Text
                style={[styles.email, { color: theme.colors.textMuted }]}
              >
                {item.email}
              </Text>
            )}
          </View>
        </View>

        {/* Workload Meter */}
        <View style={styles.workloadSection}>
          <Text
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            Công suất làm việc (Workload)
          </Text>
          <WorkloadMeter workload={workload} capacity={capacity} />
        </View>

        {/* Skill Matrix Pills */}
        {item.skills?.length > 0 && (
          <View style={styles.skillsSection}>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Ma trận Kỹ năng (Skill Matrix)
            </Text>
            <View style={styles.skillsWrap}>
              {item.skills.map((sk, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.skillTag,
                    {
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#f1f5f9',
                    },
                  ]}
                >
                  <Text
                    style={[styles.skillName, { color: theme.colors.text }]}
                  >
                    {sk.name}
                  </Text>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Lv.{sk.level}</Text>
                  </View>
                </View>
              ))}
            </View>
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
              placeholder="Tìm theo tên hoặc vị trí..."
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
      </View>

      {/* Resource List */}
      <FlatList
        data={resources}
        keyExtractor={(item) => item._id}
        renderItem={renderResourceItem}
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
              icon="people-outline"
              title="Không tìm thấy nhân sự"
              description="Thử thay đổi từ khóa hoặc bấm '+' để thêm nhân sự mới."
            />
          ) : null
        }
      />

      {/* Create Resource Modal */}
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
                Thêm nhân sự mới
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Họ và tên *
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
                placeholder="VD: Nguyễn Văn A"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Email
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
                placeholder="VD: vana@company.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Vị trí chuyên môn
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
                placeholder="VD: Senior React Developer"
                placeholderTextColor={theme.colors.textMuted}
                value={position}
                onChangeText={setPosition}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Phòng ban *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pickerScroll}
              >
                {departments.map((d) => {
                  const isSel = department === d._id;
                  return (
                    <TouchableOpacity
                      key={d._id}
                      onPress={() => setDepartment(d._id)}
                      style={[
                        styles.deptPill,
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
                          styles.deptPillText,
                          {
                            color: isSel ? '#ffffff' : theme.colors.text,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Capacity tối đa (giờ/tuần)
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
                placeholder="40"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={maxCapacity}
                onChangeText={setMaxCapacity}
              />

              <Button
                title="Lưu nhân sự"
                onPress={handleCreateResource}
                loading={creating}
                size="lg"
                style={{ marginTop: 14, marginBottom: 12 }}
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resourceCard: {
    marginBottom: 14,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  position: {
    fontSize: 12,
    marginTop: 2,
  },
  email: {
    fontSize: 11,
    marginTop: 2,
  },
  workloadSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  skillsSection: {
    marginTop: 4,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  skillName: {
    fontSize: 12,
    fontWeight: '500',
  },
  levelBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366f1',
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
  pickerScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  deptPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  deptPillText: {
    fontSize: 12,
  },
});
