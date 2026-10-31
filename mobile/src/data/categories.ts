/** 任务分类:内置分类 + 用户自定义分类(见 categories-context.tsx) */
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  /** 用户自定义分类 */
  custom?: boolean;
}

/** 内置分类 */
export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'study', name: '学习', color: '#4F46E5' },
  { id: 'work', name: '工作', color: '#0EA5E9' },
  { id: 'sport', name: '运动', color: '#10B981' },
  { id: 'life', name: '生活', color: '#F59E0B' },
  { id: 'other', name: '其他', color: '#6B7280' },
];

/** 自定义分类可选颜色 */
export const CATEGORY_COLORS = [
  '#4F46E5',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
];

/** 在分类列表中按 id 查找,未设置或未知 id 返回 undefined(无标签) */
export function findCategory(
  categories: TaskCategory[],
  id?: string,
): TaskCategory | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}
