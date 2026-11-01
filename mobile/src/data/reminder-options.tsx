import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 内置提醒档位(分钟) */
export const PRESET_REMINDER_MINUTES = [0, 10, 30, 60, 1440];

const STORAGE_KEY = 'reminder-options-v1';

/** 提醒时间文案:准时 / 提前N分钟 / 提前N小时 / 提前N天 */
export function reminderLabel(minutes: number): string {
  if (minutes === 0) return '准时';
  if (minutes % 1440 === 0) return `提前${minutes / 1440}天`;
  if (minutes % 60 === 0) return `提前${minutes / 60}小时`;
  return `提前${minutes}分钟`;
}

interface ReminderOptionsContextValue {
  /** 内置 + 自定义档位,按分钟升序 */
  options: number[];
  /** 新增自定义档位;重复或非法返回 false */
  addOption: (minutes: number) => boolean;
  /** 删除自定义档位(内置档位不可删除) */
  removeOption: (minutes: number) => void;
}

const ReminderOptionsContext = createContext<ReminderOptionsContextValue | null>(null);

/** 提醒档位提供者:自定义档位持久化到本地 */
export function ReminderOptionsProvider({ children }: { children: ReactNode }) {
  const [customOptions, setCustomOptions] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // 读取成功才允许回写;读取失败(非损坏)时禁止写,避免用空数据覆盖仍有内容的存档
  const [persistable, setPersistable] = useState(false);

  // 启动时读取自定义档位
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          setPersistable(true);
          if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed)) {
              const stored = parsed.filter(
                (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0,
              );
              // 与水合前用户已添加的档位合并,避免覆盖
              setCustomOptions((prev) => [...new Set([...prev, ...stored])]);
            }
          }
        }
      } catch {
        // 读取失败:不启用回写,避免覆盖存档
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 自定义档位变化时保存
  useEffect(() => {
    if (!hydrated || !persistable) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customOptions)).catch(() => {
      // 保存失败不影响本次使用
    });
  }, [hydrated, persistable, customOptions]);

  const options = useMemo(() => {
    const all = new Set<number>([...PRESET_REMINDER_MINUTES, ...customOptions]);
    return [...all].sort((a, b) => a - b);
  }, [customOptions]);

  const addOption = useCallback(
    (minutes: number): boolean => {
      if (!Number.isInteger(minutes) || minutes < 0) return false;
      if (options.includes(minutes)) return false;
      setCustomOptions((prev) => [...prev, minutes]);
      return true;
    },
    [options],
  );

  const removeOption = useCallback((minutes: number) => {
    if (PRESET_REMINDER_MINUTES.includes(minutes)) return;
    setCustomOptions((prev) => prev.filter((n) => n !== minutes));
  }, []);

  const value = useMemo(
    () => ({ options, addOption, removeOption }),
    [options, addOption, removeOption],
  );

  return (
    <ReminderOptionsContext.Provider value={value}>{children}</ReminderOptionsContext.Provider>
  );
}

export function useReminderOptions(): ReminderOptionsContextValue {
  const ctx = useContext(ReminderOptionsContext);
  if (!ctx) {
    throw new Error('useReminderOptions 必须在 ReminderOptionsProvider 内使用');
  }
  return ctx;
}
