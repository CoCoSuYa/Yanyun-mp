/**
 * 邀请相关路由（getInvites, sendInvite, dismissInvite, getInvitableUsers）
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async getInvitableUsers() {
    return req(`${SERVER}/api/mp/users/invitable`);
  },

  async sendInvite(event, openId) {
    const { fromUserId, targetUserId, teamId } = event;
    return req(`${SERVER}/api/mp/invite`, 'POST', { fromUserId, targetUserId, teamId, fromOpenId: openId });
  },

  async getInvites(event) {
    const { userId } = event;
    return req(`${SERVER}/api/mp/invites/${userId}`);
  },

  async dismissInvite(event) {
    const { userId, inviteId } = event;
    return req(`${SERVER}/api/mp/invites/${userId}/${inviteId}`, 'DELETE');
  }
};
