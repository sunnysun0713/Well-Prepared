import { TaskImportScreen } from '.';
import type { AppModule } from '../types';

export const taskImportModule: AppModule = {
  id: 'task-import',
  title: '任务载入',
  icon: 'scan-outline',
  component: TaskImportScreen,
};
