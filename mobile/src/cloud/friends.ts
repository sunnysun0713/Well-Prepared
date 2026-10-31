import AV from 'leancloud-storage';

/**
 * 好友关系:Friendship 记录申请人与接收人,双方都有读写权限。
 * 状态:pending(待同意) / accepted(已是好友) / rejected(已拒绝)。
 */

const FRIENDSHIP_CLASS = 'Friendship';

export interface FriendInfo {
  id: string;
  username: string;
  nickname: string;
}

export interface FriendRequestInfo {
  id: string;
  from: FriendInfo;
}

function currentUserOrThrow(): AV.User {
  const user = AV.User.current() as AV.User | null;
  if (!user) throw new Error('未登录');
  return user;
}

function infoOf(user: AV.User): FriendInfo {
  return {
    id: user.id ?? '',
    username: user.getUsername() ?? '',
    nickname: String(user.get('nickname') ?? '') || user.getUsername() || '',
  };
}

function pointerOf(userId: string): AV.Object {
  return AV.Object.createWithoutData('_User', userId);
}

/** 按好友码查找用户(只读取公开资料) */
export async function findUserByFriendCode(code: string): Promise<FriendInfo | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const query = new AV.Query('_User');
  query.equalTo('friendCode', trimmed);
  query.limit(1);
  const results = await query.find();
  if (results.length === 0) return null;
  return infoOf(results[0] as AV.User);
}

/** 发送好友申请 */
export async function sendFriendRequest(target: FriendInfo): Promise<void> {
  const me = currentUserOrThrow();
  if (target.id === me.id) throw new Error('不能添加自己为好友');

  const targetPointer = pointerOf(target.id);
  const sent = new AV.Query(FRIENDSHIP_CLASS);
  sent.equalTo('requester', me);
  sent.equalTo('addressee', targetPointer);
  const received = new AV.Query(FRIENDSHIP_CLASS);
  received.equalTo('requester', targetPointer);
  received.equalTo('addressee', me);
  const existing = [...(await sent.find()), ...(await received.find())];
  if (existing.length > 0) {
    const status = existing[0].get('status');
    if (status === 'accepted') throw new Error('你们已经是好友了');
    if (status === 'pending') throw new Error('好友申请已发送,等待对方同意');
  }

  const obj = new AV.Object(FRIENDSHIP_CLASS);
  obj.set('requester', me);
  obj.set('addressee', targetPointer);
  obj.set('status', 'pending');

  const acl = new AV.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  acl.setReadAccess(me, true);
  acl.setWriteAccess(me, true);
  acl.setReadAccess(target.id, true);
  acl.setWriteAccess(target.id, true);
  obj.setACL(acl);

  await obj.save();
}

/** 我收到的待处理好友申请 */
export async function fetchIncomingFriendRequests(): Promise<FriendRequestInfo[]> {
  const me = currentUserOrThrow();
  const query = new AV.Query(FRIENDSHIP_CLASS);
  query.equalTo('addressee', me);
  query.equalTo('status', 'pending');
  query.include('requester');
  query.limit(100);
  const results = await query.find();
  return results
    .map((obj) => {
      const requester = obj.get('requester') as AV.User | undefined;
      if (!requester) return null;
      return { id: obj.id ?? '', from: infoOf(requester) };
    })
    .filter((item): item is FriendRequestInfo => item !== null);
}

/** 同意好友申请 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const obj = AV.Object.createWithoutData(FRIENDSHIP_CLASS, requestId);
  obj.set('status', 'accepted');
  await obj.save();
}

/** 拒绝好友申请 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const obj = AV.Object.createWithoutData(FRIENDSHIP_CLASS, requestId);
  obj.set('status', 'rejected');
  await obj.save();
}

/** 我的好友列表 */
export async function fetchFriends(): Promise<FriendInfo[]> {
  const me = currentUserOrThrow();
  const sent = new AV.Query(FRIENDSHIP_CLASS);
  sent.equalTo('requester', me);
  sent.equalTo('status', 'accepted');
  sent.include('addressee');

  const received = new AV.Query(FRIENDSHIP_CLASS);
  received.equalTo('addressee', me);
  received.equalTo('status', 'accepted');
  received.include('requester');

  const results = [...(await sent.find()), ...(await received.find())];
  const friends: FriendInfo[] = [];
  const seen = new Set<string>();
  for (const obj of results) {
    const other = obj.get('requester') as AV.User | undefined;
    const addressee = obj.get('addressee') as AV.User | undefined;
    const candidate = other?.id === me.id ? addressee : other;
    if (!candidate || !candidate.id || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    friends.push(infoOf(candidate));
  }
  return friends;
}
