/**
 * 队伍 & 签到相关路由
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async getTeams() {
    return req(`${SERVER}/api/teams`);
  },

  async getTeam(event) {
    const { teamId } = event;
    return req(`${SERVER}/api/teams/${teamId}`);
  },

  async createTeam(event) {
    const { type, purpose, time, date, userId } = event;
    return req(`${SERVER}/api/teams`, 'POST', { type, purpose, time, date, userId });
  },

  async joinTeam(event) {
    const { teamId, userId } = event;
    return req(`${SERVER}/api/teams/${teamId}/join`, 'POST', { userId });
  },

  async leaveTeam(event) {
    const { teamId, userId } = event;
    return req(`${SERVER}/api/teams/${teamId}/leave`, 'POST', { userId });
  },

  async changeTeamTime(event) {
    const { teamId, leaderId, time, date } = event;
    return req(`${SERVER}/api/teams/${teamId}/time`, 'PUT', { leaderId, time, date });
  },

  async dissolveTeam(event) {
    const { teamId, adminId } = event;
    return req(`${SERVER}/api/teams/${teamId}/dissolve`, 'POST', { adminId });
  },
};
