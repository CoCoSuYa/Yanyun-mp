Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/tianming/tianming', icon: '令', text: '令牌殿' },
      { pagePath: '/pages/shenfan/shenfan',   icon: '侠', text: '身份牌' },
    ]
  },
  methods: {
    switchTab(e) {
      const { path } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
    }
  }
});
