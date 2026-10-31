import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { reminderLabel } from '@/data/reminder-options';
import { dateKeyOf, type Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { ensureNotificationPermission, NOTIFICATIONS_SUPPORTED } from '@/notifications';
import { CategoryPicker } from './CategoryPicker';
import { ReminderTimeModal } from './ReminderTimeModal';

const ACCENT = '#4F46E5';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Props {
  visible: boolean;
  /** 新任务所属日期 */
  date: Date;
  onClose: () => void;
}

/** 新增任务弹窗:任务名 / 备注 / 时间 / 分类 / 闹钟提醒 */
export function AddTaskModal({ visible, date, onClose }: Props) {
  const { addTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [remind, setRemind] = useState<number | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [error, setError] = useState('');

  // 打开弹窗时重置表单(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle('');
      setNote('');
      setStartTime('09:00');
      setEndTime('09:30');
      setCategoryId(undefined);
      setRemind(null);
      setReminderOpen(false);
      setError('');
    }
  }

  const confirm = async () => {
    const t = title.trim();
    if (!t) {
      setError('请输入任务名');
      return;
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime) || endTime <= startTime) {
      setError('时间格式应为 HH:mm,且结束时间晚于起始时间');
      return;
    }
    // 设置提醒前确认通知权限,避免"设了却不响"
    if (remind != null && NOTIFICATIONS_SUPPORTED) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setError('通知权限被拒绝,提醒不会生效;请开启权限或关闭提醒后再添加');
        return;
      }
    }
    const task: Task = {
      id: `${dateKeyOf(date)}-t${Date.now()}`,
      title: t,
      startTime,
      endTime,
      note: note.trim() || undefined,
      categoryId,
      remindAdvanceMinutes: remind ?? undefined,
    };
    addTask(date, task);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>新增任务</Text>

          <Text style={styles.label}>任务名</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="要做什么?"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
            autoFocus
          />

          <Text style={styles.label}>备注</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={styles.input}
            placeholder="添加备注(可选)"
            placeholderTextColor="#9CA3AF"
            maxLength={100}
          />

          <Text style={styles.label}>时间</Text>
          <View style={styles.timeRow}>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              style={styles.timeInput}
              placeholder="09:00"
              placeholderTextColor="#9CA3AF"
              maxLength={5}
            />
            <Text style={styles.timeDash}>至</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              style={styles.timeInput}
              placeholder="09:30"
              placeholderTextColor="#9CA3AF"
              maxLength={5}
            />
          </View>

          <Text style={styles.label}>分类</Text>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />

          <Text style={styles.label}>闹钟提醒</Text>
          <View style={styles.reminderRow}>
            <Switch
              value={remind != null}
              onValueChange={(on) => setRemind(on ? (remind ?? 10) : null)}
              trackColor={{ false: '#D1D5DB', true: '#C7D2FE' }}
              thumbColor={remind != null ? ACCENT : '#F3F4F6'}
            />
            <Pressable
              style={[styles.reminderButton, remind == null && styles.reminderButtonDisabled]}
              disabled={remind == null}
              onPress={() => setReminderOpen(true)}
            >
              <Text style={styles.reminderButtonText}>
                {remind != null ? reminderLabel(remind) : '未开启'}
              </Text>
              <Text style={styles.reminderButtonHint}>设置时间</Text>
            </Pressable>
          </View>
          {!NOTIFICATIONS_SUPPORTED && (
            <Text style={styles.reminderHint}>提醒仅在手机上生效,浏览器预览不支持</Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={confirm}>
              <Text style={styles.confirmText}>添加</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>

      <ReminderTimeModal
        visible={reminderOpen}
        value={remind}
        onClose={() => setReminderOpen(false)}
        onSelect={setRemind}
        onDeleted={(minutes) => {
          if (remind === minutes) setRemind(10);
        }}
      />
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
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
    textAlign: 'center',
  },
  timeDash: {
    fontSize: 13,
    color: '#6B7280',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  reminderButtonDisabled: {
    opacity: 0.5,
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  reminderButtonHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reminderHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
