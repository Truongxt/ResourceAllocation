import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import projectApi from '../../api/projectApi';
import taskApi from '../../api/taskApi';
import {
  formatDate,
  formatCurrency,
  PROJECT_STATUS_MAP,
  STATUS_MAP,
  PRIORITY_MAP,
} from '../../utils/formatters';

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId, title } = route.params;
  const { theme } = useTheme();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'members'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjectData = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        projectApi.getById(projectId),
        taskApi.getAll({ project: projectId }),
      ]);
      setProject(pRes.data?.data);
      setTasks(tRes.data?.data || []);
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
                  Công việc ({tasks.length})
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
              tasks.length === 0 ? (
                <EmptyState
                  icon="checkbox-outline"
                  title="Chưa có công việc"
                  description="Dự án này chưa được thêm công việc nào."
                />
              ) : (
                tasks.map((task) => {
                  const sMeta = STATUS_MAP[task.status] || STATUS_MAP.todo;
                  const pMeta = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                  return (
                    <Card key={task._id} style={styles.taskCard}>
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
                        <Badge
                          label={pMeta.label}
                          color={pMeta.color}
                          bg={pMeta.bg}
                          size="sm"
                        />
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
              )
            ) : (
              project.members?.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="Chưa có thành viên"
                  description="Dự án chưa có nhân sự được thêm vào."
                />
              ) : (
                project.members?.map((m) => (
                  <Card key={m._id || m.resource?._id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.avatarText}>
                        {(m.resource?.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text
                        style={[styles.memberName, { color: theme.colors.text }]}
                      >
                        {m.resource?.name || 'Nhân sự'}
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
                ))
              )
            )}
          </>
        )}
      </ScrollView>
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
    marginBottom: 16,
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
});
