import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import WorkloadMeter from '../../components/common/WorkloadMeter';
import EmptyState from '../../components/common/EmptyState';
import resourceApi from '../../api/resourceApi';

export default function ResourcesScreen() {
  const { theme } = useTheme();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadResources = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();

      const res = await resourceApi.getAll(params);
      setResources(res.data?.data || []);
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
      {/* Search Bar */}
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
              description="Thử thay đổi từ khóa tìm kiếm."
            />
          ) : null
        }
      />
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
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
});
