import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { findCategory } from '@/data/categories';
import { useCategories } from '@/data/categories-context';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { TaskSettingsModal } from './TaskSettingsModal';
import { TimeWheelModal } from './TimeWheelModal';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
  /** 提供时在卡片上显示删除按钮(日历模块使用) */
  onRequestDelete?: () => void;
}

/**
 * 任务卡片:时间上下排列 + 标题/备注 + 分类色条。
 * 点击卡片主体时,左侧色条变宽并竖排显示分类名,内容整体右移。
 */
export function TaskCard({ task, past, onRequestDelete }: Props) {
  const { updateTask } = useTasks();
  const { categories } = useCategories();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeTarget, setTimeTarget] = useState<'start' | 'end' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const category = findCategory(categories, task.categoryId);
  const hasTime = Boolean(task.startTime || task.endTime);

  return (
    <View style={[styles.card, past && styles.past]}>
      {category && (
        <View
          style={[
            styles.categoryBar,
            expanded && styles.categoryBarExpanded,
            { backgroundColor: category.color },
          ]}
        >
          {expanded && (
            <Text style={styles.categoryLabel}>{category.name.split('').join('\n')}</Text>
          )}
        </View>
      )}

      <View style={[styles.main, expanded && category && styles.mainExpanded]}>
        {hasTime && (
          <View style={styles.timeCol}>
            <Pressable onPress={() => setTimeTarget('start')} hitSlop={6}>
              <Text style={styles.time}>{task.startTime || '—'}</Text>
            </Pressable>
            <Pressable onPress={() => setTimeTarget('end')} hitSlop={6}>
              <Text style={styles.timeEnd}>{task.endTime || '—'}</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          style={styles.body}
          onPress={() => {
            if (category) setExpanded((value) => !value);
          }}
        >
          <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
          {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
        </Pressable>
      </View>

      {task.remindAdvanceMinutes != null && <Text style={styles.bell}>🔔</Text>}
      <Pressable onPress={() => updateTask(task.id, { done: !task.done })} hitSlop={8}>
        <Text style={[styles.status, task.done && styles.statusDone]}>
          {task.done ? '✓' : '○'}
        </Text>
      </Pressable>
      <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8}>
        <Text style={styles.gear}>⚙️</Text>
      </Pressable>
      {onRequestDelete ? (
        <Pressable onPress={onRequestDelete} hitSlop={8}>
          <Text style={styles.trash}>🗑️</Text>
        </Pressable>
      ) : null}

      <TimeWheelModal
        visible={timeTarget !== null}
        title={timeTarget === 'end' ? '设置结束时间' : '设置起始时间'}
        subtitle={task.title}
        initialTime={timeTarget === 'end' ? task.endTime : task.startTime}
        validate={
          timeTarget === 'end'
            ? (time) => (time <= task.startTime ? '结束时间需晚于起始时间' : null)
            : undefined
        }
        onCancel={() => setTimeTarget(null)}
        onConfirm={(time) => {
          if (timeTarget === 'end') {
            updateTask(task.id, { endTime: time });
          } else {
            // 起始时间晚于结束时间时,结束时间自动顺延 30 分钟
            let end = task.endTime;
            if (!end || end <= time) {
              const [h, m] = time.split(':').map(Number);
              const total = Math.min(h * 60 + m + 30, 23 * 60 + 59);
              end = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
            }
            updateTask(task.id, { startTime: time, endTime: end });
          }
          setTimeTarget(null);
        }}
      />
      <TaskSettingsModal
        visible={settingsOpen}
        task={task}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  past: {
    opacity: 0.5,
  },
  categoryBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryBarExpanded: {
    width: 34,
  },
  categoryLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainExpanded: {
    marginLeft: 30,
  },
  timeCol: {
    minWidth: 48,
    gap: 1,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    fontVariant: ['tabular-nums'],
  },
  timeEnd: {
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
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
    color: '#9CA3AF',
  },
  bell: {
    fontSize: 14,
  },
  status: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  statusDone: {
    color: '#10B981',
  },
  gear: {
    fontSize: 16,
    color: '#6B7280',
  },
  trash: {
    fontSize: 15,
  },
});
