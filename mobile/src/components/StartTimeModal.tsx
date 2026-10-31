import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeTime } from '@/ai/parse';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';

const ACCENT = '#4F46E5';
const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

/** 单独的起始时间设置弹窗:只改开始时间,结束时间不合法时自动顺延 */
export function StartTimeModal({ visible, task, onClose }: Props) {
  const { updateTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [timeText, setTimeText] = useState(task.startTime);
  const [error, setError] = useState('');

  // 打开时重置为当前起始时间(渲染期间派生)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTimeText(task.startTime);
      setError('');
    }
  }

  const save = () => {
    const start = normalizeTime(timeText);
    if (!start) {
      setError('时间格式应为 HH:mm,例如 09:30');
      return;
    }
    // 结束时间不晚于新的起始时间时,自动顺延 30 分钟(最多到 23:59)
    let end = task.endTime;
    if (!end || end <= start) {
      const [h, m] = start.split(':').map(Number);
      const total = Math.min(h * 60 + m + 30, 23 * 60 + 59);
      end = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
    }
    updateTask(task.id, { startTime: start, endTime: end });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>设置起始时间</Text>
          <Text style={styles.taskName} numberOfLines={1}>
            {task.title}
          </Text>

          <TextInput
            value={timeText}
            onChangeText={setTimeText}
            style={styles.input}
            placeholder="09:30"
            placeholderTextColor="#9CA3AF"
            maxLength={8}
            autoFocus
            onSubmitEditing={save}
          />
          <Text style={styles.hint}>
            24 小时制,如 09:30;若晚于结束时间会自动顺延 30 分钟
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={save}>
              <Text style={styles.confirmText}>保存</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  taskName: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '600',
    color: ACCENT,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  button: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: ACCENT,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
