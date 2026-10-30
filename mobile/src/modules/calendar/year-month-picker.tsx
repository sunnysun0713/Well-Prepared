import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ACCENT = '#4F46E5';

interface Props {
  /** 当前查看的年份 */
  year: number;
  /** 当前查看的月份(0-11) */
  month: number;
  /** 选定某年某月后回调 */
  onPick: (year: number, month: number) => void;
}

/** 年月快捷选择面板:年份横滑条 + 月份网格,点年份改选年,点月份直接跳转 */
export function YearMonthPicker({ year, month, onPick }: Props) {
  const todayYear = new Date().getFullYear();
  // 今天前后 6 年,共 13 个候选年份
  const years = Array.from({ length: 13 }, (_, i) => todayYear - 6 + i);
  const [pickedYear, setPickedYear] = useState(year);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>年份</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.yearRow}
      >
        {years.map((y) => (
          <Pressable
            key={y}
            onPress={() => setPickedYear(y)}
            style={[styles.yearChip, y === pickedYear && styles.chipActive]}
          >
            <Text style={[styles.chipText, y === pickedYear && styles.chipTextActive]}>
              {y}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>月份</Text>
      <View style={styles.monthGrid}>
        {Array.from({ length: 12 }, (_, i) => i).map((m) => {
          const active = m === month && pickedYear === year;
          return (
            <Pressable
              key={m}
              onPress={() => onPick(pickedYear, m)}
              style={[styles.monthChip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {m + 1}月
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  yearRow: {
    gap: 8,
    marginBottom: 12,
  },
  yearChip: {
    height: 36,
    minWidth: 56,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: ACCENT,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthChip: {
    width: '31%',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
