import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { channelIdForSound, findReminderSound } from '@/data/reminder-sounds';
import type { Task } from '@/data/tasks';

/**
 * 本地任务提醒:按任务的「提前分钟数」在开始前触发系统通知。
 * 通知能力仅 Android/iOS 可用,Web 端全部跳过。
 */

export const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web';

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

/** 已创建的通知渠道(每个铃声一个渠道) */
const readyChannels = new Set<string>();

/** 创建指定铃声的通知渠道;应用启动时与排程前都可调用,重复调用无副作用 */
export async function ensureNotificationChannel(soundId?: string): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  const channelId = channelIdForSound(soundId);
  if (readyChannels.has(channelId)) return;
  try {
    const sound = findReminderSound(soundId);
    await Notifications.setNotificationChannelAsync(channelId, {
      name: '任务提醒',
      importance: AndroidImportance.HIGH,
      sound: sound.filename,
    });
    readyChannels.add(channelId);
  } catch {
    // 渠道创建失败不阻塞应用使用,后续排程时会再次尝试
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

/**
 * 确保精确闹钟权限:未授权时在安卓 14+ 会跳系统设置引导用户开启,
 * 安卓 12/13 默认已授权,直接返回。不阻塞保存(未授权时退化为可延迟闹钟)。
 */
export async function ensureExactAlarmPermission(): Promise<boolean> {
  if (!NOTIFICATIONS_SUPPORTED || Platform.OS !== 'android') return true;
  try {
    const current = await Notifications.getExactAlarmPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestExactAlarmPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** 通知标识:与任务 id 绑定,便于更新/删除时按同一 id 取消重排 */
const identifierOf = (taskId: string) => `task-${taskId}`;
/** 短信提醒使用独立标识,与闹钟互不影响 */
const smsIdentifierOf = (taskId: string) => `task-${taskId}-sms`;

/** 按提前分钟数排程一条通知;分钟数无效、无起始时间或已过触发时间时跳过 */
async function scheduleTaskNotification(params: {
  identifier: string;
  title: string;
  minutes: number;
  task: Task;
  dateKey: string;
  soundId?: string;
}): Promise<void> {
  const { identifier, title, minutes, task, dateKey, soundId } = params;
  if (!task.startTime) return;

  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = task.startTime.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return;
  const fireAt = new Date(y, m - 1, d, hh, mm, 0, 0);
  fireAt.setMinutes(fireAt.getMinutes() - minutes);
  if (fireAt.getTime() <= Date.now()) return;

  const sound = findReminderSound(soundId);
  await ensureNotificationChannel(sound.id);
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body: `${task.title} · ${task.startTime} 开始`,
      data: { taskId: task.id, dateKey },
      // iOS 走 content.sound;Android 8+ 由渠道声音决定
      sound: sound.filename ?? 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: channelIdForSound(sound.id),
      // alarmClock 走系统 setAlarmClock:精确到秒触发,华为等厂商的电池策略不能延迟
      delivery: 'alarmClock',
    },
  });
}

/**
 * 同步一条任务的提醒:先取消旧排程,再按当前设置重新排程。
 * 闹钟与短信提醒各自独立,时间可以不同。
 */
export async function syncTaskReminder(dateKey: string, task: Task): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  for (const identifier of [identifierOf(task.id), smsIdentifierOf(task.id)]) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // 不存在该 id 的排程时取消会失败,忽略
    }
  }

  try {
    if (task.remindAdvanceMinutes != null) {
      await scheduleTaskNotification({
        identifier: identifierOf(task.id),
        title: '任务提醒',
        minutes: task.remindAdvanceMinutes,
        task,
        dateKey,
        soundId: task.remindSound,
      });
    }
    if (task.smsRemindAdvanceMinutes != null) {
      await scheduleTaskNotification({
        identifier: smsIdentifierOf(task.id),
        title: '短信提醒',
        minutes: task.smsRemindAdvanceMinutes,
        task,
        dateKey,
        soundId: task.smsRemindSound,
      });
    }
  } catch {
    // 排程失败不影响任务本身的使用
  }
}

/** 取消一条任务已排程的提醒(任务删除或关闭提醒时调用) */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  for (const identifier of [identifierOf(taskId), smsIdentifierOf(taskId)]) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // 无排程时忽略
    }
  }
}
