const { CLOUD_ENV } = require('./config');
const bgm = require('./components/bgm-player/player');

App({
  globalData: {
    statusBarHeight: 20
  },

  onLaunch() {
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    try {
      const sysInfo = wx.getSystemInfoSync();
      this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20;
    } catch (e) {
      this.globalData.statusBarHeight = 20;
    }

    // 初始化全局音乐播放器（单例模块，组件 require 同一实例）
    bgm.init();
    bgm.loadPlaylist();

    if (typeof wx.preloadPage === 'function') {
      wx.preloadPage({ url: '/pages/zudui/zudui' });
      wx.preloadPage({ url: '/pages/shenfan/shenfan' });
    }
  }
});
