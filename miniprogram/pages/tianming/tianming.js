const { TEMPLATE_IDS } = require('../../config');

const MAX_ROUNDS = 3;
const PER_ROUND  = 3;

Page({
  data: {
    isBound: false,
    loading: true,
    getting: false,
    quotas: { invite: 0, full: 0, remind: 0 },

    currentRound: 1,      // 当前第几轮（1-3）
    roundDone: 0,         // 本轮已完成次数（0-3）
    roundComplete: false, // 本轮是否已完成
    allComplete: false,   // 三轮是否全部完成
    totalGained: 0,       // 本次会话共领取令牌枚数

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
    this._checkBind();
    const tb = this.getTabBar && this.getTabBar();
    if (tb && tb.syncBgmState) tb.syncBgmState();
  },

  _setTabSelected(idx) {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setData) {
      this.getTabBar().setData({ selected: idx });
    }
  },

  _checkBind() {
    const user = wx.getStorageSync('boundUser');
    if (user && user.id) {
      this.setData({ isBound: true, loading: false });
      this._loadQuota(user.id);
    } else {
      this.setData({ isBound: false, loading: false });
    }
  },

  _loadQuota(userId) {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getQuota', userId }
      }).then(res => {
        if (res.result && res.result.quotas) {
          this.setData({ quotas: res.result.quotas });
        }
        resolve();
      }).catch(e => {
        console.error('[令牌查询失败]', e);
        resolve();
      });
    });
  },

  // 主按钮点击
  onGetQuota() {
    if (this.data.getting) return;
    if (!this.data.isBound) {
      wx.showToast({ title: '请先绑定身份', icon: 'none' });
      return;
    }

    // 全部完成后不可继续
    if (this.data.allComplete) {
      wx.showToast({ title: '本次已领完三轮', icon: 'none' });
      return;
    }

    // 本轮完成 → 进入下一轮
    if (this.data.roundComplete) {
      const nextRound = this.data.currentRound + 1;
      this.setData({ currentRound: nextRound, roundDone: 0, roundComplete: false });
      return;
    }

    // 触发订阅弹窗
    this._doSubscribe();
  },

  _doSubscribe() {
    const user = wx.getStorageSync('boundUser');
    if (!user) return;

    const tmplIds = [TEMPLATE_IDS.invite, TEMPLATE_IDS.full, TEMPLATE_IDS.remind];
    this.setData({ getting: true });

    wx.requestSubscribeMessage({
      tmplIds,
      success: async (res) => {
        const accepted = tmplIds.filter(id => res[id] === 'accept');

        if (accepted.length > 0) {
          try {
            await this._addQuota(user.id, accepted);
            const newDone   = this.data.roundDone + 1;
            const newGained = this.data.totalGained + accepted.length;
            const roundDone = newDone >= PER_ROUND;
            const allDone   = roundDone && this.data.currentRound >= MAX_ROUNDS;

            this.setData({
              roundDone: newDone,
              totalGained: newGained,
              roundComplete: roundDone,
              allComplete: allDone,
            });

            await this._loadQuota(user.id);

            if (allDone) {
              wx.showToast({ title: `三轮领完！共得 ${newGained} 枚`, icon: 'success', duration: 2500 });
            } else if (roundDone) {
              wx.showToast({ title: `第${this.data.currentRound}轮完成`, icon: 'none', duration: 1500 });
            } else {
              wx.showToast({ title: `已领 ${newDone}/${PER_ROUND}`, icon: 'none', duration: 1200 });
            }
          } catch (e) {
            console.error('[增加令牌失败]', e);
            wx.showToast({ title: '网络异常，请重试', icon: 'none' });
          }
        } else {
          wx.showToast({ title: '未点允许，可重试', icon: 'none', duration: 1500 });
        }

        this.setData({ getting: false });
      },
      fail: (err) => {
        console.error('[订阅消息调用失败]', JSON.stringify(err));
        wx.showModal({
          title: '授权失败',
          content: `错误码：${err.errCode}\n${err.errMsg}\n\n请在设置中允许订阅消息通知`,
          showCancel: false,
          confirmText: '我知道了'
        });
        this.setData({ getting: false });
      }
    });
  },

  _addQuota(userId, accepted) {
    return wx.cloud.callFunction({
      name: 'yanyunApi',
      data: { action: 'addQuota', userId, accepted }
    }).then(res => {
      if (res.result && res.result.error) throw new Error(res.result.error);
      return res.result;
    });
  },

  goToBind() { wx.switchTab({ url: '/pages/shenfan/shenfan' }); },
});
