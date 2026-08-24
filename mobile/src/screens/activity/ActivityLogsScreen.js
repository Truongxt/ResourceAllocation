import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import activityLogApi from '../../api/activityLogApi';
import { formatTimeAgo } from '../../utils/formatters';

const ACTION_LABELS = {
  CREATE_PROJECT: { label: 'Tạo dự án', color: '#10b981' },
  UPDATE_PROJECT: { label: 'Cập nhật dự án', color: '#3b82f6' },
  DELETE_PROJECT: { label: 'Xóa dự án', color: '#ef4444' },
  CREATE_TASK: { label: 'Tạo công việc', color: '#10b981' },
  UPDATE_TASK: { label: 'Cập nhật công việc', color: '#3b82f6' },
  UPDATE_TASK_STATUS: { label: 'Đổi trạng thái việc', color: '#06b6d4' },
  DELETE_TASK: { label: 'Xóa công việc', color: '#ef4444' },
  RUN_OPTIMIZATION: { label: 'Chạy tối ưu hóa', color: '#f59e0b' },
  APPLY_OPTIMIZATION: { label: 'Áp dụng phân bổ', color: '#ec4899' },
  CREATE_RESOURCE: { label: 'Thêm nhân sự', color: '#10b981' },
  UPDATE_RESOURCE: { label: 'Cập nhật nhân sự', color: '#3b82f6' },
  DELETE_RESOURCE: { label: 'Xóa nhân sự', color: '#ef4444' },
  LOGIN: { label: 'Đăng nhập', color: '#8b5cf6' },
  LOGOUT: { label: 'Đăng xuất', color: '#64748b' },
};

export default function ActivityLogsScreen({ navigation }) {
  const { theme } = useTheme();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const res = await activityLogApi.getAll({ limit: 40 });
      setLogs(res.data?.data?.logs || []);
    } catch (e) {
      console.log('Error loading activity logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const renderLogItem = ({ item }) => {
    const actionMeta = ACTION_LABELS[item.action] || {
      label: item.action,
      color: '#3b82f6',
    };

    return (
      <Card style={styles.logCard}>
        <View style={styles.logTop}>
          <View style={styles.actorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.userName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.actorName, { color: theme.colors.text }]}>
                {item.userName || 'Hệ thống'}
              </Text>
              <Text
                style={[styles.logTime, { color: theme.colors.textSecondary }]}
              >
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
          <Badge
            label={actionMeta.label}
            color={actionMeta.color}
            size="sm"
          />
        </View>

        <Text
          style={[styles.description, { color: theme.colors.text }]}
        >
          {item.description}
        </Text>

        {item.ipAddress && (
          <View style={styles.ipRow}>
            <Ionicons
              name="globe-outline"
              size={12}
              color={theme.colors.textMuted}
            />
            <Text
              style={[styles.ipText, { color: theme.colors.textMuted }]}
            >
              IP: {item.ipAddress}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Nhật ký Hoạt động"
        subtitle="Lịch sử thao tác & kiểm vết hệ thống"
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={logs}
        keyExtractor={(item) => item._id}
        renderItem={renderLogItem}
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
              icon="time-outline"
              title="Chưa có nhật ký"
              description="Hệ thống chưa ghi nhận thao tác nào."
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  logCard: {
    marginBottom: 10,
    padding: 14,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 10,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ipText: {
    fontSize: 11,
  },
});
