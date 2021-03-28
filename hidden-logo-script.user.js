// ==UserScript==
// @name         隐藏徽标
// @namespace    https://github.com/GuoChen-thlg
// @version      0.2.0
// @description  隐藏视频播放时出现的网站LOGO
// @author       THLG
// @supportURL   gc.thlg@gmail.com
// @match        *://v.qq.com/*
// @match        *://*.iqiyi.com/*
// @match        *://v.youku.com/*
// @grant        none
// ==/UserScript==
(function () {
    'use strict';
    var style = [
        "[id='mod_player'] [data-role='txp-ui-watermark-mod']",
        ".iqp-player [data-player-hook='logo'].iqp-logo-box",
        "#ykPlayer .youku-layer-logo",

    ].join(',') + "{ display:none !important }"
    var n_style = document.createElement('style')
    n_style.innerHTML = style
    document.getElementsByTagName('head')[0].appendChild(n_style)
})();