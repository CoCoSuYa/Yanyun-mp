/**
 * bgm-player 组件 — 可拖动悬浮 UI
 * 通过 player 单例模块共享位置状态，切 tab 时同步拖动位置
 */
const player = require('./player');

Component({
  properties: {
    draggable: { type: Boolean, value: true }
  },

  data: {
    playing: false,
    songName: '',
    showName: false,
    posX: 8,
    posY: 8,
    moveAreaW: 375,
    moveAreaH: 667
  },

  lifetimes: {
    attached() {
      this._calcMoveArea();

      // 从全局单例恢复拖动位置
      const savedPos = player.getPos();
      if (savedPos) {
        this.setData({ posX: savedPos.x, posY: savedPos.y });
      } else {
        // 首次：定位在状态栏下方
        try {
          const menu = wx.getMenuButtonBoundingClientRect();
          if (menu && menu.top) {
            this.setData({ posY: menu.top });
          }
        } catch (e) {}
      }

      // 同步初始播放状态
      const s = player.getState();
      this.setData({
        playing: s.playing,
        songName: s.songName || '',
        showName: !!s.songName
      });

      // 监听播放器状态变化
      this._offListener = player.on('stateChange', (data) => {
        const patch = {};
        if ('playing' in data) patch.playing = data.playing;
        if ('songName' in data) {
          patch.songName = data.songName;
          patch.showName = !!data.songName;
        }
        if (Object.keys(patch).length) this.setData(patch);
      });
    },

    detached() {
      if (this._offListener) this._offListener();
    }
  },

  methods: {
    _calcMoveArea() {
      try {
        const sys = wx.getWindowInfo();
        this.setData({
          moveAreaW: sys.windowWidth,
          moveAreaH: sys.windowHeight
        });
      } catch (e) {}
    },

    onToggle() {
      player.toggle();
    },

    onNext() {
      player.next();
    },

    onMoveEnd(e) {
      if (e.detail) {
        const pos = { x: e.detail.x, y: e.detail.y };
        this.setData({ posX: pos.x, posY: pos.y });
        // 持久化到全局单例，下次 attached 恢复
        player.setPos(pos);
      }
    }
  }
});