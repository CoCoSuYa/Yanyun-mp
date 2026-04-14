const { TEMPLATE_IDS } = require('../../config');

Page({
  data: {
    isBound: false,
    loading: true,
    getting: false,
    quotas: { invite: 0, full: 0, remind: 0 },
    showPicker: false,
    countOptions: [3, 5, 10, 20, 50],
    targetCount: 0,
    doneCount: 0,
    sessionGained: 0,
    _autoOpen: false,
    statusBarHeight: 20, // 默认20px
  },

  onLoad(options) {
    const app = getApp();
    if (app && app.globalData) {
      this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    }
    if (options && options.autoOpen === '1') {
      this.data._autoOpen = true;
    }
  },

  onReady() {
    if (this.data._autoOpen) {
      this.data._autoOpen = false;
      setTimeout(() => {
        const float = this.selectComponent('#inviteFloat');
        if (float) float._openPanel();
      }, 400);
    }
  },

  onShow() {
    this._setTabSelected(0);
    this._checkBind();
    this._refreshInvites();
  },

  _refreshInvites() {
    const float = this.selectComponent('#inviteFloat');
    if (float) float.refresh();
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
    return new Promise(async (resolve) => {
      try {
        const res = await wx.cloud.callFunction({ name: 'yanyunApi', data: { action: 'getQuota', userId } });
        console.log('[额度查询结果]', res.result);
        if (res.result && res.result.quotas) {
          this.setData({ quotas: res.result.quotas });
        }
        resolve();
      } catch (e) {
        console.error('获取额度失败', e);
        resolve();
      }
    });
  },

  onGetQuota() {
    if (this.data.getting) return;
    if (!this.data.isBound) { 
      wx.showToast({ title: '请先绑定身份', icon: 'none' }); 
      return; 
    }
    if (this.data.targetCount === 0) { 
      this.setData({ showPicker: true }); 
      return; 
    }
    if (this.data.doneCount >= this.data.targetCount) {
      this.setData({ targetCount: 0, doneCount: 0, sessionGained: 0, showPicker: true });
      return;
    }

    const user = wx.getStorageSync('boundUser');
    if (!user) {
      console.error('[错误] 未找到绑定用户信息');
      return;
    }
    
    console.log('[onGetQuota] 开始执行', { 
      targetCount: this.data.targetCount,
      doneCount: this.data.doneCount,
      userId: user.id 
    });
    
    this.setData({ getting: true });
    
    // 使用三个模板 ID
    const tmplIds = [TEMPLATE_IDS.invite, TEMPLATE_IDS.full, TEMPLATE_IDS.remind];
    console.log('[准备请求订阅消息]', { tmplIds });

    wx.requestSubscribeMessage({
      tmplIds,
      success: async (res) => {
        console.log('[订阅消息授权结果]', res);
        const accepted = tmplIds.filter(id => res[id] === 'accept');
        console.log('[已授权的模板]', accepted);
        
        if (accepted.length > 0) {
          try {
            const quotaRes = await wx.cloud.callFunction({ 
              name: 'yanyunApi', 
              data: { action: 'addQuota', userId: user.id, accepted } 
            });
            console.log('[额度增加结果]', quotaRes.result);
            
            const newDone   = this.data.doneCount + 1;
            const newGained = this.data.sessionGained + accepted.length;
            this.setData({ doneCount: newDone, sessionGained: newGained });
            await this._loadQuota(user.id);
            
            if (newDone >= this.data.targetCount) {
              wx.showToast({ title: `领取完成！共得 ${newGained} 枚`, icon: 'success', duration: 2000 });
            } else {
              wx.showToast({ title: `已领 ${newDone}/${this.data.targetCount} 次`, icon: 'none', duration: 1500 });
            }
          } catch (e) {
            console.error('[增加额度失败]', e);
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
          content: `错误码：${err.errCode}\n错误信息：${err.errMsg}\n\n请在小程序设置中允许订阅消息通知`,
          showCancel: false,
          confirmText: '我知道了'
        });
        this.setData({ getting: false });
      }
    });
  },

  onHidePicker() { this.setData({ showPicker: false }); },

  onPickCount(e) {
    const count = Number(e.currentTarget.dataset.count);
    this.setData({ targetCount: count, doneCount: 0, sessionGained: 0, showPicker: false });
  },

  goToBind() { wx.switchTab({ url: '/pages/shenfan/shenfan' }); },
});
