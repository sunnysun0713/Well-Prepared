import { DailyTasksScreen } from '.';
import type { AppModule } from '../types';

export const dailyTasksModule: AppModule = {
  id: 'daily-tasks',
  title: '每日任务',
  icon: 'checkmark-done-outline',
  component: DailyTasksScreen,
};
