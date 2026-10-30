import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTasks } from '@/data/tasks-context';
import { TaskCard } from '@/components/TaskCard';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 相对今天的称呼:今天 / 明天 / 昨天,其余返回空串 */
function relativeLabel(date: Date, today: Date): string {
  const d = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
  if (d === 0) return '今天';
  if (d === 1) return '明天';
  if (d === -1) return '昨天';
  return '';
}

/** 每日任务模块主界面:顶部日期栏(左右滑动/箭头切换日期)+ 当日任务卡片列表 */
export function DailyTasksScreen() {
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  // 惰性初始化,实例稳定;不用 ref,避免渲染期读写
  const [slide] = useState(() => new Animated.Value(0));

  // 每秒刷新一次时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** 切换日期:dir = +1 下一天 / -1 前一天,带轻量滑动动画 */
  const switchDay = useCallback(
    (dir: number) => {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + dir);
        return next;
      });
      slide.setValue(dir * 48);
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    },
    [slide],
  );

  // 左右滑动切日:仅当手势明显为横向时接管(纵向滚动不受影响)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -60) switchDay(1);
          else if (g.dx > 60) switchDay(-1);
        },
      }),
    [switchDay],
  );

  const { getTasks } = useTasks();

  // 任务只随日期(与任务状态)变化
  const dateKey = selectedDate.toDateString();
  const tasks = useMemo(() => getTasks(new Date(dateKey)), [dateKey, getTasks]);

  const isTodaySelected = relativeLabel(selectedDate, now) === '今天';
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const label = relativeLabel(selectedDate, now);

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <View style={styles.dayHeader}>
        <Pressable onPress={() => switchDay(-1)} style={styles.arrowButton} hitSlop={8}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <View style={styles.dayTitleGroup}>
          <Text style={styles.dayTitle}>
            {label ? `${label} · ` : ''}
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 星期
            {WEEKDAYS[selectedDate.getDay()]}
          </Text>
          <Text style={styles.dayFull}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
            {selectedDate.getDate()}日
            {isTodaySelected
              ? ` ${pad(now.getHours())}时${pad(now.getMinutes())}分${pad(now.getSeconds())}秒`
              : ''}
          </Text>
        </View>
        <Pressable onPress={() => switchDay(1)} style={styles.arrowButton} hitSlop={8}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>左右滑动切换日期</Text>

      <Animated.View style={[styles.body, { transform: [{ translateX: slide }] }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
          <Text style={styles.sectionLabel}>当日任务({tasks.length})</Text>
          <View style={styles.list}>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} past={isTodaySelected && t.endTime < nowHM} />
            ))}
            {tasks.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>这一天没有安排</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: '#374151',
  },
  dayTitleGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayFull: {
    fontSize: 13,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
