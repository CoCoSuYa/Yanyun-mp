Page({
  data: {
    boundUser: null,
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
    // 纯静态展示，不加载数据
    this.setData({ boundUser: null });
  },
});
