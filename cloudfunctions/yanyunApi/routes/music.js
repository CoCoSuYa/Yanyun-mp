/**
 * 音乐路由（getMusic）
 */
const { req } = require('../utils/http');

const SERVER = 'http://43.251.102.69:3000';

module.exports = {
  async getMusic() {
    try {
      const result = await req(`${SERVER}/api/music`);
      return result;
    } catch (e) {
      console.error('[getMusic error]', e);
      return { tracks: [] };
    }
  }
};
