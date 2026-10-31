import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  currentUser,
  ensureFriendCode,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  updateProfile as updateProfileApi,
  type AccountProfile,
} from '@/cloud/auth';
import {
  EMPTY_CLOUD_CONFIG,
  isCloudConfigReady,
  loadCloudConfig,
  saveCloudConfig,
  type CloudConfig,
} from '@/cloud/config';
import { fetchIncomingFriendRequests } from '@/cloud/friends';
import { ensureLeanCloud } from '@/cloud/leancloud';
import { fetchIncomingTaskRequests } from '@/cloud/requests';

interface AccountContextValue {
  config: CloudConfig;
  configReady: boolean;
  /** 本地配置读取完成(避免首屏误显示配置表单) */
  configLoaded: boolean;
  user: AccountProfile | null;
  /** 待处理的好友申请 + 任务请求数量 */
  pendingCount: number;
  refreshPending: () => Promise<void>;
  saveConfig: (config: CloudConfig) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: { nickname?: string; qq?: string }) => Promise<void>;
  refreshUser: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/** 账户状态提供者:LeanCloud 配置 + 登录用户 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CloudConfig>(EMPTY_CLOUD_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [user, setUser] = useState<AccountProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // 启动时读取云配置并恢复登录态(SDK 会把会话存进 storage 适配器)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await loadCloudConfig();
      if (cancelled) return;
      setConfig(cfg);
      setConfigLoaded(true);
      if (!isCloudConfigReady(cfg)) return;

      ensureLeanCloud(cfg);
      let profile = currentUser();
      if (profile) {
        try {
          const code = await ensureFriendCode();
          if (code && profile.friendCode !== code) {
            profile = { ...profile, friendCode: code };
          }
        } catch {
          // 好友码补齐失败不影响登录态
        }
      }
      if (!cancelled) setUser(profile);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveConfig = useCallback(async (next: CloudConfig) => {
    await saveCloudConfig(next);
    setConfig(next);
    if (isCloudConfigReady(next)) {
      ensureLeanCloud(next);
      setUser(currentUser());
    } else {
      setUser(null);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const profile = await loginApi(config, username, password);
      setUser(profile);
    },
    [config],
  );

  const register = useCallback(
    async (username: string, password: string, nickname: string) => {
      const profile = await registerApi(config, username, password, nickname);
      setUser(profile);
    },
    [config],
  );

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    setPendingCount(0);
  }, []);

  /** 刷新待处理请求数量(好友申请 + 任务请求) */
  const refreshPending = useCallback(async () => {
    if (!user) return;
    try {
      const [friendRequests, taskRequests] = await Promise.all([
        fetchIncomingFriendRequests(),
        fetchIncomingTaskRequests(),
      ]);
      setPendingCount(friendRequests.length + taskRequests.length);
    } catch {
      // 网络异常时保留上次数量
    }
  }, [user]);

  // 登录后轮询待处理请求,用于账户按钮角标(setState 在 await 之后,避免同步更新)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const [friendRequests, taskRequests] = await Promise.all([
          fetchIncomingFriendRequests(),
          fetchIncomingTaskRequests(),
        ]);
        if (!cancelled) setPendingCount(friendRequests.length + taskRequests.length);
      } catch {
        // 网络异常时保留上次数量
      }
    };
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  const updateProfile = useCallback(async (patch: { nickname?: string; qq?: string }) => {
    const profile = await updateProfileApi(patch);
    setUser(profile);
  }, []);

  const refreshUser = useCallback(() => {
    setUser(currentUser());
  }, []);

  const value = useMemo(
    () => ({
      config,
      configReady: isCloudConfigReady(config),
      configLoaded,
      user,
      pendingCount,
      refreshPending,
      saveConfig,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }),
    [
      config,
      configLoaded,
      user,
      pendingCount,
      refreshPending,
      saveConfig,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount 必须在 AccountProvider 内使用');
  }
  return ctx;
}
