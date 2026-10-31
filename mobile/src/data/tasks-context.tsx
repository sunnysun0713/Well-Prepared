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
import { useAccount } from '@/account/account-context';
import {
  createCloudTask,
  deleteCloudTask,
  fetchMyTasks,
  updateCloudTask,
  type CloudTaskRecord,
} from '@/cloud/tasks';
import { cancelTaskReminder, syncTaskReminder } from '@/notifications';
import { buildInitialTasks, dateKeyOf, type Task } from './tasks';

/** 本地存档键;数据结构变化时改版本号,避免读到旧格式 */
const STORAGE_KEY = 'tasks-state-v1';

/** 任务状态:按日期键分组 */
type TasksState = Record<string, Task[]>;

type Action =
  | { type: 'REPLACE'; state: TasksState }
  | { type: 'ADD_TASK'; dateKey: string; task: Task }
  | { type: 'UPDATE_TASK'; id: string; patch: Partial<Omit<Task, 'id'>> }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'CLEAR_CATEGORY'; categoryId: string }
  | { type: 'MERGE_REMOTE'; records: CloudTaskRecord[] };

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
    case 'CLEAR_CATEGORY':
      // 删除分类时,把使用该分类的任务改为无标签
      return Object.fromEntries(
        Object.entries(state).map(([key, tasks]) => [
          key,
          tasks.map((t) => {
            if (t.categoryId !== action.categoryId) return t;
            const next = { ...t };
            delete next.categoryId;
            return next;
          }),
        ]),
      );
    case 'MERGE_REMOTE': {
      // 云端记录覆盖本地同 remoteId/localId 的版本;软删除记录同时删除本地任务
      const next: TasksState = {};
      for (const [key, tasks] of Object.entries(state)) next[key] = tasks.slice();
      for (const record of action.records) {
        // 收藏标记暂不同步到云端,合并时保留本地已收藏状态
        let favorite: boolean | undefined;
        for (const key of Object.keys(next)) {
          const matched = next[key].find(
            (t) => t.remoteId === record.remoteId || t.id === record.localId,
          );
          if (matched?.favorite) favorite = true;
          const filtered = next[key].filter(
            (t) => t.remoteId !== record.remoteId && t.id !== record.localId,
          );
          if (filtered.length > 0) next[key] = filtered;
          else delete next[key];
        }
        if (record.deleted) continue;
        const task: Task = {
          id: record.localId || `${record.dateKey}-r${record.remoteId}`,
          remoteId: record.remoteId,
          title: record.title,
          startTime: record.startTime,
          endTime: record.endTime,
          note: record.note,
          done: record.done,
          remindAdvanceMinutes: record.remindAdvanceMinutes,
          categoryId: record.categoryId,
          favorite,
        };
        next[record.dateKey] = [...(next[record.dateKey] ?? []), task];
      }
      return next;
    }
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
  /** 从云端拉取并合并任务,返回云端记录数 */
  syncNow: () => Promise<number>;
  /** 把没有云端 id 的本地任务上传,返回上传条数 */
  uploadLocalTasks: () => Promise<number>;
  /** 删除分类时清除任务上的该分类标记 */
  clearCategory: (categoryId: string) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/** 任务状态提供者:AsyncStorage 本地持久化,重启后修改依然保留 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount();
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
          const parsed = JSON.parse(raw) as TasksState;
          dispatch({ type: 'REPLACE', state: parsed });
          // 启动时按存档重排全部提醒(覆盖本功能上线前只存了数字的旧任务)
          for (const [key, tasks] of Object.entries(parsed)) {
            for (const task of tasks) void syncTaskReminder(key, task);
          }
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
    (date: Date, task: Task) => {
      const key = dateKeyOf(date);
      dispatch({ type: 'ADD_TASK', dateKey: key, task });
      // 有提醒时排程本地通知(异步,不阻塞界面)
      void syncTaskReminder(key, task);
      // 已登录时同步到云端,成功后回填 remoteId
      if (user) {
        void createCloudTask(key, task)
          .then((remoteId) => {
            if (remoteId) {
              dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { remoteId } });
            }
          })
          .catch(() => {
            // 网络异常时保留本地任务,可稍后手动上传
          });
      }
    },
    [user],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id'>>) => {
      dispatch({ type: 'UPDATE_TASK', id, patch });
      // 找到任务所属日期,按更新后的完整任务重排提醒
      for (const [key, tasks] of Object.entries(state)) {
        const current = tasks.find((t) => t.id === id);
        if (current) {
          void syncTaskReminder(key, { ...current, ...patch });
          if (user && current.remoteId) {
            void updateCloudTask(current.remoteId, patch).catch(() => {
              // 云端更新失败时以本地为准,下次同步会覆盖
            });
          }
          break;
        }
      }
    },
    [state, user],
  );

  const deleteTask = useCallback(
    (id: string) => {
      let remoteId: string | undefined;
      for (const tasks of Object.values(state)) {
        const found = tasks.find((t) => t.id === id);
        if (found) {
          remoteId = found.remoteId;
          break;
        }
      }
      dispatch({ type: 'DELETE_TASK', id });
      void cancelTaskReminder(id);
      if (user && remoteId) {
        void deleteCloudTask(remoteId).catch(() => {
          // 云端删除失败时保留记录,下次同步仍会显示
        });
      }
    },
    [state, user],
  );

  /** 拉取云端任务并合并到本地 */
  const syncNow = useCallback(async () => {
    if (!user) return 0;
    const records = await fetchMyTasks();
    dispatch({ type: 'MERGE_REMOTE', records });
    return records.length;
  }, [user]);

  /** 上传没有云端 id 的本地任务 */
  const uploadLocalTasks = useCallback(async () => {
    if (!user) return 0;
    let count = 0;
    for (const [key, tasks] of Object.entries(state)) {
      for (const task of tasks) {
        if (task.remoteId) continue;
        try {
          const remoteId = await createCloudTask(key, task);
          if (remoteId) {
            dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { remoteId } });
            count += 1;
          }
        } catch {
          // 单条失败不影响其余任务
        }
      }
    }
    return count;
  }, [state, user]);

  /** 删除分类:清除任务上的标记,并同步云端 */
  const clearCategory = useCallback(
    (categoryId: string) => {
      dispatch({ type: 'CLEAR_CATEGORY', categoryId });
      if (!user) return;
      for (const tasks of Object.values(state)) {
        for (const task of tasks) {
          if (task.categoryId === categoryId && task.remoteId) {
            void updateCloudTask(task.remoteId, { categoryId: undefined }).catch(() => {
              // 云端更新失败时下次同步会覆盖
            });
          }
        }
      }
    },
    [state, user],
  );

  // 登录后自动拉取云端任务;等本地存档读取完成,避免合并结果被覆盖
  useEffect(() => {
    if (!user || !hydrated) return;
    void syncNow().catch(() => {
      // 网络异常时保持本地数据
    });
  }, [user, hydrated, syncNow]);

  const value = useMemo(
    () => ({
      getTasks,
      addTask,
      updateTask,
      deleteTask,
      syncNow,
      uploadLocalTasks,
      clearCategory,
    }),
    [getTasks, addTask, updateTask, deleteTask, syncNow, uploadLocalTasks, clearCategory],
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
