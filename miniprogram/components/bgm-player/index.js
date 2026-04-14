const app = getApp();

Component({
  data: {
    isPlaying: false,
    statusBarHeight: 20,
    x: 16,
    y: 28
  },

  lifetimes: {
    attached() {
      // 获取状态栏高度用于定位
      if (app && app.globalData) {
        const sHeight = app.globalData.statusBarHeight || 20;
        this.setData({ 
          statusBarHeight: sHeight,
          x: 16, // 左侧留出一点边距
          y: sHeight + 8 // 初始放在标题栏位置
        });
        
        const bgm = app.globalData.bgm;
        if (bgm) {
          // 初始化状态
          this.setData({ isPlaying: !bgm.paused });

          // 监听播放器事件（避免重复绑定，微信会自动管理多次绑定或可以用箭头函数保持上下文）
          bgm.onPlay(() => {
            this.setData({ isPlaying: true });
          });
          bgm.onPause(() => {
            this.setData({ isPlaying: false });
          });
          bgm.onStop(() => {
            this.setData({ isPlaying: false });
          });
          bgm.onEnded(() => {
            this.setData({ isPlaying: false });
          });
          bgm.onError(() => {
            this.setData({ isPlaying: false });
          });
        }
      }
    }
  },

  methods: {
    togglePlay() {
      if (!app || !app.globalData || !app.globalData.bgm) {
        if (app) app.initBGM(); // 如果因为异常没有初始化，重新初始化一把
        return;
      }
      
      const bgm = app.globalData.bgm;
      if (bgm.paused) {
        bgm.play();
      } else {
        bgm.pause();
      }
    }
  }
});
