/**
 * 用户相关路由（login, register, bindAccount, getUserByOpenId, getUser）
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async login(event) {
    const { gameName, password } = event;
    try {
      const result = await req(`${SERVER}/api/auth/login`, 'POST', { gameName, password });
      return result;
    } catch (e) {
      console.error('[login error]', e);
      return { error: '登录失败：' + (e.message || '未知错误') };
    }
  },

  async register(event) {
    const { gameName, guildName, mainStyle, subStyle, password } = event;
    try {
      const result = await req(`${SERVER}/api/users`, 'POST', {
        gameName, guildName, mainStyle, subStyle, password
      });
      return result;
    } catch (e) {
      console.error('[register error]', e);
      return { error: '注册失败：' + (e.message || '未知错误') };
    }
  },

  async bindAccount(event, openId) {
    const { gameName, password } = event;
    return req(`${SERVER}/api/mp/bind`, 'POST', { gameName, password, openId });
  },

  async getUserByOpenId(openId) {
    return req(`${SERVER}/api/mp/userByOpenId/${openId}`);
  },

  async getUser(event) {
    const { userId } = event;
    const users = await req(`${SERVER}/api/users`);
    const user = Array.isArray(users) ? users.find(u => u.id === userId) : null;
    return user ? { user } : { error: '用户不存在' };
  }
};
