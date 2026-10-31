import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extractTasksFromImage } from '@/ai/extract';
import { commitImport, draftsOf } from '@/ai/import';
import { getPreset, presetDisplayName } from '@/ai/presets';
import { getProvider } from '@/ai/providers';
import { useAiSettings } from '@/ai/settings';
import type { ExtractedTask } from '@/ai/types';
import { useTasks } from '@/data/tasks-context';
import { AiSettingsModal } from './ai-settings-modal';
import { ImportConfirmModal } from './import-confirm-modal';
import { PresetModal } from './preset-modal';

const ACCENT = '#4F46E5';

/** 导入模式选项:自动直接写入 / 手动弹窗确认 */
const MODE_OPTIONS = [
  { value: true, label: '自动导入' },
  { value: false, label: '手动确认' },
] as const;

/** 已选图片的展示信息(原始 uri 供预览,提取阶段再压缩转 base64) */
interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/** 任务载入模块主界面:选图/拍照 + 预览 + AI 提取任务 */
export function TaskImportScreen() {
  const { settings, updateSettings } = useAiSettings();
  const { addTask } = useTasks();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractedTask[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const preset = getPreset(settings.presetId);
  const presetName = presetDisplayName(preset, settings.presetNames);

  /** 从相册选图:图库在安卓/Web 无需权限,iOS 由系统弹窗处理 */
  const pickFromLibrary = async () => {
    setError('');
    setImportNote('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height });
    }
  };

  /** 拍照:相机必须用户授权,拒绝时提示且不覆盖已选图片 */
  const takePhoto = async () => {
    setError('');
    setImportNote('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('相机权限被拒绝,无法拍照;可以改用「从相册选择」');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height });
    }
  };

  /** AI 提取:压缩图片 → 视觉服务 → 归一化,成功后弹出结果列表 */
  const runExtraction = async () => {
    if (!image || extracting) return;
    setError('');
    setImportNote('');
    setExtracting(true);
    try {
      const provider = getProvider(settings.providerId);
      if (!provider.mock && !settings.apiKey) {
        throw new Error('请先在右上角设置中填写 API Key');
      }
      const tasks = await extractTasksFromImage(provider, settings.apiKey, image, preset.prompt);
      // 自动导入模式:直接归一化写入,不弹确认列表
      if (settings.autoImport) {
        const count = commitImport(draftsOf(tasks, new Date()), addTask);
        setImportNote(
          count > 0 ? `已自动导入 ${count} 条任务,到「每日任务」查看` : '没有识别到可导入的任务',
        );
        return;
      }
      setResult(tasks);
      setResultOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提取失败,请重试');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {/* 第一行:左上角预设选择器 + 右上角设置 */}
        <View style={styles.topRow}>
          <Pressable style={styles.presetChip} onPress={() => setPresetOpen(true)} hitSlop={4}>
            <Text style={styles.presetChipText} numberOfLines={1}>
              {preset.icon} {presetName} ▾
            </Text>
          </Pressable>
          <Pressable style={styles.gearButton} onPress={() => setSettingsOpen(true)} hitSlop={8}>
            <Text style={styles.gearText}>⚙️</Text>
          </Pressable>
        </View>

        {/* 第二行:标题 + 导入模式开关 */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>任务载入</Text>
          <View style={styles.modeSwitch}>
            {MODE_OPTIONS.map((opt) => {
              const active = settings.autoImport === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => updateSettings({ ...settings, autoImport: opt.value })}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                  hitSlop={4}
                >
                  <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.subtitle}>拍一张照片,自动变成当天计划</Text>
      </View>

      {image ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
        </View>
      ) : (
        <Pressable style={styles.dropZone} onPress={pickFromLibrary}>
          <Text style={styles.dropIcon}>🖼️</Text>
          <Text style={styles.dropTitle}>选择图片或拍照</Text>
          <Text style={styles.dropDesc}>
            课程表、通知截图、手写日程……{'\n'}AI 帮你提取成一条条任务
          </Text>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={pickFromLibrary}>
          <Text style={styles.secondaryText}>{image ? '重新选择' : '从相册选择'}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={takePhoto}>
          <Text style={styles.secondaryText}>拍照</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, styles.primaryButton, (!image || extracting) && styles.buttonDisabled]}
        disabled={!image || extracting}
        onPress={runExtraction}
      >
        {extracting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.primaryText}>识别中…</Text>
          </View>
        ) : (
          <Text style={styles.primaryText}>✨ AI 提取任务</Text>
        )}
      </Pressable>
      {!image && <Text style={styles.hint}>选好图片后点「AI 提取任务」开始识别</Text>}
      {importNote ? <Text style={styles.importNote}>{importNote}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ImportConfirmModal
        visible={resultOpen}
        tasks={result}
        onClose={() => setResultOpen(false)}
        onImport={(count) => setImportNote(`已导入 ${count} 条任务,到「每日任务」查看`)}
      />
      <AiSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PresetModal visible={presetOpen} onClose={() => setPresetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetChip: {
    height: 28,
    maxWidth: '72%',
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: ACCENT,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 13,
    padding: 2,
  },
  modeChip: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: ACCENT,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearText: {
    fontSize: 18,
  },
  dropZone: {
    flex: 1,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  dropIcon: {
    fontSize: 44,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dropDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  previewWrap: {
    flex: 1,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  preview: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: ACCENT,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
  },
  importNote: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginTop: 8,
  },
});
