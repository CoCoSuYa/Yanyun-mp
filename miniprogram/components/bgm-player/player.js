/**
 * BGM 播放器 — 全局单例模块
 * 在 app.js 中调用 init() 和 loadPlaylist() 初始化
 * custom-tab-bar 直接 require 引用同一个实例
 */
const { SERVER_URL } = require('../config');

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
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const track = this.playlist[this.currentIndex];
    this.songName = track.name || '';
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

  // 拖动位置
  _pos: null,

  setPos(pos) { this._pos = pos; },

  getPos() { return this._pos; },

  /** 注册 UI 刷新回调 */
  onUpdate(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  },

  _emit() {
    const state = { playing: this.playing, songName: this.songName };
    this._listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error('[BGM] listener error', e); }
    });
  }
};

module.exports = bgm;