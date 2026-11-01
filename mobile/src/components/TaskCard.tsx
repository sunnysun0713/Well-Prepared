import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { findCategory } from '@/data/categories';
import { useCategories } from '@/data/categories-context';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { TaskSettingsModal } from './TaskSettingsModal';
import { TimeRangeModal } from './TimeRangeModal';

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
}

/**
 * 任务卡片:时间上下排列 + 标题/备注 + 分类色条。
 * 点击卡片主体时,左侧色条变宽并竖排显示分类名,内容整体右移。
 */
export function TaskCard({ task, past }: Props) {
  const { updateTask } = useTasks();
  const { categories } = useCategories();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
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
            <Text style={styles.categoryLabel}>
              {(category.name.length > 4
                ? `${category.name.slice(0, 3)}…`
                : category.name
              )
                .split('')
                .join('\n')}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.main, expanded && category && styles.mainExpanded]}>
        {hasTime && (
          <Pressable onPress={() => setTimeOpen(true)} hitSlop={6}>
            <View style={styles.timeCol}>
              <Text style={styles.time}>{task.startTime || '—'}</Text>
              <Text style={styles.timeEnd}>{task.endTime || '—'}</Text>
            </View>
          </Pressable>
        )}
        <Pressable
          style={styles.body}
          onPress={() => {
            if (category) setExpanded((value) => !value);
          }}
        >
          <Text style={styles.title}>{task.title}</Text>
          {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
        </Pressable>
      </View>

      {task.remindAdvanceMinutes != null && <Text style={styles.bell}>🔔</Text>}
      <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8}>
        <Text style={styles.gear}>⚙️</Text>
      </Pressable>
      <Pressable
        onPress={() => updateTask(task.id, { favorite: !task.favorite })}
        hitSlop={8}
        accessibilityLabel={task.favorite ? '取消收藏' : '收藏为紧急任务'}
      >
        <Text style={[styles.favorite, task.favorite && styles.favoriteOn]}>
          {task.favorite ? '★' : '☆'}
        </Text>
      </Pressable>

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
  note: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bell: {
    fontSize: 14,
  },
  gear: {
    fontSize: 16,
    color: '#6B7280',
  },
  favorite: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  favoriteOn: {
    color: '#F59E0B',
  },
});
