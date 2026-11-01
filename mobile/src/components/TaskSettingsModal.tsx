import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { reminderLabel } from '@/data/reminder-options';
import {
  channelIdForSound,
  DEFAULT_REMINDER_SOUND,
  findReminderSound,
} from '@/data/reminder-sounds';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import {
  ensureNotificationChannel,
  ensureNotificationPermission,
  NOTIFICATIONS_SUPPORTED,
} from '@/notifications';
import { ReminderTimeModal } from './ReminderTimeModal';
import { TimeRangeModal } from './TimeRangeModal';

const ACCENT = '#4F46E5';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Props {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

/** 任务设置弹窗,功能分行排列:任务名 → 备注 → 时间 → 闹钟提醒 */
export function TaskSettingsModal({ visible, task, onClose }: Props) {
  const { updateTask, deleteTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState(task.title);
  const [startTime, setStartTime] = useState(task.startTime);
  const [endTime, setEndTime] = useState(task.endTime);
  const [note, setNote] = useState(task.note ?? '');
  const [remind, setRemind] = useState<number | null>(task.remindAdvanceMinutes ?? null);
  const [remindSound, setRemindSound] = useState(
    task.remindSound ?? DEFAULT_REMINDER_SOUND,
  );
  const [smsRemind, setSmsRemind] = useState<number | null>(
    task.smsRemindAdvanceMinutes ?? null,
  );
  const [smsRemindSound, setSmsRemindSound] = useState(
    task.smsRemindSound ?? DEFAULT_REMINDER_SOUND,
  );
  const [error, setError] = useState('');
  const [testNote, setTestNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [smsReminderOpen, setSmsReminderOpen] = useState(false);

  // 打开弹窗时重置为任务当前值(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle(task.title);
      setStartTime(task.startTime);
      setEndTime(task.endTime);
      setNote(task.note ?? '');
      setRemind(task.remindAdvanceMinutes ?? null);
      setRemindSound(task.remindSound ?? DEFAULT_REMINDER_SOUND);
      setSmsRemind(task.smsRemindAdvanceMinutes ?? null);
      setSmsRemindSound(task.smsRemindSound ?? DEFAULT_REMINDER_SOUND);
      setError('');
      setTestNote('');
      setConfirmDelete(false);
      setTimeOpen(false);
      setReminderOpen(false);
      setSmsReminderOpen(false);
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
        setError('通知权限被拒绝,提醒不会生效;请开启权限或关闭提醒后再保存');
        return;
      }
    }
    updateTask(task.id, {
      title: t,
      startTime,
      endTime,
      note: note.trim() ? note.trim() : undefined,
      remindAdvanceMinutes: remind ?? undefined,
      remindSound: remind != null ? remindSound : undefined,
      smsRemindAdvanceMinutes: smsRemind ?? undefined,
      smsRemindSound: smsRemind != null ? smsRemindSound : undefined,
    });
    onClose();
  };

  /** 发送一条 10 秒后弹出的测试提醒,验证通知权限/渠道/铃声是否正常 */
  const sendTestNotification = async () => {
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setTestNote('通知权限被拒绝,请到系统设置里允许通知');
        return;
      }
      const sound = findReminderSound(remindSound);
      await ensureNotificationChannel(sound.id);
      await Notifications.scheduleNotificationAsync({
        identifier: `test-${Date.now()}`,
        content: {
          title: '测试提醒',
          body: '提醒通道正常(10 秒前发送)',
          sound: sound.filename ?? 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 10_000),
          channelId: channelIdForSound(sound.id),
        },
      });
      setTestNote('测试提醒已发送,10 秒后弹出;请勿划掉应用');
    } catch {
      setTestNote('测试提醒发送失败,请重试');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* behavior='height' 在安卓 Modal 内会挤压弹窗并渲染黑块,统一用 padding */}
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>任务设置</Text>

            {/* 第 1 行:任务名(改名) */}
            <Text style={styles.label}>任务名</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="任务名"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />

            {/* 第 2 行:备注 */}
            <Text style={styles.label}>备注</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={styles.input}
              placeholder="添加备注(显示在任务名下方)"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            {/* 第 3 行:时间(点击打开起止时间滚轮) */}
            <Text style={styles.label}>时间</Text>
            <Pressable style={styles.timeButton} onPress={() => setTimeOpen(true)}>
              <Text style={styles.timeButtonText}>
                {startTime} ~ {endTime}
              </Text>
              <Text style={styles.timeButtonHint}>点击设置</Text>
            </Pressable>

            {/* 第 4 行:闹钟提醒开关 + 提醒时间 */}
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

            {/* 第 5 行:短信提醒,时间独立于闹钟 */}
            <Text style={styles.label}>短信提醒</Text>
            <View style={styles.reminderRow}>
              <Switch
                value={smsRemind != null}
                onValueChange={(on) => setSmsRemind(on ? (smsRemind ?? 10) : null)}
                trackColor={{ false: '#D1D5DB', true: '#C7D2FE' }}
                thumbColor={smsRemind != null ? ACCENT : '#F3F4F6'}
              />
              <Pressable
                style={[
                  styles.reminderButton,
                  smsRemind == null && styles.reminderButtonDisabled,
                ]}
                disabled={smsRemind == null}
                onPress={() => setSmsReminderOpen(true)}
              >
                <Text style={styles.reminderButtonText}>
                  {smsRemind != null ? reminderLabel(smsRemind) : '未开启'}
                </Text>
                <Text style={styles.reminderButtonHint}>设置时间</Text>
              </Pressable>
            </View>
            <Text style={styles.smsHint}>
              到时单独弹出一条「短信提醒」消息,时间可与闹钟不同
            </Text>

            <Pressable onPress={sendTestNotification} hitSlop={6} accessibilityRole="button">
              <Text style={styles.testButton}>发送测试提醒(10 秒后弹出)</Text>
            </Pressable>
            {testNote ? <Text style={styles.testNote}>{testNote}</Text> : null}

            {NOTIFICATIONS_SUPPORTED && (
              <Text style={styles.reminderHint}>
                提醒由系统闹钟触发,划掉(清理)应用会取消提醒
              </Text>
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
                <Text style={styles.confirmText}>确定</Text>
              </Pressable>
            </View>

            {/* 删除入口:两步确认,避免误删 */}
            {confirmDelete ? (
              <View style={styles.deleteConfirm}>
                <Text style={styles.deleteConfirmText}>确定删除「{task.title}」？不可恢复</Text>
                <View style={styles.deleteConfirmActions}>
                  <Pressable
                    style={styles.deleteCancelButton}
                    onPress={() => setConfirmDelete(false)}
                  >
                    <Text style={styles.deleteCancelText}>取消</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteDangerButton}
                    onPress={() => {
                      deleteTask(task.id);
                      onClose();
                    }}
                  >
                    <Text style={styles.deleteDangerText}>删除</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.deleteButton} onPress={() => setConfirmDelete(true)}>
                <Text style={styles.deleteText}>删除任务</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

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
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  timeButton: {
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
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
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
    height: 34,
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
  smsHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  testButton: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  testNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
  deleteButton: {
    marginTop: 10,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
  },
  deleteConfirm: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  deleteConfirmText: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteCancelButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  deleteDangerButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteDangerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
