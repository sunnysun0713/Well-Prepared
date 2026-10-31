import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extractTasksFromImage } from '@/ai/extract';
import { getProvider } from '@/ai/providers';
import { useAiSettings } from '@/ai/settings';
import type { ExtractedTask } from '@/ai/types';
import { AiSettingsModal } from './ai-settings-modal';
import { ImportConfirmModal } from './import-confirm-modal';

const ACCENT = '#4F46E5';

/** 已选图片的展示信息(原始 uri 供预览,提取阶段再压缩转 base64) */
interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/** 任务载入模块主界面:选图/拍照 + 预览 + AI 提取任务 */
export function TaskImportScreen() {
  const { settings } = useAiSettings();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractedTask[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      const tasks = await extractTasksFromImage(provider, settings.apiKey, image);
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
        <View style={styles.headerText}>
          <Text style={styles.title}>任务载入</Text>
          <Text style={styles.subtitle}>拍一张照片,自动变成当天计划</Text>
        </View>
        <Pressable style={styles.gearButton} onPress={() => setSettingsOpen(true)} hitSlop={8}>
          <Text style={styles.gearText}>⚙️</Text>
        </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
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
