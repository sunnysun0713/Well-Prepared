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

/** 自定义分类存档键 */
const STORAGE_KEY = 'task-categories-v1';

interface CategoriesContextValue {
  /** 内置 + 自定义分类 */
  categories: TaskCategory[];
  /** 新增自定义分类并返回它 */
  addCategory: (name: string, color: string) => TaskCategory;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

/** 分类提供者:内置分类固定,自定义分类持久化到本地 */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [customCategories, setCustomCategories] = useState<TaskCategory[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 启动时读取自定义分类
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setCustomCategories(
              parsed.filter(
                (item): item is TaskCategory =>
                  typeof item === 'object' &&
                  item !== null &&
                  typeof (item as TaskCategory).id === 'string' &&
                  typeof (item as TaskCategory).name === 'string' &&
                  typeof (item as TaskCategory).color === 'string',
              ),
            );
          }
        }
      } catch {
        // 存档损坏时忽略,只保留内置分类
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 自定义分类变化时保存
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customCategories)).catch(() => {
      // 保存失败不影响本次使用
    });
  }, [hydrated, customCategories]);

  const addCategory = useCallback((name: string, color: string): TaskCategory => {
    const category: TaskCategory = {
      id: `custom-${Date.now()}`,
      name: name.trim().slice(0, CATEGORY_NAME_MAX_LENGTH),
      color,
      custom: true,
    };
    setCustomCategories((prev) => [...prev, category]);
    return category;
  }, []);

  const categories = useMemo(
    () => [...TASK_CATEGORIES, ...customCategories],
    [customCategories],
  );

  const value = useMemo(() => ({ categories, addCategory }), [categories, addCategory]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories 必须在 CategoriesProvider 内使用');
  }
  return ctx;
}
