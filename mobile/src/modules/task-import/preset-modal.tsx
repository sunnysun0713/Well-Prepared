import { useState, type ComponentProps } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { GENERAL_PROMPT, OUTPUT_RULES, type ExtractionPreset } from '@/ai/presets';
import { useAiSettings } from '@/ai/settings';
import { colors, radius, shadow } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const NAME_MAX_LENGTH = 12;
const RULES_PLACEHOLDER = '例如:从图片中提取所有会议安排,备注写地点';

/** 内置模板的显示图标;自定义模板统一用文档图标(数据里的 emoji 字段保持不变) */
const BUILTIN_ICONS: Record<string, IconName> = {
  general: 'document-text-outline',
  timetable: 'school-outline',
  meeting: 'megaphone-outline',
  handwritten: 'brush-outline',
};

function iconOf(preset: ExtractionPreset): IconName {
  return BUILTIN_ICONS[preset.id] ?? 'reader-outline';
}

/** 编辑模板时只展示用户写的规则部分,隐藏自动追加的 JSON 输出约束 */
function stripOutputRules(prompt: string): string {
  return prompt.replace(OUTPUT_RULES, '').trim();
}

const GENERAL_RULES = stripOutputRules(GENERAL_PROMPT);

/** 列表里的规则摘要:通用规则显示友好文案,其余显示规则首行 */
function rulesSummary(prompt: string): string {
  const rules = stripOutputRules(prompt);
  if (!rules || rules === GENERAL_RULES) return '通用规则,AI 自动规划';
  return rules.split('\n')[0];
}

/** 用户规则 → 完整提示词:留空用通用规则,未写输出格式时自动追加 JSON 约束 */
function buildPrompt(rules: string): string {
  const trimmed = rules.trim();
  if (!trimmed) return GENERAL_PROMPT;
  return trimmed.includes('只输出 JSON') ? trimmed : `${trimmed}\n${OUTPUT_RULES}`;
}

interface EditorProps {
  title: string;
  name: string;
  rules: string;
  error: string;
  saveLabel: string;
  onChangeName: (v: string) => void;
  onChangeRules: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

/** 模板编辑表单:新增与编辑共用 */
function TemplateEditor({
  title,
  name,
  rules,
  error,
  saveLabel,
  onChangeName,
  onChangeRules,
  onCancel,
  onSave,
}: EditorProps) {
  return (
    <View style={styles.editor}>
      <Text style={styles.editorTitle}>{title}</Text>

      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>名称</Text>
        <Text style={styles.counter}>
          {name.length}/{NAME_MAX_LENGTH}
        </Text>
      </View>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="给模板起个名字"
        placeholderTextColor={colors.textMuted}
        maxLength={NAME_MAX_LENGTH}
        autoFocus
        accessibilityLabel="模板名称"
      />

      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>提取规则</Text>
        <Text style={styles.optional}>选填</Text>
      </View>
      <TextInput
        value={rules}
        onChangeText={onChangeRules}
        style={[styles.input, styles.rulesInput]}
        placeholder={RULES_PLACEHOLDER}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        accessibilityLabel="提取规则"
      />
      <View style={styles.tipRow}>
        <Ionicons name="sparkles" size={12} color={colors.primary} />
        <Text style={styles.tipText}>不填也行,AI 会自己规划;输出格式自动补充</Text>
      </View>

      {error ? (
        <View style={styles.tipRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.editorActions}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}
        >
          <Text style={styles.ghostText}>取消</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryText}>{saveLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 模板弹窗:选择/编辑/删除/新增提取模板(内置模板也可删除) */
export function PresetModal({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAiSettings();
  const templates = settings.templates;
  const [prevVisible, setPrevVisible] = useState(visible);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftRules, setDraftRules] = useState('');
  const [formError, setFormError] = useState('');

  // 打开弹窗时清空编辑状态(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setEditingId(null);
      setAdding(false);
      setPendingDeleteId(null);
      setDraftName('');
      setDraftRules('');
      setFormError('');
    }
  }

  const closeForms = () => {
    setEditingId(null);
    setAdding(false);
    setFormError('');
  };

  const startEdit = (preset: ExtractionPreset) => {
    setEditingId(preset.id);
    setAdding(false);
    setPendingDeleteId(null);
    setDraftName(preset.name);
    const rules = stripOutputRules(preset.prompt);
    // 通用规则不回填,让用户看到的是「留空 = AI 自动规划」
    setDraftRules(rules === GENERAL_RULES ? '' : rules);
    setFormError('');
  };

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setPendingDeleteId(null);
    setDraftName('');
    setDraftRules('');
    setFormError('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const name = draftName.trim().slice(0, NAME_MAX_LENGTH);
    if (!name) {
      setFormError('请填写模板名称');
      return;
    }
    const prompt = buildPrompt(draftRules);
    updateSettings({
      ...settings,
      templates: templates.map((t) => (t.id === editingId ? { ...t, name, prompt } : t)),
    });
    closeForms();
  };

  const saveAdd = () => {
    const name = draftName.trim().slice(0, NAME_MAX_LENGTH);
    if (!name) {
      setFormError('请填写模板名称');
      return;
    }
    const template: ExtractionPreset = {
      id: `custom-${Date.now()}`,
      name,
      icon: '📄',
      prompt: buildPrompt(draftRules),
    };
    updateSettings({
      ...settings,
      templates: [...templates, template],
      presetId: template.id,
    });
    closeForms();
  };

  const removeTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    updateSettings({
      ...settings,
      templates: next,
      presetId: settings.presetId === id ? (next[0]?.id ?? '') : settings.presetId,
    });
    setPendingDeleteId(null);
    if (editingId === id) closeForms();
  };

  const selectTemplate = (id: string) => {
    updateSettings({ ...settings, presetId: id });
    onClose();
  };

  const editorProps = {
    name: draftName,
    rules: draftRules,
    error: formError,
    onChangeName: (v: string) => {
      setDraftName(v);
      if (formError) setFormError('');
    },
    onChangeRules: setDraftRules,
    onCancel: closeForms,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>提取模板</Text>
                <Text style={styles.subtitle}>点选模板切换,AI 会按模板规则识别图片</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="关闭"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {templates.map((preset) => {
                const selected = preset.id === settings.presetId;
                const confirmingDelete = pendingDeleteId === preset.id;
                const editing = editingId === preset.id;
                return (
                  <View
                    key={preset.id}
                    style={[styles.item, selected && styles.itemSelected]}
                  >
                    <Pressable
                      onPress={() => selectTemplate(preset.id)}
                      disabled={editing}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`模板 ${preset.name}`}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                        <Ionicons
                          name={iconOf(preset)}
                          size={18}
                          color={selected ? colors.onPrimary : colors.primary}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text
                          style={[styles.rowName, selected && styles.rowNameSelected]}
                          numberOfLines={1}
                        >
                          {preset.name}
                        </Text>
                        <Text style={styles.rowDesc} numberOfLines={1}>
                          {rulesSummary(preset.prompt)}
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
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.smallGhost, pressed && styles.pressed]}
                          >
                            <Text style={styles.smallGhostText}>取消</Text>
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              removeTemplate(preset.id);
                            }}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={`确认删除模板 ${preset.name}`}
                            style={({ pressed }) => [styles.smallDanger, pressed && styles.pressed]}
                          >
                            <Text style={styles.smallDangerText}>删除</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.rowActions}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              if (editing) closeForms();
                              else startEdit(preset);
                            }}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={`编辑模板 ${preset.name}`}
                            style={({ pressed }) => [
                              styles.iconButton,
                              editing && styles.iconButtonActive,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={16}
                              color={editing ? colors.primary : colors.textMuted}
                            />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(preset.id);
                              if (editing) closeForms();
                            }}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={`删除模板 ${preset.name}`}
                            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                          </Pressable>
                          {selected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={colors.primary}
                              style={styles.check}
                            />
                          )}
                        </View>
                      )}
                    </Pressable>

                    {editing && (
                      <TemplateEditor
                        {...editorProps}
                        title="编辑模板"
                        saveLabel="保存"
                        onSave={saveEdit}
                      />
                    )}
                  </View>
                );
              })}

              {templates.length === 0 && !adding && (
                <View style={styles.empty}>
                  <Ionicons name="albums-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>还没有模板</Text>
                  <Text style={styles.emptyHint}>点下方「添加模板」新建一个</Text>
                </View>
              )}

              {adding ? (
                <View style={[styles.item, styles.itemSelected]}>
                  <TemplateEditor
                    {...editorProps}
                    title="添加模板"
                    saveLabel="保存模板"
                    onSave={saveAdd}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={startAdd}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addText}>添加模板</Text>
                </Pressable>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingTop: 18,
    paddingBottom: 12,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  item: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  itemSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  rowNameSelected: {
    color: colors.primary,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: colors.surface,
  },
  check: {
    marginLeft: 2,
  },
  deleteConfirm: {
    flexDirection: 'row',
    gap: 6,
  },
  smallGhost: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallGhostText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  smallDanger: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  editor: {
    margin: 8,
    marginTop: 0,
    padding: 12,
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryBorder,
  },
  editorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  counter: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  optional: {
    fontSize: 11,
    color: colors.textMuted,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inputError: {
    borderColor: colors.danger,
  },
  rulesInput: {
    height: 96,
    paddingTop: 10,
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  ghostButton: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryBorder,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.55,
  },
});
