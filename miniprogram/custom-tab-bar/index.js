/**
 * custom-tab-bar — 底部 tab + 悬浮 bgm 播放器
 * bgm 播放器直接内联在此组件中，不使用独立子组件
 * 所有 tab 页共享同一个 tab-bar 实例的 UI 状态
 */
const player = require('../components/bgm-player/player');

Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/tianming/tianming', icon: '令', text: '令牌殿' },
      { pagePath: '/pages/shenfan/shenfan',   icon: '侠', text: '身份牌' },
    ],

    // bgm 播放器状态
    playing: false,
    songName: '',

    // 拖动状态
    bgmLeft: 0,
    bgmTop: 0,
    dragging: false
  },

  lifetimes: {
    attached() {
      // 初始化 bgm 位置：状态栏右侧
      try {
        const menu = wx.getMenuButtonBoundingClientRect();
        const sys = wx.getWindowInfo();
        // 放在右上角胶囊按钮下方
        this.setData({
          bgmLeft: sys.windowWidth - 200,
          bgmTop: (menu ? menu.bottom : 48) + 8
        });
      } catch (e) {
        this.setData({ bgmLeft: 8, bgmTop: 48 });
      }

      // 恢复拖动位置
      const savedPos = player.getPos();
      if (savedPos) {
        this.setData({ bgmLeft: savedPos.left, bgmTop: savedPos.top });
      }

      // 同步播放状态
      this.setData({
        playing: player.playing,
        songName: player.songName || ''
      });

      // 监听播放器状态
      this._offUpdate = player.onUpdate((state) => {
        this.setData({
          playing: state.playing,
          songName: state.songName || ''
        });
      });
    },

    detached() {
      if (this._offUpdate) this._offUpdate();
    }
  },

  pageLifetimes: {
    show() {
      // 切回页面时同步状态
      this.setData({
        playing: player.playing,
        songName: player.songName || ''
      });
      const savedPos = player.getPos();
      if (savedPos) {
        this.setData({ bgmLeft: savedPos.left, bgmTop: savedPos.top });
      }
    }
  },

  methods: {
    switchTab(e) {
      const { path } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
    },

    // ===== bgm 控制 =====
    onBgmToggle() {
      player.toggle();
    },

    onBgmNext() {
      player.next();
    },

    // ===== 拖动 =====
    onBgmTouchStart(e) {
      this._dragStartX = e.touches[0].clientX;
      this._dragStartY = e.touches[0].clientY;
      this._startLeft = this.data.bgmLeft;
      this._startTop = this.data.bgmTop;
      this.setData({ dragging: true });
    },

    onBgmTouchMove(e) {
      const dx = e.touches[0].clientX - this._dragStartX;
      const dy = e.touches[0].clientY - this._dragStartY;
      const newLeft = this._startLeft + dx;
      const newTop = this._startTop + dy;

      // 边界限制
      try {
        const sys = wx.getWindowInfo();
        const maxX = sys.windowWidth - 60;
        const maxY = sys.windowHeight - 160; // 不超过 tab 栏
        this.setData({
          bgmLeft: Math.max(0, Math.min(newLeft, maxX)),
          bgmTop: Math.max(0, Math.min(newTop, maxY))
        });
      } catch (e) {
        this.setData({ bgmLeft: newLeft, bgmTop: newTop });
      }
    },

    onBgmTouchEnd() {
      this.setData({ dragging: false });
      player.setPos({ left: this.data.bgmLeft, top: this.data.bgmTop });
    }
  }
});
