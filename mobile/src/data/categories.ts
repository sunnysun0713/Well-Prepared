/** 任务分类:预置颜色标签,新增分类在 TASK_CATEGORIES 里登记 */
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'study', name: '学习', color: '#4F46E5' },
  { id: 'work', name: '工作', color: '#0EA5E9' },
  { id: 'sport', name: '运动', color: '#10B981' },
  { id: 'life', name: '生活', color: '#F59E0B' },
  { id: 'other', name: '其他', color: '#6B7280' },
];

/** 按 id 取分类,未设置或未知 id 返回 undefined(无标签) */
export function getCategory(id?: string): TaskCategory | undefined {
  if (!id) return undefined;
  return TASK_CATEGORIES.find((c) => c.id === id);
}
