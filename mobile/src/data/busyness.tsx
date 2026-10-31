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

/** 默认映射:1 个任务 1 级,2 个 2 级……5 个及以上 5 级 */
export const DEFAULT_BUSYNESS_THRESHOLDS = [1, 2, 3, 4, 5];

/** 繁忙度等级数量(1-5 级) */
export const BUSYNESS_LEVEL_COUNT = 5;

/** 各等级圆点颜色:绿 → 黄 → 橙 → 橙红 → 红 */
export const BUSYNESS_LEVEL_COLORS = [
  '#22C55E',
  '#EAB308',
  '#F97316',
  '#F4511E',
  '#DC2626',
] as const;

/** 等级(1-5)对应的圆点颜色;0 级用中性灰 */
export function busynessColorFor(level: number): string {
  if (level <= 0) return '#9CA3AF';
  return BUSYNESS_LEVEL_COLORS[Math.min(level, BUSYNESS_LEVEL_COUNT) - 1];
}

const STORAGE_KEY = 'busyness-thresholds-v1';

/** 校验阈值:5 个正整数且严格递增 */
export function isValidThresholds(values: number[]): boolean {
  if (values.length !== BUSYNESS_LEVEL_COUNT) return false;
  return values.every(
    (value, index) =>
      Number.isInteger(value) &&
      value >= 1 &&
      (index === 0 || value > values[index - 1]),
  );
}

interface BusynessContextValue {
  /** 第 i 项表示达到 i+1 级所需的最少任务数 */
  thresholds: number[];
  saveThresholds: (values: number[]) => void;
  /** 按任务数计算繁忙度等级(0-5) */
  levelFor: (count: number) => number;
}

const BusynessContext = createContext<BusynessContextValue | null>(null);

/** 繁忙度指标提供者:阈值持久化到本地 */
export function BusynessProvider({ children }: { children: ReactNode }) {
  const [thresholds, setThresholds] = useState<number[]>(DEFAULT_BUSYNESS_THRESHOLDS);
  const [hydrated, setHydrated] = useState(false);

  // 启动时读取阈值
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (
            Array.isArray(parsed) &&
            isValidThresholds(parsed.filter((n): n is number => typeof n === 'number'))
          ) {
            setThresholds(parsed as number[]);
          }
        }
      } catch {
        // 存档损坏时使用默认阈值
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 阈值变化时保存
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds)).catch(() => {
      // 保存失败不影响本次使用
    });
  }, [hydrated, thresholds]);

  const saveThresholds = useCallback((values: number[]) => {
    if (isValidThresholds(values)) setThresholds(values);
  }, []);

  const levelFor = useCallback(
    (count: number): number => {
      let level = 0;
      thresholds.forEach((threshold, index) => {
        if (count >= threshold) level = index + 1;
      });
      return Math.min(level, BUSYNESS_LEVEL_COUNT);
    },
    [thresholds],
  );

  const value = useMemo(
    () => ({ thresholds, saveThresholds, levelFor }),
    [thresholds, saveThresholds, levelFor],
  );

  return <BusynessContext.Provider value={value}>{children}</BusynessContext.Provider>;
}

export function useBusyness(): BusynessContextValue {
  const ctx = useContext(BusynessContext);
  if (!ctx) {
    throw new Error('useBusyness 必须在 BusynessProvider 内使用');
  }
  return ctx;
}
