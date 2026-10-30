/** 任务数据层:类型定义与按日期查询。目前为内存示例数据,后续可换成本地持久化。 */

export interface Task {
  id: string;
  title: string;
  /** 时间,格式 'HH:mm' */
  time: string;
  note?: string;
  done?: boolean;
}

/** 示例计划:相对今天的天数偏移 → 当日任务(时间为示意) */
const SAMPLE_PLAN: { offset: number; tasks: Omit<Task, 'id'>[] }[] = [
  {
    offset: -3,
    tasks: [
      { title: '整理上周资料', time: '10:00', note: '归档到网盘', done: true },
      { title: '健身 1 小时', time: '19:00', done: true },
    ],
  },
  {
    offset: -2,
    tasks: [{ title: '项目评审会', time: '14:00', note: '会议室 A', done: true }],
  },
  {
    offset: -1,
    tasks: [
      { title: '超市采购', time: '18:30', note: '牛奶、鸡蛋', done: true },
      { title: '视频剪辑', time: '20:00', done: true },
    ],
  },
  {
    offset: 0,
    tasks: [
      { title: '晨跑 3 公里', time: '07:30', note: '沿江绿道', done: true },
      { title: '吃早餐', time: '08:00' },
      { title: '团队站会', time: '09:30', note: '汇报本周进度' },
      { title: '午饭', time: '12:00' },
      { title: '写周报', time: '15:00', note: '整理本周任务完成情况' },
      { title: '阅读 30 分钟', time: '19:30', note: '《设计模式》' },
      { title: '睡前复盘', time: '22:30' },
    ],
  },
  {
    offset: 1,
    tasks: [
      { title: '牙医复诊', time: '10:30', note: '市口腔医院' },
      { title: '朋友聚餐', time: '18:00', note: '海底捞' },
    ],
  },
  {
    offset: 2,
    tasks: [{ title: '月度总结', time: '16:00', note: '提交给主管' }],
  },
  {
    offset: 3,
    tasks: [],
  },
  {
    offset: 4,
    tasks: [
      { title: '家庭大扫除', time: '09:00' },
      { title: '给车做保养', time: '14:30', note: '4S 店' },
      { title: '夜跑 5 公里', time: '20:00' },
    ],
  },
];

/** 两个日期相差的天数(按自然日,忽略时分秒) */
function diffDays(a: Date, b: Date): number {
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((dayA - dayB) / 86400000);
}

/** 获取某天的任务,按时间升序排列。目前仅今天前后数天有示例数据。 */
export function getTasksForDate(date: Date): Task[] {
  const offset = diffDays(date, new Date());
  const plan = SAMPLE_PLAN.find((p) => p.offset === offset);
  if (!plan) {
    return [];
  }
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  return plan.tasks
    .map((t, i) => ({ ...t, id: `${key}-${i}` }))
    .sort((a, b) => a.time.localeCompare(b.time));
}
