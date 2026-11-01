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
import { buildInitialTasks, dateKeyOf, type Task, type TasksState } from './tasks';

/** 本地存档键;数据结构变化时改版本号,避免读到旧格式 */
const STORAGE_KEY = 'tasks-state-v1';
/** 存档修改时间戳键:云同步冲突判定用,与任务存档分开存,不改存档格式 */
const UPDATED_AT_KEY = 'tasks-updatedAt-v1';

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
    (date: Date) =>
      (state[dateKeyOf(date)] ?? [])
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
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
    (id: string, patch: Partial<Omit<Task, 'id'>>) => {
      dispatch({ type: 'UPDATE_TASK', id, patch });
      setUpdatedAt(Date.now());
      // 找到任务所属日期,按更新后的完整任务重排提醒
      for (const [key, tasks] of Object.entries(state)) {
        const current = tasks.find((t) => t.id === id);
        if (current) {
          void syncTaskReminder(key, { ...current, ...patch });
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
