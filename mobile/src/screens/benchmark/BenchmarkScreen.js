import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import optimizationApi from '../../api/optimizationApi';

const DATASETS = [
  { key: 'small', label: 'Tập Nhỏ', tasks: '20 Tasks', resources: '5 Người' },
  { key: 'medium', label: 'Tập Vừa', tasks: '100 Tasks', resources: '20 Người' },
  { key: 'large', label: 'Tập Lớn', tasks: '500 Tasks', resources: '60 Người' },
  { key: 'live', label: 'Dữ liệu Thật', tasks: 'Live DB', resources: 'Live DB' },
];

export default function BenchmarkScreen({ navigation }) {
  const { theme } = useTheme();

  const [selectedDataset, setSelectedDataset] = useState('medium');
  const [running, setRunning] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);

  const handleRunBenchmark = async () => {
    setRunning(true);
    try {
      const payload = {
        datasetType: selectedDataset === 'live' ? 'medium' : selectedDataset,
        useDatabaseData: selectedDataset === 'live',
      };

      const res = await optimizationApi.runBenchmark(payload);
      if (res.data?.success) {
        setBenchmarkData(res.data.data);
        Alert.alert('Thành công', 'Đã hoàn thành thực nghiệm đánh giá đa thuật toán!');
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Có lỗi khi chạy thực nghiệm');
    } finally {
      setRunning(false);
    }
  };

  const results = benchmarkData?.results || {};
  const g = results.greedy || {};
  const c = results.csp || {};
  const ga = results.genetic || {};
  const h = results.hybrid || {};

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Benchmark Studio"
        subtitle="Experimental Algorithm Evaluation"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <Card style={styles.bannerCard}>
          <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>
            🧪 Thực nghiệm Đánh giá Đối chứng
          </Text>
          <Text style={[styles.bannerSub, { color: theme.colors.textSecondary }]}>
            So sánh hiệu năng, tốc độ thực thi và độ hội tụ giữa 4 giải thuật: Greedy vs CSP vs GA vs Hybrid.
          </Text>
        </Card>

        {/* Dataset Selector */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          1. Chọn Tập Dữ liệu Thử nghiệm
        </Text>

        <View style={styles.datasetsRow}>
          {DATASETS.map((d) => {
            const isSel = selectedDataset === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => setSelectedDataset(d.key)}
                style={[
                  styles.datasetTile,
                  {
                    backgroundColor: isSel
                      ? 'rgba(99, 102, 241, 0.15)'
                      : theme.isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9',
                    borderColor: isSel ? theme.colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.datasetLabel,
                    {
                      color: isSel ? theme.colors.primary : theme.colors.text,
                      fontWeight: isSel ? '800' : '600',
                    },
                  ]}
                >
                  {d.label}
                </Text>
                <Text style={[styles.datasetMeta, { color: theme.colors.textSecondary }]}>
                  {d.tasks}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Run Button */}
        <Button
          title={running ? 'Đang chạy thực nghiệm đối chứng...' : '🚀 Bắt đầu Chạy Benchmark'}
          onPress={handleRunBenchmark}
          loading={running}
          size="lg"
          style={styles.runBtn}
        />

        {/* Results */}
        {running ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Đang phân tích và đo đạc thời gian 4 giải thuật...
            </Text>
          </View>
        ) : benchmarkData ? (
          <View style={styles.resultsWrap}>
            {/* Champions KPI */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              2. Kết quả Quán quân 🏆
            </Text>

            <View style={styles.championsGrid}>
              <Card style={[styles.champCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
                <Text style={[styles.champLabel, { color: theme.colors.textSecondary }]}>
                  Tối ưu nhất (Best Fitness)
                </Text>
                <Text style={[styles.champName, { color: '#f59e0b' }]}>
                  {benchmarkData.summary?.bestFitnessAlgo}
                </Text>
                <Text style={[styles.champScore, { color: theme.colors.text }]}>
                  Fitness: {h.fitness || ga.fitness || 0}
                </Text>
              </Card>

              <Card style={[styles.champCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                <Text style={[styles.champLabel, { color: theme.colors.textSecondary }]}>
                  Nhanh nhất (Fastest Runtime)
                </Text>
                <Text style={[styles.champName, { color: '#3b82f6' }]}>
                  {benchmarkData.summary?.fastestAlgo}
                </Text>
                <Text style={[styles.champScore, { color: theme.colors.text }]}>
                  Thời gian: {g.executionTime || 1}ms
                </Text>
              </Card>
            </View>

            {/* Algorithm Breakdown Cards */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 12 }]}>
              3. Đối chiếu Chi tiết 4 Giải thuật
            </Text>

            {/* Hybrid */}
            <Card style={[styles.algoResultCard, { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
              <View style={styles.algoCardHeader}>
                <View style={styles.algoTitleWrap}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#10b981" />
                  <Text style={[styles.algoCardTitle, { color: theme.colors.text }]}>
                    Hybrid (CSP → GA)
                  </Text>
                </View>
                <Badge label="Quán quân Đề tài 🏆" color="#10b981" bg="rgba(16, 185, 129, 0.15)" />
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Fitness</Text>
                  <Text style={[styles.metricV, { color: theme.colors.primaryLight }]}>{h.fitness}</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Thời gian</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{h.executionTime}ms</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Khớp kỹ năng</Text>
                  <Text style={[styles.metricV, { color: '#10b981' }]}>{h.skillMatchRate}%</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Lệch tải (StdDev)</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{h.workloadStdDev}</Text>
                </View>
              </View>
            </Card>

            {/* GA */}
            <Card style={styles.algoResultCard}>
              <View style={styles.algoCardHeader}>
                <View style={styles.algoTitleWrap}>
                  <MaterialCommunityIcons name="dna" size={20} color="#8b5cf6" />
                  <Text style={[styles.algoCardTitle, { color: theme.colors.text }]}>
                    Genetic Algorithm (GA)
                  </Text>
                </View>
                <Badge label="Multi-objective" color="#8b5cf6" size="sm" />
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Fitness</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{ga.fitness}</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Thời gian</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{ga.executionTime}ms</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Khớp kỹ năng</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{ga.skillMatchRate}%</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Lệch tải (StdDev)</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{ga.workloadStdDev}</Text>
                </View>
              </View>
            </Card>

            {/* CSP */}
            <Card style={styles.algoResultCard}>
              <View style={styles.algoCardHeader}>
                <View style={styles.algoTitleWrap}>
                  <MaterialCommunityIcons name="link-variant" size={20} color="#3b82f6" />
                  <Text style={[styles.algoCardTitle, { color: theme.colors.text }]}>
                    CSP Solver
                  </Text>
                </View>
                <Badge label="Hard Constraints" color="#3b82f6" size="sm" />
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Fitness</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{c.fitness}</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Thời gian</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{c.executionTime}ms</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Khớp kỹ năng</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{c.skillMatchRate}%</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Lệch tải (StdDev)</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{c.workloadStdDev}</Text>
                </View>
              </View>
            </Card>

            {/* Greedy */}
            <Card style={styles.algoResultCard}>
              <View style={styles.algoCardHeader}>
                <View style={styles.algoTitleWrap}>
                  <MaterialCommunityIcons name="target" size={20} color="#64748b" />
                  <Text style={[styles.algoCardTitle, { color: theme.colors.text }]}>
                    Greedy (Tham lam)
                  </Text>
                </View>
                <Badge label="Baseline" color="#64748b" size="sm" />
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Fitness</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{g.fitness}</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Thời gian</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{g.executionTime}ms</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Khớp kỹ năng</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{g.skillMatchRate}%</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricK, { color: theme.colors.textSecondary }]}>Lệch tải (StdDev)</Text>
                  <Text style={[styles.metricV, { color: theme.colors.text }]}>{g.workloadStdDev}</Text>
                </View>
              </View>
            </Card>
          </View>
        ) : null}
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
    paddingBottom: 40,
  },
  bannerCard: {
    padding: 14,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  datasetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  datasetTile: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  datasetLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  datasetMeta: {
    fontSize: 10,
  },
  runBtn: {
    marginBottom: 16,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  resultsWrap: {
    gap: 10,
  },
  championsGrid: {
    gap: 8,
    marginBottom: 8,
  },
  champCard: {
    padding: 12,
  },
  champLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  champName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  champScore: {
    fontSize: 12,
    marginTop: 2,
  },
  algoResultCard: {
    padding: 14,
    marginBottom: 8,
  },
  algoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  algoTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  algoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCol: {
    width: '46%',
    marginBottom: 4,
  },
  metricK: {
    fontSize: 10,
  },
  metricV: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
});
