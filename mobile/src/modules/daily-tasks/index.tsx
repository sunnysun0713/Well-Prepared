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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTasks } from '@/data/tasks-context';
import type { Task } from '@/data/tasks';
import { AddTaskModal } from '@/components/AddTaskModal';
import { SpanRemainingPanel } from '@/components/SpanRemainingPanel';
import { TaskCard } from '@/components/TaskCard';
import { colors, radius, shadow } from '@/theme';

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

/** 每日任务模块主界面:顶部日期卡(左右滑动/箭头切换日期)+ 当日任务卡片列表 */
export function DailyTasksScreen() {
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [spanOpen, setSpanOpen] = useState(false);
  const [editingSpan, setEditingSpan] = useState<Task | null>(null);
  const insets = useSafeAreaInsets();
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

  /** 回到今天(浏览其他日期时显示入口) */
  const goToday = useCallback(() => setSelectedDate(new Date()), []);

  /** 跳到长时任务的开始/结束日:直接切换当前选中日期 */
  const jumpToDate = useCallback(
    (date: Date) => {
      setSelectedDate(new Date(date));
      slide.setValue(0);
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

  const { getTasks, getSpanTasks } = useTasks();

  // 任务只随日期(与任务状态)变化
  const dateKey = selectedDate.toDateString();
  const tasks = useMemo(() => getTasks(new Date(dateKey)), [dateKey, getTasks]);
  const spanTasks = useMemo(() => getSpanTasks(new Date(dateKey)), [dateKey, getSpanTasks]);

  // 今天收藏(紧急)任务数:始终按真实今天统计,与当前浏览日期无关
  const todayFavoriteCount = useMemo(
    () => getTasks(new Date()).filter((t) => t.favorite).length,
    [getTasks],
  );

  const label = relativeLabel(selectedDate, now);
  const isTodaySelected = label === '今天';
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const doneCount = isTodaySelected
    ? tasks.filter((t) => t.endTime !== '' && t.endTime < nowHM).length
    : 0;

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <View style={styles.dayCard}>
        <Pressable
          onPress={() => switchDay(-1)}
          style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="前一天"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.dayTitleGroup}>
          <View style={styles.dayTitleRow}>
            {label ? (
              <View style={[styles.relBadge, isTodaySelected && styles.relBadgeToday]}>
                <Text style={[styles.relBadgeText, isTodaySelected && styles.relBadgeTextToday]}>
                  {label}
                </Text>
              </View>
            ) : null}
            <Text style={styles.dayTitle}>
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            </Text>
            <Text style={styles.weekday}>周{WEEKDAYS[selectedDate.getDay()]}</Text>
          </View>
          {isTodaySelected ? (
            <Text style={styles.clock}>
              {pad(now.getHours())}:{pad(now.getMinutes())}
              <Text style={styles.clockSec}>:{pad(now.getSeconds())}</Text>
            </Text>
          ) : (
            <Pressable onPress={goToday} hitSlop={6} accessibilityRole="button">
              <Text style={styles.backToday}>{selectedDate.getFullYear()}年 · 回到今天</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => switchDay(1)}
          style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="后一天"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {todayFavoriteCount > 0 && (
        <View style={styles.urgentBar}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.urgentText}>今日紧急任务 {todayFavoriteCount} 项</Text>
        </View>
      )}

      <Animated.View style={[styles.body, { transform: [{ translateX: slide }] }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionLabel}>当日任务</Text>
              <Pressable
                onPress={() => setSpanOpen((open) => !open)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="长时任务"
                accessibilityState={{ expanded: spanOpen }}
                style={[styles.spanToggle, spanOpen && styles.spanToggleActive]}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={spanOpen ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.spanToggleText, spanOpen && styles.spanToggleTextActive]}>
                  长时任务
                </Text>
                <Ionicons
                  name={spanOpen ? 'chevron-up' : 'chevron-down'}
                  size={11}
                  color={spanOpen ? colors.primary : colors.textMuted}
                />
              </Pressable>
            </View>
            <Text style={styles.sectionCount}>
              {isTodaySelected && tasks.length > 0
                ? `已过 ${doneCount} / 共 ${tasks.length}`
                : `共 ${tasks.length} 项`}
            </Text>
          </View>
          {spanOpen ? (
            <SpanRemainingPanel
              tasks={spanTasks}
              onPressTask={setEditingSpan}
              onJumpToDate={jumpToDate}
            />
          ) : null}
          <View style={styles.list}>
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                past={isTodaySelected && t.endTime !== '' && t.endTime < nowHM}
              />
            ))}
            {tasks.length === 0 && (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="sunny-outline" size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>这一天没有安排</Text>
                <Text style={styles.emptyHint}>点右下角 + 添加任务,左右滑动切换日期</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: 24 + insets.bottom },
          pressed && styles.fabPressed,
        ]}
        onPress={() => setAddOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="新增任务"
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>

      <AddTaskModal visible={addOpen} date={selectedDate} onClose={() => setAddOpen(false)} />
      <AddTaskModal
        visible={editingSpan !== null}
        editTask={editingSpan ?? undefined}
        onClose={() => setEditingSpan(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  dayTitleGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  relBadge: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  relBadgeToday: {
    backgroundColor: colors.primarySoft,
  },
  relBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  relBadgeTextToday: {
    color: colors.primary,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  weekday: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  clock: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  clockSec: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  backToday: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
    paddingVertical: 4,
  },
  urgentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 10,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  urgentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warningText,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spanToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  spanToggleActive: {
    backgroundColor: colors.primarySoft,
  },
  spanToggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  spanToggleTextActive: {
    color: colors.primary,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  fabPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.96 }],
  },
});
