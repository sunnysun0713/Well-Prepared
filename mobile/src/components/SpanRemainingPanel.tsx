import { StyleSheet, Text, View } from 'react-native';
import {
  formatRemaining,
  spanProgress,
  spanRangeLabel,
  type Task,
} from '@/data/tasks';
import { colors, radius } from '@/theme';

interface Props {
  /** 覆盖当前所选日期的跨多天任务 */
  tasks: Task[];
}

/** 「剩余时间」面板:跨多天任务的剩余时长与进度条 */
export function SpanRemainingPanel({ tasks }: Props) {
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
        // 极短进度也保留一条细线,避免看起来是空条
        const width = `${Math.max(2, Math.round(progress.ratio * 100))}%` as const;

        return (
          <View key={task.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={[styles.remaining, { color }]}>{text}</Text>
            </View>
            <Text style={styles.range} numberOfLines={1}>
              {spanRangeLabel(task)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width, backgroundColor: color }]} />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  remaining: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  range: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  track: {
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
