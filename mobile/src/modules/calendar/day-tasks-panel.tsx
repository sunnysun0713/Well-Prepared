import { StyleSheet, Text, View } from 'react-native';
import { useTasks } from '@/data/tasks-context';
import { TaskCard } from '@/components/TaskCard';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  date: Date;
}

/** 选中日期下方的「当日代办事项」面板:展示每日任务模块中该日期的任务 */
export function DayTasksPanel({ date }: Props) {
  const { getTasks } = useTasks();
  const tasks = getTasks(date);

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {date.getMonth() + 1}月{date.getDate()}日 代办事项({tasks.length})
      </Text>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>当天暂无代办事项</Text>
          <Text style={styles.emptyHint}>可在「每日任务」模块中添加任务</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} past={isToday && t.endTime < nowHM} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
