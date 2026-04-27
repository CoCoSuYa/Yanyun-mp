/**
 * 签到相关路由
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async signIn(event) {
    const { userId } = event;
    return req(`${SERVER}/api/sign-in`, 'POST', { userId });
  },

  async getSignInStatus(event) {
    const { userId } = event;
    return req(`${SERVER}/api/sign-in/status?userId=${userId}`);
  },
};
