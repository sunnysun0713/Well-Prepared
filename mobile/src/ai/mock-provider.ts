import type { RawTaskItem, VisionProvider } from './types';

/**
 * 本地模拟提取器:没有 API key 也能跑通全流程(自测用)。
 * 日期故意用相对表达(今天/明天/周日)、时间混用中文与标准格式,以验证归一化逻辑。
 */
export const mockProvider: VisionProvider = {
  id: 'mock',
  label: 'Mock 模拟(无需 key)',
  mock: true,
  async extractTasks(): Promise<RawTaskItem[]> {
    // 模拟网络延迟,让加载态可见
    await new Promise((r) => setTimeout(r, 800));
    return [
      { title: '数学作业提交', date: '今天', start: '19:00', end: '20:00', note: '第3章习题' },
      { title: '英语单词打卡', date: '今天', start: '上午7点30', end: '07:50' },
      { title: '篮球训练', date: '明天', start: '17:00', end: '18:30', note: '市体育馆' },
      { title: '整理错题本', date: '今天', start: '', end: '' },
      { title: '读书会', date: '周日', start: '14:00', end: '16:00', note: '老地方咖啡馆' },
    ];
  },
};
