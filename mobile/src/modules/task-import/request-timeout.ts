import { AppState, type AppStateStatus } from 'react-native';

/**
 * 单张图片识别超时的计时器:
 * - 应用在后台时暂停计时,避免切后台期间把正在进行的请求中断;
 * - 回到前台后重新计时,给请求一个新的超时窗口。
 * 计时器跟随主取消信号,清理时一并移除。
 */

interface TimeoutEntry {
  timeoutMs: number;
  controller: AbortController;
  timer: ReturnType<typeof setTimeout> | null;
}

const entries = new Set<TimeoutEntry>();
let appState: AppStateStatus = (AppState.currentState ?? 'active') as AppStateStatus;

function startTimer(entry: TimeoutEntry) {
  entry.timer = setTimeout(() => entry.controller.abort(), entry.timeoutMs);
}

function stopTimer(entry: TimeoutEntry) {
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
}

// 模块级监听:识别可能在模块卸载后继续跑,不能依赖组件生命周期
AppState.addEventListener('change', (next) => {
  const wasActive = appState === 'active';
  appState = next;
  if (next === 'active') {
    for (const entry of entries) {
      stopTimer(entry);
      startTimer(entry);
    }
  } else if (wasActive) {
    for (const entry of entries) stopTimer(entry);
  }
});

/** 创建跟随主取消信号、并带超时的子信号 */
export function linkAbort(signal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const entry: TimeoutEntry = { timeoutMs, controller, timer: null };
  const onParentAbort = () => controller.abort();

  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', onParentAbort);
  // 后台发起的请求(少见)等回到前台再开始计时
  if (appState === 'active') startTimer(entry);
  entries.add(entry);

  return {
    signal: controller.signal,
    timedOut: () => !signal.aborted && controller.signal.aborted,
    cleanup: () => {
      stopTimer(entry);
      entries.delete(entry);
      signal.removeEventListener('abort', onParentAbort);
    },
  };
}
