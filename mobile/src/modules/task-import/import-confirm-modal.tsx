import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { commitImport, draftsOf } from '@/ai/import';
import type { ExtractedTask, ImportDraft } from '@/ai/types';
import { useTasks } from '@/data/tasks-context';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  tasks: ExtractedTask[];
  onClose: () => void;
  /** 导入完成后回调实际写入条数 */
  onImport: (count: number) => void;
}

/** 提取结果确认弹窗:逐条勾选/编辑后导入任务数据层 */
export function ImportConfirmModal({ visible, tasks, onClose, onImport }: Props) {
  const { addTask } = useTasks();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [items, setItems] = useState<ImportDraft[]>([]);

  // 打开弹窗时按最新提取结果重建条目(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setItems(draftsOf(tasks, new Date()));
    }
  }

  const patchItem = (index: number, patch: Partial<ImportDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const toggleAll = () => {
    setItems((prev) => {
      const allSelected = prev.every((it) => it.selected);
      return prev.map((it) => ({ ...it, selected: !allSelected }));
    });
  };

  /** 勾选的条目归一化后写入任务数据层,返回实际写入条数 */
  const importSelected = () => {
    const count = commitImport(items, addTask);
    onImport(count);
    onClose();
  };

  const selectedCount = items.filter((it) => it.selected).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>确认导入({items.length} 条)</Text>

            {items.length > 0 ? (
              <>
                <View style={styles.listHeader}>
                  <Text style={styles.listHint}>逐条检查,可修改后再导入</Text>
                  <Pressable onPress={toggleAll} hitSlop={8}>
                    <Text style={styles.toggleAllText}>
                      {selectedCount === items.length ? '取消全选' : '全选'}
                    </Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                  {items.map((it, index) => (
                    <View key={index} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Pressable
                          onPress={() => patchItem(index, { selected: !it.selected })}
                          style={[styles.checkbox, it.selected && styles.checkboxOn]}
                          hitSlop={8}
                        >
                          {it.selected ? <Text style={styles.checkboxText}>✓</Text> : null}
                        </Pressable>
                        <TextInput
                          value={it.title}
                          onChangeText={(v) => patchItem(index, { title: v })}
                          style={styles.titleInput}
                          placeholder="任务名"
                          placeholderTextColor="#9CA3AF"
                          maxLength={50}
                        />
                      </View>
                      <View style={styles.metaRow}>
                        <TextInput
                          value={it.dateText}
                          onChangeText={(v) => patchItem(index, { dateText: v })}
                          style={styles.dateInput}
                          placeholder="今天"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                          value={it.startText}
                          onChangeText={(v) => patchItem(index, { startText: v })}
                          style={styles.timeInput}
                          placeholder="开始"
                          placeholderTextColor="#9CA3AF"
                          maxLength={8}
                        />
                        <Text style={styles.dash}>至</Text>
                        <TextInput
                          value={it.endText}
                          onChangeText={(v) => patchItem(index, { endText: v })}
                          style={styles.timeInput}
                          placeholder="结束"
                          placeholderTextColor="#9CA3AF"
                          maxLength={8}
                        />
                      </View>
                      <TextInput
                        value={it.note}
                        onChangeText={(v) => patchItem(index, { note: v })}
                        style={styles.noteInput}
                        placeholder="备注(可选)"
                        placeholderTextColor="#9CA3AF"
                        maxLength={100}
                      />
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.empty}>没有识别到任务,试试更清晰的照片</Text>
            )}

            <View style={styles.actions}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.confirmButton, selectedCount === 0 && styles.disabled]}
                disabled={selectedCount === 0}
                onPress={importSelected}
              >
                <Text style={styles.confirmText}>导入 {selectedCount} 条</Text>
              </Pressable>
            </View>
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
    width: 330,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  toggleAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: ACCENT,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  itemCard: {
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkboxText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  titleInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1F2937',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  timeInput: {
    width: 58,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 4,
    fontSize: 13,
    color: '#1F2937',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  dash: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noteInput: {
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  empty: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
  disabled: {
    opacity: 0.4,
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
