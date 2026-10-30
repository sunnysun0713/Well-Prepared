import { StyleSheet, Text, View } from 'react-native';
import type { Task } from '@/data/tasks';

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
}

/** 任务卡片:时间 + 标题/备注 + 完成状态(每日任务与日历模块共用) */
export function TaskCard({ task, past }: Props) {
  return (
    <View style={[styles.card, past && styles.past]}>
      <Text style={styles.time}>{task.time}</Text>
      <View style={styles.body}>
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
        {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
      </View>
      <Text style={[styles.status, task.done && styles.statusDone]}>
        {task.done ? '✓' : '○'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  past: {
    opacity: 0.5,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
  },
  status: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  statusDone: {
    color: '#10B981',
  },
});
