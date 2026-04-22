/**
 * 通用校验逻辑（与 yanyun 项目 submitRegister 校验规则一致）
 */

/** 校验注册表单，返回错误信息或空字符串 */
function validateRegister({ gameName, guildName, mainStyle, subStyle, password, password2 }) {
  if (!gameName) return '游戏名不可为空';
  if (!/^[\u4e00-\u9fa5]{1,8}$/.test(gameName)) return '游戏名仅允许1-8个中文字符';
  if (!guildName) return '百业名不可为空';
  if (guildName !== '百舸争流') return '非本百业游侠，暂无法使用此功能';
  if (!mainStyle) return '主流派不可为空';
  if (!/^[\u4e00-\u9fa5]{1,2}$/.test(mainStyle)) return '主流派仅允许最多2个中文字符';
  if (subStyle && !/^[\u4e00-\u9fa5]{1,2}$/.test(subStyle)) return '副流派仅允许最多2个中文字符';
  if (!password || password.length < 6) return '密码不可少于6位';
  if (password !== password2) return '两次密码输入不一致';
  return '';
}

/** 校验登录表单 */
function validateLogin({ gameName, password }) {
  if (!gameName) return '请输入游戏名';
  if (!password) return '请输入密码';
  return '';
}

module.exports = { validateRegister, validateLogin };
