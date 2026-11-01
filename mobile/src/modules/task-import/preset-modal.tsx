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
import { GENERAL_PROMPT, OUTPUT_RULES, type ExtractionPreset } from '@/ai/presets';
import { useAiSettings } from '@/ai/settings';

const ACCENT = '#4F46E5';
const NAME_MAX_LENGTH = 12;

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 模板弹窗:选择/重命名/删除/新增提取模板(内置模板也可删除) */
export function PresetModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const templates = settings.templates;
  const [prevVisible, setPrevVisible] = useState(visible);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [formError, setFormError] = useState('');

  // 打开弹窗时清空编辑状态(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setRenamingId(null);
      setDraftName('');
      setPendingDeleteId(null);
      setAdding(false);
      setNewName('');
      setNewPrompt('');
      setFormError('');
    }
  }

  const startRename = (preset: ExtractionPreset) => {
    setRenamingId(preset.id);
    setDraftName(preset.name);
    setPendingDeleteId(null);
  };

  const saveRename = () => {
    if (!renamingId) return;
    const name = draftName.trim().slice(0, NAME_MAX_LENGTH);
    if (!name) return;
    updateSettings({
      ...settings,
      templates: templates.map((t) => (t.id === renamingId ? { ...t, name } : t)),
    });
    setRenamingId(null);
  };

  const removeTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    updateSettings({
      ...settings,
      templates: next,
      presetId:
        settings.presetId === id ? next[0]?.id ?? '' : settings.presetId,
    });
    setPendingDeleteId(null);
  };

  const addTemplate = () => {
    const name = newName.trim().slice(0, NAME_MAX_LENGTH);
    const rules = newPrompt.trim();
    if (!name) {
      setFormError('请填写模板名称');
      return;
    }
    // 规则可留空:使用通用提取规则;输出格式约束自动补充,避免模型输出无法解析的内容
    const prompt = rules
      ? rules.includes('只输出 JSON')
        ? rules
        : `${rules}\n${OUTPUT_RULES}`
      : GENERAL_PROMPT;
    const template: ExtractionPreset = {
      id: `custom-${Date.now()}`,
      name,
      icon: '📄',
      prompt,
    };
    updateSettings({
      ...settings,
      templates: [...templates, template],
      presetId: template.id,
    });
    setAdding(false);
  };

  const renamingPreset = renamingId
    ? templates.find((t) => t.id === renamingId)
    : undefined;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>模板</Text>
            <Text style={styles.hint}>点模板切换;✏️ 改名,🗑️ 删除,内置模板也可删除</Text>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {templates.map((preset) => {
                const selected = preset.id === settings.presetId;
                const confirmingDelete = pendingDeleteId === preset.id;
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
                        {preset.name}
                      </Text>
                    </View>
                    {confirmingDelete ? (
                      <View style={styles.deleteConfirm}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(null);
                          }}
                          hitSlop={6}
                        >
                          <Text style={styles.cancelText}>取消</Text>
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            removeTemplate(preset.id);
                          }}
                          hitSlop={6}
                        >
                          <Text style={styles.dangerText}>删除</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            startRename(preset);
                          }}
                          hitSlop={8}
                          style={styles.iconButton}
                        >
                          <Text style={styles.renameIcon}>✏️</Text>
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(preset.id);
                            setRenamingId(null);
                          }}
                          hitSlop={8}
                          style={styles.iconButton}
                        >
                          <Text style={styles.renameIcon}>🗑️</Text>
                        </Pressable>
                        {selected && <Text style={styles.check}>✓</Text>}
                      </>
                    )}
                  </Pressable>
                );
              })}
              {templates.length === 0 && (
                <Text style={styles.empty}>还没有模板,点下方「添加模板」新建</Text>
              )}
            </ScrollView>

            {renamingPreset && (
              <View style={styles.editBox}>
                <Text style={styles.editLabel}>重命名「{renamingPreset.name}」</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  style={styles.editInput}
                  placeholder={`最多 ${NAME_MAX_LENGTH} 字`}
                  placeholderTextColor="#9CA3AF"
                  maxLength={NAME_MAX_LENGTH}
                  autoFocus
                  onSubmitEditing={saveRename}
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={styles.editCancel}
                    onPress={() => setRenamingId(null)}
                  >
                    <Text style={styles.editCancelText}>取消</Text>
                  </Pressable>
                  <Pressable style={styles.editSave} onPress={saveRename}>
                    <Text style={styles.editSaveText}>保存名称</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {adding && (
              <View style={styles.editBox}>
                <Text style={styles.editLabel}>添加模板</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.editInput}
                  placeholder={`模板名称(最多 ${NAME_MAX_LENGTH} 字)`}
                  placeholderTextColor="#9CA3AF"
                  maxLength={NAME_MAX_LENGTH}
                  autoFocus
                />
                <TextInput
                  value={newPrompt}
                  onChangeText={setNewPrompt}
                  style={[styles.editInput, styles.promptInput]}
                  placeholder="提取规则(可选),例如:从图片中提取所有会议安排,备注写地点"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.promptHint}>
                  无特殊要求可以不填,AI 会自己为你规划;JSON 输出格式会自动补充
                </Text>
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}
                <View style={styles.editActions}>
                  <Pressable
                    style={styles.editCancel}
                    onPress={() => setAdding(false)}
                  >
                    <Text style={styles.editCancelText}>取消</Text>
                  </Pressable>
                  <Pressable style={styles.editSave} onPress={addTemplate}>
                    <Text style={styles.editSaveText}>保存模板</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {!adding && (
              <Pressable
                style={styles.addTemplateButton}
                onPress={() => {
                  setAdding(true);
                  setRenamingId(null);
                  setPendingDeleteId(null);
                  setFormError('');
                }}
              >
                <Text style={styles.addTemplateText}>＋ 添加模板</Text>
              </Pressable>
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
    maxHeight: '88%',
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
    gap: 8,
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
  iconButton: {
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
  deleteConfirm: {
    flexDirection: 'row',
    gap: 10,
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
  empty: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  editBox: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    padding: 10,
    gap: 8,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4338CA',
  },
  editInput: {
    height: 34,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  promptInput: {
    height: 84,
    paddingTop: 8,
  },
  promptHint: {
    fontSize: 10,
    color: '#6B7280',
  },
  formError: {
    fontSize: 11,
    color: '#DC2626',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCancel: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  editSave: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addTemplateButton: {
    marginTop: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTemplateText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  closeButton: {
    marginTop: 10,
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
