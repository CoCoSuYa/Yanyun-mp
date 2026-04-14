const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 密码加密函数（与后端保持一致）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 云函数入口函数
 * 直接操作云数据库，每次写操作时版本号 +1
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

        // 1. 查找用户（通过 gameName + 加密后的密码）
        const passwordHash = hashPassword(password);
        const userRes = await db.collection('users')
          .where({
            gameName: gameName.trim(),
            passwordHash
          })
          .get();

        if (userRes.data.length === 0) {
          return { error: '游戏名或密码错误' };
        }

        const user = userRes.data[0];

        // 2. 检查是否已被其他 openId 绑定
        if (user.openId && user.openId !== openId) {
          return { error: '该账号已被其他微信绑定' };
        }

        // 3. 更新 openId（版本号 +1）
        const currentVersion = user._syncVersion || 0;
        await db.collection('users').doc(user._id).update({
          data: {
            openId,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updatedAt: new Date()
          }
        });

        return { user: { id: user._id, gameName: user.gameName, openId } };
      }

      case 'getUserByOpenId': {
        const userRes = await db.collection('users')
          .where({ openId })
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

        return { quotas: userRes.data.mpQuota || { invite: 0, full: 0, remind: 0 } };
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
        const mpQuota = user.mpQuota || { invite: 0, full: 0, remind: 0 };

        // 增加对应模板的额度
        accepted.forEach(templateId => {
          if (templateId.includes('invite')) mpQuota.invite++;
          else if (templateId.includes('full')) mpQuota.full++;
          else if (templateId.includes('remind')) mpQuota.remind++;
        });

        // 更新云库（版本号 +1）
        const currentVersion = user._syncVersion || 0;
        await db.collection('users').doc(userId).update({
          data: {
            mpQuota,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updatedAt: new Date()
          }
        });

        return { quotas: mpQuota };
      }

      case 'getInvitableUsers': {
        // 获取所有用户（排除当前用户）
        const usersRes = await db.collection('users')
          .where({
            openId: _.neq(openId)
          })
          .get();

        return usersRes.data.map(u => ({
          id: u._id,
          gameName: u.gameName,
          mainStyle: u.mainStyle,
          subStyle: u.subStyle
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
        if (team.members && team.members.length >= team.maxSize) {
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
            gameName: user.gameName,
            mainStyle: user.mainStyle,
            subStyle: user.subStyle
          }
        ];

        await db.collection('teams').doc(teamId).update({
          data: {
            members: newMembers,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updatedAt: new Date()
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
        const pendingInvites = target.pendingInvites || [];

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
            pendingInvites,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updatedAt: new Date()
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

        const pendingInvites = userRes.data.pendingInvites || [];

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
        const pendingInvites = (user.pendingInvites || []).filter(inv => inv.id !== inviteId);

        // 更新邀请列表（版本号 +1）
        const currentVersion = user._syncVersion || 0;
        await db.collection('users').doc(userId).update({
          data: {
            pendingInvites,
            _syncVersion: currentVersion + 1,
            _dataSource: 'cloud',
            updatedAt: new Date()
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
