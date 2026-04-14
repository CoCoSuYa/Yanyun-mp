Page({
  data: {
    logs: []
  },

  onShow() {
    this.loadLogs();
  },

  loadLogs() {
    try {
      const logs = wx.getStorageSync('fontLogs') || [];
      // 反转数组，最新的在前
      this.setData({ logs: logs.reverse() });
    } catch (e) {
      console.error('加载日志失败', e);
    }
  },

  clearLogs() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有日志吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('fontLogs');
          this.setData({ logs: [] });
          wx.showToast({ title: '已清空' });
        }
      }
    });
  },

  refresh() {
    this.loadLogs();
    wx.showToast({ title: '已刷新' });
  }
});
