/**
 * BGM 播放器 — 全局单例模块
 * 在 app.js 中调用 init() 和 loadPlaylist() 初始化
 * bgm-player 组件通过 require 引用同一个实例
 */
const { SERVER_URL } = require('./config');

// 单例对象
const bgm = {
  playlist: [],
  currentIndex: -1,
  innerAudio: null,
  _listeners: [],

  init() {
    this.innerAudio = wx.createInnerAudioContext();
    this.innerAudio.onPlay(() => this._emit({ playing: true }));
    this.innerAudio.onPause(() => this._emit({ playing: false }));
    this.innerAudio.onStop(() => this._emit({ playing: false }));
    this.innerAudio.onEnded(() => this.next());
    this.innerAudio.onError((err) => {
      console.error('[BGM] 播放错误', err);
      this._emit({ playing: false });
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
    this.innerAudio.src = track.url;
    this.innerAudio.play();
    this._emit({ songName: track.name || '' });
  },

  toggle() {
    if (!this.innerAudio) return;
    if (this.innerAudio.paused) {
      this.innerAudio.play();
    } else {
      this.innerAudio.pause();
    }
  },

  getState() {
    const track = this.playlist[this.currentIndex] || {};
    return {
      playing: this.innerAudio ? !this.innerAudio.paused : false,
      songName: track.name || ''
    };
  },

  // ---- 拖动位置持久化（切 tab 时跨组件实例同步） ----
  _pos: null,

  setPos(pos) {
    this._pos = pos;
  },

  getPos() {
    return this._pos;
  },

  // ---- 事件系统 ----

  on(event, fn) {
    this._listeners.push({ event, fn });
    return () => { this._listeners = this._listeners.filter(l => l.fn !== fn); };
  },

  off(event, fn) {
    this._listeners = this._listeners.filter(l => l.event !== event || l.fn !== fn);
  },

  _emit(data) {
    this._listeners.forEach(l => {
      if (l.event === 'stateChange') {
        try { l.fn(data); } catch (e) { console.error('[BGM] listener error', e); }
      }
    });
  }
};

module.exports = bgm;