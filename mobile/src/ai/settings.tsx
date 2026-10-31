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

/** AI 设置:所选视觉服务 + API key + 提取后导入模式;数据结构变化时改版本号 */
export interface AiSettings {
  providerId: string;
  apiKey: string;
  /** true = 提取后直接写入任务;false = 弹确认列表由用户勾选 */
  autoImport: boolean;
}

const STORAGE_KEY = 'ai-settings-v1';
const DEFAULT_SETTINGS: AiSettings = { providerId: 'mock', apiKey: '', autoImport: false };

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
          const parsed = JSON.parse(raw) as Partial<AiSettings>;
          dispatch({
            type: 'REPLACE',
            settings: {
              providerId:
                typeof parsed.providerId === 'string' ? parsed.providerId : DEFAULT_SETTINGS.providerId,
              apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
              autoImport:
                typeof parsed.autoImport === 'boolean' ? parsed.autoImport : DEFAULT_SETTINGS.autoImport,
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
