import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddTaskModal } from '@/components/AddTaskModal';
import { SpanRemainingPanel } from '@/components/SpanRemainingPanel';
import { TaskCard } from '@/components/TaskCard';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { colors, radius } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  date: Date;
}

/** 选中日期下方的「当日代办事项」面板:展示每日任务模块中该日期的任务 */
export function DayTasksPanel({ date }: Props) {
  const { getTasks, getSpanTasks } = useTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [spanOpen, setSpanOpen] = useState(false);
  const [editingSpan, setEditingSpan] = useState<Task | null>(null);
  const tasks = getTasks(date);
  const spanTasks = getSpanTasks(date);

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {date.getMonth() + 1}月{date.getDate()}日 代办
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{tasks.length}</Text>
          </View>
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
        <Pressable
          onPress={() => setAddOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="新增任务"
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={16} color={colors.onPrimary} />
          <Text style={styles.addButtonText}>新增</Text>
        </Pressable>
      </View>
      {spanOpen ? (
        <SpanRemainingPanel tasks={spanTasks} onPressTask={setEditingSpan} />
      ) : null}
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="sunny-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>当天暂无代办事项</Text>
          <Text style={styles.emptyHint}>点右上角「新增」添加任务</Text>
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
      <AddTaskModal
        visible={editingSpan !== null}
        editTask={editingSpan ?? undefined}
        onClose={() => setEditingSpan(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  countPill: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
    borderRadius: radius.pill,
    paddingLeft: 8,
    paddingRight: 12,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
