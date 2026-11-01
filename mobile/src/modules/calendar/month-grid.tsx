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
  /** 有任务的日号集合,格内显示小圆点 */
  taskDays: Set<number>;
  /** 点击某一天(传当月日号) */
  onSelectDay: (day: number) => void;
}

/** 月历网格:周标题行 + 固定 6 周(42 格)。今天实心高亮,选中日期空心高亮,有任务显示圆点 */
export function MonthGrid({
  year,
  month,
  today,
  selected,
  taskDays,
  onSelectDay,
}: Props) {
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
                    {taskDays.has(day) && (
                      <View style={[styles.taskDot, todayCell && styles.taskDotOnToday]} />
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
  taskDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  taskDotOnToday: {
    backgroundColor: '#FFFFFF',
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
