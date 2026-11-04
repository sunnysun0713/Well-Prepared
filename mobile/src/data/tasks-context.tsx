import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelTaskReminder, syncTaskReminder } from '@/notifications';
import { pullState, pushState, syncEnabled } from './sync';
import { buildInitialTasks, dateKeyOf, isSpanTask, spanCoversDate, type Task, type TasksState } from './tasks';

/** 本地存档键;数据结构变化时改版本号,避免读到旧格式 */
const STORAGE_KEY = 'tasks-state-v1';
/** 存档修改时间戳键:云同步冲突判定用,与任务存档分开存,不改存档格式 */
const UPDATED_AT_KEY = 'tasks-updatedAt-v1';

type Action =
  | { type: 'REPLACE'; state: TasksState }
  | { type: 'ADD_TASK'; dateKey: string; task: Task }
  | { type: 'UPDATE_TASK'; id: string; patch: Partial<Omit<Task, 'id'>>; moveToDateKey?: string }
  | { type: 'DELETE_TASK'; id: string };

function reducer(state: TasksState, action: Action): TasksState {
  switch (action.type) {
    case 'REPLACE':
      return action.state;
    case 'ADD_TASK':
      return { ...state, [action.dateKey]: [...(state[action.dateKey] ?? []), action.task] };
    case 'UPDATE_TASK': {
      const { id, patch, moveToDateKey } = action;
      let sourceKey: string | null = null;
      let current: Task | null = null;
      for (const [key, tasks] of Object.entries(state)) {
        const found = tasks.find((t) => t.id === id);
        if (found) {
          sourceKey = key;
          current = found;
          break;
        }
      }
      if (!current || sourceKey === null) return state;
      const updated: Task = { ...current, ...patch };
      // 起始日期变化(仅跨多天任务)时把任务移到新的日期分组
      if (moveToDateKey && moveToDateKey !== sourceKey) {
        const next: TasksState = { ...state };
        const remain = state[sourceKey].filter((t) => t.id !== id);
        if (remain.length > 0) next[sourceKey] = remain;
        else delete next[sourceKey];
        next[moveToDateKey] = [...(next[moveToDateKey] ?? []), updated];
        return next;
      }
      return {
        ...state,
        [sourceKey]: state[sourceKey].map((t) => (t.id === id ? updated : t)),
      };
    }
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
  /** 某天的短时任务(长时任务只在「长时任务」面板展示),按起始时间升序 */
  getTasks: (date: Date) => Task[];
  /** 覆盖某天的跨多天任务,按开始日期升序 */
  getSpanTasks: (date: Date) => Task[];
  /** 在指定日期新增任务 */
  addTask: (date: Date, task: Task) => void;
  /** 按任务 id 更新;跨多天任务改变开始日期时传 moveToDateKey 迁移分组 */
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>, moveToDateKey?: string) => void;
  /** 按任务 id 删除 */
  deleteTask: (id: string) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/** 重排某状态下全部任务的提醒(启动水合与云端合并后共用) */
function resyncAllReminders(state: TasksState): void {
  for (const [key, tasks] of Object.entries(state)) {
    for (const task of tasks) void syncTaskReminder(key, task);
  }
}

/** 任务状态提供者:AsyncStorage 本地持久化;配置云同步后与云端按时间戳取新合并 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialTasks);
  // 本地存档读取完成后才允许回写,避免用示例数据覆盖存档
  const [hydrated, setHydrated] = useState(false);
  // 存档最后修改时间戳:云同步冲突判定用
  const [updatedAt, setUpdatedAt] = useState(0);
  // 云端合并引起的状态替换跳过一次上传,避免把自己刚拉下来的数据又推回去
  const skipPushRef = useRef(false);
  // 上传防抖计时器
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 启动时读取本地存档;已配置云同步时与云端合并(时间戳取新)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        raw = null;
      }
      let localState: TasksState | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as TasksState;
          dispatch({ type: 'REPLACE', state: parsed });
          localState = parsed;
          // 启动时按存档重排全部提醒(覆盖本功能上线前只存了数字的旧任务)
          resyncAllReminders(parsed);
        } catch {
          // 存档损坏时继续使用示例数据
        }
      }
      let localUpdatedAt = 0;
      try {
        const rawUpdatedAt = await AsyncStorage.getItem(UPDATED_AT_KEY);
        const n = Number(rawUpdatedAt);
        if (rawUpdatedAt && Number.isFinite(n) && n > 0) localUpdatedAt = n;
      } catch {
        // 读不到时间戳按旧存档处理,下方顺延为当前时间
      }
      // 本功能上线前的存档没有时间戳:视为刚修改过,避免被云端旧数据覆盖
      if (localState && localUpdatedAt === 0) {
        localUpdatedAt = Date.now();
      }
      setUpdatedAt(localUpdatedAt);

      if (!cancelled && syncEnabled()) {
        const remote = await pullState();
        if (!cancelled) {
          if (!remote) {
            // 云端暂无数据:上传本地存档
            if (localState) void pushState(localState, localUpdatedAt);
          } else if (remote.updatedAt > localUpdatedAt) {
            // 云端较新:整体替换本地并重排提醒,跳过本次上传
            const remoteState = remote.state as TasksState;
            dispatch({ type: 'REPLACE', state: remoteState });
            setUpdatedAt(remote.updatedAt);
            resyncAllReminders(remoteState);
            skipPushRef.current = true;
          } else if (localState) {
            // 本地较新或时间戳相同:以上传本地为准
            void pushState(localState, localUpdatedAt);
          }
        }
      }
      if (!cancelled) setHydrated(true);
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

  // 时间戳变化时持久化(用户操作与水合时都会走到)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(UPDATED_AT_KEY, String(updatedAt)).catch(() => {
      // 保存失败不影响本次使用,下次变更时重试
    });
  }, [hydrated, updatedAt]);

  // 状态或时间戳变化时防抖上传云端;云端按时间戳取新,旧数据不会覆盖新数据
  useEffect(() => {
    if (!hydrated) return;
    // 云端合并标记只消费一次,未配置云同步时也顺手清掉
    skipPushRef.current = false;
    if (!syncEnabled() || updatedAt <= 0) return;
    pushTimerRef.current = setTimeout(() => {
      void pushState(state, updatedAt);
    }, 2000);
    return () => {
      if (pushTimerRef.current !== null) clearTimeout(pushTimerRef.current);
    };
  }, [hydrated, state, updatedAt]);

  const getTasks = useCallback(
    (date: Date) => {
      // 长时任务只出现在「长时任务」面板,当日列表只展示短时任务
      const direct = state[dateKeyOf(date)] ?? [];
      return direct
        .filter((task) => !isSpanTask(task))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    [state],
  );

  /** 覆盖某天的跨多天任务(用于「剩余时间」面板) */
  const getSpanTasks = useCallback(
    (date: Date) => {
      const result: Task[] = [];
      const seen = new Set<string>();
      for (const tasks of Object.values(state)) {
        for (const task of tasks) {
          if (seen.has(task.id) || !isSpanTask(task)) continue;
          if (spanCoversDate(task, date)) {
            seen.add(task.id);
            result.push(task);
          }
        }
      }
      return result.sort((a, b) =>
        (a.startDateKey ?? '').localeCompare(b.startDateKey ?? '') ||
        a.startTime.localeCompare(b.startTime),
      );
    },
    [state],
  );

  const addTask = useCallback((date: Date, task: Task) => {
    const key = dateKeyOf(date);
    dispatch({ type: 'ADD_TASK', dateKey: key, task });
    setUpdatedAt(Date.now());
    // 有提醒时排程本地通知(异步,不阻塞界面)
    void syncTaskReminder(key, task);
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id'>>, moveToDateKey?: string) => {
      dispatch({ type: 'UPDATE_TASK', id, patch, moveToDateKey });
      setUpdatedAt(Date.now());
      // 找到任务所属日期,按更新后的完整任务重排提醒;迁移分组时用新日期键
      for (const [key, tasks] of Object.entries(state)) {
        const current = tasks.find((t) => t.id === id);
        if (current) {
          void syncTaskReminder(moveToDateKey ?? key, { ...current, ...patch });
          break;
        }
      }
    },
    [state],
  );

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', id });
    setUpdatedAt(Date.now());
    void cancelTaskReminder(id);
  }, []);

  const value = useMemo(
    () => ({ getTasks, getSpanTasks, addTask, updateTask, deleteTask }),
    [getTasks, getSpanTasks, addTask, updateTask, deleteTask],
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
