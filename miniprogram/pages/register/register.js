const { validateRegister } = require('../../utils/validate');

Page({
  data: {
    gameName: '',
    guildName: '百舸争流',
    mainStyle: '',
    subStyle: '',
    password: '',
    password2: '',
    errMsg: '',
    loading: false
  },

  onInputName(e)  { this.setData({ gameName: e.detail.value, errMsg: '' }); },
  onInputGuild(e) { this.setData({ guildName: e.detail.value, errMsg: '' }); },
  onInputMain(e)  { this.setData({ mainStyle: e.detail.value, errMsg: '' }); },
  onInputSub(e)   { this.setData({ subStyle: e.detail.value, errMsg: '' }); },
  onInputPwd(e)   { this.setData({ password: e.detail.value, errMsg: '' }); },
  onInputPwd2(e)  { this.setData({ password2: e.detail.value, errMsg: '' }); },

  async onRegister() {
    const { gameName, guildName, mainStyle, subStyle, password, password2 } = this.data;
    const err = validateRegister({
      gameName: gameName.trim(),
      guildName: guildName.trim(),
      mainStyle: mainStyle.trim(),
      subStyle: subStyle.trim(),
      password,
      password2
    });
    if (err) return this.setData({ errMsg: err });

    this.setData({ loading: true, errMsg: '' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: {
          action: 'register',
          gameName: gameName.trim(),
          guildName: guildName.trim(),
          mainStyle: mainStyle.trim(),
          subStyle: subStyle.trim(),
          password
        }
      });
      const r = res.result;
      if (r.error) { this.setData({ errMsg: r.error }); return; }

      // 注册成功后自动登录
      const user = r.id ? r : (r.user || null);
      if (user) {
        wx.setStorageSync('boundUser', user);
        wx.showToast({ title: '注册成功，已自动登录', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        // 注册接口未直接返回 user，尝试登录
        const loginRes = await wx.cloud.callFunction({
          name: 'yanyunApi',
          data: { action: 'login', gameName: gameName.trim(), password }
        });
        const lr = loginRes.result;
        if (!lr.error && lr.id) {
          wx.setStorageSync('boundUser', lr);
          wx.showToast({ title: '注册成功，已自动登录', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1500);
        } else {
          wx.showToast({ title: '注册成功，请手动登录', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      }
    } catch (e) {
      console.error('注册失败:', e);
      this.setData({ errMsg: '网络异常，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
