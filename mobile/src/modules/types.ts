import type { ComponentType } from 'react';

/**
 * 功能模块的完整定义。
 * 每个模块目录自包含:界面组件 + 元信息(module.ts),最终汇总到 registry.ts。
 */
export interface AppModule {
  /** 唯一标识,如 'daily-tasks' */
  id: string;
  /** 顶部模块栏显示的名称 */
  title: string;
  /** 顶部模块栏显示的图标(emoji) */
  icon: string;
  /** 模块主界面组件 */
  component: ComponentType;
}
