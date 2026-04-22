/**
 * 队伍相关路由（getTeam, joinTeam）
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async getTeam(event) {
    const { teamId } = event;
    return req(`${SERVER}/api/teams/${teamId}`);
  },

  async joinTeam(event) {
    const { teamId, userId } = event;
    return req(`${SERVER}/api/teams/${teamId}/join`, 'POST', { userId });
  }
};
