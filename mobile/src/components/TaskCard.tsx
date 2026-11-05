import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseDateKey, type Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { colors, radius, shadow } from '@/theme';
import { AddTaskModal } from './AddTaskModal';
import { TimeRangeModal } from './TimeRangeModal';

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
  /** 跳转到指定日期(派生任务的开始↔结束快捷入口) */
  onJumpToDate?: (date: Date) => void;
}

/** 任务卡片:左侧时间列(点按改时间)+ 标题/备注 + 提醒标记 + 跳转/设置/收藏 */
export function TaskCard({ task, past, onJumpToDate }: Props) {
  const { updateTask, getTaskById } = useTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const hasTime = Boolean(task.startTime || task.endTime);
  const hasAlarm = task.remindAdvanceMinutes != null;
  const hasSms = task.smsRemindAdvanceMinutes != null;
  // 长时任务派生的开始/结束任务:设置入口指向所属长时任务,而不是派生出来的短时任务
  const spanParent = task.parentId ? getTaskById(task.parentId) : null;
  const derived = Boolean(spanParent && task.spanRole);
  const editTask = spanParent ?? task;
  // 派生任务没有自己的备注时沿用长时任务的备注(旧存档的派生任务也能显示)
  const displayNote = task.note ?? spanParent?.note;
  // 开始任务跳到结束日,结束任务跳到开始日
  const jumpDate =
    spanParent && task.spanRole
      ? parseDateKey(
          (task.spanRole === 'start' ? spanParent.endDateKey : spanParent.startDateKey) ?? '',
        )
      : null;

  return (
    <View style={[styles.card, task.favorite && styles.cardFavorite, past && styles.past]}>
      {hasTime && (
        <Pressable
          onPress={() => (derived ? setAddOpen(true) : setTimeOpen(true))}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={
            derived
              ? `编辑长时任务,当前 ${task.startTime || '未设'} 至 ${task.endTime || '未设'}`
              : `修改时间,当前 ${task.startTime || '未设'} 至 ${task.endTime || '未设'}`
          }
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
        {displayNote ? (
          <Text style={styles.note} numberOfLines={2}>
            {displayNote}
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
        {jumpDate && onJumpToDate ? (
          <Pressable
            onPress={() => onJumpToDate(jumpDate)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={task.spanRole === 'start' ? '跳转到结束日' : '跳转到开始日'}
            style={({ pressed }) => [styles.jumpButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={task.spanRole === 'start' ? 'arrow-forward' : 'arrow-back'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
        ) : null}
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
      <AddTaskModal visible={addOpen} editTask={editTask} onClose={() => setAddOpen(false)} />
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
  /** 跳转按钮:与设置按钮同尺寸的方形描边框,内嵌箭头 */
  jumpButton: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
});
