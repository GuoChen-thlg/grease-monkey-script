// ==UserScript==
// @name         隐藏徽标
// @namespace    https://github.com/GuoChen-thlg
// @version      0.1.0
// @description  隐藏视频播放时出现的网站LOGO
// @author       THLG
// @supportURL   gc.thlg@gmail.com
// @match        *://v.qq.com/*
// @match        *://*.iqiyi.com/*
// @grant        none
// ==/UserScript==
(function () {
    'use strict';
    const style = `
    
    
    .iqp-player [data-player-hook="logo"].iqp-logo-box,
    [id="mod_player"] [data-role="txp-ui-watermark-mod"]{
        display:none !important
    }`
    const n_style = document.createElement('style')
    n_style.innerHTML = style
    document.querySelector('head').appendChild(n_style)
})();