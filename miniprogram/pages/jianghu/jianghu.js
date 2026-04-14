const { SERVER_URL } = require('../../config');

Page({
  data: { 
    url: SERVER_URL,
    statusBarHeight: 20
  },

  onLoad() {
    const app = getApp();
    if (app && app.globalData) {
      this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setData) {
      this.getTabBar().setData({ selected: 1 });
    }
    const float = this.selectComponent('#inviteFloat');
    if (float) float.refresh();
  },

  onCopy() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '令已复制', icon: 'success' })
    });
  },
});
