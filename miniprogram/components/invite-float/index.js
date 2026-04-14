Component({
  data: {
    expanded: false,
    panelVisible: false,
    loading: false,
    invites: [],
    _expandTimer: null,
  },

  methods: {
    refresh() {
      const user = wx.getStorageSync('boundUser');
      if (!user || !user.id) { this.setData({ invites: [] }); return; }
      wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getInvites', userId: user.id },
      }).then(res => {
        const list = Array.isArray(res.result) ? res.result : [];
        this.setData({ invites: list.map(inv => ({ ...inv, teamTimeStr: this._fmt(inv.teamTime), _joining: false })) });
      }).catch(() => this.setData({ invites: [] }));
    },

    onFloatTap() {
      const { expanded } = this.data;
      clearTimeout(this.data._expandTimer);
      if (!expanded) {
        const timer = setTimeout(() => this.setData({ expanded: false }), 3000);
        this.setData({ expanded: true, _expandTimer: timer });
      } else {
        this.setData({ expanded: false });
        this._openPanel();
      }
    },

    _openPanel() {
      const user = wx.getStorageSync('boundUser');
      if (!user || !user.id) { wx.showToast({ title: '请先绑定身份', icon: 'none' }); return; }
      this.setData({ panelVisible: true, loading: true });
      wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getInvites', userId: user.id },
      }).then(res => {
        const list = Array.isArray(res.result) ? res.result : [];
        this.setData({ invites: list.map(inv => ({ ...inv, teamTimeStr: this._fmt(inv.teamTime), _joining: false })), loading: false });
      }).catch(() => this.setData({ loading: false }));
    },

    closePanel() { this.setData({ panelVisible: false }); },

    onAccept(e) {
      const { id, teamid } = e.currentTarget.dataset;
      const user = wx.getStorageSync('boundUser');
      if (!user) return;
      this.setData({ invites: this.data.invites.map(inv => inv.id === id ? { ...inv, _joining: true } : inv) });
      wx.cloud.callFunction({ name: 'yanyunApi', data: { action: 'joinTeam', teamId: teamid, userId: user.id } })
        .then(res => {
          if (res.result && res.result.error) {
            wx.showToast({ title: res.result.error, icon: 'none' });
            this.setData({ invites: this.data.invites.map(inv => inv.id === id ? { ...inv, _joining: false } : inv) });
            return;
          }
          this._dismiss(id, user.id, () => wx.showToast({ title: '已成功入队', icon: 'success' }));
        })
        .catch(() => {
          wx.showToast({ title: '网络异常', icon: 'none' });
          this.setData({ invites: this.data.invites.map(inv => inv.id === id ? { ...inv, _joining: false } : inv) });
        });
    },

    onReject(e) {
      const { id } = e.currentTarget.dataset;
      const user = wx.getStorageSync('boundUser');
      if (!user) return;
      this._dismiss(id, user.id);
    },

    _dismiss(inviteId, userId, cb) {
      wx.cloud.callFunction({ name: 'yanyunApi', data: { action: 'dismissInvite', userId, inviteId } })
        .finally(() => {
          this.setData({ invites: this.data.invites.filter(inv => inv.id !== inviteId) });
          if (typeof cb === 'function') cb();
        });
    },

    _fmt(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    },
  },
});
