Page({
  data: { loading: true, errMsg: '', team: null, fromUser: null, teamTimeStr: '', leaderName: '', alreadyIn: false, timePassed: false },

  onLoad(options) {
    this._load(options.teamId, options.fromUserId);
  },

  async _load(teamId, fromUserId) {
    try {
      const [teamRes, userRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'yanyunApi', data: { action: 'getTeam', teamId } }),
        wx.cloud.callFunction({ name: 'yanyunApi', data: { action: 'getUser', userId: fromUserId } }),
      ]);
      const team     = teamRes.result;
      const fromUser = userRes.result && userRes.result.user;
      if (!team || team.error) { this.setData({ loading: false, errMsg: '队伍信息获取失败' }); return; }

      const d = new Date(team.time);
      const teamTimeStr = `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const leader    = (team.members || []).find(m => m.id === team.leaderId);
      const leaderName = leader ? leader.gameName : '未知';
      const bound     = wx.getStorageSync('boundUser');
      const alreadyIn = bound && (team.members || []).some(m => m.id === bound.id);
      const timePassed = new Date() > d;

      this.setData({ loading: false, team, fromUser: fromUser || { gameName: '侠士' }, teamTimeStr, leaderName, alreadyIn, timePassed });
    } catch (e) {
      this.setData({ loading: false, errMsg: '网络异常' });
    }
  },

  async onJoin() {
    const bound = wx.getStorageSync('boundUser');
    if (!bound) { wx.navigateTo({ url: '/pages/shenfan/shenfan' }); return; }
    const res = await wx.cloud.callFunction({ name: 'yanyunApi', data: { action: 'joinTeam', teamId: this.data.team.id, userId: bound.id } });
    if (res.result && res.result.error) { wx.showToast({ title: res.result.error, icon: 'none' }); return; }
    wx.showToast({ title: '入队成功！', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1500);
  },
});
