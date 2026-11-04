import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { colors, radius, shadow } from '@/theme';
import { AddTaskModal } from './AddTaskModal';
import { TimeRangeModal } from './TimeRangeModal';

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
}

/** 任务卡片:左侧时间列(点按改时间)+ 标题/备注 + 提醒标记 + 设置/收藏 */
export function TaskCard({ task, past }: Props) {
  const { updateTask } = useTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const hasTime = Boolean(task.startTime || task.endTime);
  const hasAlarm = task.remindAdvanceMinutes != null;
  const hasSms = task.smsRemindAdvanceMinutes != null;

  return (
    <View style={[styles.card, task.favorite && styles.cardFavorite, past && styles.past]}>
      {hasTime && (
        <Pressable
          onPress={() => setTimeOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`修改时间,当前 ${task.startTime || '未设'} 至 ${task.endTime || '未设'}`}
          style={({ pressed }) => [styles.timeCol, pressed && styles.pressed]}
        >
          <Text style={styles.time}>{task.startTime || '—'}</Text>
          <Text style={styles.timeEnd}>{task.endTime || '—'}</Text>
        </Pressable>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>
          {task.spanRange ? (
            <Text style={styles.spanRange} numberOfLines={1}>
              ({task.spanRange})
            </Text>
          ) : null}
        </View>
        {task.note ? (
          <Text style={styles.note} numberOfLines={2}>
            {task.note}
          </Text>
        ) : null}
        {(hasAlarm || hasSms) && (
          <View style={styles.badges}>
            {hasAlarm && (
              <View style={styles.badge}>
                <Ionicons name="alarm-outline" size={12} color={colors.primary} />
                <Text style={styles.badgeText}>闹钟</Text>
              </View>
            )}
            {hasSms && (
              <View style={styles.badge}>
                <Ionicons name="mail" size={11} color={colors.primary} />
                <Text style={styles.badgeText}>短信</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => setAddOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="任务设置"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => updateTask(task.id, { favorite: !task.favorite })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={task.favorite ? '取消收藏' : '收藏为紧急任务'}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons
            name={task.favorite ? 'star' : 'star-outline'}
            size={19}
            color={task.favorite ? colors.warning : colors.borderStrong}
          />
        </Pressable>
      </View>

      <TimeRangeModal
        visible={timeOpen}
        subtitle={task.title}
        initialStart={task.startTime}
        initialEnd={task.endTime}
        onCancel={() => setTimeOpen(false)}
        onConfirm={(start, end) => {
          updateTask(task.id, { startTime: start, endTime: end });
          setTimeOpen(false);
        }}
      />
      <AddTaskModal visible={addOpen} editTask={task} onClose={() => setAddOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    ...shadow.card,
  },
  cardFavorite: {
    borderColor: colors.warningBorder,
    backgroundColor: '#FFFDF7',
  },
  past: {
    opacity: 0.5,
  },
  timeCol: {
    minWidth: 52,
    paddingVertical: 4,
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    gap: 2,
  },
  time: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timeEnd: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  spanRange: {
    flexShrink: 0,
    fontSize: 10,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
});
