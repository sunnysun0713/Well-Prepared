import AV from 'leancloud-storage';
import type { CloudConfig } from './config';
import { ensureLeanCloud } from './leancloud';

/** 账户资料:QQ 号仅作资料展示,不代表 QQ 登录 */
export interface AccountProfile {
  id: string;
  username: string;
  nickname: string;
  qq: string;
  /** 好友码:添加好友时使用,8 位 */
  friendCode: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 生成 8 位好友码(去掉易混淆字符 0/O/1/I) */
function randomFriendCode(): string {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function profileOf(user: AV.User): AccountProfile {
  const readString = (key: string): string => {
    const value = user.get(key);
    return typeof value === 'string' ? value : '';
  };
  return {
    id: user.id ?? '',
    username: user.getUsername() ?? '',
    nickname: readString('nickname'),
    qq: readString('qq'),
    friendCode: readString('friendCode'),
  };
}

/** 注册并自动登录 */
export async function register(
  config: CloudConfig,
  username: string,
  password: string,
  nickname: string,
): Promise<AccountProfile> {
  ensureLeanCloud(config);
  const user = new AV.User();
  user.setUsername(username.trim());
  user.setPassword(password);
  user.set('nickname', nickname.trim() || username.trim());
  user.set('qq', '');
  user.set('friendCode', randomFriendCode());
  await user.signUp();
  return profileOf(user);
}

/** 登录 */
export async function login(
  config: CloudConfig,
  username: string,
  password: string,
): Promise<AccountProfile> {
  ensureLeanCloud(config);
  const user = await AV.User.logIn(username.trim(), password);
  return profileOf(user);
}

/** 当前登录用户;未登录或未初始化时返回 null */
export function currentUser(): AccountProfile | null {
  try {
    const user = AV.User.current() as AV.User | null;
    return user ? profileOf(user) : null;
  } catch {
    return null;
  }
}

/** 退出登录 */
export async function logout(): Promise<void> {
  await AV.User.logOut();
}

/** 更新资料(昵称/QQ 号) */
export async function updateProfile(patch: {
  nickname?: string;
  qq?: string;
}): Promise<AccountProfile> {
  const user = AV.User.current() as AV.User | null;
  if (!user) throw new Error('未登录');
  if (patch.nickname !== undefined) user.set('nickname', patch.nickname.trim());
  if (patch.qq !== undefined) user.set('qq', patch.qq.trim());
  await user.save();
  return profileOf(user);
}

/** 好友码缺失时补齐(兼容早期注册的账号) */
export async function ensureFriendCode(): Promise<string> {
  const user = AV.User.current() as AV.User | null;
  if (!user) return '';
  const existing = user.get('friendCode');
  if (typeof existing === 'string' && existing) return existing;
  const code = randomFriendCode();
  user.set('friendCode', code);
  await user.save();
  return code;
}
