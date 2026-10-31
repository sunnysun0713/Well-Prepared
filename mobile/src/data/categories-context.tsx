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
import {
  CATEGORY_NAME_MAX_LENGTH,
  TASK_CATEGORIES,
  type TaskCategory,
} from './categories';

/** 分类存档:v2 同时保存自定义分类与全部标签顺序 */
const STORAGE_KEY = 'task-categories-v2';
/** 旧版只保存自定义分类数组,用于迁移 */
const LEGACY_KEY = 'task-categories-v1';

interface StoredCategories {
  custom: TaskCategory[];
  order: string[];
}

interface CategoriesContextValue {
  /** 内置 + 自定义分类,按用户拖动后的顺序排列 */
  categories: TaskCategory[];
  /** 新增自定义分类并返回它 */
  addCategory: (name: string, color: string) => TaskCategory;
  /** 删除自定义分类(内置分类不可删除) */
  removeCategory: (id: string) => void;
  /** 把分类从 from 移到 to */
  moveCategory: (from: number, to: number) => void;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

function isCategory(value: unknown): value is TaskCategory {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as TaskCategory).id === 'string' &&
    typeof (value as TaskCategory).name === 'string' &&
    typeof (value as TaskCategory).color === 'string'
  );
}

/** 合并存档顺序与现有分类:过滤失效 id,补齐遗漏项 */
function normalizeOrder(stored: string[], allIds: string[]): string[] {
  const valid = stored.filter((id) => allIds.includes(id));
  const missing = allIds.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

/** 分类提供者:内置分类固定,自定义分类与排序持久化到本地 */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [customCategories, setCustomCategories] = useState<TaskCategory[]>([]);
  const [order, setOrder] = useState<string[]>(TASK_CATEGORIES.map((c) => c.id));
  const [hydrated, setHydrated] = useState(false);

  // 启动时读取自定义分类与顺序(兼容旧版存档)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: StoredCategories | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (typeof parsed === 'object' && parsed !== null) {
            const data = parsed as Partial<StoredCategories>;
            stored = {
              custom: Array.isArray(data.custom) ? data.custom.filter(isCategory) : [],
              order: Array.isArray(data.order)
                ? data.order.filter((id): id is string => typeof id === 'string')
                : [],
            };
          }
        }
      } catch {
        stored = null;
      }

      // 没有 v2 存档时,尝试读取旧版自定义分类
      if (!stored) {
        try {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) {
            const parsed = JSON.parse(legacy) as unknown;
            if (Array.isArray(parsed)) {
              stored = { custom: parsed.filter(isCategory), order: [] };
            }
          }
        } catch {
          // 旧存档损坏时忽略
        }
      }

      if (cancelled) return;
      const custom = stored?.custom ?? [];
      setCustomCategories(custom);
      setOrder(
        normalizeOrder(stored?.order ?? [], [
          ...TASK_CATEGORIES.map((c) => c.id),
          ...custom.map((c) => c.id),
        ]),
      );
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 分类或顺序变化时保存
  useEffect(() => {
    if (!hydrated) return;
    const payload: StoredCategories = { custom: customCategories, order };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {
      // 保存失败不影响本次使用
    });
  }, [hydrated, customCategories, order]);

  const addCategory = useCallback((name: string, color: string): TaskCategory => {
    const category: TaskCategory = {
      id: `custom-${Date.now()}`,
      name: name.trim().slice(0, CATEGORY_NAME_MAX_LENGTH),
      color,
      custom: true,
    };
    setCustomCategories((prev) => [...prev, category]);
    setOrder((prev) => [...prev, category.id]);
    return category;
  }, []);

  const removeCategory = useCallback((id: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
    setOrder((prev) => prev.filter((categoryId) => categoryId !== id));
  }, []);

  const moveCategory = useCallback((from: number, to: number) => {
    setOrder((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const categories = useMemo(() => {
    const all = [...TASK_CATEGORIES, ...customCategories];
    const byId = new Map(all.map((c) => [c.id, c]));
    return order.map((id) => byId.get(id)).filter((c): c is TaskCategory => Boolean(c));
  }, [customCategories, order]);

  const value = useMemo(
    () => ({ categories, addCategory, removeCategory, moveCategory }),
    [categories, addCategory, removeCategory, moveCategory],
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories 必须在 CategoriesProvider 内使用');
  }
  return ctx;
}
