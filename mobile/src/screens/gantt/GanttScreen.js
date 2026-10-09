import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import EmptyState from '../../components/common/EmptyState';
import taskApi from '../../api/taskApi';
import projectApi from '../../api/projectApi';
import { STATUS_MAP } from '../../utils/formatters';
import { computeCriticalPath } from '../../utils/gantt';
import { buildGanttLayout } from '../../utils/ganttLayout';

/**
 * Gantt chỉ xem. Không kéo thả (dễ kéo nhầm khi cuộn trên màn nhỏ) và không vẽ mũi tên phụ
 * thuộc (cần thêm react-native-svg) — chốt ở plan 2026-10-08-mobile-gantt.
 *
 * Cột tên việc đứng yên bên trái, trục thời gian cuộn ngang bên phải; cả hai cùng cuộn dọc.
 */

const ZOOMS = [
  { key: 'day', label: 'Ngày', dayWidth: 32 },
  { key: 'week', label: 'Tuần', dayWidth: 12 },
];
const LABEL_WIDTH = 128;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 32;
const BAR_HEIGHT = 20;
const MILESTONE_SIZE = 14;
const CRITICAL_COLOR = '#facc15';

export default function GanttScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [projectId, setProjectId] = useState(route?.params?.projectId || '');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomKey, setZoomKey] = useState('day');
  const [showCritical, setShowCritical] = useState(false);

  const zoom = ZOOMS.find((z) => z.key === zoomKey);

  useEffect(() => {
    projectApi
      .getAll({ limit: 50 })
      .then((res) => {
        const raw = res.data?.data?.projects || res.data?.projects || [];
        setProjects(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setProjects([]));
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { tasks: loaded } = await taskApi.getAllPages(projectId ? { project: projectId } : {});
      setTasks(Array.isArray(loaded) ? loaded : []);
    } catch (err) {
      console.log('Error loading gantt tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const layout = useMemo(() => buildGanttLayout(tasks, { dayWidth: zoom.dayWidth }), [tasks, zoom.dayWidth]);
  // CPM chỉ trên việc có lịch: việc thiếu ngày không có thời lượng thật để tính.
  const cpm = useMemo(() => computeCriticalPath(layout.rows.map((r) => r.task)), [layout.rows]);

  // Nhãn trục: chế độ Ngày ghi từng ngày, chế độ Tuần chỉ ghi ngày thứ Hai.
  const dayLabels = useMemo(
    () =>
      Array.from({ length: layout.totalDays }, (_, i) => {
        const date = dayjs(layout.start).add(i, 'day');
        if (zoomKey === 'day') return { i, text: date.format('DD'), month: date.date() === 1 };
        return date.day() === 1 ? { i, text: date.format('DD/MM'), month: false } : null;
      }).filter(Boolean),
    [layout.start, layout.totalDays, zoomKey]
  );

  const openTask = (task) => navigation.navigate('TaskDetail', { taskId: task._id, title: task.title });
  const projectName = projects.find((p) => p._id === projectId)?.name;
  const chipStyle = (active) => [
    styles.chip,
    {
      backgroundColor: active ? theme.colors.primary : theme.isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    },
  ];
  const chipText = (active) => [styles.chipText, { color: active ? '#fff' : theme.colors.textSecondary }];

  const renderBar = ({ task, left, width, milestone }) => {
    const critical = showCritical && cpm.critical.has(task._id);
    const color = STATUS_MAP[task.status]?.color || theme.colors.primary;
    const label = `${task.title}${critical ? ', trên đường găng' : ''}`;
    if (milestone) {
      return (
        <TouchableOpacity
          key={task._id}
          testID={`gantt-bar-${task._id}`}
          accessibilityLabel={label}
          onPress={() => openTask(task)}
          style={[
            styles.milestone,
            {
              left: left - MILESTONE_SIZE / 2,
              backgroundColor: color,
              borderColor: critical ? CRITICAL_COLOR : 'transparent',
            },
          ]}
        />
      );
    }
    return (
      <TouchableOpacity
        key={task._id}
        testID={`gantt-bar-${task._id}`}
        accessibilityLabel={label}
        onPress={() => openTask(task)}
        style={[
          styles.bar,
          { left, width, backgroundColor: color, borderColor: critical ? CRITICAL_COLOR : 'transparent' },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Tiến độ (Gantt)"
        subtitle={projectName || 'Tất cả dự án'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.controls}>
        <View style={styles.row}>
          {ZOOMS.map((z) => (
            <TouchableOpacity key={z.key} onPress={() => setZoomKey(z.key)} style={chipStyle(zoomKey === z.key)}>
              <Text style={chipText(zoomKey === z.key)}>{z.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setShowCritical((v) => !v)} style={chipStyle(showCritical)}>
          <Text style={chipText(showCritical)}>Đường găng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectChips}>
        <TouchableOpacity onPress={() => setProjectId('')} style={chipStyle(!projectId)}>
          <Text style={chipText(!projectId)}>Tất cả</Text>
        </TouchableOpacity>
        {projects.map((p) => (
          <TouchableOpacity key={p._id} onPress={() => setProjectId(p._id)} style={chipStyle(projectId === p._id)}>
            <Text style={chipText(projectId === p._id)}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showCritical && !loading && (
        <Text style={[styles.summary, { color: theme.colors.textSecondary }]}>
          {cpm.cyclic
            ? 'Phụ thuộc vòng tròn — không có đường găng. Hãy sửa phụ thuộc của các việc.'
            : `Đường găng: ${cpm.critical.size} việc, ${cpm.length} ngày`}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="bar-chart-outline"
          title="Chưa có công việc nào"
          description="Tạo công việc có ngày bắt đầu và kết thúc để thấy tiến độ ở đây."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.row}>
            {/* Cột tên việc */}
            <View style={{ width: LABEL_WIDTH }}>
              <View style={{ height: HEADER_HEIGHT }} />
              {layout.rows.map(({ task }) => (
                <TouchableOpacity key={task._id} onPress={() => openTask(task)} style={styles.labelCell}>
                  <Text numberOfLines={1} style={[styles.labelText, { color: theme.colors.text }]}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Trục thời gian */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentOffset={{ x: Math.max(0, layout.todayOffset - 80), y: 0 }}
            >
              <View style={{ width: layout.width }}>
                <View style={[styles.axis, { borderBottomColor: theme.colors.border }]}>
                  {dayLabels.map(({ i, text, month }) => (
                    <Text
                      key={i}
                      style={[
                        styles.axisText,
                        { left: i * zoom.dayWidth, color: month ? theme.colors.primaryLight : theme.colors.textMuted },
                      ]}
                    >
                      {text}
                    </Text>
                  ))}
                </View>
                {layout.rows.map((row) => (
                  <View key={row.task._id} style={[styles.track, { borderBottomColor: theme.colors.border }]}>
                    {renderBar(row)}
                  </View>
                ))}
                <View
                  pointerEvents="none"
                  style={[styles.todayLine, { left: layout.todayOffset, backgroundColor: theme.colors.danger }]}
                />
              </View>
            </ScrollView>
          </View>

          {layout.unscheduled.length > 0 && (
            <View style={styles.unscheduled}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {`Chưa có lịch (${layout.unscheduled.length})`}
              </Text>
              {layout.unscheduled.map((task) => (
                <TouchableOpacity key={task._id} onPress={() => openTask(task)} style={styles.unscheduledItem}>
                  <Text style={{ color: theme.colors.textSecondary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  projectChips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  summary: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 12 },
  loading: { marginTop: 40 },
  body: { paddingBottom: 32 },
  labelCell: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 12 },
  labelText: { fontSize: 13, fontWeight: '500' },
  axis: { height: HEADER_HEIGHT, borderBottomWidth: 1 },
  axisText: { position: 'absolute', top: 8, fontSize: 10 },
  track: { height: ROW_HEIGHT, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  bar: {
    position: 'absolute',
    height: BAR_HEIGHT,
    top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
    borderRadius: 6,
    borderWidth: 2,
  },
  milestone: {
    position: 'absolute',
    width: MILESTONE_SIZE,
    height: MILESTONE_SIZE,
    top: (ROW_HEIGHT - MILESTONE_SIZE) / 2,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
  },
  todayLine: { position: 'absolute', top: 0, bottom: 0, width: 2, opacity: 0.7 },
  unscheduled: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  unscheduledItem: { paddingVertical: 8 },
});
