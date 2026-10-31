import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AddTaskModal } from '@/components/AddTaskModal';
import { TaskCard } from '@/components/TaskCard';
import { useTasks } from '@/data/tasks-context';

const ACCENT = '#4F46E5';
const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  date: Date;
}

/** 选中日期下方的「当日代办事项」面板:展示每日任务模块中该日期的任务 */
export function DayTasksPanel({ date }: Props) {
  const { getTasks } = useTasks();
  const [addOpen, setAddOpen] = useState(false);
  const tasks = getTasks(date);

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {date.getMonth() + 1}月{date.getDate()}日 代办事项({tasks.length})
        </Text>
        <Pressable style={styles.addButton} onPress={() => setAddOpen(true)} hitSlop={6}>
          <Text style={styles.addButtonText}>+ 新增</Text>
        </Pressable>
      </View>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>当天暂无代办事项</Text>
          <Text style={styles.emptyHint}>点上方「+ 新增」添加任务</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              past={isToday && t.endTime !== '' && t.endTime < nowHM}
            />
          ))}
        </View>
      )}

      <AddTaskModal visible={addOpen} date={date} onClose={() => setAddOpen(false)} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
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
