import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  PRESET_REMINDER_MINUTES,
  reminderLabel,
  useReminderOptions,
} from '@/data/reminder-options';
import { REMINDER_SOUNDS } from '@/data/reminder-sounds';

const ACCENT = '#4F46E5';
const MAX_MINUTES = 7 * 24 * 60;

interface Props {
  visible: boolean;
  /** 当前任务的提醒分钟数;null 表示未开启 */
  value: number | null;
  onClose: () => void;
  onSelect: (minutes: number) => void;
  /** 删除档位后回调(用于处理当前选中项被删) */
  onDeleted: (minutes: number) => void;
  /** 当前铃声 id(见 reminder-sounds.ts) */
  sound: string;
  /** 选择铃声(不关闭弹窗) */
  onSelectSound: (id: string) => void;
}

/** 提醒时间设置:选择档位、添加自定义分钟、删除自定义档位 */
export function ReminderTimeModal({
  visible,
  value,
  onClose,
  onSelect,
  onDeleted,
  sound,
  onSelectSound,
}: Props) {
  const { options, addOption, removeOption } = useReminderOptions();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  // 打开时清空输入与确认状态(渲染期间派生)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setCustomText('');
      setError('');
      setPendingDelete(null);
    }
  }

  // 当前值可能来自旧数据,不在档位列表时临时补进列表展示
  const displayOptions = useMemo(() => {
    const set = new Set(options);
    if (value != null) set.add(value);
    return [...set].sort((a, b) => a - b);
  }, [options, value]);

  const addCustom = () => {
    const minutes = parseInt(customText, 10);
    if (Number.isNaN(minutes) || minutes < 0 || minutes > MAX_MINUTES) {
      setError(`请输入 0 - ${MAX_MINUTES} 之间的整数分钟`);
      return;
    }
    if (!addOption(minutes)) {
      setError('该提醒时间已存在');
      return;
    }
    setCustomText('');
    setError('');
    onSelect(minutes);
    onClose();
  };

  const confirmDelete = (minutes: number) => {
    removeOption(minutes);
    onDeleted(minutes);
    setPendingDelete(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>提醒时间</Text>
          <Text style={styles.hint}>选择档位;自定义档位可删除</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {displayOptions.map((minutes) => {
              const active = value === minutes;
              const custom = !PRESET_REMINDER_MINUTES.includes(minutes);
              return (
                <View key={minutes} style={[styles.row, active && styles.rowActive]}>
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => {
                      onSelect(minutes);
                      onClose();
                    }}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>
                      {reminderLabel(minutes)}
                    </Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                  {custom ? (
                    pendingDelete === minutes ? (
                      <View style={styles.deleteConfirm}>
                        <Pressable onPress={() => setPendingDelete(null)} hitSlop={6}>
                          <Text style={styles.cancelText}>取消</Text>
                        </Pressable>
                        <Pressable onPress={() => confirmDelete(minutes)} hitSlop={6}>
                          <Text style={styles.dangerText}>删除</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => setPendingDelete(minutes)} hitSlop={8}>
                        <Text style={styles.trash}>🗑️</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.addRow}>
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              style={styles.input}
              placeholder="自定义分钟,如 45"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={5}
              onSubmitEditing={addCustom}
            />
            <Pressable style={styles.addButton} onPress={addCustom}>
              <Text style={styles.addButtonText}>添加</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.soundLabel}>铃声</Text>
          <View style={styles.soundRow}>
            {REMINDER_SOUNDS.map((option) => {
              const active = sound === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onSelectSound(option.id)}
                  style={[styles.soundChip, active && styles.soundChipActive]}
                >
                  <Text style={[styles.soundText, active && styles.soundTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.soundHint}>铃声在手机通知中播放,需使用重新打包后的 App</Text>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>关闭</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 300,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
    maxHeight: 240,
  },
  listContent: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  rowActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  rowTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  check: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  deleteConfirm: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 10,
  },
  soundLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 6,
  },
  soundRow: {
    flexDirection: 'row',
    gap: 6,
  },
  soundChip: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundChipActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  soundText: {
    fontSize: 12,
    color: '#6B7280',
  },
  soundTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  soundHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
  },
  cancelText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  trash: {
    fontSize: 13,
    marginLeft: 10,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  addButton: {
    width: 58,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  error: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 6,
  },
  closeButton: {
    marginTop: 10,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
});
