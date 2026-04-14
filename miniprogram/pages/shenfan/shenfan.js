Page({
  data: {
    boundUser: null,
    gameName: '',
    password: '',
    displayPwd: '',
    errMsg: '',
    loading: false,
    nameFocus: false,
    pwdFocus: false,
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
      this.getTabBar().setData({ selected: 2 });
    }
    const user = wx.getStorageSync('boundUser');
    this.setData({ boundUser: user || null, errMsg: '' });
    const float = this.selectComponent('#inviteFloat');
    if (float) float.refresh();
  },

  onInputName(e) { this.setData({ gameName: e.detail.value, errMsg: '' }); },
  onInputPwd(e) {
    const val = e.detail.value;
    let realPwd = this.data.password || '';

    // 这是一个简单且稳健的非严格密码掩码方案，彻底规避双键盘
    if (val.length < realPwd.length) {
      realPwd = realPwd.substring(0, val.length); // 处理删除
    } else if (val.length > realPwd.length) {
      const added = val.replace(/•/g, ''); // 提取新输入的非掩码字符
      if (val.length === 1 && added.length === 1) {
        realPwd = added; // 全选覆盖的情形
      } else {
        realPwd += added; // 追加输入
      }
    } else {
      const added = val.replace(/•/g, '');
      if (added.length > 0) realPwd = added;
    }

    const masked = '•'.repeat(realPwd.length);
    this.setData({ password: realPwd, displayPwd: masked, errMsg: '' });

    // 返回带有光标控制的对象，微信会自动将其同步给输入框
    return { value: masked, cursor: masked.length };
  },

  onNameBlur() { this.setData({ nameFocus: false }); },
  onPwdFocus() {
    // 强制失焦游戏名，解决安卓双键盘冲突
    this.setData({ nameFocus: false, pwdFocus: true });
  },
  onPwdBlur() { this.setData({ pwdFocus: false }); },

  async onBind() {
    const { gameName, password } = this.data;
    if (!gameName.trim()) return this.setData({ errMsg: '请输入游戏名' });
    if (!password) return this.setData({ errMsg: '请输入密码' });

    this.setData({ loading: true, errMsg: '' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'bindAccount', gameName: gameName.trim(), password }
      });
      const r = res.result;
      console.log('[bindAccount 返回]', JSON.stringify(r));
      if (r.error) { this.setData({ errMsg: r.error }); return; }
      // 云函数返回 { user: { id, game_name, open_id } }
      const rawUser = r.user || (r.id ? r : null);
      if (!rawUser) {
        this.setData({ errMsg: '绑定失败，账号信息获取异常，请重试' });
        console.error('[bindAccount] 无法解析用户信息，完整返回:', r);
        return;
      }
      // 统一转为前端使用的 camelCase 格式存储
      const user = {
        id: rawUser.id || rawUser._id,
        gameName: rawUser.game_name || rawUser.gameName,
        openId: rawUser.open_id || rawUser.openId,
      };
      wx.setStorageSync('boundUser', user);
      this.setData({ boundUser: user, gameName: '', password: '', displayPwd: '' });
      wx.showToast({ title: '身份绑定成功', icon: 'success' });
    } catch (e) {
      console.error('绑定失败:', e);
      this.setData({ errMsg: '网络异常，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onUnbind() {
    wx.showModal({
      title: '解绑确认',
      content: '解绑后将不再接收组队通知，确认解绑？',
      success: ({ confirm }) => {
        if (!confirm) return;
        wx.removeStorageSync('boundUser');
        this.setData({ boundUser: null });
        wx.showToast({ title: '已解绑', icon: 'success' });
      }
    });
  },
});
