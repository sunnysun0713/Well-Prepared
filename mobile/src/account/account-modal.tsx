import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAccount } from './account-context';

const ACCENT = '#4F46E5';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** LeanCloud 错误转成用户可读文案 */
function friendlyError(e: unknown): string {
  const err = e as { code?: number; message?: string };
  if (err?.code === 210) return '用户名已被占用,换一个试试';
  if (err?.code === 211 || err?.code === 212) return '用户名或密码错误';
  return err?.message || '操作失败,请稍后重试';
}

/** 账户弹窗:云配置 / 登录注册 / 个人资料 */
export function AccountModal({ visible, onClose }: Props) {
  const {
    config,
    configReady,
    configLoaded,
    user,
    saveConfig,
    login,
    register,
    logout,
    updateProfile,
  } = useAccount();

  const [prevVisible, setPrevVisible] = useState(visible);
  const [showConfig, setShowConfig] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [appId, setAppId] = useState(config.appId);
  const [appKey, setAppKey] = useState(config.appKey);
  const [serverURL, setServerURL] = useState(config.serverURL);
  const [profileNickname, setProfileNickname] = useState(user?.nickname ?? '');
  const [profileQq, setProfileQq] = useState(user?.qq ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 打开弹窗时重置表单(渲染期间派生,避免 effect 内 setState)
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setShowConfig(!configReady);
      setMode('login');
      setUsername('');
      setPassword('');
      setNickname('');
      setAppId(config.appId);
      setAppKey(config.appKey);
      setServerURL(config.serverURL);
      setProfileNickname(user?.nickname ?? '');
      setProfileQq(user?.qq ?? '');
      setError('');
      setBusy(false);
    }
  }

  const run = async (task: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const submitConfig = () => {
    if (!appId.trim() || !appKey.trim() || !serverURL.trim()) {
      setError('请填写 AppID、AppKey 和服务器地址');
      return;
    }
    void run(async () => {
      await saveConfig({
        appId: appId.trim(),
        appKey: appKey.trim(),
        serverURL: serverURL.trim(),
      });
      setShowConfig(false);
    });
  };

  const submitAuth = () => {
    const name = username.trim();
    if (!name || !password) {
      setError('请输入用户名和密码');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    void run(async () => {
      if (mode === 'login') {
        await login(name, password);
      } else {
        await register(name, password, nickname.trim() || name);
      }
      setPassword('');
    });
  };

  const saveProfile = () => {
    void run(async () => {
      await updateProfile({ nickname: profileNickname, qq: profileQq });
    });
  };

  const doLogout = () => {
    void run(async () => {
      await logout();
    });
  };

  const avatarText = (user?.nickname || user?.username || '?').slice(0, 1).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>账户</Text>

            {!configLoaded ? (
              <Text style={styles.loading}>正在读取配置…</Text>
            ) : showConfig ? (
              /* 云服务配置 */
              <>
                <Text style={styles.sectionHint}>
                  在 LeanCloud 国际版控制台创建应用后,到「设置 → 应用凭证」复制以下信息
                </Text>
                <Text style={styles.label}>AppID</Text>
                <TextInput
                  value={appId}
                  onChangeText={setAppId}
                  style={styles.input}
                  placeholder="LeanCloud AppID"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.label}>AppKey</Text>
                <TextInput
                  value={appKey}
                  onChangeText={setAppKey}
                  style={styles.input}
                  placeholder="LeanCloud AppKey"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.label}>服务器地址</Text>
                <TextInput
                  value={serverURL}
                  onChangeText={setServerURL}
                  style={styles.input}
                  placeholder="https://xxx.api.lncldglobal.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.actions}>
                  {configReady && (
                    <Pressable
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setShowConfig(false)}
                    >
                      <Text style={styles.cancelText}>返回</Text>
                    </Pressable>
                  )}
                  <Pressable style={[styles.button, styles.confirmButton]} onPress={submitConfig}>
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmText}>保存并连接</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : !user ? (
              /* 登录 / 注册 */
              <>
                <View style={styles.tabs}>
                  {(['login', 'register'] as const).map((m) => {
                    const active = mode === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => {
                          setMode(m);
                          setError('');
                        }}
                        style={[styles.tab, active && styles.tabActive]}
                      >
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>
                          {m === 'login' ? '登录' : '注册'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.label}>用户名</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  placeholder="用户名"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.label}>密码</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholder={mode === 'register' ? '至少 6 位' : '密码'}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                />
                {mode === 'register' && (
                  <>
                    <Text style={styles.label}>昵称(可选)</Text>
                    <TextInput
                      value={nickname}
                      onChangeText={setNickname}
                      style={styles.input}
                      placeholder="好友看到的名字"
                      placeholderTextColor="#9CA3AF"
                      maxLength={16}
                    />
                  </>
                )}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable style={[styles.button, styles.confirmButton, styles.authButton]} onPress={submitAuth}>
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>{mode === 'login' ? '登录' : '注册并登录'}</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setShowConfig(true)} hitSlop={6}>
                  <Text style={styles.linkText}>云服务配置</Text>
                </Pressable>
              </>
            ) : (
              /* 已登录:个人资料 */
              <>
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarText}</Text>
                  </View>
                  <View style={styles.profileMeta}>
                    <Text style={styles.profileName}>{user.nickname || user.username}</Text>
                    <Text style={styles.profileUsername}>@{user.username}</Text>
                  </View>
                </View>

                <ScrollView style={styles.profileScroll} contentContainerStyle={styles.profileContent}>
                  <Text style={styles.label}>昵称</Text>
                  <TextInput
                    value={profileNickname}
                    onChangeText={setProfileNickname}
                    style={styles.input}
                    placeholder="昵称"
                    placeholderTextColor="#9CA3AF"
                    maxLength={16}
                  />
                  <Text style={styles.label}>QQ 号(仅资料展示,不是 QQ 登录)</Text>
                  <TextInput
                    value={profileQq}
                    onChangeText={setProfileQq}
                    style={styles.input}
                    placeholder="填写你的 QQ 号"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={15}
                  />
                  <Text style={styles.label}>我的好友码</Text>
                  <View style={styles.friendCodeBox}>
                    <Text style={styles.friendCode}>{user.friendCode || '—'}</Text>
                    <Text style={styles.friendCodeHint}>把这个码发给好友,对方就能添加你</Text>
                  </View>
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  <Pressable style={[styles.button, styles.confirmButton, styles.authButton]} onPress={saveProfile}>
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmText}>保存资料</Text>
                    )}
                  </Pressable>
                </ScrollView>

                <View style={styles.footerRow}>
                  <Pressable onPress={() => setShowConfig(true)} hitSlop={6}>
                    <Text style={styles.linkText}>云服务配置</Text>
                  </Pressable>
                  <Pressable onPress={doLogout} hitSlop={6}>
                    <Text style={styles.logoutText}>退出登录</Text>
                  </Pressable>
                </View>
              </>
            )}

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 330,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  loading: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sectionHint: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  button: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButton: {
    marginTop: 14,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: ACCENT,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  linkText: {
    fontSize: 12,
    color: ACCENT,
    textAlign: 'center',
    marginTop: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileUsername: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  profileScroll: {
    flexGrow: 0,
  },
  profileContent: {
    paddingBottom: 4,
  },
  friendCodeBox: {
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  friendCode: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  friendCodeHint: {
    fontSize: 11,
    color: '#6B7280',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 10,
  },
  closeButton: {
    marginTop: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
