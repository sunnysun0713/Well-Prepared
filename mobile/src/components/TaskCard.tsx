import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { TaskSettingsModal } from './TaskSettingsModal';

interface Props {
  task: Task;
  /** 时间已过,整卡弱化显示 */
  past: boolean;
}

/** 任务卡片:起止时间 + 可编辑标题/备注 + 提醒标记 + 设置入口 */
export function TaskCard({ task, past }: Props) {
  const { updateTask } = useTasks();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const startEdit = () => {
    setDraft(task.title);
    setEditing(true);
  };

  /** 提交标题修改,空标题回退为原标题 */
  const commitEdit = () => {
    const t = draft.trim();
    if (t) {
      updateTask(task.id, { title: t });
    } else {
      setDraft(task.title);
    }
    setEditing(false);
  };

  return (
    <View style={[styles.card, past && styles.past]}>
      <Text style={styles.time}>
        {task.startTime}–{task.endTime}
      </Text>
      <View style={styles.body}>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            autoFocus
            selectTextOnFocus
            maxLength={50}
            style={styles.titleInput}
          />
        ) : (
          <Pressable onPress={startEdit} hitSlop={4}>
            <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
          </Pressable>
        )}
        {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
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
    paddingVertical: 14,
  },
  past: {
    opacity: 0.5,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    fontVariant: ['tabular-nums'],
    minWidth: 80,
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
  titleInput: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#4F46E5',
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
});
