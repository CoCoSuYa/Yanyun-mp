Page({
  data: {
    isBound: false,
    loading: false,
    quotas: { invite: 0, full: 0, remind: 0 },
    statusBarHeight: 20,
  },

  onLoad() {
    const app = getApp();
    if (app && app.globalData) {
      this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    }
  },

  onShow() {
    this._setTabSelected(0);
    // 纯静态展示，不加载数据
    this.setData({ isBound: false, loading: false });
  },

  _setTabSelected(idx) {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setData) {
      this.getTabBar().setData({ selected: idx });
    }
  },

  goToBind() { 
    wx.switchTab({ url: '/pages/shenfan/shenfan' }); 
  },
});
