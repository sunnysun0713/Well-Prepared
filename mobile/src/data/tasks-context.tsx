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
import { buildInitialTasks, dateKeyOf, type Task } from './tasks';

/** 本地存档键;数据结构变化时改版本号,避免读到旧格式 */
const STORAGE_KEY = 'tasks-state-v1';

/** 任务状态:按日期键分组 */
type TasksState = Record<string, Task[]>;

type Action =
  | { type: 'REPLACE'; state: TasksState }
  | { type: 'ADD_TASK'; dateKey: string; task: Task }
  | { type: 'UPDATE_TASK'; id: string; patch: Partial<Omit<Task, 'id'>> }
  | { type: 'DELETE_TASK'; id: string };

function reducer(state: TasksState, action: Action): TasksState {
  switch (action.type) {
    case 'REPLACE':
      return action.state;
    case 'ADD_TASK':
      return { ...state, [action.dateKey]: [...(state[action.dateKey] ?? []), action.task] };
    case 'UPDATE_TASK':
      return Object.fromEntries(
        Object.entries(state).map(([key, tasks]) => [
          key,
          tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
        ]),
      );
    case 'DELETE_TASK':
      // 删除后为空的日期键一并移除,保持存档整洁
      return Object.fromEntries(
        Object.entries(state)
          .map(([key, tasks]) => [key, tasks.filter((t) => t.id !== action.id)] as const)
          .filter(([, tasks]) => tasks.length > 0),
      );
  }
}

interface TasksContextValue {
  /** 某天的任务,按起始时间升序 */
  getTasks: (date: Date) => Task[];
  /** 在指定日期新增任务 */
  addTask: (date: Date, task: Task) => void;
  /** 按任务 id 更新(标题/时间/备注/提醒等) */
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  /** 按任务 id 删除 */
  deleteTask: (id: string) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/** 任务状态提供者:AsyncStorage 本地持久化,重启后修改依然保留 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialTasks);
  // 本地存档读取完成后才允许回写,避免用示例数据覆盖存档
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
          dispatch({ type: 'REPLACE', state: JSON.parse(raw) });
        } catch {
          // 存档损坏时继续使用示例数据
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 状态变化时自动保存
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // 保存失败不影响本次使用,下次变更时重试
    });
  }, [hydrated, state]);

  const getTasks = useCallback(
    (date: Date) =>
      (state[dateKeyOf(date)] ?? [])
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [state],
  );

  const addTask = useCallback(
    (date: Date, task: Task) => dispatch({ type: 'ADD_TASK', dateKey: dateKeyOf(date), task }),
    [],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id'>>) => dispatch({ type: 'UPDATE_TASK', id, patch }),
    [],
  );

  const deleteTask = useCallback(
    (id: string) => dispatch({ type: 'DELETE_TASK', id }),
    [],
  );

  const value = useMemo(
    () => ({ getTasks, addTask, updateTask, deleteTask }),
    [getTasks, addTask, updateTask, deleteTask],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks 必须在 TasksProvider 内使用');
  }
  return ctx;
}
