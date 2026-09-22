import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * `workload` là giờ của TUẦN CAO ĐIỂM, không phải tổng giờ cả kỳ — vì `capacity`
 * là năng lực mỗi tuần, so tổng với năng lực tuần là so hai đơn vị khác nhau.
 *
 * `unscheduled` là giờ đã giao nhưng chưa có ngày: không rơi vào tuần nào nên
 * không nằm trong `workload`, nhưng cũng không được để nó biến mất khỏi màn hình.
 */
export default function WorkloadMeter({
  workload = 0,
  capacity = 40,
  utilization,
  unscheduled = 0,
  style,
}) {
  const { theme } = useTheme();

  const util =
    utilization !== undefined
      ? utilization
      : capacity > 0
      ? Math.round((workload / capacity) * 100)
      : 0;

  let color = theme.colors.success;
  if (util > 100) {
    color = theme.colors.danger;
  } else if (util > 80) {
    color = theme.colors.warning;
  }

  const fillPercent = Math.min(util, 100);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[styles.hours, { color: theme.colors.textSecondary }]}>
          {workload}h / {capacity}h
        </Text>
        <Text style={[styles.percent, { color }]}>{util}%</Text>
      </View>
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : '#e2e8f0',
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${fillPercent}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {unscheduled > 0 && (
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>
          +{unscheduled}h đã giao nhưng chưa xếp lịch
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hours: {
    fontSize: 12,
    fontWeight: '500',
  },
  percent: {
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
  note: {
    fontSize: 11,
    marginTop: 4,
  },
});
