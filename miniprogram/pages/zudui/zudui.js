const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isPast(ds) {
  return ds < todayStr();
}

function normDate(d) {
  if (!d) return '';
  return String(d).substring(0, 10);
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (_) { return ''; }
}

function fmtDateLabel(ds) {
  const d = new Date(ds + 'T00:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  const today = todayStr();
  if (ds === today) return `今日 · ${m}月${day}日 周${w}`;
  return `${m}月${day}日 周${w}`;
}

function buildDateList() {
  const list = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDS = dateStr(today);

  for (let i = -2; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const ds = dateStr(d);
    list.push({
      date: ds,
      day: d.getDate(),
      label: ds === todayDS ? '今日' : '周' + WEEKDAYS[d.getDay()],
      isPast: ds < todayDS,
      isToday: ds === todayDS,
    });
  }
  return list;
}

function buildCreateDateOptions() {
  const list = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const ds = dateStr(d);
    const label = i === 0
      ? `今日 ${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`
      : `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
    list.push({ date: ds, label });
  }
  return list;
}

function buildHourOptions() {
  const list = [];
  for (let h = 0; h < 24; h++) {
    list.push(String(h).padStart(2, '0') + ':00');
    list.push(String(h).padStart(2, '0') + ':30');
  }
  return list;
}

Page({
  data: {
    isBound: false,
    loading: false,
    statusBarHeight: 20,
    allTeams: [],
    filteredTeams: [],
    selectedDate: '',
    dateList: [],
    dateLabelText: '',
    emptyTip: '',
    scrollIntoDate: '',

    showCreate: false,
    typeOptions: ['五人本（5人）', '十人本（10人）'],
    typeIndex: 0,
    purposeOptions: ['日常', '天赋'],
    purposeIndex: 0,
    createDateOptions: [],
    createDateIndex: 0,
    hourOptions: [],
    hourIndex: 0,

    showActions: false,
    actionList: [],
    _actionTeam: null,
    _isEditMode: false,

  },

  onLoad() {
    const app = getApp();
    if (app && app.globalData) {
      this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    }
  },

  onShow() {
    this._setTabSelected(1);
    this._checkBind();
    const tb = this.getTabBar && this.getTabBar();
    if (tb && tb.syncBgmState) tb.syncBgmState();
  },

  _setTabSelected(idx) {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setData) {
      this.getTabBar().setData({ selected: idx });
    }
  },

  _checkBind() {
    const user = wx.getStorageSync('boundUser');
    if (user && user.id) {
      this.setData({ isBound: true });
      this._initDateBar();
      this._loadTeams();
    } else {
      this.setData({ isBound: false });
    }
  },

  _initDateBar() {
    const dateList = buildDateList();
    const today = todayStr();
    const selected = this.data.selectedDate || today;
    this.setData({
      dateList,
      selectedDate: selected,
      scrollIntoDate: 'date-' + selected,
      dateLabelText: fmtDateLabel(selected),
      emptyTip: isPast(selected) ? '往昔已逝，此日无队可寻' : '此日尚无队伍\n江湖路宽，可率先聚义',
    });
  },

  async _loadTeams() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'getTeams' }
      });
      const raw = res.result;
      let teams = [];
      if (Array.isArray(raw)) {
        teams = raw;
      } else if (raw && raw.error) {
        console.error('[getTeams error]', raw.error);
        wx.showToast({ title: raw.error, icon: 'none' });
      }
      teams = teams.map(t => ({ ...t, date: normDate(t.date) }));
      this.setData({ allTeams: teams });
      this._filterTeams();
    } catch (e) {
      console.error('[加载队伍失败]', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  _filterTeams() {
    const user = wx.getStorageSync('boundUser');
    const date = this.data.selectedDate;
    const list = this.data.allTeams
      .filter(t => t.date === date)
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .map(t => {
        const isMine = user && t.members.some(m => m.userId === user.id);
        const isFull = t.members.length >= t.maxSize;
        const slots = [];
        for (let i = 0; i < t.maxSize; i++) {
          const m = t.members[i];
          if (m) {
            slots.push({
              idx: i,
              empty: false,
              gameName: m.gameName,
              mainStyle: m.mainStyle,
              subStyle: m.subStyle || '',
              isLeader: m.userId === t.leaderId,
            });
          } else {
            slots.push({ idx: i, empty: true });
          }
        }
        return {
          ...t,
          _isMine: isMine,
          _isFull: isFull,
          _timeStr: fmtTime(t.time),
          _slots: slots,
        };
      });

    this.setData({
      filteredTeams: list,
      emptyTip: isPast(date) ? '往昔已逝，此日无队可寻' : '此日尚无队伍\n江湖路宽，可率先聚义',
    });
  },

  onSelectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({
      selectedDate: date,
      dateLabelText: fmtDateLabel(date),
    });
    this._filterTeams();
  },

  _isAdmin() {
    const user = wx.getStorageSync('boundUser');
    return !!(user && user.isAdmin);
  },

  // ===== 卡片点击 =====
  onCardTap(e) {
    const teamId = e.currentTarget.dataset.teamId;
    const team = this.data.allTeams.find(t => t.id === teamId);
    if (!team) return;

    const user = wx.getStorageSync('boundUser');
    if (!user) return;

    const isMine = team.members.some(m => m.userId === user.id);
    const isFull = team.members.length >= team.maxSize;
    const isLeader = team.leaderId === user.id;
    const isAdmin = this._isAdmin();
    const timePassed = new Date(team.time) <= new Date();

    if (isPast(this.data.selectedDate) && !isAdmin) {
      wx.showToast({ title: '往昔队伍不可相邀，请择他日再聚', icon: 'none' });
      return;
    }

    const actions = [];

    if (isMine) {
      if (isLeader) {
        actions.push({ label: '修改时间', action: 'editTime' });
      }
      actions.push({ label: '辞队而去', danger: true, action: 'leave' });
    } else {
      if (!isAdmin) {
        if (isFull) {
          wx.showToast({ title: '队伍已满员，暂难容纳更多游侠', icon: 'none' });
          return;
        }
        if (timePassed) {
          wx.showToast({ title: '此队已过开本时间，无法加入', icon: 'none' });
          return;
        }
      }
      if (!isFull && !timePassed) {
        actions.push({ label: '入队相邀', action: 'join' });
      }
    }

    if (isAdmin) {
      if (!isLeader) {
        actions.push({ label: '修改时间', action: 'editTime' });
      }
      actions.push({ label: '散伙议事', danger: true, action: 'dissolve' });
    }

    if (!actions.length) return;

    this.setData({
      showActions: true,
      actionList: actions,
      _actionTeam: team,
    });
  },

  onActionTap(e) {
    const idx = e.currentTarget.dataset.index;
    const action = this.data.actionList[idx];
    const team = this.data._actionTeam;
    this.setData({ showActions: false });

    if (!action || !team) return;

    switch (action.action) {
      case 'join':      this._doJoin(team); break;
      case 'leave':     this._doLeave(team); break;
      case 'editTime':  this._showEditTime(team); break;
      case 'dissolve':  this._doDissolve(team); break;
    }
  },

  onCloseActions() {
    this.setData({ showActions: false });
  },

  // ===== 入队 =====
  async _doJoin(team) {
    const user = wx.getStorageSync('boundUser');
    if (!user) return;
    wx.showLoading({ title: '入队中…' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: { action: 'joinTeam', teamId: team.id, userId: user.id }
      });
      const result = res.result;
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' });
        return;
      }
      wx.showToast({ title: '已入队，江湖再聚！', icon: 'success' });
      this._loadTeams();
    } catch (e) {
      console.error('[入队失败]', e);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ===== 离队 =====
  async _doLeave(team) {
    const user = wx.getStorageSync('boundUser');
    if (!user) return;

    wx.showModal({
      title: '辞队确认',
      content: '确定要辞队而去吗？',
      success: async ({ confirm }) => {
        if (!confirm) return;
        wx.showLoading({ title: '离队中…' });
        try {
          const res = await wx.cloud.callFunction({
            name: 'yanyunApi',
            data: { action: 'leaveTeam', teamId: team.id, userId: user.id }
          });
          const result = res.result;
          if (result.error) {
            wx.showToast({ title: result.error, icon: 'none' });
            return;
          }
          wx.showToast({ title: '已辞队而去', icon: 'success' });
          this._loadTeams();
        } catch (e) {
          console.error('[离队失败]', e);
          wx.showToast({ title: '网络异常', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // ===== 解散队伍（管理员） =====
  _doDissolve(team) {
    wx.showModal({
      title: '散伙议事',
      content: '确定要解散此队伍吗？此操作不可撤回。',
      confirmColor: '#e05050',
      success: async ({ confirm }) => {
        if (!confirm) return;
        const user = wx.getStorageSync('boundUser');
        if (!user) return;
        wx.showLoading({ title: '解散中…' });
        try {
          const res = await wx.cloud.callFunction({
            name: 'yanyunApi',
            data: { action: 'dissolveTeam', teamId: team.id, adminId: user.id }
          });
          const result = res.result;
          if (result.error) {
            wx.showToast({ title: result.error, icon: 'none' });
            return;
          }
          wx.showToast({ title: '队伍已解散', icon: 'success' });
          this._loadTeams();
        } catch (e) {
          console.error('[解散失败]', e);
          wx.showToast({ title: '网络异常', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // ===== 修改时间（队长/管理员） =====
  _showEditTime(team) {
    const createDateOptions = buildCreateDateOptions();
    const hourOptions = buildHourOptions();

    let dateIdx = createDateOptions.findIndex(o => o.date === team.date);
    if (dateIdx < 0) dateIdx = 0;

    const timeStr = fmtTime(team.time);
    let hourIdx = hourOptions.indexOf(timeStr);
    if (hourIdx < 0) hourIdx = 0;

    this._editTeam = team;
    this.setData({
      showCreate: true,
      createDateOptions,
      createDateIndex: dateIdx,
      hourOptions,
      hourIndex: hourIdx,
      _isEditMode: true,
    });
  },

  // ===== 新建队伍 =====
  onCreateTap() {
    const user = wx.getStorageSync('boundUser');
    if (!user) {
      wx.showToast({ title: '请先绑定身份', icon: 'none' });
      return;
    }
    const now = new Date();
    const hourOptions = buildHourOptions();
    const defHour = String(now.getHours()).padStart(2, '0') + ':00';
    let hourIdx = hourOptions.indexOf(defHour);
    if (hourIdx < 0) hourIdx = 0;

    const createDateOptions = buildCreateDateOptions();
    let dateIdx = 0;
    if (this.data.selectedDate && !isPast(this.data.selectedDate)) {
      const found = createDateOptions.findIndex(o => o.date === this.data.selectedDate);
      if (found >= 0) dateIdx = found;
    }

    this.setData({
      showCreate: true,
      typeIndex: 0,
      purposeIndex: 0,
      createDateOptions,
      createDateIndex: dateIdx,
      hourOptions,
      hourIndex: hourIdx,
      _isEditMode: false,
    });
  },

  onCloseCreate() {
    this.setData({ showCreate: false });
    this._editTeam = null;
  },

  onTypeChange(e) { this.setData({ typeIndex: +e.detail.value }); },
  onPurposeChange(e) { this.setData({ purposeIndex: +e.detail.value }); },
  onCreateDateChange(e) { this.setData({ createDateIndex: +e.detail.value }); },
  onHourChange(e) { this.setData({ hourIndex: +e.detail.value }); },

  async onSubmitCreate() {
    const user = wx.getStorageSync('boundUser');
    if (!user) return;

    const { _isEditMode } = this.data;

    if (_isEditMode && this._editTeam) {
      return this._submitEditTime();
    }

    const typeVal = this.data.typeIndex === 0 ? '五人本' : '十人本';
    const purposeVal = this.data.purposeOptions[this.data.purposeIndex];
    const dateVal = this.data.createDateOptions[this.data.createDateIndex].date;
    const hourVal = this.data.hourOptions[this.data.hourIndex];

    const dt = new Date(dateVal + 'T' + hourVal + ':00');
    if (isNaN(dt.getTime())) {
      wx.showToast({ title: '时间格式错误', icon: 'none' });
      return;
    }
    if (dt <= new Date()) {
      wx.showToast({ title: '往昔不可追，请择他日', icon: 'none' });
      return;
    }

    this.setData({ showCreate: false });
    wx.showLoading({ title: '创建队伍中…' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: {
          action: 'createTeam',
          type: typeVal,
          purpose: purposeVal,
          time: dt.toISOString(),
          date: dateVal,
          userId: user.id,
        }
      });
      const result = res.result;
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' });
        return;
      }
      wx.showToast({ title: '队伍已建，广邀江湖同道！', icon: 'success' });
      this.setData({ selectedDate: dateVal, dateLabelText: fmtDateLabel(dateVal) });
      this._loadTeams();
    } catch (e) {
      console.error('[创建队伍失败]', e);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async _submitEditTime() {
    const team = this._editTeam;
    const user = wx.getStorageSync('boundUser');
    if (!team || !user) return;

    const dateVal = this.data.createDateOptions[this.data.createDateIndex].date;
    const hourVal = this.data.hourOptions[this.data.hourIndex];
    const dt = new Date(dateVal + 'T' + hourVal + ':00');

    if (isNaN(dt.getTime()) || dt <= new Date()) {
      wx.showToast({ title: '时间不可早于当前时刻', icon: 'none' });
      return;
    }

    this.setData({ showCreate: false });
    wx.showLoading({ title: '修改中…' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'yanyunApi',
        data: {
          action: 'changeTeamTime',
          teamId: team.id,
          leaderId: user.id,
          time: dt.toISOString(),
          date: dateVal,
        }
      });
      const result = res.result;
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' });
        return;
      }
      wx.showToast({ title: '时间已修改', icon: 'success' });
      this._loadTeams();
    } catch (e) {
      console.error('[修改时间失败]', e);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
      this._editTeam = null;
    }
  },

  goToBind() {
    wx.switchTab({ url: '/pages/shenfan/shenfan' });
  },
});
