const cloud = require('wx-server-sdk');
const http  = require('http');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const SERVER = 'http://115.190.74.217:3000';

function req(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port:     u.port || 80,
      path:     u.pathname + u.search,
      method,
      headers:  { 'Content-Type': 'application/json' },
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

exports.main = async (event, context) => {
  const wxCtx  = cloud.getWXContext();
  const openId = wxCtx.OPENID;

  switch (event.action) {

    case 'bindAccount': {
      const { gameName, password } = event;
      return req(`${SERVER}/api/mp/bind`, 'POST', { gameName, password, openId });
    }

    case 'getQuota': {
      const { userId } = event;
      return req(`${SERVER}/api/mp/quota/${userId}`);
    }

    case 'addQuota': {
      const { userId, accepted } = event;
      return req(`${SERVER}/api/mp/quota/add`, 'POST', { userId, openId, accepted });
    }

    case 'getUserByOpenId': {
      return req(`${SERVER}/api/mp/userByOpenId/${openId}`);
    }

    case 'getInvitableUsers': {
      return req(`${SERVER}/api/mp/users/invitable`);
    }

    case 'sendInvite': {
      const { fromUserId, targetUserId, teamId } = event;
      return req(`${SERVER}/api/mp/invite`, 'POST', { fromUserId, targetUserId, teamId, fromOpenId: openId });
    }

    case 'getTeam': {
      const { teamId } = event;
      return req(`${SERVER}/api/teams/${teamId}`);
    }

    case 'getUser': {
      const { userId } = event;
      const users = await req(`${SERVER}/api/users`);
      const user = Array.isArray(users) ? users.find(u => u.id === userId) : null;
      return user ? { user } : { error: '用户不存在' };
    }

    case 'joinTeam': {
      const { teamId, userId } = event;
      return req(`${SERVER}/api/teams/${teamId}/join`, 'POST', { userId });
    }

    case 'getInvites': {
      const { userId } = event;
      return req(`${SERVER}/api/mp/invites/${userId}`);
    }

    case 'dismissInvite': {
      const { userId, inviteId } = event;
      return req(`${SERVER}/api/mp/invites/${userId}/${inviteId}`, 'DELETE');
    }

    default:
      return { error: '未知指令' };
  }
};
