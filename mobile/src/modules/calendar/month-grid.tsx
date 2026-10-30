import { StyleSheet, Text, View } from 'react-native';

const WEEK_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKEND_COLOR = '#DC2626';

interface Props {
  year: number;
  /** 0-11 */
  month: number;
  today: Date;
}

/** 月历网格:周标题行 + 固定 6 周(42 格),今天高亮,周末着色 */
export function MonthGrid({ year, month, today }: Props) {
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

  return (
    <View style={styles.grid}>
      {WEEK_HEADERS.map((h, i) => (
        <View key={`h-${i}`} style={styles.cell}>
          <Text style={[styles.weekHeader, i >= 5 && { color: WEEKEND_COLOR }]}>
            {h}
          </Text>
        </View>
      ))}
      {cells.map((day, i) => (
        <View key={`d-${i}`} style={styles.cell}>
          {day !== null && (
            <View style={[styles.dayCircle, isToday(day) && styles.todayCircle]}>
              <Text
                style={[
                  styles.dayText,
                  i % 7 >= 5 && !isToday(day) && { color: WEEKEND_COLOR },
                  isToday(day) && styles.todayText,
                ]}
              >
                {day}
              </Text>
            </View>
          )}
        </View>
      ))}
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
    backgroundColor: '#4F46E5',
  },
  dayText: {
    fontSize: 15,
    color: '#1F2937',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
