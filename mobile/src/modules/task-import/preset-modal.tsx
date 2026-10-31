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
import { getPreset, PRESETS, presetDisplayName } from '@/ai/presets';
import { useAiSettings } from '@/ai/settings';

const ACCENT = '#4F46E5';
const NAME_MAX_LENGTH = 12;

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 预设模板选择弹窗:选择预设 + 自定义命名(留空恢复默认名) */
export function PresetModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const active = getPreset(settings.presetId);
  const [prevVisible, setPrevVisible] = useState(visible);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  // 打开弹窗时清空重命名状态(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setRenamingId(null);
      setDraftName('');
    }
  }

  const startRename = (id: string) => {
    setRenamingId(id);
    setDraftName(presetDisplayName(getPreset(id), settings.presetNames));
  };

  const saveRename = () => {
    if (!renamingId) return;
    const name = draftName.trim().slice(0, NAME_MAX_LENGTH);
    const next = { ...settings.presetNames };
    if (name) {
      next[renamingId] = name;
    } else {
      // 留空 = 恢复默认名称
      delete next[renamingId];
    }
    updateSettings({ ...settings, presetNames: next });
    setRenamingId(null);
  };

  const renamingPreset = renamingId ? getPreset(renamingId) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>选择预设模板</Text>
            <Text style={styles.hint}>不同预设使用不同的提取规则,点 ✏️ 可自定义名称</Text>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {PRESETS.map((preset) => {
                const selected = preset.id === active.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      updateSettings({ ...settings, presetId: preset.id });
                      onClose();
                    }}
                    style={[styles.row, selected && styles.rowActive]}
                  >
                    <Text style={styles.rowIcon}>{preset.icon}</Text>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, selected && styles.rowNameActive]}>
                        {presetDisplayName(preset, settings.presetNames)}
                      </Text>
                      <Text style={styles.rowDesc}>{preset.description}</Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        startRename(preset.id);
                      }}
                      hitSlop={8}
                      style={styles.renameButton}
                    >
                      <Text style={styles.renameIcon}>✏️</Text>
                    </Pressable>
                    {selected && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            {renamingPreset && (
              <View style={styles.renameBox}>
                <Text style={styles.renameLabel}>重命名「{renamingPreset.name}」</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  style={styles.renameInput}
                  placeholder={`最多 ${NAME_MAX_LENGTH} 字,留空恢复默认`}
                  placeholderTextColor="#9CA3AF"
                  maxLength={NAME_MAX_LENGTH}
                  autoFocus
                  onSubmitEditing={saveRename}
                />
                <View style={styles.renameActions}>
                  <Pressable
                    style={styles.renameCancel}
                    onPress={() => setRenamingId(null)}
                  >
                    <Text style={styles.renameCancelText}>取消</Text>
                  </Pressable>
                  <Pressable style={styles.renameSave} onPress={saveRename}>
                    <Text style={styles.renameSaveText}>保存名称</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>关闭</Text>
            </Pressable>
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
    width: 320,
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
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  rowIcon: {
    fontSize: 20,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  rowNameActive: {
    color: ACCENT,
  },
  rowDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  renameButton: {
    padding: 2,
  },
  renameIcon: {
    fontSize: 14,
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  renameBox: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    padding: 10,
    gap: 8,
  },
  renameLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4338CA',
  },
  renameInput: {
    height: 34,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  renameActions: {
    flexDirection: 'row',
    gap: 8,
  },
  renameCancel: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  renameSave: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    marginTop: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
