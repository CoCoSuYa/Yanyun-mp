const { CLOUD_ENV } = require('./config');

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

    // 初始化全局背景音乐
    this.initBGM();
  },

  initBGM() {
    const bgm = wx.createInnerAudioContext();
    bgm.autoplay = true;
    bgm.loop = true;
    bgm.src = 'https://636c-cloud1-3gvmh3i3fabb6c3b-1408953644.tcb.qcloud.la/bgm.flac';
    
    bgm.onPlay(() => console.log('BGM 开始播放'));
    bgm.onError((res) => console.error('BGM 播放错误:', res.errMsg));
    
    // 挂载到全局方便其他页面后续可能需要的暂停/控制
    this.globalData.bgm = bgm;
  }
});
