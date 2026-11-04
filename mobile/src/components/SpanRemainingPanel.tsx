import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatRemaining,
  parseDateKey,
  spanDateRangeLabel,
  spanProgress,
  type Task,
} from '@/data/tasks';
import { colors, radius } from '@/theme';

interface Props {
  /** 覆盖当前所选日期的长时任务 */
  tasks: Task[];
  /** 点卡片进入编辑 */
  onPressTask?: (task: Task) => void;
  /** 跳转到指定日期(开始/结束日快捷入口) */
  onJumpToDate?: (date: Date) => void;
}

/** 「长时任务」面板:剩余时长与进度条 */
export function SpanRemainingPanel({ tasks, onPressTask, onJumpToDate }: Props) {
  const now = new Date();

  if (tasks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>当天没有长时任务</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => {
        const progress = spanProgress(task, now);
        if (!progress) return null;
        const nearEnd = progress.remainingMs <= progress.totalMs * 0.2;
        const color =
          progress.status === 'overdue'
            ? colors.danger
            : progress.status === 'pending'
              ? colors.textMuted
              : nearEnd
                ? colors.warning
                : colors.primary;
        const text =
          progress.status === 'overdue'
            ? '已结束'
            : progress.status === 'pending'
              ? `未开始 · ${formatRemaining(progress.remainingMs)}`
              : `剩余 ${formatRemaining(progress.remainingMs)}`;
        // 倒计时进度条:填充宽度 = 剩余时间比例,随时间变短;已结束时清空。
        // 进行中剩余的极短进度仍保留一条细线,避免看起来像尚未开始。
        const percent = Math.round(progress.remainingRatio * 100);
        const width = `${
          progress.status === 'overdue' ? 0 : Math.max(2, percent)
        }%` as const;
        const startDate = task.startDateKey ? parseDateKey(task.startDateKey) : null;
        const endDate = task.endDateKey ? parseDateKey(task.endDateKey) : null;

        return (
          <View key={task.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.dateRange} numberOfLines={1}>
                ({spanDateRangeLabel(task)})
              </Text>
              {task.note ? (
                <Text style={styles.note} numberOfLines={1}>
                  {task.note}
                </Text>
              ) : null}
              <Text style={[styles.remaining, { color }]}>{text}</Text>
            </View>
            <View style={styles.bottomRow}>
              <View style={styles.track}>
                <View style={[styles.fill, { width, backgroundColor: color }]} />
              </View>
              {onJumpToDate && startDate ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onJumpToDate(startDate);
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="跳转到开始日"
                  style={({ pressed }) => [styles.jumpChip, pressed && styles.pressed]}
                >
                  <Ionicons name="chevron-back" size={11} color={colors.primary} />
                  <Text style={styles.jumpText}>开始</Text>
                </Pressable>
              ) : null}
              {onJumpToDate && endDate ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onJumpToDate(endDate);
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="跳转到结束日"
                  style={({ pressed }) => [styles.jumpChip, pressed && styles.pressed]}
                >
                  <Text style={styles.jumpText}>结束</Text>
                  <Ionicons name="chevron-forward" size={11} color={colors.primary} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onPressTask?.(task);
                }}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`编辑长时任务 ${task.title}`}
                style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
              >
                <Ionicons name="options-outline" size={15} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pressed: {
    opacity: 0.65,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  remaining: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dateRange: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  note: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  jumpText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  settingsButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
