import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const ACCENT = '#4F46E5';
/** 备注最大长度,与卡片上的备注限制保持一致 */
export const NOTE_MAX_LENGTH = 100;

interface Props {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

/** 备注编辑弹窗:点「备注」旁的文档图标打开,用大输入框查看和修改备注 */
export function NoteEditorModal({ visible, value, onClose, onSave }: Props) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [draft, setDraft] = useState(value);

  // 打开弹窗时带入当前备注(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setDraft(value);
  }

  const save = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.backdrop}>
          {/* 遮罩是卡片的兄弟层,拖动输入框选择文字时不会误触关闭 */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.card}>
            <Text style={styles.title}>备注</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              style={styles.input}
              placeholder="添加备注(可选)"
              placeholderTextColor="#9CA3AF"
              maxLength={NOTE_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.counter}>
              {draft.length} / {NOTE_MAX_LENGTH}
            </Text>

            <View style={styles.actions}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.confirmButton]} onPress={save}>
                <Text style={styles.confirmText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    height: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  counter: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
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
