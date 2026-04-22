/**
 * 额度相关路由（getQuota, addQuota）
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async getQuota(event) {
    const { userId } = event;
    return req(`${SERVER}/api/mp/quota/${userId}`);
  },

  async addQuota(event, openId) {
    const { userId, accepted } = event;
    return req(`${SERVER}/api/mp/quota/add`, 'POST', { userId, openId, accepted });
  }
};
