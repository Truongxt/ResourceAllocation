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
import WorkloadMeter from '../../components/common/WorkloadMeter';
import EmptyState from '../../components/common/EmptyState';
import analyticsApi from '../../api/analyticsApi';

const BURNOUT_MAP = {
  high: { label: 'Cao (Nguy cơ)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  medium: { label: 'Trung bình', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  low: { label: 'Thấp (An toàn)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
};

export default function ReportsScreen({ navigation }) {
  const { theme } = useTheme();

  const [overview, setOverview] = useState(null);
  const [utilizationList, setUtilizationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('burnout'); // 'burnout' | 'departments'

  const loadData = useCallback(async () => {
    try {
      const [dashRes, utilRes] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getUtilization(),
      ]);
      setOverview(dashRes.data?.data || {});
      setUtilizationList(utilRes.data?.data || []);
    } catch (e) {
      console.log('Error loading analytics reports:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const highBurnoutCount = utilizationList.filter(
    (r) => r.burnoutRisk === 'high' || (r.utilizationRate || 0) > 100
  ).length;

  const avgUtilization =
    utilizationList.length > 0
      ? Math.round(
          utilizationList.reduce((sum, r) => sum + (r.utilizationRate || 0), 0) /
            utilizationList.length
        )
      : 0;

  // Group by department
  const deptMap = {};
  utilizationList.forEach((r) => {
    const deptName = r.department?.name || 'Chung';
    if (!deptMap[deptName]) {
      deptMap[deptName] = { name: deptName, count: 0, totalLoad: 0, totalCap: 0 };
    }
    deptMap[deptName].count += 1;
    deptMap[deptName].totalLoad += r.currentWorkload || 0;
    deptMap[deptName].totalCap += r.maxCapacity || 40;
  });
  const deptList = Object.values(deptMap);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Báo cáo & Phân tích"
        subtitle="Resource Histogram & Burnout Risk"
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
        {/* KPI Summary Cards */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Tổng nhân sự
            </Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {utilizationList.length}
            </Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Utilization TB
            </Text>
            <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>
              {avgUtilization}%
            </Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
              Nguy cơ Burnout
            </Text>
            <Text
              style={[
                styles.kpiValue,
                { color: highBurnoutCount > 0 ? '#ef4444' : '#10b981' },
              ]}
            >
              {highBurnoutCount}
            </Text>
          </Card>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            onPress={() => setActiveTab('burnout')}
            style={[
              styles.tabItem,
              activeTab === 'burnout' && {
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
                    activeTab === 'burnout'
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  fontWeight: activeTab === 'burnout' ? '700' : '500',
                },
              ]}
            >
              Rủi ro Burnout ({utilizationList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('departments')}
            style={[
              styles.tabItem,
              activeTab === 'departments' && {
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
                    activeTab === 'departments'
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  fontWeight: activeTab === 'departments' ? '700' : '500',
                },
              ]}
            >
              Theo Phòng ban ({deptList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Burnout Risk List */}
        {activeTab === 'burnout' ? (
          utilizationList.length === 0 ? (
            <EmptyState
              icon="stats-chart-outline"
              title="Không có dữ liệu phân tích"
              description="Chưa có nhân sự hoặc công việc được ghi nhận."
            />
          ) : (
            utilizationList.map((item) => {
              const util = item.utilizationRate || 0;
              const riskKey =
                item.burnoutRisk || (util > 100 ? 'high' : util > 80 ? 'medium' : 'low');
              const bMeta = BURNOUT_MAP[riskKey] || BURNOUT_MAP.low;

              return (
                <Card key={item._id} style={styles.personCard}>
                  <View style={styles.personHeader}>
                    <View style={styles.personInfo}>
                      <Text style={[styles.personName, { color: theme.colors.text }]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.personSub,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.position || 'Nhân sự'} · {item.department?.name || 'Phòng ban'}
                      </Text>
                    </View>
                    <Badge
                      label={bMeta.label}
                      color={bMeta.color}
                      bg={bMeta.bg}
                    />
                  </View>

                  <WorkloadMeter
                    workload={item.currentWorkload || 0}
                    capacity={item.maxCapacity || 40}
                    utilization={util}
                    style={{ marginTop: 8 }}
                  />
                </Card>
              );
            })
          )
        ) : (
          /* Tab 2: Department Breakdown */
          deptList.map((d, idx) => {
            const util =
              d.totalCap > 0 ? Math.round((d.totalLoad / d.totalCap) * 100) : 0;
            return (
              <Card key={idx} style={styles.personCard}>
                <View style={styles.personHeader}>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: theme.colors.text }]}>
                      {d.name}
                    </Text>
                    <Text
                      style={[
                        styles.personSub,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {d.count} nhân sự
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.deptPercent,
                      { color: util > 100 ? '#ef4444' : theme.colors.primary },
                    ]}
                  >
                    {util}% tải
                  </Text>
                </View>

                <WorkloadMeter
                  workload={d.totalLoad}
                  capacity={d.totalCap}
                  utilization={util}
                  style={{ marginTop: 8 }}
                />
              </Card>
            );
          })
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
    paddingBottom: 36,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  tabTitle: {
    fontSize: 13,
  },
  personCard: {
    marginBottom: 10,
    padding: 14,
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  personInfo: {
    flex: 1,
    marginRight: 8,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
  },
  personSub: {
    fontSize: 12,
    marginTop: 2,
  },
  deptPercent: {
    fontSize: 13,
    fontWeight: '800',
  },
});
