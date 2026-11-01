import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reminderLabel } from '@/data/reminder-options';
import { DEFAULT_REMINDER_SOUND } from '@/data/reminder-sounds';
import { dateKeyOf, type Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { ensureNotificationPermission, NOTIFICATIONS_SUPPORTED } from '@/notifications';
import { ReminderTimeModal } from './ReminderTimeModal';
import { TimeRangeModal } from './TimeRangeModal';

const ACCENT = '#4F46E5';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Props {
  visible: boolean;
  /** 新任务所属日期 */
  date: Date;
  onClose: () => void;
}

/** 新增任务弹窗:任务名 / 备注 / 时间 / 闹钟提醒 */
export function AddTaskModal({ visible, date, onClose }: Props) {
  const { addTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [remind, setRemind] = useState<number | null>(null);
  const [remindSound, setRemindSound] = useState(DEFAULT_REMINDER_SOUND);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [smsRemind, setSmsRemind] = useState<number | null>(null);
  const [smsRemindSound, setSmsRemindSound] = useState(DEFAULT_REMINDER_SOUND);
  const [smsReminderOpen, setSmsReminderOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [error, setError] = useState('');

  // 打开弹窗时重置表单(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle('');
      setNote('');
      setStartTime('09:00');
      setEndTime('09:30');
      setRemind(null);
      setRemindSound(DEFAULT_REMINDER_SOUND);
      setReminderOpen(false);
      setSmsRemind(null);
      setSmsRemindSound(DEFAULT_REMINDER_SOUND);
      setSmsReminderOpen(false);
      setTimeOpen(false);
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
    if ((remind != null || smsRemind != null) && NOTIFICATIONS_SUPPORTED) {
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
      remindAdvanceMinutes: remind ?? undefined,
      remindSound: remind != null ? remindSound : undefined,
      smsRemindAdvanceMinutes: smsRemind ?? undefined,
      smsRemindSound: smsRemind != null ? smsRemindSound : undefined,
    };
    addTask(date, task);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>新增任务</Text>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
          <Pressable style={styles.timeButton} onPress={() => setTimeOpen(true)}>
            <Text style={styles.timeButtonText}>
              {startTime} ~ {endTime}
            </Text>
            <Text style={styles.timeButtonHint}>点击设置</Text>
          </Pressable>

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

          <Text style={styles.label}>短信提醒</Text>
          <View style={styles.reminderRow}>
            <Switch
              value={smsRemind != null}
              onValueChange={(on) => setSmsRemind(on ? (smsRemind ?? 10) : null)}
              trackColor={{ false: '#D1D5DB', true: '#C7D2FE' }}
              thumbColor={smsRemind != null ? ACCENT : '#F3F4F6'}
            />
            <Pressable
              style={[styles.reminderButton, smsRemind == null && styles.reminderButtonDisabled]}
              disabled={smsRemind == null}
              onPress={() => setSmsReminderOpen(true)}
            >
              <Text style={styles.reminderButtonText}>
                {smsRemind != null ? reminderLabel(smsRemind) : '未开启'}
              </Text>
              <Text style={styles.reminderButtonHint}>设置时间</Text>
            </Pressable>
          </View>
          <Text style={styles.reminderHint}>到时单独弹出一条「短信提醒」消息,时间可与闹钟不同</Text>
          {NOTIFICATIONS_SUPPORTED && (
            <Text style={styles.reminderHint}>提醒由系统闹钟触发,划掉(清理)应用会取消提醒</Text>
          )}
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
          </ScrollView>
        </Pressable>
      </Pressable>

      <TimeRangeModal
        visible={timeOpen}
        subtitle={title}
        initialStart={startTime}
        initialEnd={endTime}
        onCancel={() => setTimeOpen(false)}
        onConfirm={(start, end) => {
          setStartTime(start);
          setEndTime(end);
          setTimeOpen(false);
        }}
      />

      <ReminderTimeModal
        visible={reminderOpen}
        value={remind}
        onClose={() => setReminderOpen(false)}
        onSelect={setRemind}
        onDeleted={(minutes) => {
          if (remind === minutes) setRemind(10);
        }}
        sound={remindSound}
        onSelectSound={setRemindSound}
      />

      <ReminderTimeModal
        visible={smsReminderOpen}
        value={smsRemind}
        onClose={() => setSmsReminderOpen(false)}
        onSelect={setSmsRemind}
        onDeleted={(minutes) => {
          if (smsRemind === minutes) setSmsRemind(10);
        }}
        sound={smsRemindSound}
        onSelectSound={setSmsRemindSound}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 320,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  body: {
    flexGrow: 0,
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
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  timeButtonHint: {
    fontSize: 11,
    color: '#9CA3AF',
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
