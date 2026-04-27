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
    userStats: { signInCount: 0, contributionPoints: 0 },
    showSignIn: false,
    showSignSuccess: false,
    signInCount: 0,
    signEarnedPoints: 0,

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
      this.getTabBar().setData({ selected: 2 });
    }
    const user = wx.getStorageSync('boundUser');
    this.setData({ boundUser: user || null, errMsg: '' });
    if (user && user.id) {
      this._loadStats(user);
      this._checkSignIn(user.id);
    } else {
      this.setData({ showSignIn: false });
    }
    const tb = this.getTabBar && this.getTabBar();
    if (tb && tb.syncBgmState) tb.syncBgmState();
  },

  async _loadStats(user) {
    const stats = {
      signInCount: user.signInCount || 0,
      contributionPoints: user.contributionPoints || 0,
    };
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getUser', userId: user.id }
      });
      const r = res.result;
      if (r && r.user) {
        stats.signInCount = r.user.signInCount || 0;
        stats.contributionPoints = r.user.contributionPoints || 0;
        const updated = { ...user, signInCount: stats.signInCount, contributionPoints: stats.contributionPoints };
        wx.setStorageSync('boundUser', updated);
      }
    } catch (_) {}
    this.setData({ userStats: stats });
  },

  async _checkSignIn(userId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getSignInStatus', userId }
      });
      const r = res.result;
      if (r && !r.error) {
        this.setData({ showSignIn: !r.alreadySignedIn });
      }
    } catch (_) {}
  },

  async onSignIn() {
    const user = wx.getStorageSync('boundUser');
    if (!user) return;
    this.setData({ showSignIn: false });
    wx.showLoading({ title: '签到中…' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'signIn', userId: user.id }
      });
      const r = res.result;
      if (r.error) {
        if (r.alreadySignedIn) {
          wx.showToast({ title: '今日已签到', icon: 'none' });
        } else {
          wx.showToast({ title: r.error, icon: 'none' });
          this.setData({ showSignIn: true });
        }
        return;
      }
      user.signInCount = r.signInCount;
      user.contributionPoints = r.contributionPoints;
      wx.setStorageSync('boundUser', user);

      this.setData({
        showSignSuccess: true,
        signInCount: r.signInCount,
        signEarnedPoints: r.earnedPoints || 0,
        userStats: { signInCount: r.signInCount, contributionPoints: r.contributionPoints },
      });
      setTimeout(() => this.setData({ showSignSuccess: false }), 3000);
    } catch (e) {
      console.error('[签到失败]', e);
      wx.showToast({ title: '网络异常', icon: 'none' });
      this.setData({ showSignIn: true });
    } finally {
      wx.hideLoading();
    }
  },

  onCloseSignSuccess() {
    this.setData({ showSignSuccess: false });
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
      this._loadStats(user);
      this._checkSignIn(user.id);
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
        this._loadStats(user);
        this._checkSignIn(user.id);
      } else {
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
        this._loadStats(lr);
        this._checkSignIn(lr.id);
      }
    } catch (e) {
      console.error('注册失败:', e);
      this.setData({ regErr: '网络异常，请重试' });
    } finally {
      this.setData({ regLoading: false });
    }
  }
});
