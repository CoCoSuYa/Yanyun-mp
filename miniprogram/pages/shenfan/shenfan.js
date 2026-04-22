const { validateRegister, validateLogin } = require('../../utils/validate');

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
    statusBarHeight: 20,

    // 注册弹窗
    showRegister: false,
    regGameName: '',
    regGuildName: '百舸争流',
    regMainStyle: '',
    regSubStyle: '',
    regPassword: '',
    regPassword2: '',
    regErr: '',
    regLoading: false
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
    const user = wx.getStorageSync('boundUser');
    this.setData({ boundUser: user || null, errMsg: '' });
    const float = this.selectComponent('#inviteFloat');
    if (float) float.refresh();
  },

  // ===== 登录 =====
  onInputName(e) { this.setData({ gameName: e.detail.value, errMsg: '' }); },
  onInputPwd(e) {
    const val = e.detail.value;
    let realPwd = this.data.password || '';
    if (val.length < realPwd.length) {
      realPwd = realPwd.substring(0, val.length);
    } else if (val.length > realPwd.length) {
      const added = val.replace(/•/g, '');
      if (val.length === 1 && added.length === 1) {
        realPwd = added;
      } else {
        realPwd += added;
      }
    } else {
      const added = val.replace(/•/g, '');
      if (added.length > 0) realPwd = added;
    }
    const masked = '•'.repeat(realPwd.length);
    this.setData({ password: realPwd, displayPwd: masked, errMsg: '' });
    return { value: masked, cursor: masked.length };
  },
  onNameBlur() { this.setData({ nameFocus: false }); },
  onPwdFocus() { this.setData({ nameFocus: false, pwdFocus: true }); },
  onPwdBlur() { this.setData({ pwdFocus: false }); },

  async onBind() {
    const { gameName, password } = this.data;
    const err = validateLogin({ gameName: gameName.trim(), password });
    if (err) return this.setData({ errMsg: err });

    this.setData({ loading: true, errMsg: '' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'login', gameName: gameName.trim(), password }
      });
      const r = res.result;
      if (r.error) { this.setData({ errMsg: r.error }); return; }
      const user = r.id ? r : (r.user || null);
      if (!user) { this.setData({ errMsg: '登录失败，请重试' }); return; }
      wx.setStorageSync('boundUser', user);
      this.setData({ boundUser: user, gameName: '', password: '', displayPwd: '' });
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (e) {
      console.error('登录失败:', e);
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

  // ===== 注册弹窗 =====
  onOpenRegister() {
    this.setData({
      showRegister: true,
      regGameName: '', regMainStyle: '', regSubStyle: '',
      regPassword: '', regPassword2: '', regErr: '', regLoading: false
    });
  },
  onCloseRegister() { this.setData({ showRegister: false }); },

  onRegInputName(e)  { this.setData({ regGameName: e.detail.value, regErr: '' }); },
  onRegInputGuild(e) { this.setData({ regGuildName: e.detail.value, regErr: '' }); },
  onRegInputMain(e)  { this.setData({ regMainStyle: e.detail.value, regErr: '' }); },
  onRegInputSub(e)   { this.setData({ regSubStyle: e.detail.value, regErr: '' }); },
  onRegInputPwd(e)   { this.setData({ regPassword: e.detail.value, regErr: '' }); },
  onRegInputPwd2(e)  { this.setData({ regPassword2: e.detail.value, regErr: '' }); },

  async onRegister() {
    const { regGameName, regGuildName, regMainStyle, regSubStyle, regPassword, regPassword2 } = this.data;
    const err = validateRegister({
      gameName: regGameName.trim(), guildName: regGuildName.trim(),
      mainStyle: regMainStyle.trim(), subStyle: regSubStyle.trim(),
      password: regPassword, password2: regPassword2
    });
    if (err) return this.setData({ regErr: err });

    this.setData({ regLoading: true, regErr: '' });
    try {
      // 注册
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: {
          action: 'register',
          gameName: regGameName.trim(),
          guildName: regGuildName.trim(),
          mainStyle: regMainStyle.trim(),
          subStyle: regSubStyle.trim(),
          password: regPassword
        }
      });
      const r = res.result;
      if (r.error) { this.setData({ regErr: r.error }); return; }

      // 注册成功后自动登录（与 yanyun 流程一致）
      const user = r.id ? r : (r.user || null);
      if (user) {
        wx.setStorageSync('boundUser', user);
        this.setData({ boundUser: user, showRegister: false });
        wx.showToast({ title: '注册成功，已自动登录', icon: 'success' });
      } else {
        // 注册接口未直接返回 user，尝试登录
        const loginRes = await wx.cloud.callFunction({
          name: 'yanyunApi',
          data: { action: 'login', gameName: regGameName.trim(), password: regPassword }
        });
        const lr = loginRes.result;
        if (lr.error || !lr.id) {
          this.setData({ showRegister: false });
          wx.showToast({ title: '注册成功，请手动登录', icon: 'none' });
          return;
        }
        wx.setStorageSync('boundUser', lr);
        this.setData({ boundUser: lr, showRegister: false });
        wx.showToast({ title: '注册成功，已自动登录', icon: 'success' });
      }
    } catch (e) {
      console.error('注册失败:', e);
      this.setData({ regErr: '网络异常，请重试' });
    } finally {
      this.setData({ regLoading: false });
    }
  }
});
