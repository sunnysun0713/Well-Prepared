import { Platform } from 'react-native';

/**
 * 识别期间的前台服务(仅 Android):
 * 切到后台/锁屏后系统不会冻结进程,AI 请求可以继续跑,
 * 自动导入模式下识别完成后会直接写入任务,不需要用户停留在这个界面。
 */

interface BackgroundActions {
  start: (
    task: () => Promise<void>,
    options: Record<string, unknown>,
  ) => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
}

let service: BackgroundActions | null = null;
let active = false;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getService(): Promise<BackgroundActions | null> {
  if (Platform.OS !== 'android') return null;
  if (!service) {
    try {
      // 动态引入:Web/iOS 上不加载原生模块
      const mod = (await import('react-native-background-actions')) as unknown as {
        default: BackgroundActions;
      };
      service = mod.default;
    } catch {
      return null;
    }
  }
  return service;
}

/** 开启识别前台服务;系统不允许时静默降级为普通后台执行 */
export async function startImportBackgroundService(imageCount: number): Promise<void> {
  const bg = await getService();
  if (!bg || active) return;
  active = true;
  try {
    await bg.start(
      async () => {
        // 服务存活期间保持任务不结束,识别完成后由 stopImportBackgroundService 收尾
        while (bg.isRunning()) await sleep(1000);
      },
      {
        taskName: 'AI 图片识别',
        taskTitle: '有备',
        taskDesc: `正在识别 ${imageCount} 张图片…`,
        taskIcon: { name: 'ic_launcher', type: 'mipmap' },
        color: '#4F46E5',
        foregroundServiceType: ['dataSync'],
      },
    );
  } catch {
    active = false;
  }
}

export async function stopImportBackgroundService(): Promise<void> {
  const bg = service;
  if (!bg || !active) return;
  active = false;
  try {
    await bg.stop();
  } catch {
    // 服务已结束或被系统回收,忽略
  }
}
