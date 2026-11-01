import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '@/data/tasks-context';
import { colors, radius } from '@/theme';
import { DayTasksPanel } from './day-tasks-panel';
import { MonthGrid } from './month-grid';
import { WheelPickerModal } from './wheel-picker';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const TODAY_YEAR = new Date().getFullYear();
// 滚轮候选年份:今年往前 50 年
const YEARS_BACK = 50;
const FIRST_YEAR = TODAY_YEAR - YEARS_BACK;
const YEAR_OPTIONS = Array.from(
  { length: YEARS_BACK + 1 },
  (_, i) => `${FIRST_YEAR + i}年`,
);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

/** 日历模块主界面:顶部今天日期,年月切换栏,月历网格;点选日期后网格下方显示当日代办 */
export function CalendarScreen() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  // 进入模块时默认选中今天,直接展示当天任务
  const [selected, setSelected] = useState<Date | null>(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const { getTasks } = useTasks();

  // 当前视图月份中有任务的日号,用于网格圆点标记
  const taskDays = useMemo(() => {
    const set = new Set<number>();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      if (getTasks(new Date(viewYear, viewMonth, day)).length > 0) {
        set.add(day);
      }
    }
    return set;
  }, [getTasks, viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  /** 回到今天:视图切回本月并选中今天 */
  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelected(now);
  };

  /** 是否同一天(忽略时分秒) */
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  /** 点击日期:选中;再次点击同一日期取消选中 */
  const handleSelectDay = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day);
    if (selected && isSameDay(selected, picked)) {
      setSelected(null);
    } else {
      setSelected(picked);
    }
  };

  /** 某年某月的天数:JS Date 自动处理大小月与闰年 */
  const getDayCount = (yearIdx: number, monthIdx: number) =>
    new Date(FIRST_YEAR + yearIdx, monthIdx + 1, 0).getDate();

  // 打开弹窗时三个滚轮定位到今天
  const todayYearIndex = today.getFullYear() - FIRST_YEAR;
  const todayMonthIndex = today.getMonth();
  const todayDayIndex = today.getDate() - 1;

  // 视图不在本月或没选中今天时,显示「回到今天」
  const showGoToday =
    viewYear !== today.getFullYear() ||
    viewMonth !== today.getMonth() ||
    !selected ||
    !isSameDay(selected, today);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.todayLabel}>今天</Text>
            <Text style={styles.today}>
              {today.getMonth() + 1}月{today.getDate()}日 星期{WEEKDAYS[today.getDay()]}
            </Text>
          </View>
          {showGoToday && (
            <Pressable
              onPress={goToday}
              hitSlop={6}
              accessibilityRole="button"
              style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
            >
              <Text style={styles.todayButtonText}>回到今天</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.monthSwitcher}>
          <Pressable
            onPress={goPrevMonth}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="上个月"
            style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`选择日期,当前 ${viewYear}年${viewMonth + 1}月`}
            style={({ pressed }) => [styles.titleGroup, pressed && styles.pressed]}
          >
            <Text style={styles.monthTitle}>
              {viewYear}年{viewMonth + 1}月
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={goNextMonth}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="下个月"
            style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <MonthGrid
          year={viewYear}
          month={viewMonth}
          today={today}
          selected={selected}
          taskDays={taskDays}
          onSelectDay={handleSelectDay}
        />

        {selected && <DayTasksPanel date={selected} />}

        <WheelPickerModal
          visible={pickerOpen}
          title="选择日期"
          yearOptions={YEAR_OPTIONS}
          monthOptions={MONTH_OPTIONS}
          getDayCount={getDayCount}
          yearValue={todayYearIndex}
          monthValue={todayMonthIndex}
          dayValue={todayDayIndex}
          onConfirm={(yearIdx, monthIdx, dayIdx) => {
            const y = FIRST_YEAR + yearIdx;
            setViewYear(y);
            setViewMonth(monthIdx);
            setSelected(new Date(y, monthIdx, dayIdx + 1));
            setPickerOpen(false);
          }}
          onCancel={() => setPickerOpen(false)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: {
    gap: 2,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  today: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  todayButton: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
});
