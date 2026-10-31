import { Pressable, StyleSheet, Text, View } from 'react-native';

const WEEK_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKEND_COLOR = '#DC2626';
const ACCENT = '#4F46E5';

interface Props {
  year: number;
  /** 0-11 */
  month: number;
  today: Date;
  /** 选中的日期(可能在其他月份) */
  selected: Date | null;
  /** 每日任务数对应的星级(0-5),格内显示星星 */
  starsByDay: Record<number, number>;
  /** 点击某一天(传当月日号) */
  onSelectDay: (day: number) => void;
}

/** 月历网格:周标题行 + 固定 6 周(42 格)。今天实心高亮,选中日期空心高亮,任务繁忙度用星星表示 */
export function MonthGrid({ year, month, today, selected, starsByDay, onSelectDay }: Props) {
  // 周一起始:计算当月 1 日前需要补的空格数
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) {
    cells.push(null);
  }

  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  // 选中恰为今天时只显示今天的实心圈,空心圈不与今日高亮重叠
  const isSelected = (day: number) =>
    selected !== null &&
    !isToday(day) &&
    year === selected.getFullYear() &&
    month === selected.getMonth() &&
    day === selected.getDate();

  return (
    <View style={styles.grid}>
      {WEEK_HEADERS.map((h, i) => (
        <View key={`h-${i}`} style={styles.cell}>
          <Text style={[styles.weekHeader, i >= 5 && { color: WEEKEND_COLOR }]}>
            {h}
          </Text>
        </View>
      ))}
      {cells.map((day, i) => {
        const weekend = i % 7 >= 5;
        const todayCell = day !== null && isToday(day);
        const selectedCell = day !== null && isSelected(day);
        const stars = day !== null ? (starsByDay[day] ?? 0) : 0;
        return (
          <View key={`d-${i}`} style={styles.cell}>
            {day !== null && (
              <Pressable onPress={() => onSelectDay(day)} hitSlop={4}>
                {({ pressed }) => (
                  <View
                    style={[
                      styles.dayCircle,
                      todayCell && styles.todayCircle,
                      selectedCell && styles.selectedCircle,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        weekend && !todayCell && !selectedCell && { color: WEEKEND_COLOR },
                        selectedCell && styles.selectedText,
                        todayCell && styles.todayText,
                      ]}
                    >
                      {day}
                    </Text>
                    {stars > 0 && (
                      <Text style={[styles.stars, todayCell && styles.starsOnToday]}>
                        {'★'.repeat(stars)}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  cell: {
    width: '14.285%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: ACCENT,
  },
  selectedCircle: {
    borderWidth: 2,
    borderColor: ACCENT,
  },
  pressed: {
    opacity: 0.6,
  },
  dayText: {
    fontSize: 15,
    color: '#1F2937',
  },
  stars: {
    fontSize: 6,
    lineHeight: 7,
    letterSpacing: 0.5,
    color: '#F59E0B',
  },
  starsOnToday: {
    color: '#FFFFFF',
  },
  selectedText: {
    color: ACCENT,
    fontWeight: '600',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
