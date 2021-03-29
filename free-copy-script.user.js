// ==UserScript==
// @name                Free Copy
// @name:CN:zh          自由复制
// @namespace           https://github.com/GuoChen-thlg
// @version             0.1.0
// @description         支持复制受限网站的文本内容
// @author              THLG
// @supportURL          gc.thlg@gmail.com
// @updateURL           https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/free-copy-script.user.js
// @installURL          https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/free-copy-script.user.js
// @downloadURL         https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/free-copy-script.user.js
// @contributionURL     https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CK755FJ9PSBZ8
// @contributionAmount  1
// @match               *://wenku.baidu.com/*
// @match               *
// @grant               none
// @run-at              document-end
// ==/UserScript==
(function () {
    'use strict';
    function rejectOtherHandlers (e) {
        e.stopPropagation()
        if (e.stopImmediatePropagation) {
            e.stopImmediatePropagation()
        }
    }
    [
        'copy',
        'keydown',
        'keyup',
    ].forEach((event) => {
        document.documentElement.addEventListener(event, rejectOtherHandlers, {
            capture: true,
        })
    })
    var style = [
        "*::before",
        "*",
        "*::after",
    ].join(',') + "{ user-select: initial !important;\n -webkit-user-select: initial !important; }"
    var n_style = document.createElement('style')
    n_style.innerHTML = style
    document.getElementsByTagName('head')[0].appendChild(n_style)
})();