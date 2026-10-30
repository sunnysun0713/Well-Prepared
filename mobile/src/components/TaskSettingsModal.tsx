import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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
  { label: '准时提醒', minutes: 0 },
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

/** 任务设置弹窗:起止时间、备注、闹钟提醒(固定档位 + 自定义) */
export function TaskSettingsModal({ visible, task, onClose }: Props) {
  const { updateTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [startTime, setStartTime] = useState(task.startTime);
  const [endTime, setEndTime] = useState(task.endTime);
  const [note, setNote] = useState(task.note ?? '');
  const [remind, setRemind] = useState<number | null>(task.remindAdvanceMinutes ?? null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [timeError, setTimeError] = useState('');

  // 打开弹窗时重置为任务当前值(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setStartTime(task.startTime);
      setEndTime(task.endTime);
      setNote(task.note ?? '');
      setRemind(task.remindAdvanceMinutes ?? null);
      setCustomMinutes('');
      setTimeError('');
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
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime) || endTime <= startTime) {
      setTimeError('时间格式应为 HH:mm,且结束时间晚于起始时间');
      return;
    }
    updateTask(task.id, {
      startTime,
      endTime,
      note: note.trim() ? note.trim() : undefined,
      remindAdvanceMinutes: remind ?? undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>任务设置</Text>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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
            {timeError ? <Text style={styles.error}>{timeError}</Text> : null}

            <Text style={styles.label}>备注</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={styles.noteInput}
              placeholder="添加备注(显示在任务名下方)"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            <Text style={styles.label}>闹钟提醒</Text>
            <View style={styles.chips}>
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
                  {customActive ? `自定义 · ${remind}分钟` : '自定义'}
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
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={confirm}>
              <Text style={styles.confirmText}>确定</Text>
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
    width: 320,
    maxHeight: '85%',
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
  body: {
    flexGrow: 0,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
    marginTop: 8,
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
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  noteInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: ACCENT,
  },
  chipText: {
    fontSize: 13,
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
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  applyButton: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
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
