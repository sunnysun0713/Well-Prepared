import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { buildInitialTasks, dateKeyOf, type Task } from './tasks';

/** 任务状态:按日期键分组 */
type TasksState = Record<string, Task[]>;

type Action = {
  type: 'UPDATE_TASK';
  id: string;
  patch: Partial<Omit<Task, 'id'>>;
};

function reducer(state: TasksState, action: Action): TasksState {
  switch (action.type) {
    case 'UPDATE_TASK':
      return Object.fromEntries(
        Object.entries(state).map(([key, tasks]) => [
          key,
          tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
        ]),
      );
  }
}

interface TasksContextValue {
  /** 某天的任务,按起始时间升序 */
  getTasks: (date: Date) => Task[];
  /** 按任务 id 更新(标题/时间/备注/提醒等) */
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/** 任务状态提供者:目前为内存存储,重启应用后恢复为示例数据 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialTasks);

  const getTasks = useCallback(
    (date: Date) =>
      (state[dateKeyOf(date)] ?? [])
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [state],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id'>>) => dispatch({ type: 'UPDATE_TASK', id, patch }),
    [],
  );

  const value = useMemo(() => ({ getTasks, updateTask }), [getTasks, updateTask]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks 必须在 TasksProvider 内使用');
  }
  return ctx;
}
