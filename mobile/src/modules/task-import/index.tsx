import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { extractTasksFromImage } from '@/ai/extract';
import { commitImport, draftsOf } from '@/ai/import';
import { getProvider } from '@/ai/providers';
import { useAiSettings } from '@/ai/settings';
import type { ExtractedTask } from '@/ai/types';
import { ChipButton } from '@/components/ChipButton';
import { useTasks } from '@/data/tasks-context';
import { colors, radius, shadow } from '@/theme';
import { AiSettingsModal } from './ai-settings-modal';
import { ImportConfirmModal } from './import-confirm-modal';
import { ImportReminderModal } from './import-reminder-modal';
import { PresetModal } from './preset-modal';

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
  const [images, setImages] = useState<PickedImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewRef = useRef<ScrollViewInstance>(null);
  // 进行中的识别请求,取消时统一中断
  const abortRef = useRef<AbortController | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  // 预览区宽度:先按窗口估算,布局完成后用实际宽度校正(避免滚动条/内边距造成错位)
  const [previewWidth, setPreviewWidth] = useState(Math.max(1, windowWidth - 32));
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractedTask[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const preset =
    settings.templates.find((template) => template.id === settings.presetId) ??
    settings.templates[0];
  const planOn =
    settings.importReminderMinutes != null || settings.importSmsRemindMinutes != null;

  /** 提示条透明度:出现 5s 后淡出并清空提示(useState 惰性创建,实例跨渲染稳定) */
  const [noticesOpacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!error && !importNote) {
      noticesOpacity.setValue(1);
      return;
    }
    noticesOpacity.setValue(1);
    const timer = setTimeout(() => {
      Animated.timing(noticesOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setError('');
          setImportNote('');
        }
      });
    }, 5000);
    return () => {
      clearTimeout(timer);
      noticesOpacity.stopAnimation();
    };
  }, [error, importNote, noticesOpacity]);

  /** 从相册选图:支持多选,整批替换当前已选图片 */
  const pickFromLibrary = async () => {
    setError('');
    setImportNote('');
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });
    if (!picked.canceled && picked.assets.length > 0) {
      setImages(
        picked.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height })),
      );
      setPreviewIndex(0);
      previewRef.current?.scrollTo({ x: 0, animated: false });
    }
  };

  /** 拍照:必须用户授权,拒绝时提示且不覆盖已选图片;拍到的照片追加到已选列表 */
  const takePhoto = async () => {
    setError('');
    setImportNote('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('相机权限被拒绝,无法拍照;可以改用「从相册选择」');
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!shot.canceled && shot.assets[0]) {
      const a = shot.assets[0];
      const nextIndex = images.length;
      setImages((prev) => [...prev, { uri: a.uri, width: a.width, height: a.height }]);
      setPreviewIndex(nextIndex);
      // 等新页面渲染后再滑到刚拍的照片
      setTimeout(() => {
        previewRef.current?.scrollTo({ x: nextIndex * previewWidth, animated: true });
      }, 60);
    }
  };

  /** 取消正在进行的识别:中断所有图片请求,保留已选图片方便重试 */
  const cancelExtraction = () => {
    abortRef.current?.abort();
  };

  /** AI 提取:逐张压缩图片 → 视觉服务 → 归一化,合并所有图片的任务后走导入流程 */
  const runExtraction = async () => {
    if (images.length === 0 || extracting) return;
    setError('');
    setImportNote('');
    setExtracting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const provider = getProvider(settings.providerId, settings.customModel);
      const apiKey = settings.apiKeys[settings.providerId] ?? '';
      if (!apiKey) {
        throw new Error('请先在右上角设置中填写当前服务的 API Key');
      }
      if (!preset) {
        throw new Error('请先在「模板」中添加一个提取模板');
      }
      const results = await Promise.all(
        images.map((img) =>
          extractTasksFromImage(provider, apiKey, img, preset.prompt, controller.signal),
        ),
      );
      const tasks = results.flat();
      if (controller.signal.aborted) {
        setImportNote('已取消本次识别');
        return;
      }
      // 自动导入模式:直接归一化写入,不弹确认列表
      if (settings.autoImport) {
        const count = commitImport(draftsOf(tasks, new Date()), addTask, {
          remindAdvanceMinutes: settings.importReminderMinutes,
          remindSound: settings.importReminderSound,
          smsRemindAdvanceMinutes: settings.importSmsRemindMinutes,
          smsRemindSound: settings.importSmsRemindSound,
        });
        setImportNote(
          count > 0 ? `已自动导入 ${count} 条任务,到「每日任务」查看` : '没有识别到可导入的任务',
        );
        return;
      }
      if (tasks.length === 0) {
        setImportNote('没有识别到可导入的任务');
        return;
      }
      setResult(tasks);
      setResultOpen(true);
    } catch (e) {
      if (controller.signal.aborted) {
        setImportNote('已取消本次识别');
        return;
      }
      setError(e instanceof Error ? e.message : '提取失败,请重试');
    } finally {
      setExtracting(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const canExtract = images.length > 0 && !extracting;

  return (
    <View style={styles.root}>
      {/* 标题区:标题 + 副标题,右上角 AI 设置 */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>任务载入</Text>
          <Text style={styles.subtitle}>拍一张照片,自动变成当天计划</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => setSettingsOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="AI 设置"
        >
          <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* 工具条:模板 / 规划 / 导入模式 */}
      <View style={styles.toolbar}>
        <ChipButton
          icon="albums-outline"
          label={preset?.name ?? '模板'}
          active={presetOpen}
          expandable
          onPress={() => setPresetOpen(true)}
          accessibilityLabel={`选择模板,当前 ${preset?.name ?? '无'}`}
          style={styles.presetChip}
        />
        <Pressable
          style={({ pressed }) => [
            styles.toolChip,
            planOn && styles.toolChipWarning,
            pressed && styles.pressed,
          ]}
          onPress={() => setReminderOpen(true)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={planOn ? '规划:已开启导入提醒' : '规划:未开启导入提醒'}
        >
          <Ionicons
            name="alarm-outline"
            size={14}
            color={planOn ? colors.warningText : colors.textSecondary}
          />
          <Text style={[styles.toolChipText, planOn && styles.toolChipTextWarning]}>规划</Text>
        </Pressable>

        <View style={styles.spacer} />

        <View style={styles.modeSwitch} accessibilityRole="tablist">
          {MODE_OPTIONS.map((opt) => {
            const active = settings.autoImport === opt.value;
            return (
              <Pressable
                key={opt.label}
                onPress={() => updateSettings({ ...settings, autoImport: opt.value })}
                style={[styles.modeChip, active && styles.modeChipActive]}
                hitSlop={4}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 中间区域:选图/预览;提示浮动在其上方(绝对定位覆盖,不挤压布局) */}
      <View style={styles.middle}>
        {error || importNote ? (
          <Animated.View
            style={[styles.noticesTop, { opacity: noticesOpacity }]}
            pointerEvents="none"
          >
            {importNote ? (
              <View style={[styles.notice, styles.noticeSuccess]}>
                <Ionicons name="checkmark-done-outline" size={15} color={colors.success} />
                <Text style={[styles.noticeText, { color: colors.success }]}>{importNote}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={[styles.notice, styles.noticeError]} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={[styles.noticeText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {images.length > 0 ? (
          <View
            style={styles.previewWrap}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - previewWidth) > 0.5) setPreviewWidth(w);
            }}
          >
            <ScrollView
              ref={previewRef}
              horizontal
              pagingEnabled
              snapToInterval={previewWidth}
              decelerationRate="fast"
              // 松手后只翻相邻一页,避免快速滑动一次跳过多张
              disableIntervalMomentum
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              style={styles.previewPager}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / previewWidth);
                setPreviewIndex(Math.min(Math.max(idx, 0), images.length - 1));
              }}
            >
              {images.map((img, index) => (
                <View
                  key={`${img.uri}-${index}`}
                  style={{ width: previewWidth, height: '100%' }}
                >
                  <Image
                    source={{ uri: img.uri }}
                    style={styles.preview}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.previewCounter} pointerEvents="none">
              <Text style={styles.previewCounterText}>
                {Math.min(previewIndex + 1, images.length)} / {images.length}
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.dropZone, pressed && styles.dropZonePressed]}
            onPress={pickFromLibrary}
            accessibilityRole="button"
            accessibilityLabel="从相册选择图片"
          >
            <View style={styles.dropIconWrap}>
              <Ionicons name="scan-outline" size={34} color={colors.primary} />
            </View>
            <Text style={styles.dropTitle}>选择图片(可多选)或拍照</Text>
            <Text style={styles.dropDesc}>
              可一次选择多张,左右滑动预览{'\n'}课程表、通知截图、手写日程……AI 帮你提取成任务
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
          onPress={pickFromLibrary}
          accessibilityRole="button"
        >
          <Ionicons name="images-outline" size={17} color={colors.text} />
          <Text style={styles.secondaryText}>
            {images.length > 0 ? '重新选择' : '从相册选择'}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
          onPress={takePhoto}
          accessibilityRole="button"
        >
          <Ionicons name="camera-outline" size={17} color={colors.text} />
          <Text style={styles.secondaryText}>拍照</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          extracting ? styles.cancelExtractButton : styles.primaryButton,
          !extracting && !canExtract && styles.buttonDisabled,
          pressed && !extracting && canExtract && styles.primaryPressed,
        ]}
        disabled={!extracting && !canExtract}
        onPress={extracting ? cancelExtraction : runExtraction}
        accessibilityRole="button"
        accessibilityLabel={extracting ? '取消本次识别' : 'AI 提取任务'}
        accessibilityState={{ disabled: !extracting && !canExtract, busy: extracting }}
      >
        {extracting ? (
          <>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[styles.primaryText, styles.cancelExtractText]}>取消本次识别</Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles" size={17} color={colors.onPrimary} />
            <Text style={styles.primaryText}>AI 提取任务</Text>
          </>
        )}
      </Pressable>

      <View style={styles.feedback}>
        {images.length === 0 && !error && !importNote ? (
          <Text style={styles.hint}>选好图片后点「AI 提取任务」开始识别</Text>
        ) : null}
      </View>

      <ImportConfirmModal
        visible={resultOpen}
        tasks={result}
        onClose={() => setResultOpen(false)}
        onImport={(count) => setImportNote(`已导入 ${count} 条任务,到「每日任务」查看`)}
      />
      <AiSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PresetModal visible={presetOpen} onClose={() => setPresetOpen(false)} />
      <ImportReminderModal visible={reminderOpen} onClose={() => setReminderOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 18,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  spacer: {
    flex: 1,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 1,
  },
  presetChip: {
    maxWidth: 150,
  },
  toolChipWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  toolChipTextWarning: {
    color: colors.warningText,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 3,
  },
  modeChip: {
    height: 24,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  modeChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  middle: {
    flex: 1,
    marginTop: 16,
  },
  dropZone: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  dropZonePressed: {
    backgroundColor: colors.primarySoft,
  },
  dropIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dropDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewWrap: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  preview: {
    flex: 1,
  },
  previewPager: {
    flex: 1,
  },
  previewCounter: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  previewCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    gap: 6,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    ...shadow.raised,
  },
  cancelExtractButton: {
    marginTop: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cancelExtractText: {
    color: colors.textSecondary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  feedback: {
    minHeight: 40,
    marginTop: 10,
    gap: 6,
  },
  noticesTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 2,
    gap: 6,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  noticeSuccess: {
    backgroundColor: colors.successSoft,
  },
  noticeError: {
    backgroundColor: colors.dangerSoft,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.6,
  },
});
