import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export interface HeatmapLog {
  date: string;
  status: 'completed' | 'skipped' | 'missed';
  count: number;
}

interface HeatmapMatrixProps {
  logs?: HeatmapLog[];
  color?: string;
  weeksToShow?: number;
}

export const HeatmapMatrix: React.FC<HeatmapMatrixProps> = ({
  logs = [],
  color = Colors.dark.habits,
  weeksToShow = 20,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ date: string; status: string; count: number } | null>(null);

  // Map logs for fast O(1) lookup: 'YYYY-MM-DD' -> Log
  const logMap = new Map<string, HeatmapLog>();
  logs.forEach((l) => logMap.set(l.date, l));

  // Build grid of weeks (columns) and days (rows 0..6: Sun..Sat)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks: { date: Date; dateStr: string; log?: HeatmapLog }[][] = [];

  // Find start date: end of current week minus (weeksToShow - 1) weeks
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + (6 - dayOfWeek));

  const totalDays = weeksToShow * 7;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - totalDays + 1);

  const curr = new Date(startDate);
  for (let w = 0; w < weeksToShow; w++) {
    const weekDays: { date: Date; dateStr: string; log?: HeatmapLog }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = curr.toISOString().split('T')[0];
      const log = logMap.get(dateStr);
      weekDays.push({
        date: new Date(curr),
        dateStr,
        log,
      });
      curr.setDate(curr.getDate() + 1);
    }
    weeks.push(weekDays);
  }

  const getCellColor = (item: { date: Date; dateStr: string; log?: HeatmapLog }) => {
    if (item.date > today) {
      return 'transparent'; // Future dates
    }
    if (!item.log || item.log.status !== 'completed') {
      return 'rgba(255, 255, 255, 0.05)';
    }
    const count = item.log.count || 1;
    if (count >= 3) return color;
    if (count === 2) return `${color}CC`;
    return `${color}80`;
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.container}>
      {/* Selected date tooltip */}
      {selectedCell && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            📅 {selectedCell.date}: {selectedCell.status === 'completed' ? `✓ Completed (${selectedCell.count}x)` : 'Not completed'}
          </Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {/* Day of week labels */}
        <View style={styles.labelsColumn}>
          {dayLabels.map((l, i) => (
            <Text key={i} style={styles.dayLabel}>
              {i % 2 === 1 ? l : ''}
            </Text>
          ))}
        </View>

        {/* 2D Matrix Grid */}
        <View style={styles.grid}>
          {weeks.map((week, wIdx) => (
            <View key={wIdx} style={styles.weekColumn}>
              {week.map((item, dIdx) => {
                const isFuture = item.date > today;
                return (
                  <Pressable
                    key={dIdx}
                    disabled={isFuture}
                    onPress={() =>
                      setSelectedCell({
                        date: item.dateStr,
                        status: item.log?.status || 'none',
                        count: item.log?.count || 0,
                      })
                    }
                    style={[
                      styles.cell,
                      { backgroundColor: getCellColor(item) },
                      isFuture && styles.futureCell,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.legendCell, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
        <View style={[styles.legendCell, { backgroundColor: `${color}80` }]} />
        <View style={[styles.legendCell, { backgroundColor: `${color}CC` }]} />
        <View style={[styles.legendCell, { backgroundColor: color }]} />
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
  },
  tooltip: {
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignSelf: 'flex-start',
  },
  tooltipText: {
    fontSize: 12,
    color: Colors.dark.text,
    fontWeight: '600',
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  labelsColumn: {
    marginRight: Spacing.one,
    justifyContent: 'space-between',
    height: 7 * (12 + 4) - 4,
  },
  dayLabel: {
    fontSize: 9,
    color: Colors.dark.textMuted,
    fontWeight: '700',
    height: 12,
    lineHeight: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  weekColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 2.5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  futureCell: {
    borderColor: 'transparent',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing.two,
  },
  legendText: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginHorizontal: 2,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
