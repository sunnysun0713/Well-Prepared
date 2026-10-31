import * as browserAdapters from '@leancloud/platform-adapters-browser';
import type { Adapters } from '@leancloud/adapter-types';

/** Web 平台直接复用 LeanCloud 官方浏览器适配器 */
export const adapters = browserAdapters as unknown as Partial<Adapters>;
