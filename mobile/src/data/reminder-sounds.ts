/**
 * 内置提醒铃声:音频文件在 assets/sounds,通过 app.json 的 expo-notifications 配置插件
 * 打包进原生工程(Android res/raw、iOS App bundle)。系统通知只能播放打包音频,
 * 因此这里提供有限的内置选项,而不是任意本地文件。
 */

export const DEFAULT_REMINDER_SOUND = 'default';

export interface ReminderSoundOption {
  id: string;
  label: string;
  /** 打包的音频文件名;null 表示跟随系统默认提示音 */
  filename: string | null;
}

export const REMINDER_SOUNDS: ReminderSoundOption[] = [
  { id: DEFAULT_REMINDER_SOUND, label: '默认', filename: null },
  { id: 'chime', label: '清脆', filename: 'chime.wav' },
  { id: 'bright', label: '轻快', filename: 'bright.wav' },
  { id: 'gentle', label: '柔和', filename: 'gentle.wav' },
];

/** 按 id 查找铃声;未知 id 回退到默认铃声 */
export function findReminderSound(id: string | undefined): ReminderSoundOption {
  return REMINDER_SOUNDS.find((sound) => sound.id === id) ?? REMINDER_SOUNDS[0];
}

/**
 * 每段铃声使用独立通知渠道:Android 8+ 的渠道声音创建后不能再改,
 * 所以按铃声分渠道,排程时选择对应渠道。
 */
export function channelIdForSound(id: string | undefined): string {
  return `task-reminders-${findReminderSound(id).id}`;
}
