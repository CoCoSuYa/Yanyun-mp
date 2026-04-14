const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 密码加密函数（与后端保持一致，使用相同的盐值）
const PWD_SALT = 'yanyun16_';
function hashPassword(password) {
  return crypto.createHash('sha256').update(PWD_SALT + password).digest('hex');
}

/**
 * 云函数入口函数
 * 直接操作云数据库，字段名统一使用 snake_case 与 MySQL 一致
 * 每次写操作时 _syncVersion +1，_dataSource = 'cloud'
 */
exports.main = async (event, context) => {
  const wxCtx = cloud.getWXContext();
  const openId = wxCtx.OPENID;

  try {
    switch (event.action) {

      // ========== 用户相关 ==========

      case 'bindAccount': {
        const { gameName, password } = event;
        if (!gameName || !password) {
          return { error: '参数不完整' };
        }

        // 1. 查找用户（通过 game_name + 加密后的密码）
        const passwordHash = hashPassword(password);
        const userRes = await db.collection('users')
          .where({
            game_name: gameName.trim(),
            password_hash: passwordHash
          })
          .get();

        if (userRes.data.length === 0) {
          return { error: '游戏名或密码错误' };
        }

        const user = userRes.data[0];

        // 2. 检查是否已被其他 openId 绑定
        if (user.open_id && user.open_id !== openId) {
          return { error: '该账号已被其他微信绑定' };
        }

        // 3. 更新 open_id（版本号 +1）
        const currentVersion = user._syncVersion || 0;
        await db.collection('users').doc(user._id).update({
          data: {
            open_id: openId,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updated_at: db.serverDate()
          }
        });

        return { user: { id: user._id, game_name: user.game_name, open_id: openId } };
      }

      case 'getUserByOpenId': {
        const userRes = await db.collection('users')
          .where({ open_id: openId })
          .get();

        if (userRes.data.length === 0) {
          return { error: '未找到绑定用户' };
        }

        return userRes.data[0];
      }

      case 'getUser': {
        const { userId } = event;
        const userRes = await db.collection('users').doc(userId).get();
        
        if (!userRes.data) {
          return { error: '用户不存在' };
        }

        return { user: userRes.data };
      }

      case 'getQuota': {
        const { userId } = event;
        const userRes = await db.collection('users').doc(userId).get();
        
        if (!userRes.data) {
          return { error: '用户不存在' };
        }

        return { quotas: userRes.data.mp_quota || { invite: 0, full: 0, remind: 0 } };
      }

      case 'addQuota': {
        const { userId, accepted } = event;
        if (!userId || !Array.isArray(accepted)) {
          return { error: '参数不完整' };
        }

        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
          return { error: '用户不存在' };
        }

        const user = userRes.data;
        const mpQuota = user.mp_quota || { invite: 0, full: 0, remind: 0 };

        // 只要用户点击了授权（不管同意几个模板），三种令牌都各 +1
        if (accepted.length > 0) {
          mpQuota.invite++;
          mpQuota.full++;
          mpQuota.remind++;
        }

        // 更新云库（版本号 +1）
        const currentVersion = user._syncVersion || 0;
        await db.collection('users').doc(userId).update({
          data: {
            mp_quota: mpQuota,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updated_at: db.serverDate()
          }
        });

        return { quotas: mpQuota };
      }

      case 'getInvitableUsers': {
        // 获取所有用户（排除当前用户）
        const usersRes = await db.collection('users')
          .where({
            open_id: _.neq(openId)
          })
          .get();

        return usersRes.data.map(u => ({
          id: u._id,
          game_name: u.game_name,
          main_style: u.main_style,
          sub_style: u.sub_style
        }));
      }

      // ========== 队伍相关 ==========

      case 'getTeam': {
        const { teamId } = event;
        const teamRes = await db.collection('teams').doc(teamId).get();
        
        if (!teamRes.data) {
          return { error: '队伍不存在' };
        }

        return teamRes.data;
      }

      case 'joinTeam': {
        const { teamId, userId } = event;
        
        // 1. 获取队伍信息
        const teamRes = await db.collection('teams').doc(teamId).get();
        if (!teamRes.data) {
          return { error: '队伍不存在' };
        }

        const team = teamRes.data;

        // 2. 检查是否已满员
        if (team.members && team.members.length >= team.max_size) {
          return { error: '队伍已满' };
        }

        // 3. 检查是否已在队伍中
        if (team.members && team.members.some(m => m.userId === userId)) {
          return { error: '您已在队伍中' };
        }

        // 4. 获取用户信息
        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
          return { error: '用户不存在' };
        }

        const user = userRes.data;

        // 5. 加入队伍（版本号 +1）
        const currentVersion = team._syncVersion || 0;
        const newMembers = [
          ...(team.members || []),
          {
            userId: user._id,
            gameName: user.game_name,
            mainStyle: user.main_style,
            subStyle: user.sub_style
          }
        ];

        await db.collection('teams').doc(teamId).update({
          data: {
            members: newMembers,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updated_at: db.serverDate()
          }
        });

        return { success: true };
      }

      // ========== 邀请相关 ==========

      case 'sendInvite': {
        const { fromUserId, targetUserId, teamId } = event;
        if (!fromUserId || !targetUserId || !teamId) {
          return { error: '参数不完整' };
        }

        // 1. 获取目标用户
        const targetRes = await db.collection('users').doc(targetUserId).get();
        if (!targetRes.data) {
          return { error: '目标用户不存在' };
        }

        const target = targetRes.data;
        const pendingInvites = target.pending_invites || [];

        // 2. 检查是否已有相同邀请
        if (pendingInvites.some(inv => inv.teamId === teamId)) {
          return { error: '已发送过邀请' };
        }

        // 3. 添加邀请（版本号 +1）
        const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentVersion = target._syncVersion || 0;

        pendingInvites.push({
          id: inviteId,
          fromUserId,
          teamId,
          createdAt: new Date().toISOString()
        });

        await db.collection('users').doc(targetUserId).update({
          data: {
            pending_invites: pendingInvites,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updated_at: db.serverDate()
          }
        });

        return { success: true, inviteId };
      }

      case 'getInvites': {
        const { userId } = event;
        const userRes = await db.collection('users').doc(userId).get();
        
        if (!userRes.data) {
          return [];
        }

        const pendingInvites = userRes.data.pending_invites || [];

        // 获取每个邀请对应的队伍信息
        const invitesWithTeam = await Promise.all(
          pendingInvites.map(async (inv) => {
            const teamRes = await db.collection('teams').doc(inv.teamId).get();
            if (!teamRes.data) return null;

            const team = teamRes.data;
            return {
              id: inv.id,
              fromUserId: inv.fromUserId,
              teamId: inv.teamId,
              teamType: team.type,
              teamPurpose: team.purpose,
              teamTime: team.time,
              teamDate: team.date,
              createdAt: inv.createdAt
            };
          })
        );

        return invitesWithTeam.filter(inv => inv !== null);
      }

      case 'dismissInvite': {
        const { userId, inviteId } = event;
        
        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
          return { error: '用户不存在' };
        }

        const user = userRes.data;
        const pendingInvites = (user.pending_invites || []).filter(inv => inv.id !== inviteId);

        // 更新邀请列表（版本号 +1）
        const currentVersion = user._syncVersion || 0;
        await db.collection('users').doc(userId).update({
          data: {
            pending_invites: pendingInvites,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updated_at: db.serverDate()
          }
        });

        return { ok: true };
      }

      default:
        return { error: '未知指令' };

    }
  } catch (err) {
    console.error('[云函数错误]', event.action, err);
    return { error: '服务异常，请稍后重试' };
  }
};
