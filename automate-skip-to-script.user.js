// ==UserScript==
// @name                自动跳转
// @namespace           https://github.com/GuoChen-thlg
// @version             1.0.2
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
// @grant               none
// @run-at              document-end
// ==/UserScript==
(function () {
    'use strict';
    // juejin.cn
    const url = new URL(location.href)
    if(url.host === 'link.juejin.cn' || url.host === 'link.csdn.net' || url.host === 'link.zhihu.com' || url.host === 'gitee.com'){
        location.href = decodeURIComponent(url.searchParams.get('target'))
    }
    // code
})();