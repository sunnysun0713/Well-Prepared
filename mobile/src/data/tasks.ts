/** 任务数据层:类型定义与示例数据。运行时的可编辑状态见 tasks-context.tsx。 */

export interface Task {
  id: string;
  title: string;
  /** 起始时间,格式 'HH:mm' */
  startTime: string;
  /** 结束时间,格式 'HH:mm' */
  endTime: string;
  note?: string;
  done?: boolean;
  /** 提前提醒的分钟数;未设置表示无提醒 */
  remindAdvanceMinutes?: number;
  /** 云端对象 id;仅登录并同步后存在 */
  remoteId?: string;
  /** 分类标签 id(见 categories.ts);未设置表示无标签 */
  categoryId?: string;
  /** 是否收藏(紧急任务);收藏后日历星星加深色边框、每日任务顶部显示数量 */
  favorite?: boolean;
}

/** 日期键 'YYYY-MM-DD' */
export function dateKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** 示例计划:相对今天的天数偏移 → 当日任务(时间为示意) */
const SAMPLE_PLAN: { offset: number; tasks: Omit<Task, 'id'>[] }[] = [
  {
    offset: -3,
    tasks: [
      { title: '整理上周资料', startTime: '10:00', endTime: '10:40', note: '归档到网盘', done: true },
      { title: '健身 1 小时', startTime: '19:00', endTime: '20:00', done: true },
    ],
  },
  {
    offset: -2,
    tasks: [
      { title: '项目评审会', startTime: '14:00', endTime: '15:30', note: '会议室 A', done: true },
    ],
  },
  {
    offset: -1,
    tasks: [
      { title: '超市采购', startTime: '18:30', endTime: '19:15', note: '牛奶、鸡蛋', done: true },
      { title: '视频剪辑', startTime: '20:00', endTime: '21:00', done: true },
    ],
  },
  {
    offset: 0,
    tasks: [
      { title: '晨跑 3 公里', startTime: '07:30', endTime: '08:10', note: '沿江绿道', done: true },
      { title: '吃早餐', startTime: '08:00', endTime: '08:20' },
      { title: '团队站会', startTime: '09:30', endTime: '10:00', note: '汇报本周进度' },
      { title: '午饭', startTime: '12:00', endTime: '12:40' },
      { title: '写周报', startTime: '15:00', endTime: '15:30', note: '整理本周任务完成情况' },
      { title: '阅读 30 分钟', startTime: '19:30', endTime: '20:00', note: '《设计模式》' },
      { title: '睡前复盘', startTime: '22:30', endTime: '22:45' },
    ],
  },
  {
    offset: 1,
    tasks: [
      { title: '牙医复诊', startTime: '10:30', endTime: '11:00', note: '市口腔医院' },
      { title: '朋友聚餐', startTime: '18:00', endTime: '20:30', note: '海底捞' },
    ],
  },
  {
    offset: 2,
    tasks: [{ title: '月度总结', startTime: '16:00', endTime: '17:00', note: '提交给主管' }],
  },
  {
    offset: 3,
    tasks: [],
  },
  {
    offset: 4,
    tasks: [
      { title: '家庭大扫除', startTime: '09:00', endTime: '11:00' },
      { title: '给车做保养', startTime: '14:30', endTime: '16:00', note: '4S 店' },
      { title: '夜跑 5 公里', startTime: '20:00', endTime: '20:50' },
    ],
  },
];

/** 用示例计划构建初始任务状态(按日期键分组) */
export function buildInitialTasks(): Record<string, Task[]> {
  const today = new Date();
  const state: Record<string, Task[]> = {};
  for (const plan of SAMPLE_PLAN) {
    const d = new Date(today);
    d.setDate(d.getDate() + plan.offset);
    const key = dateKeyOf(d);
    state[key] = plan.tasks.map((t, i) => ({ ...t, id: `${key}-${i}` }));
  }
  return state;
}
