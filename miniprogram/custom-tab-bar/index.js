const player = require('../components/bgm-player/player');

Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/tianming/tianming', icon: '令', text: '令牌殿' },
      { pagePath: '/pages/shenfan/shenfan',   icon: '侠', text: '身份牌' },
    ],
    playing:    false,
    songName:   '',
    bgmLeft:    0,
    bgmTop:     0,
    _maxX:      300,
    _maxY:      700,
    pageActive: false,
  },

  pageLifetimes: {
    hide() {
      this.setData({ pageActive: false });
    }
  },

  lifetimes: {
    attached() {
      let pos = player.getPos();
      let maxX = 300, maxY = 700;
      try {
        const sys = wx.getWindowInfo();
        maxX = sys.windowWidth  - 60;
        maxY = sys.windowHeight - 160;
        if (!pos) pos = { left: 16, top: (sys.statusBarHeight || 20) + 8 };
      } catch (e) {
        if (!pos) pos = { left: 16, top: 56 };
      }
      if (!player.getPos()) player.setPos(pos);

      this.setData({
        bgmLeft:  pos.left,
        bgmTop:   pos.top,
        _maxX:    maxX,
        _maxY:    maxY,
        playing:  player.playing,
        songName: player.songName || '',
      });

      this._offUpdate = player.onUpdate((state) => {
        this.setData({
          playing:  state.playing,
          songName: state.songName || '',
          ...(state.pos ? { bgmLeft: state.pos.left, bgmTop: state.pos.top } : {})
        });
      });
    },

    detached() {
      if (this._offUpdate) this._offUpdate();
    }
  },

  methods: {
    syncBgmState() {
      const pos = player.getPos();
      this.setData({
        playing:    player.playing,
        songName:   player.songName || '',
        pageActive: true,
        ...(pos ? { bgmLeft: pos.left, bgmTop: pos.top } : {})
      });
    },

    switchTab(e) {
      wx.switchTab({ url: e.currentTarget.dataset.path });
    },

    onBgmToggle() { player.toggle(); },
    onBgmNext()   { player.next();   },

    // WXS 拖动结束后的唯一回调，同步最终坐标
    onBgmDragEnd(pos) {
      this.setData({ bgmLeft: pos.left, bgmTop: pos.top });
      player.setPos({ left: pos.left, top: pos.top });
    },
  }
});
