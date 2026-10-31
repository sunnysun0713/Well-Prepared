import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Task } from '@/data/tasks';
import { useTasks } from '@/data/tasks-context';

const ACCENT = '#4F46E5';

/** 闹钟提醒固定档位 */
const REMINDER_PRESETS = [
  { label: '准时', minutes: 0 },
  { label: '提前10分钟', minutes: 10 },
  { label: '提前30分钟', minutes: 30 },
  { label: '提前1小时', minutes: 60 },
  { label: '提前1天', minutes: 1440 },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Props {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

/** 任务设置弹窗,功能分行排列:任务名(改名)→ 时间 → 备注 → 闹钟提醒 */
export function TaskSettingsModal({ visible, task, onClose }: Props) {
  const { updateTask, deleteTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState(task.title);
  const [startTime, setStartTime] = useState(task.startTime);
  const [endTime, setEndTime] = useState(task.endTime);
  const [note, setNote] = useState(task.note ?? '');
  const [remind, setRemind] = useState<number | null>(task.remindAdvanceMinutes ?? null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 打开弹窗时重置为任务当前值(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle(task.title);
      setStartTime(task.startTime);
      setEndTime(task.endTime);
      setNote(task.note ?? '');
      setRemind(task.remindAdvanceMinutes ?? null);
      setCustomMinutes('');
      setError('');
      setConfirmDelete(false);
    }
  }

  const isPreset = (m: number) => REMINDER_PRESETS.some((p) => p.minutes === m);
  const customActive = remind !== null && !isPreset(remind);

  /** 自定义分钟数生效 */
  const applyCustom = () => {
    const n = parseInt(customMinutes, 10);
    if (!Number.isNaN(n) && n >= 0) {
      setRemind(n);
    }
  };

  const confirm = () => {
    const t = title.trim();
    if (!t) {
      setError('请输入任务名');
      return;
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime) || endTime <= startTime) {
      setError('时间格式应为 HH:mm,且结束时间晚于起始时间');
      return;
    }
    updateTask(task.id, {
      title: t,
      startTime,
      endTime,
      note: note.trim() ? note.trim() : undefined,
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

            {/* 第 2 行:时间 */}
            <Text style={styles.label}>时间</Text>
            <View style={styles.timeRow}>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                style={styles.timeInput}
                placeholder="07:30"
                placeholderTextColor="#9CA3AF"
                maxLength={5}
              />
              <Text style={styles.timeDash}>至</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                style={styles.timeInput}
                placeholder="08:00"
                placeholderTextColor="#9CA3AF"
                maxLength={5}
              />
            </View>

            {/* 第 3 行:备注 */}
            <Text style={styles.label}>备注</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={styles.input}
              placeholder="添加备注(显示在任务名下方)"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            {/* 第 4 行:闹钟提醒(每行 3 个档位,固定排布不溢出) */}
            <Text style={styles.label}>闹钟提醒</Text>
            <View style={styles.chipGrid}>
              {REMINDER_PRESETS.map((p) => {
                const active = remind === p.minutes;
                return (
                  <Pressable
                    key={p.minutes}
                    onPress={() => setRemind(p.minutes)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={applyCustom}
                style={[styles.chip, customActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, customActive && styles.chipTextActive]}>
                  {customActive ? `自定义·${remind}分` : '自定义'}
                </Text>
              </Pressable>
              {remind !== null && (
                <Pressable onPress={() => setRemind(null)} style={styles.chip}>
                  <Text style={styles.chipText}>关闭提醒</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.customRow}>
              <TextInput
                value={customMinutes}
                onChangeText={setCustomMinutes}
                style={styles.customInput}
                placeholder="自定义分钟数(如 45)"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={4}
                onSubmitEditing={applyCustom}
              />
              <Pressable onPress={applyCustom} style={styles.applyButton}>
                <Text style={styles.applyText}>应用</Text>
              </Pressable>
            </View>

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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  timeDash: {
    fontSize: 13,
    color: '#6B7280',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  chip: {
    width: '31.5%',
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: ACCENT,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  applyButton: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
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
