// ==UserScript==
// @name                自动跳转
// @namespace           https://github.com/GuoChen-thlg
// @version             1.0.5
// @description         自动跳转链接 懒人小工具
// @author              THLG
// @supportURL          gc.thlg@gmail.com
// @updateURL           https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/automate-skip-to-script.user.js
// @installURL          https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/automate-skip-to-script.user.js
// @downloadURL         https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/automate-skip-to-script.user.js
// @contributionURL     https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CK755FJ9PSBZ8
// @contributionAmount  1
// @match               *://link.juejin.cn/*
// @match               *://link.csdn.net/*
// @match               *://link.zhihu.com/*
// @match               *://gitee.com/*
// @match               *://cloud.tencent.com/*
// @match               *://www.jianshu.com/*
// @match               *://blog.51cto.com/*
// @grant               none
// @run-at              document-end
// ==/UserScript==
(function () {
    'use strict';
    const url = new URL(location.href)
    if (['link.juejin.cn', 'link.csdn.net', 'link.zhihu.com', 'gitee.com', 'cloud.tencent.com'].includes(url.host)) {
        if (url.searchParams.get('target')) {
            location.href = decodeURIComponent(url.searchParams.get('target'))
        }
    }
    if (['www.jianshu.com'].includes(url.host)) {
        if (url.searchParams.get('url')) {
            location.href = decodeURIComponent(url.searchParams.get('url'))
        }
    }
    if (['blog.51cto.com'].includes(url.host) && location.pathname === '/transfer') {
        const target_url = url.href.split('?').slice(1).join('?')
        if (target_url) {
            location.href = decodeURIComponent(target_url)
        }
    }

})();