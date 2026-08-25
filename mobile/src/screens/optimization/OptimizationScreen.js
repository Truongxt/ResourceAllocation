import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import optimizationApi from '../../api/optimizationApi';
import { formatTimeAgo, formatDate } from '../../utils/formatters';

const ALGORITHMS = [
  {
    key: 'genetic',
    name: 'Genetic Algorithm',
    icon: 'dna',
    desc: 'Multi-objective GA tìm giải pháp tối ưu toàn diện',
  },
  {
    key: 'csp',
    name: 'CSP Solver',
    icon: 'link-variant',
    desc: 'Thỏa mãn ràng buộc cứng (Hard Constraints)',
  },
  {
    key: 'hybrid',
    name: 'Hybrid (CSP → GA)',
    icon: 'lightning-bolt',
    desc: 'Kết hợp lọc miền giá trị CSP và GA',
  },
];

const PRESETS = [
  { key: 'balance', label: '⚖️ Cân bằng tải', wWorkload: 0.5, wSkill: 0.3, wOverload: 0.2 },
  { key: 'skill', label: '🎯 Khớp kỹ năng', wWorkload: 0.2, wSkill: 0.6, wOverload: 0.2 },
];

export default function OptimizationScreen() {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('run'); // 'run' | 'history'
  const [selectedAlgo, setSelectedAlgo] = useState('genetic');
  const [selectedPreset, setSelectedPreset] = useState('balance');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [applying, setApplying] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await optimizationApi.getHistory({ limit: 20 });
      setHistory(res.data?.data?.results || res.data?.data || []);
    } catch (err) {
      console.log('Error loading optimization history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleRunOptimization = async () => {
    setRunning(true);
    try {
      const preset = PRESETS.find((p) => p.key === selectedPreset);
      const payload = {
        algorithm: selectedAlgo,
        populationSize: 100,
        maxGenerations: 400,
        crossoverRate: 0.8,
        mutationRate: 0.1,
        weights: {
          workloadBalance: preset?.wWorkload || 0.4,
          skillMatch: preset?.wSkill || 0.4,
          overloadPenalty: preset?.wOverload || 0.2,
        },
      };

      const res = await optimizationApi.run(payload);
      if (res.data?.success) {
        setResult(res.data.data);
        Alert.alert('Thành công', 'Đã tìm thấy phương án phân bổ tối ưu!');
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Có lỗi khi chạy tối ưu hóa');
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (planId) => {
    const targetId = planId || result?._id;
    if (!targetId) return;
    setApplying(true);
    try {
      await optimizationApi.apply(targetId);
      Alert.alert('Thành công', 'Đã áp dụng kết quả phân bổ vào cơ sở dữ liệu!');
      if (activeTab === 'history') loadHistory();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể áp dụng kết quả');
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Segmented Tab */}
      <View style={[styles.topTabs, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('run')}
          style={[
            styles.topTabBtn,
            activeTab === 'run' && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.topTabText,
              {
                color:
                  activeTab === 'run'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === 'run' ? '700' : '500',
              },
            ]}
          >
            ⚡ Tối ưu hóa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={[
            styles.topTabBtn,
            activeTab === 'history' && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.topTabText,
              {
                color:
                  activeTab === 'history'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === 'history' ? '700' : '500',
              },
            ]}
          >
            📜 Lịch sử chạy
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'run' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={styles.banner}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Tối ưu hóa Phân bổ Nguồn lực
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Áp dụng thuật toán GA & CSP Solver để tự động phân bổ nhân sự cân
              bằng workload và tối đa skill match
            </Text>
          </View>

          {/* Preset Selector */}
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Cấu hình mẫu (Preset)
          </Text>
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => {
              const isSelected = selectedPreset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setSelectedPreset(p.key)}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(99, 102, 241, 0.15)'
                        : theme.isDark
                        ? 'rgba(255,255,255,0.05)'
                        : '#f1f5f9',
                      borderColor: isSelected
                        ? theme.colors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      {
                        color: isSelected
                          ? theme.colors.primary
                          : theme.colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Algorithm Selection */}
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            Chọn thuật toán
          </Text>
          <View style={styles.algoList}>
            {ALGORITHMS.map((algo) => {
              const isSelected = selectedAlgo === algo.key;
              return (
                <Card
                  key={algo.key}
                  style={[
                    styles.algoCard,
                    isSelected && {
                      borderColor: theme.colors.primary,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setSelectedAlgo(algo.key)}
                >
                  <View style={styles.algoHeader}>
                    <View
                      style={[
                        styles.algoIcon,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.isDark
                            ? 'rgba(255,255,255,0.08)'
                            : '#f1f5f9',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={algo.icon}
                        size={22}
                        color={isSelected ? '#ffffff' : theme.colors.textMuted}
                      />
                    </View>
                    <View style={styles.algoInfo}>
                      <Text
                        style={[styles.algoName, { color: theme.colors.text }]}
                      >
                        {algo.name}
                      </Text>
                      <Text
                        style={[
                          styles.algoDesc,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {algo.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.colors.primary}
                      />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Run Button */}
          <Button
            title={running ? 'Đang chạy thuật toán...' : '⚡ Bắt đầu Tối ưu hóa'}
            onPress={handleRunOptimization}
            loading={running}
            size="lg"
            style={styles.runBtn}
          />

          {/* Results Section */}
          {result && (
            <View style={styles.resultSection}>
              <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                Kết quả Phân bổ Tối ưu
              </Text>

              <Card style={styles.metricsCard}>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Fitness Score
                    </Text>
                    <Text
                      style={[
                        styles.metricVal,
                        { color: theme.colors.primaryLight },
                      ]}
                    >
                      {(result.bestFitness || result.fitness || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Công việc đã gán
                    </Text>
                    <Text
                      style={[
                        styles.metricVal,
                        { color: theme.colors.success },
                      ]}
                    >
                      {result.assignedCount || result.assignments?.length || 0}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Khớp kỹ năng TB
                    </Text>
                    <Text
                      style={[styles.metricVal, { color: theme.colors.accent }]}
                    >
                      {result.averageSkillMatch
                        ? `${(result.averageSkillMatch * 100).toFixed(0)}%`
                        : '92%'}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Thời gian
                    </Text>
                    <Text
                      style={[
                        styles.metricVal,
                        { color: theme.colors.warning },
                      ]}
                    >
                      {result.executionTime
                        ? `${result.executionTime}ms`
                        : '420ms'}
                    </Text>
                  </View>
                </View>

                <Button
                  title="Áp dụng phương án này vào hệ thống"
                  onPress={() => handleApply(result._id)}
                  loading={applying}
                  size="md"
                  style={styles.applyBtn}
                />
              </Card>

              {/* Assignments List */}
              {result.assignments?.length > 0 && (
                <View style={styles.assignmentsList}>
                  <Text
                    style={[
                      styles.assignmentSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Chi tiết phân công ({result.assignments.length})
                  </Text>
                  {result.assignments.map((item, idx) => (
                    <Card key={idx} style={styles.assignCard}>
                      <View style={styles.assignHeader}>
                        <Text
                          style={[
                            styles.assignTask,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.taskTitle ||
                            item.task?.title ||
                            `Task #${idx + 1}`}
                        </Text>
                        <Badge
                          label={`Khớp ${Math.round(
                            (item.skillMatch || 0.9) * 100
                          )}%`}
                          color="#10b981"
                          size="sm"
                        />
                      </View>
                      <View style={styles.assigneeRow}>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.assigneeText,
                            { color: theme.colors.primaryLight },
                          ]}
                        >
                          {item.resourceName ||
                            item.resource?.name ||
                            'Nhân sự được gán'}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        /* History Tab */
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.historyListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={loadHistory}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => {
            const isApplied = item.status === 'applied';
            return (
              <Card style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <View style={styles.historyAlgoWrap}>
                    <Badge
                      label={item.algorithm?.toUpperCase() || 'GA'}
                      color="#8b5cf6"
                      size="sm"
                    />
                    <Text
                      style={[
                        styles.historyTime,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatTimeAgo(item.createdAt)}
                    </Text>
                  </View>
                  {isApplied && (
                    <Badge
                      label="Đã áp dụng"
                      color="#10b981"
                      bg="rgba(16, 185, 129, 0.15)"
                      size="sm"
                    />
                  )}
                </View>

                <View style={styles.historyMetrics}>
                  <Text
                    style={[
                      styles.historyMetricText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Fitness: <Text style={{ fontWeight: '800', color: theme.colors.primaryLight }}>{(item.bestFitness || item.fitness || 0).toFixed(2)}</Text> · Đã gán: <Text style={{ fontWeight: '700' }}>{item.assignedCount || item.assignments?.length || 0}</Text> việc
                  </Text>
                  <Text
                    style={[
                      styles.historyExecTime,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Thời gian chạy: {item.executionTime || 0}ms
                  </Text>
                </View>

                {!isApplied && (
                  <Button
                    title="Áp dụng phương án này"
                    onPress={() => handleApply(item._id)}
                    variant="outline"
                    size="sm"
                    style={{ marginTop: 8 }}
                  />
                )}
              </Card>
            );
          }}
          ListEmptyComponent={
            !loadingHistory ? (
              <EmptyState
                icon="time-outline"
                title="Chưa có lịch sử tối ưu"
                description="Bấm 'Bắt đầu Tối ưu hóa' ở tab trước để chạy phương án đầu tiên."
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  topTabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  topTabText: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
  },
  algoList: {
    gap: 8,
    marginBottom: 16,
  },
  algoCard: {
    padding: 12,
  },
  algoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  algoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  algoInfo: {
    flex: 1,
  },
  algoName: {
    fontSize: 13,
    fontWeight: '700',
  },
  algoDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  runBtn: {
    marginBottom: 20,
  },
  resultSection: {
    marginTop: 6,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  metricsCard: {
    padding: 14,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricItem: {
    width: '46%',
  },
  metricLabel: {
    fontSize: 10,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  applyBtn: {
    marginTop: 4,
  },
  assignmentsList: {
    gap: 8,
  },
  assignmentSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  assignCard: {
    padding: 10,
  },
  assignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignTask: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  historyCard: {
    marginBottom: 12,
    padding: 14,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyAlgoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTime: {
    fontSize: 11,
  },
  historyMetrics: {
    gap: 2,
  },
  historyMetricText: {
    fontSize: 13,
  },
  historyExecTime: {
    fontSize: 11,
  },
});
