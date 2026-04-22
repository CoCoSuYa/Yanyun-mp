/**
 * 云函数入口 — 路由分发
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const userRoute    = require('./routes/user');
const teamRoute    = require('./routes/team');
const inviteRoute  = require('./routes/invite');
const musicRoute   = require('./routes/music');
const quotaRoute   = require('./routes/quota');

// action → { handler, module } 映射
const ACTIONS = {
  login:           { handler: userRoute.login,           needOpenId: false },
  register:        { handler: userRoute.register,        needOpenId: false },
  bindAccount:     { handler: userRoute.bindAccount,     needOpenId: true  },
  getUserByOpenId: { handler: userRoute.getUserByOpenId, needOpenId: true  },
  getUser:         { handler: userRoute.getUser,         needOpenId: false },

  getTeam:         { handler: teamRoute.getTeam,         needOpenId: false },
  joinTeam:        { handler: teamRoute.joinTeam,        needOpenId: false },

  getInvitableUsers: { handler: inviteRoute.getInvitableUsers, needOpenId: false },
  sendInvite:        { handler: inviteRoute.sendInvite,        needOpenId: true  },
  getInvites:        { handler: inviteRoute.getInvites,        needOpenId: false },
  dismissInvite:     { handler: inviteRoute.dismissInvite,     needOpenId: false },

  getMusic:        { handler: musicRoute.getMusic,       needOpenId: false },

  getQuota:        { handler: quotaRoute.getQuota,       needOpenId: false },
  addQuota:        { handler: quotaRoute.addQuota,       needOpenId: true  },
};

exports.main = async (event) => {
  const wxCtx  = cloud.getWXContext();
  const openId = wxCtx.OPENID;
  const action = ACTIONS[event.action];

  if (!action) return { error: '未知指令' };

  return action.needOpenId
    ? action.handler(event, openId)
    : action.handler(event);
};
