import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import NotificationsModal from '../notifications/NotificationsModal';
import { projectApi } from '../../api/projectApi';
import { taskApi } from '../../api/taskApi';
import { resourceApi } from '../../api/resourceApi';
import { activityLogApi } from '../../api/activityLogApi';
import { notificationApi } from '../../api/notificationApi';
import { formatTimeAgo } from '../../utils/formatters';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [stats, setStats] = useState({
    projectsCount: 0,
    tasksCount: 0,
    resourcesCount: 0,
    avgUtilization: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [projRes, taskRes, resRes, logRes, notifRes] = await Promise.all([
        projectApi.getAll({ limit: 1 }),
        taskApi.getAll({ limit: 1 }),
        resourceApi.getAll({ limit: 1 }),
        activityLogApi.getAll({ limit: 5 }),
        notificationApi.getAll({ limit: 20 }),
      ]);

      const projectsTotal = projRes.data?.total || projRes.data?.data?.length || 0;
      const tasksTotal = taskRes.data?.total || taskRes.data?.data?.length || 0;
      const resourcesTotal = resRes.data?.total || resRes.data?.data?.length || 0;

      setStats({
        projectsCount: projectsTotal,
        tasksCount: tasksTotal,
        resourcesCount: resourcesTotal,
        avgUtilization: 86,
      });

      setRecentLogs(logRes.data?.data?.logs || []);

      const notifs = notifRes.data?.data?.notifications || notifRes.data?.data || [];
      setUnreadNotifs(notifs.filter((n) => !n.read).length);
    } catch (e) {
      console.log('Error loading dashboard:', e);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
            Xin chào 👋
          </Text>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {user?.name || 'Thành viên'}
          </Text>
        </View>
        <View style={styles.topActions}>
          {/* Notification Bell */}
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9',
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.colors.text}
            />
            {unreadNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9',
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
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
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {/* Projects KPI */}
          <Card
            style={styles.kpiCard}
            onPress={() => navigation.navigate('ProjectsTab')}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
              ]}
            >
              <Ionicons name="folder" size={20} color="#6366f1" />
            </View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Dự án
            </Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {stats.projectsCount}
            </Text>
          </Card>

          {/* Tasks KPI */}
          <Card
            style={styles.kpiCard}
            onPress={() => navigation.navigate('TasksTab')}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
              ]}
            >
              <Ionicons name="checkbox" size={20} color="#10b981" />
            </View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Công việc
            </Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {stats.tasksCount}
            </Text>
          </Card>

          {/* Resources KPI */}
          <Card
            style={styles.kpiCard}
            onPress={() => navigation.navigate('ResourcesTab')}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: 'rgba(6, 182, 212, 0.15)' },
              ]}
            >
              <Ionicons name="people" size={20} color="#06b6d4" />
            </View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Nhân sự
            </Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {stats.resourcesCount}
            </Text>
          </Card>

          {/* Reports KPI */}
          <Card
            style={styles.kpiCard}
            onPress={() => navigation.navigate('ReportsScreen')}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
              ]}
            >
              <Ionicons name="speedometer" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Công suất TB
            </Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {stats.avgUtilization}%
            </Text>
          </Card>
        </View>

        {/* Quick Action Tiles */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Thao tác nhanh
        </Text>

        <View style={styles.quickActions}>
          <Card
            style={styles.actionTile}
            onPress={() => navigation.navigate('OptimizationTab')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <MaterialCommunityIcons name="dna" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                Tối ưu hóa Phân bổ
              </Text>
              <Text
                style={[
                  styles.actionSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Chạy thuật toán GA & CSP cân bằng tải
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
            />
          </Card>

          <Card
            style={styles.actionTile}
            onPress={() => navigation.navigate('BenchmarkScreen')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: '#f59e0b' },
              ]}
            >
              <Ionicons name="flask" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                Benchmark Studio 🧪
              </Text>
              <Text
                style={[
                  styles.actionSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Thực nghiệm đánh giá đối chứng 4 giải thuật
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
            />
          </Card>

          <Card
            style={styles.actionTile}
            onPress={() => navigation.navigate('ReportsScreen')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: '#06b6d4' },
              ]}
            >
              <Ionicons name="stats-chart" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                Báo cáo & Phân tích Tải
              </Text>
              <Text
                style={[
                  styles.actionSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Xem Resource Histogram & rủi ro Burnout
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
            />
          </Card>

          <Card
            style={styles.actionTile}
            onPress={() => navigation.navigate('TasksTab')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: theme.colors.success },
              ]}
            >
              <Ionicons name="list-circle" size={24} color="#ffffff" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                Quản lý Công việc
              </Text>
              <Text
                style={[
                  styles.actionSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Cập nhật trạng thái và tiến độ task
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
            />
          </Card>
        </View>

        {/* Recent Activity Stream */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Hoạt động gần đây
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ActivityLogsScreen')}
          >
            <Text
              style={[
                styles.seeAllText,
                { color: theme.colors.primaryLight },
              ]}
            >
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        {recentLogs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Chưa có hoạt động nào được ghi nhận.
            </Text>
          </Card>
        ) : (
          recentLogs.map((log) => (
            <Card key={log._id} style={styles.logCard}>
              <View style={styles.logLeft}>
                <View
                  style={[
                    styles.logDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
                <View style={styles.logContent}>
                  <Text style={[styles.logDesc, { color: theme.colors.text }]}>
                    {log.description}
                  </Text>
                  <Text
                    style={[
                      styles.logMeta,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {log.userName || 'Hệ thống'} · {formatTimeAgo(log.createdAt)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Notifications Sheet Modal */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadNotifs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: '48%',
    padding: 14,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  quickActions: {
    gap: 10,
    marginBottom: 24,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logCard: {
    marginBottom: 8,
    padding: 12,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  logContent: {
    flex: 1,
  },
  logDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  logMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
