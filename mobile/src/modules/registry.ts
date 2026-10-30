import { dailyTasksModule } from './daily-tasks/module';
import { calendarModule } from './calendar/module';
import { taskImportModule } from './task-import/module';
import type { AppModule } from './types';

/**
 * 模块注册表:所有模块在此登记,顺序即顶部模块栏的显示顺序。
 * 新增模块:在 src/modules 下建目录(module.ts + 界面组件),然后在此 import 并加入数组。
 */
export const MODULES: AppModule[] = [
  dailyTasksModule,
  calendarModule,
  taskImportModule,
];

export function getModule(id: string): AppModule | undefined {
  return MODULES.find((m) => m.id === id);
}
