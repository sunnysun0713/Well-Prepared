import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reminderLabel } from '@/data/reminder-options';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';
import { ensureNotificationPermission, NOTIFICATIONS_SUPPORTED } from '@/notifications';
import { CategoryPicker } from './CategoryPicker';
import { ReminderTimeModal } from './ReminderTimeModal';
import { TimeRangeModal } from './TimeRangeModal';

const ACCENT = '#4F46E5';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Props {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

/** 任务设置弹窗,功能分行排列:任务名 → 备注 → 时间 → 分类 → 闹钟提醒 */
export function TaskSettingsModal({ visible, task, onClose }: Props) {
  const { updateTask, deleteTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState(task.title);
  const [startTime, setStartTime] = useState(task.startTime);
  const [endTime, setEndTime] = useState(task.endTime);
  const [note, setNote] = useState(task.note ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(task.categoryId);
  const [remind, setRemind] = useState<number | null>(task.remindAdvanceMinutes ?? null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  // 打开弹窗时重置为任务当前值(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle(task.title);
      setStartTime(task.startTime);
      setEndTime(task.endTime);
      setNote(task.note ?? '');
      setCategoryId(task.categoryId);
      setRemind(task.remindAdvanceMinutes ?? null);
      setError('');
      setConfirmDelete(false);
      setTimeOpen(false);
      setReminderOpen(false);
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
        setError('通知权限被拒绝,提醒不会生效;请开启权限或关闭提醒后再保存');
        return;
      }
    }
    updateTask(task.id, {
      title: t,
      startTime,
      endTime,
      note: note.trim() ? note.trim() : undefined,
      categoryId,
      remindAdvanceMinutes: remind ?? undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

            {/* 第 4 行:分类标签(含自定义) */}
            <Text style={styles.label}>分类</Text>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />

            {/* 第 5 行:闹钟提醒开关 + 提醒时间 */}
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
    height: 36,
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
