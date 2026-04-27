/**
 * BGM 播放器 — 全局单例模块
 * 在 app.js 中调用 init() 和 loadPlaylist() 初始化
 * custom-tab-bar 直接 require 引用同一个实例
 */
const { SERVER_URL } = require('./config');

const bgm = {
  playlist: [],
  currentIndex: -1,
  innerAudio: null,
  _listeners: [],

  // UI 状态（tab-bar 共享）
  playing: false,
  songName: '',

  init() {
    this.innerAudio = wx.createInnerAudioContext();
    this.innerAudio.onPlay(() => {
      this.playing = true;
      this._emit();
    });
    this.innerAudio.onPause(() => {
      this.playing = false;
      this._emit();
    });
    this.innerAudio.onStop(() => {
      this.playing = false;
      this._emit();
    });
    this.innerAudio.onEnded(() => this.next());
    this.innerAudio.onError((err) => {
      console.error('[BGM] 播放错误', err);
      this.playing = false;
      this._emit();
    });
  },

  async loadPlaylist() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getMusic' }
      });
      const list = Array.isArray(res.result) ? res.result : [];
      this.playlist = list.filter(t => t.url).map(t => ({
        ...t,
        url: t.url.startsWith('http') ? t.url : SERVER_URL + t.url
      }));
      if (this.playlist.length > 0) {
        this.next();
      }
    } catch (e) {
      console.error('[BGM] 加载播放列表失败', e);
    }
  },

  next() {
    if (!this.playlist.length) return;
    // 随机切歌，排除当前曲目
    let idx;
    if (this.playlist.length === 1) {
      idx = 0;
    } else {
      do {
        idx = Math.floor(Math.random() * this.playlist.length);
      } while (idx === this.currentIndex);
    }
    this.currentIndex = idx;
    const track = this.playlist[this.currentIndex];
    this.songName = track.name || track.title || '';
    this.innerAudio.src = track.url;
    this.innerAudio.play();
    this._emit();
  },

  toggle() {
    if (!this.innerAudio) return;
    if (this.innerAudio.paused) {
      this.innerAudio.play();
    } else {
      this.innerAudio.pause();
    }
  },

  _pos: null,

  setPos(pos) {
    this._pos = pos;
    this._emit();  // 立刻广播给所有实例，消除切 tab 时的位置闪烁
  },

  getPos() { return this._pos; },

  onUpdate(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  },

  _emit() {
    const state = { playing: this.playing, songName: this.songName, pos: this._pos };
    this._listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error('[BGM] listener error', e); }
    });
  }
};

module.exports = bgm;