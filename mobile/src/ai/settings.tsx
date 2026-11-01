import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER_SOUND } from '@/data/reminder-sounds';
import { DEFAULT_PRESET_ID, PRESETS, type ExtractionPreset } from './presets';
import { PROVIDERS } from './providers';

/** AI 设置:视觉服务 + API key + 导入模式 + 模板 + 导入时自动提醒;数据结构变化时改版本号 */
export interface AiSettings {
  providerId: string;
  apiKey: string;
  /** true = 提取后直接写入任务;false = 弹确认列表由用户勾选 */
  autoImport: boolean;
  /** 提取模板列表(内置模板与自定义模板都在这里,可增删) */
  templates: ExtractionPreset[];
  /** 当前使用的模板 id;模板被删空时为空串 */
  presetId: string;
  /** 导入任务时自动设置的闹钟提前分钟数;null 表示不自动设置 */
  importReminderMinutes: number | null;
  /** 导入任务时自动闹钟使用的铃声 id */
  importReminderSound: string;
  /** 导入任务时自动设置的短信提醒提前分钟数;null 表示不自动设置 */
  importSmsRemindMinutes: number | null;
  /** 导入任务时短信提醒使用的铃声 id */
  importSmsRemindSound: string;
}

const STORAGE_KEY = 'ai-settings-v1';

/** 内置模板副本,避免运行时改动污染常量 */
function defaultTemplates(): ExtractionPreset[] {
  return PRESETS.map((preset) => ({ ...preset }));
}

const DEFAULT_SETTINGS: AiSettings = {
  providerId: 'deepseek',
  apiKey: '',
  autoImport: false,
  templates: defaultTemplates(),
  presetId: DEFAULT_PRESET_ID,
  importReminderMinutes: null,
  importReminderSound: DEFAULT_REMINDER_SOUND,
  importSmsRemindMinutes: null,
  importSmsRemindSound: DEFAULT_REMINDER_SOUND,
};

/** 旧版本的预设改名表,用于迁移到模板列表 */
function parsePresetNames(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {};
  const names: Record<string, string> = {};
  for (const [id, name] of Object.entries(value)) {
    if (typeof name === 'string' && name.trim()) names[id] = name;
  }
  return names;
}

/** 校验存档中的模板数组;全部无效时返回 null,使用默认模板 */
function parseTemplates(value: unknown): ExtractionPreset[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return [];
  const templates: ExtractionPreset[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.id !== 'string' ||
      typeof raw.name !== 'string' ||
      typeof raw.prompt !== 'string'
    ) {
      continue;
    }
    templates.push({
      id: raw.id,
      name: raw.name,
      icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : '📄',
      prompt: raw.prompt,
    });
  }
  return templates.length > 0 ? templates : null;
}

type Action = { type: 'REPLACE'; settings: AiSettings };

function reducer(_state: AiSettings, action: Action): AiSettings {
  return action.settings;
}

interface AiSettingsContextValue {
  settings: AiSettings;
  updateSettings: (settings: AiSettings) => void;
}

const AiSettingsContext = createContext<AiSettingsContextValue | null>(null);

/** AI 设置提供者:AsyncStorage 持久化,重启后保留所选服务与 key */
export function AiSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, dispatch] = useReducer(reducer, DEFAULT_SETTINGS);
  // 本地存档读取完成后才允许回写,避免用默认设置覆盖存档
  const [hydrated, setHydrated] = useState(false);

  // 启动时读取本地存档
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        raw = null;
      }
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<AiSettings> & { presetNames?: unknown };
          const legacyNames = parsePresetNames(parsed.presetNames);
          const templates = parseTemplates(parsed.templates) ?? defaultTemplates().map(
            (preset) => ({ ...preset, name: legacyNames[preset.id] ?? preset.name }),
          );
          const presetId =
            typeof parsed.presetId === 'string' &&
            templates.some((template) => template.id === parsed.presetId)
              ? parsed.presetId
              : templates[0]?.id ?? '';
          dispatch({
            type: 'REPLACE',
            settings: {
              providerId:
                typeof parsed.providerId === 'string' &&
                PROVIDERS.some((provider) => provider.id === parsed.providerId)
                  ? parsed.providerId
                  : DEFAULT_SETTINGS.providerId,
              apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
              autoImport:
                typeof parsed.autoImport === 'boolean' ? parsed.autoImport : DEFAULT_SETTINGS.autoImport,
              templates,
              presetId,
              importReminderMinutes:
                typeof parsed.importReminderMinutes === 'number' &&
                Number.isInteger(parsed.importReminderMinutes) &&
                parsed.importReminderMinutes >= 0
                  ? parsed.importReminderMinutes
                  : null,
              importReminderSound:
                typeof parsed.importReminderSound === 'string'
                  ? parsed.importReminderSound
                  : DEFAULT_SETTINGS.importReminderSound,
              importSmsRemindMinutes:
                typeof parsed.importSmsRemindMinutes === 'number' &&
                Number.isInteger(parsed.importSmsRemindMinutes) &&
                parsed.importSmsRemindMinutes >= 0
                  ? parsed.importSmsRemindMinutes
                  : null,
              importSmsRemindSound:
                typeof parsed.importSmsRemindSound === 'string'
                  ? parsed.importSmsRemindSound
                  : DEFAULT_SETTINGS.importSmsRemindSound,
            },
          });
        } catch {
          // 存档损坏时继续使用默认设置
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 设置变化时自动保存
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {
      // 保存失败不影响本次使用,下次变更时重试
    });
  }, [hydrated, settings]);

  const updateSettings = useCallback(
    (s: AiSettings) => dispatch({ type: 'REPLACE', settings: s }),
    [],
  );

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <AiSettingsContext.Provider value={value}>{children}</AiSettingsContext.Provider>;
}

export function useAiSettings(): AiSettingsContextValue {
  const ctx = useContext(AiSettingsContext);
  if (!ctx) {
    throw new Error('useAiSettings 必须在 AiSettingsProvider 内使用');
  }
  return ctx;
}
