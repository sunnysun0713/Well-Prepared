/** 任务数据层:类型定义与按日期查询。目前为内存示例数据,后续可换成本地持久化。 */

export interface Task {
  id: string;
  title: string;
  /** 时间,格式 'HH:mm' */
  time: string;
  note?: string;
  done?: boolean;
}

/** 示例任务(按时间升序) */
const SAMPLE_TASKS: Task[] = [
  { id: 'sample-1', title: '晨跑 3 公里', time: '07:30', note: '沿江绿道', done: true },
  { id: 'sample-2', title: '吃早餐', time: '08:00' },
  { id: 'sample-3', title: '团队站会', time: '09:30', note: '汇报本周进度' },
  { id: 'sample-4', title: '午饭', time: '12:00' },
  { id: 'sample-5', title: '写周报', time: '15:00', note: '整理本周任务完成情况' },
  { id: 'sample-6', title: '阅读 30 分钟', time: '19:30', note: '《设计模式》' },
  { id: 'sample-7', title: '睡前复盘', time: '22:30' },
];

const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** 获取某天的任务,按时间升序排列。目前只有今天有示例数据。 */
export function getTasksForDate(date: Date): Task[] {
  const today = new Date();
  if (!isSameDate(date, today)) {
    return [];
  }
  return [...SAMPLE_TASKS].sort((a, b) => a.time.localeCompare(b.time));
}
