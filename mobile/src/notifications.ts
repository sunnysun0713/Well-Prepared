import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { Task } from '@/data/tasks';

/**
 * 本地任务提醒:按任务的「提前分钟数」在开始前触发系统通知。
 * 通知能力仅 Android/iOS 可用,Web 端全部跳过。
 */

export const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web';

/** 提醒通知渠道(Android 8+ 必须;也是 Android 13 权限弹窗的前提) */
const CHANNEL_ID = 'task-reminders';

/** 前台展示行为:应用在前台时也弹出横幅 */
if (NOTIFICATIONS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

/** 创建通知渠道:应用启动时调用一次即可,重复调用无副作用 */
export async function ensureNotificationChannel(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED || channelReady) return;
  channelReady = true;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '任务提醒',
      importance: AndroidImportance.HIGH,
    });
  } catch {
    // 渠道创建失败不阻塞应用使用,后续排程时会再次尝试
    channelReady = false;
  }
}

/** 请求通知权限;已授权时直接返回 true */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!NOTIFICATIONS_SUPPORTED) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** 通知标识:与任务 id 绑定,便于更新/删除时按同一 id 取消重排 */
const identifierOf = (taskId: string) => `task-${taskId}`;

/**
 * 同步一条任务的提醒:先取消旧排程,再按当前设置重新排程。
 * 无提醒、已完成、无起始时间或触发时间已过 → 只取消不排程。
 */
export async function syncTaskReminder(dateKey: string, task: Task): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  const identifier = identifierOf(task.id);
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // 不存在该 id 的排程时取消会失败,忽略
  }
  if (task.remindAdvanceMinutes == null || task.done) return;
  if (!task.startTime) return;

  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = task.startTime.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return;
  const fireAt = new Date(y, m - 1, d, hh, mm, 0, 0);
  fireAt.setMinutes(fireAt.getMinutes() - task.remindAdvanceMinutes);
  if (fireAt.getTime() <= Date.now()) return;

  try {
    await ensureNotificationChannel();
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: '任务提醒',
        body: `${task.title} · ${task.startTime} 开始`,
        data: { taskId: task.id, dateKey },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // 排程失败不影响任务本身的使用
  }
}

/** 取消一条任务已排程的提醒(任务删除或关闭提醒时调用) */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifierOf(taskId));
  } catch {
    // 无排程时忽略
  }
}
