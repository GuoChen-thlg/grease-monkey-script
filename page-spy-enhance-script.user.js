// ==UserScript==
// @name                PageSpy 日志增强
// @namespace           https://github.com/GuoChen-thlg
// @version             1.1.0
// @description         PageSpy 回放页 & 远程调试页日志筛选增强：类型/级别/关键词过滤，支持复制导出
// @author              THLG
// @supportURL          gc.thlg@gmail.com
// @updateURL           https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/page-spy-enhance-script.user.js
// @installURL          https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/page-spy-enhance-script.user.js
// @downloadURL         https://github.com/GuoChen-thlg/grease-monkey-script/raw/master/page-spy-enhance-script.user.js
// @contributionURL     https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CK755FJ9PSBZ8
// @contributionAmount  1
// @match               *://*/*
// @match               *://*/**
// @grant               GM_addStyle
// @grant               GM_setClipboard
// @grant               GM_getValue
// @grant               GM_setValue
// @run-at              document-end
// ==/UserScript==
(function () {
    'use strict';

    var psConsoleData = [];

    ;(function () {
        var originalDispatchEvent = EventTarget.prototype.dispatchEvent;
        EventTarget.prototype.dispatchEvent = function (event) {
            if (event && event.type === 'console' && typeof event.detail !== 'undefined') {
                var data = event.detail;
                if (data && data.logType && data.logs && Array.isArray(data.logs)) {
                    psConsoleData.push(data);
                }
            }
            return originalDispatchEvent.call(this, event);
        };
    })();

    var rawData = [];
    var filteredData = [];
    var STORAGE_KEY = 'page-spy-enhance-state';
    var consoleDataCache = new Map();
    var nextItemId = 0;
    var expandedItems = new Set();
    var defaultState = {
        types: { console: true, network: false, storage: false, system: false, meta: false },
        logLevels: { log: true, info: true, warn: true, error: true },
        search: '',
        isLoading: false,
        error: null,
    };
    var state = loadState();
    var devtoolsMode = false;
    var keywordSyncSetup = false;
    var PANEL_STATE_KEY = 'page-spy-enhance-panel-state';

    function loadPanelState() {
        if (typeof GM_getValue === 'undefined') return 'visible';
        var saved = GM_getValue(PANEL_STATE_KEY);
        if (saved === null || saved === undefined) return 'visible';
        return saved === 'hidden' ? 'hidden' : 'visible';
    }

    function savePanelState(state) {
        if (typeof GM_setValue === 'undefined') return;
        GM_setValue(PANEL_STATE_KEY, state);
    }

    GM_addStyle(
        '.ps-toggle-btn{position:fixed;top:60px;right:20px;z-index:99997;padding:4px 8px;background:#1e1e2e;border:1px solid #45475a;border-radius:6px;color:#cdd6f4;cursor:pointer;font-size:11px}' +
        '.ps-toggle-btn:hover{background:#313244}' +
        '.ps-f-overlay{position:fixed;top:60px;right:20px;z-index:99998;width:460px;max-height:calc(100vh - 100px);background:#1e1e2e;border:1px solid #45475a;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);display:flex;flex-direction:column;color:#cdd6f4;font-size:13px;overflow:hidden}' +
        '.ps-f-overlay.collapsed .ps-f-body,.ps-f-overlay.collapsed .ps-f-footer{display:none}' +
        '.ps-f-overlay.hidden{display:none}' +
        '.ps-f-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#181825;border-bottom:1px solid #313244;cursor:move;flex-shrink:0}' +
        '.ps-f-header h3{margin:0;font-size:14px;font-weight:600;color:#cdd6f4}' +
        '.ps-f-actions{display:flex;gap:6px}' +
        '.ps-f-actions button{background:none;border:none;color:#a6adc8;cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px}' +
        '.ps-f-actions button:hover{background:#313244;color:#cdd6f4}' +
        '.ps-f-body{padding:12px 14px 0;flex:1;display:flex;flex-direction:column;overflow:hidden}' +
        '.ps-f-section{margin-bottom:10px;flex-shrink:0}' +
        '.ps-f-section label{display:block;font-size:11px;color:#a6adc8;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px}' +
        '.ps-f-btns{display:flex;flex-wrap:wrap;gap:4px}' +
        '.ps-f-btns button{padding:3px 10px;border:1px solid #45475a;border-radius:6px;background:#313244;color:#cdd6f4;cursor:pointer;font-size:12px}' +
        '.ps-f-btns button:hover{background:#45475a}' +
        '.ps-f-btns button.active{background:#89b4fa;color:#1e1e2e;border-color:#89b4fa}' +
        '.ps-f-lv{display:flex;gap:4px;margin-top:6px}' +
        '.ps-f-lv button{padding:2px 10px;border:1px solid #45475a;border-radius:4px;background:#313244;color:#cdd6f4;cursor:pointer;font-size:11px}' +
        '.ps-f-lv button:hover{background:#45475a}' +
        '.ps-f-lv button.active{background:#585b70}' +
        '.ps-f-lv button.lv-error{color:#f38ba8}' +
        '.ps-f-lv button.lv-warn{color:#fab387}' +
        '.ps-f-lv button.lv-info{color:#89b4fa}' +
        '.ps-f-lv button.lv-log{color:#cdd6f4}' +
        '.ps-f-lv button.active.lv-error{background:#f38ba8;color:#1e1e2e;border-color:#f38ba8}' +
        '.ps-f-lv button.active.lv-warn{background:#fab387;color:#1e1e2e;border-color:#fab387}' +
        '.ps-f-lv button.active.lv-info{background:#89b4fa;color:#1e1e2e;border-color:#89b4fa}' +
        '.ps-f-lv button.active.lv-log{background:#7f849c;color:#1e1e2e;border-color:#cdd6f4}' +
        '.ps-f-search-inline{width:100%;padding:6px 10px;background:#313244;border:1px solid #45475a;border-radius:6px;color:#cdd6f4;font-size:12px;outline:none;box-sizing:border-box}' +
        '.ps-f-search-inline:focus{border-color:#89b4fa}' +
        '.ps-f-stats{font-size:11px;color:#6c7086;margin-top:6px;margin-bottom:0;display:flex;justify-content:space-between;flex-shrink:0}' +
        '.ps-f-list{flex:1;overflow-y:auto;border-top:1px solid #313244;padding:4px 0}' +
        '.ps-f-item{padding:6px 14px;border-bottom:1px solid #252536;cursor:pointer;font-size:12px;line-height:1.4}' +
        '.ps-f-item:hover{background:#313244}' +
        '.ps-f-item .tag{display:inline-block;padding:0 4px;border-radius:3px;font-size:10px;font-weight:600;margin-right:6px}' +
        '.ps-f-item .tag.log{color:#cdd6f4;background:#45475a}' +
        '.ps-f-item .tag.info{color:#89b4fa;background:#1e3a5f}' +
        '.ps-f-item .tag.warn{color:#fab387;background:#5a4a32}' +
        '.ps-f-item .tag.error{color:#f38ba8;background:#5a303a}' +
        '.ps-f-item .ts{color:#6c7086;font-size:10px;margin-right:8px}' +
        '.ps-f-item .msg{color:#cdd6f4;word-break:break-all}' +
        '.ps-f-item .msg.url{color:#89b4fa}' +
        '.ps-f-item.network{padding:6px 14px}' +
        '.ps-f-item.network .method{display:inline-block;padding:0 4px;border-radius:3px;font-size:10px;font-weight:600;color:#1e1e2e;background:#a6e3a1;margin-right:6px}' +
        '.ps-f-item.network .url{color:#89b4fa;word-break:break-all}' +
        '.ps-f-item.network .status{color:#6c7086;font-size:11px}' +
        '.ps-f-footer{padding:8px 14px;border-top:1px solid #313244;display:flex;gap:6px;background:#181825;flex-shrink:0}' +
        '.ps-f-footer button{padding:6px 12px;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer}' +
        '.ps-btn-copy{background:#89b4fa;color:#1e1e2e;flex:1}' +
        '.ps-btn-copy:hover{background:#b4d0fb}' +
        '.ps-btn-refresh{background:#313244;color:#cdd6f4;border:1px solid #45475a}' +
        '.ps-btn-toggle-all{background:#313244;color:#cdd6f4;border:1px solid #45475a}' +
        '.ps-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#a6e3a1;color:#1e1e2e;padding:8px 20px;border-radius:8px;font-size:13px;z-index:100000;box-shadow:0 4px 12px rgba(0,0,0,0.3)}' +
        '.ps-toast.err{background:#f38ba8}' +
        '.ps-loading{text-align:center;padding:20px;color:#6c7086;font-size:13px}' +
        '.ps-error{text-align:center;padding:40px;color:#f38ba8;font-size:13px}' +
        '.ps-f-empty{text-align:center;padding:20px;color:#6c7086;font-size:12px}' +
        '.ps-f-highlight{background:#f9e2af;color:#1e1e2e;border-radius:2px;padding:0 2px}' +
        '.ps-f-msg-truncate{max-height:4.5em;overflow:hidden}' +
        '.ps-f-msg-truncate.expanded{max-height:none}' +
        '.ps-f-expand{color:#89b4fa;cursor:pointer;font-size:11px;margin-left:4px;white-space:nowrap}' +
        '.ps-f-expand:hover{text-decoration:underline}'
    );

    function resolveLogUrl() {
        var hash = window.location.hash;
        var m = hash.match(/[?&]url=([^&]*)/);
        if (!m) return null;
        var url = decodeURIComponent(m[1]);
        if (!url.includes('fileId=')) {
            var rest = hash.slice(hash.indexOf(m[1]) + m[1].length);
            if (rest.startsWith('?') || rest.startsWith('&')) {
                var p = new URLSearchParams(rest);
                var fid = p.get('fileId');
                if (fid) url += '?fileId=' + fid;
            }
        }
        return url;
    }

    function isPageSpyRoute() {
        var hash = window.location.hash;
        return hash.indexOf('#/replay') === 0 || hash.indexOf('#/devtools') === 0;
    }

    function cloneState(source) {
        return {
            types: {
                console: !!source.types.console,
                network: !!source.types.network,
                storage: !!source.types.storage,
                system: !!source.types.system,
                meta: !!source.types.meta,
            },
            logLevels: {
                log: !!source.logLevels.log,
                info: !!source.logLevels.info,
                warn: !!source.logLevels.warn,
                error: !!source.logLevels.error,
            },
            search: source.search || '',
            isLoading: false,
            error: null,
        };
    }

    function loadState() {
        if (typeof GM_getValue === 'undefined') return cloneState(defaultState);
        var saved = GM_getValue(STORAGE_KEY);
        if (!saved || typeof saved !== 'object') return cloneState(defaultState);
        return cloneState({
            types: saved.types || defaultState.types,
            logLevels: saved.logLevels || defaultState.logLevels,
            search: saved.search || '',
        });
    }

    function persistState() {
        if (typeof GM_setValue === 'undefined') return;
        GM_setValue(STORAGE_KEY, {
            types: state.types,
            logLevels: state.logLevels,
            search: state.search,
        });
    }

    function removeFloatingUi() {
        var overlay = document.querySelector('.ps-f-overlay');
        var toggle = document.querySelector('.ps-toggle-btn');
        var copyBtn = document.querySelector('.ps-copy-btn');
        if (overlay) overlay.remove();
        if (toggle) toggle.remove();
        if (copyBtn) copyBtn.closest('.ant-space-item').remove();
    }

    function fetchLogData() {
        var logUrl = resolveLogUrl();
        if (!logUrl) return;
        state.isLoading = true;
        state.error = null;
        consoleDataCache.clear();
        renderFloating();
        var token = localStorage.getItem('page-spy-auth-token') || '';
        var headers = {};
        if (logUrl.startsWith(window.location.origin) || logUrl.startsWith('/')) {
            if (token) headers['Authorization'] = 'Bearer ' + token;
        }
        fetch(logUrl, { headers: headers })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (data) { rawData = data; state.isLoading = false; applyFilters(); })
            .catch(function (err) { state.isLoading = false; state.error = err.message; renderFloating(); });
    }

    function applyFilters() {
        if (devtoolsMode) refreshConsoleData();
        filteredData = rawData.filter(function (item) {
            var normalized = getNormalizedItem(item);
            var data = normalized.data || {};
            if (!state.types[normalized.type]) return false;
            if (normalized.type === 'console' && !state.logLevels[data.logType || 'log']) return false;
            if (state.search) {
                var searchRegex = getSearchRegex(state.search, false);
                var textParts = [normalized.type, data.url, data.logType].concat(
                    (data.logs || []).map(function (l) { return l.value; }),
                    [data.method, data.name]
                ).filter(Boolean);
                var text = textParts.join(' ');
                if (searchRegex) {
                    if (!searchRegex.test(text)) return false;
                } else {
                    if (text.toLowerCase().indexOf(state.search.toLowerCase()) === -1) return false;
                }
            }
            return true;
        });
        persistState();
        renderFloating();
    }

    function inflateData(input) {
        if (typeof input !== 'string' || typeof DecompressionStream === 'undefined') {
            return Promise.resolve(null);
        }
        try {
            var bytes = Uint8Array.from(input, function (ch) { return ch.charCodeAt(0) & 0xff; });
            var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
            return new Response(stream).text().then(function (text) {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return null;
                }
            }, function () {
                return null;
            });
        } catch (e) {
            return Promise.resolve(null);
        }
    }

    function getItemCacheKey(item) {
        return item.type + ':' + String(item.timestamp) + ':' + String(item.data || '');
    }

    function getNormalizedItem(item) {
        if (!item) return item;
        if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) return item;

        var key = getItemCacheKey(item);
        var cached = consoleDataCache.get(key);
        if (cached) return cached.value;

        consoleDataCache.set(key, { value: item });
        inflateData(item.data).then(function (parsed) {
            if (!parsed) return;
            consoleDataCache.set(key, {
                value: {
                    type: item.type,
                    timestamp: item.timestamp,
                    data: parsed,
                }
            });
            applyFilters();
        });
        return item;
    }

    function fmtTime(ts) {
        var d = new Date(ts);
        return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getSearchRegex(search, global) {
        if (!search) return null;
        var m = search.match(/^\/(.+)\/([gimsuy]*)$/);
        if (m) {
            try {
                var flags = m[2] || '';
                if (global && flags.indexOf('g') === -1) flags = 'g' + flags;
                if (flags.indexOf('i') === -1) flags = 'i' + flags;
                return new RegExp(m[1], flags);
            } catch (e) { return null; }
        }
        return null;
    }

    function highlightHtml(raw, search) {
        if (!search) return escapeHtml(raw);
        var regex = getSearchRegex(search, true);
        if (!regex) {
            var q = search.toLowerCase();
            var lower = raw.toLowerCase();
            var result = '';
            var last = 0;
            var idx;
            while ((idx = lower.indexOf(q, last)) !== -1) {
                result += escapeHtml(raw.substring(last, idx));
                result += '<span class="ps-f-highlight">' + escapeHtml(raw.substring(idx, idx + q.length)) + '</span>';
                last = idx + q.length;
            }
            result += escapeHtml(raw.substring(last));
            return result;
        }
        var result = '';
        var last = 0;
        var match;
        while ((match = regex.exec(raw)) !== null) {
            result += escapeHtml(raw.substring(last, match.index));
            result += '<span class="ps-f-highlight">' + escapeHtml(match[0]) + '</span>';
            last = regex.lastIndex;
            if (match.index === regex.lastIndex) break;
        }
        result += escapeHtml(raw.substring(last));
        return result;
    }

    function renderItem(item) {
        item = getNormalizedItem(item);
        var id = 'ps-i-' + (nextItemId++);
        if (item.type === 'console') {
            var ts = fmtTime(item.timestamp);
            var data = item.data || {};
            var lv = (data.logType || 'log').toLowerCase();
            var msg = (data.logs || []).map(function (l) {
                return l.type === 'json'
                    ? (function () { try { return JSON.stringify(JSON.parse(l.value), null, 2); } catch (e) { return l.value; } })()
                    : l.value;
            }).join(' ');
            var url = data.url || '';
            var urlHtml = url ? '<span class="msg url">[' + escapeHtml(url) + ']</span> ' : '';
            var truncated = !expandedItems.has(id) && msg.length > 500;
            var displayMsg = truncated ? msg.substring(0, 500) : msg;
            var msgHtml = '<span class="msg">' + highlightHtml(displayMsg, state.search) + '</span>';
            if (truncated) {
                msgHtml = '<div class="ps-f-msg-truncate">' + msgHtml + '</div>' +
                    '<span class="ps-f-expand" data-id="' + id + '">... 展开</span>';
            } else if (msg.length > 500) {
                msgHtml = '<div class="ps-f-msg-truncate expanded">' + msgHtml + '</div>' +
                    '<span class="ps-f-expand" data-id="' + id + '">收起</span>';
            }
            return '<div class="ps-f-item console" data-ps-id="' + id + '">' +
                '<span class="tag ' + lv + '">' + lv.toUpperCase() + '</span>' +
                '<span class="ts">' + ts + '</span>' +
                urlHtml +
                msgHtml +
                '</div>';
        } else if (item.type === 'network') {
            var d = item.data;
            var ts2 = fmtTime(item.timestamp);
            var method = d.method || 'GET';
            var url2 = d.url || '';
            var status = d.status || '-';
            var cost = d.costTime ? d.costTime + 'ms' : '-';
            return '<div class="ps-f-item network">' +
                '<span class="ts">' + ts2 + '</span>' +
                '<span class="method">' + method + '</span>' +
                '<span class="url">' + escapeHtml(url2.substring(0, 100)) + '</span>' +
                '<span class="status"> ' + status + ' | ' + cost + '</span>' +
                '</div>';
        }
        return '';
    }

    function renderFloating() {
        var overlay = document.querySelector('.ps-f-overlay');
        if (!overlay) return;
        var body = overlay.querySelector('.ps-f-body');
        if (!body) return;

        var activeEl = document.activeElement;
        var wasSearchFocused = activeEl && activeEl.classList.contains('ps-f-search-inline');
        var selStart = wasSearchFocused ? activeEl.selectionStart : 0;
        var selEnd = wasSearchFocused ? activeEl.selectionEnd : 0;

        var html = '';
        html += '<div class="ps-f-section"><label>类型</label><div class="ps-f-btns">';
        var typeKeys = Object.keys(state.types);
        for (var tk = 0; tk < typeKeys.length; tk++) {
            var k = typeKeys[tk];
            var v = state.types[k];
            html += '<button class="' + (v ? 'active ' : '') + '" data-cmd="type" data-key="' + k + '">' + k + '</button>';
        }
        html += '</div></div>';

        html += '<div class="ps-f-section" id="ps-lv-sec" style="' + (state.types.console ? '' : 'display:none') + '"><label>日志级别</label><div class="ps-f-lv">';
        var lvKeys = Object.keys(state.logLevels);
        for (var lk = 0; lk < lvKeys.length; lk++) {
            var lk2 = lvKeys[lk];
            var lv = state.logLevels[lk2];
            html += '<button class="' + (lv ? 'active ' : '') + ' lv-' + lk2 + '" data-cmd="level" data-key="' + lk2 + '">' + lk2 + '</button>';
        }
        html += '</div></div>';

        html += '<div class="ps-f-section"><label>关键词</label><input class="ps-f-search-inline" type="text" placeholder="搜索..." value="' + escapeHtml(state.search) + '"></div>';

        html += '<div class="ps-f-stats"><span>' + (state.isLoading ? '加载中...' : '共 ' + rawData.length + ' 条') + '</span><span>' + (state.isLoading ? '' : '筛选 ' + filteredData.length + ' 条') + '</span></div>';

        if (state.isLoading) html += '<div class="ps-loading">加载日志数据...</div>';
        if (state.error) html += '<div class="ps-error">' + escapeHtml(state.error) + '</div>';

        html += '<div class="ps-f-list">';
        if (!state.isLoading && !state.error) {
            if (filteredData.length === 0) {
                html += '<div class="ps-f-empty">' + (rawData.length > 0 ? '无匹配日志' : '暂无日志') + '</div>';
            } else {
                for (var i = 0; i < filteredData.length; i++) {
                    html += renderItem(filteredData[i]);
                }
            }
        }
        html += '</div>';

        body.innerHTML = html;

        if (wasSearchFocused) {
            var input = body.querySelector('.ps-f-search-inline');
            if (input) {
                input.focus();
                input.selectionStart = selStart;
                input.selectionEnd = selEnd;
            }
        }
    }

    function toText() {
        var groups = {
            console: { label: '=== 控制台日志 ===', items: [] },
            network: { label: '\n=== 网络请求 ===', items: [] },
        };
        for (var i = 0; i < filteredData.length; i++) {
            var item = getNormalizedItem(filteredData[i]);
            var g = groups[item.type];
            if (!g) continue;
            if (item.type === 'console') {
                var ts = fmtTime(item.timestamp);
                var data = item.data || {};
                var lv = (data.logType || '').toUpperCase();
                var url = data.url || '';
                var msg = (data.logs || []).map(function (l) {
                    return l.type === 'json'
                        ? (function () { try { return JSON.stringify(JSON.parse(l.value), null, 2); } catch (e) { return l.value; } })()
                        : l.value;
                }).join(' ');
                g.items.push('[' + ts + '] [' + lv + ']' + (url ? ' [' + url + ']' : '') + ' ' + msg);
            } else if (item.type === 'network') {
                var d = item.data;
                var ts2 = fmtTime(item.timestamp);
                var t = '[' + ts2 + '] ' + d.method + ' ' + d.url + '\n  Status: ' + (d.status || '-') + ' | ' + (d.costTime ? d.costTime + 'ms' : '-');
                if (d.requestPayload) {
                    try { t += '\n  Payload: ' + JSON.stringify(JSON.parse(d.requestPayload), null, 2); }
                    catch (e) { t += '\n  Payload: ' + d.requestPayload; }
                }
                g.items.push(t);
            }
        }
        var lines = [];
        var order = ['console', 'network'];
        for (var oi = 0; oi < order.length; oi++) {
            if (groups[order[oi]].items.length) {
                lines.push(groups[order[oi]].label);
                for (var si = 0; si < groups[order[oi]].items.length; si++) {
                    lines.push(groups[order[oi]].items[si]);
                }
            }
        }
        return lines.join('\n');
    }

    function copyText(text, count) {
        var n = typeof count === 'number' ? count : text.split('\n').length;
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text, 'text');
            showToast('已复制 ' + n + ' 条');
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                function () { showToast('已复制 ' + n + ' 条'); },
                function () { fallbackCopy(text, n); }
            );
        } else {
            fallbackCopy(text, n);
        }
    }

    function fallbackCopy(text, count) {
        var n = typeof count === 'number' ? count : text.split('\n').length;
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('已复制 ' + n + ' 条'); }
        catch (e) { showToast('复制失败', true); }
        document.body.removeChild(ta);
    }

    function showToast(msg, err) {
        var el = document.createElement('div');
        el.className = 'ps-toast' + (err ? ' err' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function () {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(function () { el.remove(); }, 300);
        }, 2000);
    }

    function createFloatingPanel() {
        if (document.querySelector('.ps-f-overlay')) return;

        var el = document.createElement('div');
        el.className = 'ps-f-overlay';
        var initialVisibility = loadPanelState();
        if (initialVisibility === 'hidden') el.classList.add('hidden');
        el.innerHTML =
            '<div class="ps-f-header"><h3>日志筛选器</h3><div class="ps-f-actions"><button data-cmd="collapse">─</button><button data-cmd="close">✕</button></div></div>' +
            '<div class="ps-f-body"></div>' +
            '<div class="ps-f-footer"><button class="ps-btn-copy" data-cmd="copy">复制筛选结果</button><button class="ps-btn-refresh" data-cmd="refresh">刷新</button><button class="ps-btn-toggle-all" data-cmd="toggle">全选</button></div>';
        document.body.appendChild(el);

        var drag = false, sx, sy, ox, oy;
        el.querySelector('.ps-f-header').addEventListener('mousedown', function (e) {
            if (e.target.closest('[data-cmd]')) return;
            drag = true;
            var r = el.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
            var mv = function (ev) {
                if (!drag) return;
                el.style.left = (ox + ev.clientX - sx) + 'px';
                el.style.top = (oy + ev.clientY - sy) + 'px';
                el.style.right = 'auto';
            };
            var up = function () { drag = false; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', mv);
            document.addEventListener('mouseup', up);
        });

        el.addEventListener('click', function (e) {
            var expandBtn = e.target.closest('.ps-f-expand');
            if (expandBtn) {
                var id = expandBtn.getAttribute('data-id');
                if (id) {
                    if (expandedItems.has(id)) expandedItems.delete(id);
                    else expandedItems.add(id);
                    nextItemId = 0;
                    renderFloating();
                    return;
                }
            }
            var btn = e.target.closest('button[data-cmd]');
            if (!btn) return;
            var cmd = btn.getAttribute('data-cmd');
            var key = btn.getAttribute('data-key');
            if (cmd === 'type') {
                state.types[key] = !state.types[key];
                var sec = document.getElementById('ps-lv-sec');
                if (sec) sec.style.display = state.types.console ? '' : 'none';
                applyFilters();
            } else if (cmd === 'level') {
                state.logLevels[key] = !state.logLevels[key];
                applyFilters();
                if (devtoolsMode) syncLogLevelToPageSpy(state.logLevels);
            } else if (cmd === 'copy') {
                if (!filteredData.length) { showToast('无匹配日志', true); return; }
                copyText(toText(), filteredData.length);
            } else if (cmd === 'refresh') {
                if (devtoolsMode) {
                    refreshConsoleData();
                    applyFilters();
                } else {
                    fetchLogData();
                }
            } else if (cmd === 'toggle') {
                var allOn = Object.keys(state.types).every(function (k) { return state.types[k]; });
                for (var k in state.types) { if (state.types.hasOwnProperty(k)) state.types[k] = !allOn; }
                for (var k2 in state.logLevels) { if (state.logLevels.hasOwnProperty(k2)) state.logLevels[k2] = !allOn; }
                applyFilters();
                if (devtoolsMode) syncLogLevelToPageSpy(state.logLevels);
            } else if (cmd === 'collapse') {
                el.classList.toggle('collapsed');
            } else if (cmd === 'close') {
                el.classList.add('hidden');
                savePanelState('hidden');
            }
        });

        el.addEventListener('keyup', function (e) {
            if (e.target.closest('.ps-f-search-inline')) {
                clearTimeout(e.target._timer);
                var _this = e.target;
                _this._timer = setTimeout(function () {
                    if (_this.value !== state.search) {
                        state.search = _this.value;
                        applyFilters();
                        if (devtoolsMode) syncKeywordToPageSpy(state.search);
                    }
                }, 300);
            }
        });

        renderFloating();
    }

    function isDevtoolsRoute() {
        return window.location.hash.indexOf('#/devtools') === 0;
    }

    function refreshConsoleData() {
        if (!devtoolsMode) return;
        var data = getConsoleDataFromFiber();
        if (!data && psConsoleData.length > 0) data = psConsoleData;
        rawData = (data || []).map(function (item) {
            return {
                type: 'console',
                timestamp: item.time || Date.now(),
                data: item
            };
        });
    }

    function syncKeywordToPageSpy(keyword) {
        var input = document.querySelector('.console-panel .ant-input');
        if (input) {
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, keyword);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function setupPageSpyKeywordSync() {
        if (!devtoolsMode || keywordSyncSetup) return;
        keywordSyncSetup = true;
        var input = document.querySelector('.console-panel .ant-input');
        if (input) {
            var initialVal = input.value || '';
            if (initialVal !== state.search) {
                state.search = initialVal;
                applyFilters();
            }
            input.addEventListener('input', function () {
                var val = this.value || '';
                if (val !== state.search) {
                    state.search = val;
                    applyFilters();
                }
            });
        }
    }

    function findLevelSelect() {
        var selects = document.querySelectorAll('.console-panel .ant-select');
        for (var i = 0; i < selects.length; i++) {
            var item = selects[i].querySelector('.ant-select-selection-item, .ant-select-selection-item-content');
            if (item) {
                var text = (item.textContent || '').trim().toLowerCase();
                if (['all messages', 'user messages', 'errors', 'warnings', 'info', 'verbose'].indexOf(text) !== -1) {
                    return selects[i];
                }
            }
        }
        return null;
    }

    function readLogLevelFromPageSpy() {
        var select = findLevelSelect();
        if (!select) return null;
        var item = select.querySelector('.ant-select-selection-item, .ant-select-selection-item-content');
        if (!item) return null;
        var text = (item.textContent || '').trim().toLowerCase();
        var levelToPageSpy = {
            'all messages': ['log', 'info', 'warn', 'error'],
            'user messages': ['log'],
            'errors': ['error'],
            'warnings': ['warn'],
            'info': ['info'],
            'verbose': ['debug']
        };
        var levels = levelToPageSpy[text];
        if (!levels) return null;
        var result = { log: false, info: false, warn: false, error: false };
        for (var i = 0; i < levels.length; i++) {
            if (result.hasOwnProperty(levels[i])) result[levels[i]] = true;
        }
        return result;
    }

    function syncLogLevelToPageSpy(logLevels) {
        var select = findLevelSelect();
        if (!select) return;
        var activeLevels = Object.keys(logLevels).filter(function (k) { return logLevels[k]; });
        var optionLabel;
        if (activeLevels.length === 0 || activeLevels.length === 4) {
            optionLabel = 'All messages';
        } else if (activeLevels.length === 1) {
            var mapToLabel = { log: 'User messages', error: 'Errors', warn: 'Warnings', info: 'Info' };
            optionLabel = mapToLabel[activeLevels[0]];
            if (!optionLabel) return;
        } else {
            return;
        }
        var selector = select.querySelector('.ant-select-selector');
        if (!selector) return;
        selector.click();
        setTimeout(function () {
            var options = document.querySelectorAll('.ant-select-item-option-content');
            for (var i = 0; i < options.length; i++) {
                if ((options[i].textContent || '').trim().toLowerCase() === optionLabel.toLowerCase()) {
                    options[i].click();
                    break;
                }
            }
        }, 100);
    }

    function setupPageSpyLogLevelSync() {
        if (!devtoolsMode) return;
        var select = findLevelSelect();
        if (!select) return;
        var target = select.querySelector('.ant-select-selection-item, .ant-select-selection-item-content');
        if (!target) return;
        new MutationObserver(function () {
            var levels = readLogLevelFromPageSpy();
            if (!levels) return;
            var changed = false;
            for (var k in levels) {
                if (state.logLevels[k] !== levels[k]) { changed = true; break; }
            }
            if (changed) {
                state.logLevels = levels;
                applyFilters();
            }
        }).observe(target, { childList: true, subtree: true, characterData: true });
    }

    function formatConsoleItem(item) {
        var ts = '';
        if (item.time) {
            var d = new Date(item.time);
            ts = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        }
        var lv = (item.logType || '').toUpperCase();
        var msg = (item.logs || []).map(function (l) {
            return l.type === 'json'
                ? (function () { try { return JSON.stringify(JSON.parse(l.value), null, 2); } catch (e) { return l.value; } })()
                : l.value;
        }).join(' ');
        var url = item.url || '';
        var line = '[' + ts + '] [' + lv + ']';
        if (url) line += ' [' + url + ']';
        line += ' ' + msg;
        return line;
    }

    function getConsoleDataFromFiber() {
        var root = document.getElementById('root');
        if (!root) return null;
        var fiberKey = Object.keys(root).find(function (k) { return k.startsWith('__reactFiber$'); });
        if (!fiberKey) return null;
        var result = null;
        function walk(node) {
            if (!node || result) return;
            var hook = node.memoizedState;
            while (hook) {
                var s = hook.memoizedState;
                if (s && s.current && Array.isArray(s.current) && s.current.length > 0 && s.current[0].logType) {
                    result = s.current;
                    return;
                }
                hook = hook.next;
            }
            walk(node.child);
            walk(node.sibling);
        }
        walk(root[fiberKey]);
        return result;
    }

    function readFiltersFromDom() {
        var keyword = '';
        var logLevels = [];
        var keywordInput = document.querySelector('.console-panel .ant-input');
        if (keywordInput) keyword = keywordInput.value || '';
        var selectItems = document.querySelectorAll('.console-panel .ant-select-selection-item');
        if (selectItems.length === 0) {
            selectItems = document.querySelectorAll('.console-panel .ant-select-selection-item-content');
        }
        var levelMap = { 'user messages': 'log', 'errors': 'error', 'warnings': 'warn', 'info': 'info', 'verbose': 'debug' };
        for (var si = 0; si < selectItems.length; si++) {
            var text = (selectItems[si].textContent || '').trim().toLowerCase();
            if (levelMap[text]) logLevels.push(levelMap[text]);
        }
        return { logLevels: logLevels, keyword: keyword };
    }

    function createCopyBtn() {
        if (document.querySelector('.ps-copy-btn')) return;
        var space = document.querySelector('.console-panel .ant-space');
        if (!space) return;

        var item = document.createElement('div');
        item.className = 'ant-space-item';
        var btn = document.createElement('button');
        btn.className = 'ant-btn css-ot8eiw ant-btn-default ps-copy-btn';
        btn.innerHTML = '<span>复制日志</span>';
        btn.addEventListener('click', function () {
            var lines = [];

            var allData = getConsoleDataFromFiber();
            if (!allData && psConsoleData.length > 0) allData = psConsoleData;

            if (allData) {
                var filters = readFiltersFromDom();
                var logLevels = filters.logLevels;
                var keyword = filters.keyword.trim();

                var filteredData = allData;
                if (logLevels.length && keyword) {
                    filteredData = [];
                    for (var fi = 0; fi < allData.length; fi++) {
                        var item = allData[fi];
                        if (logLevels.indexOf(item.logType) !== -1 &&
                            item.logs.map(function (l) { return l.value; }).join('').indexOf(keyword) !== -1) {
                            filteredData.push(item);
                        }
                    }
                } else if (logLevels.length) {
                    filteredData = [];
                    for (var fi2 = 0; fi2 < allData.length; fi2++) {
                        if (logLevels.indexOf(allData[fi2].logType) !== -1) {
                            filteredData.push(allData[fi2]);
                        }
                    }
                } else if (keyword) {
                    filteredData = [];
                    for (var fi3 = 0; fi3 < allData.length; fi3++) {
                        if (allData[fi3].logs.map(function (l) { return l.value; }).join('').indexOf(keyword) !== -1) {
                            filteredData.push(allData[fi3]);
                        }
                    }
                }

                for (var li = 0; li < filteredData.length; li++) {
                    lines.push(formatConsoleItem(filteredData[li]));
                }
            }

            if (lines.length === 0) {
                var items = document.querySelectorAll('.console-item');
                for (var di = 0; di < items.length; di++) {
                    var tsEl = items[di].querySelector('.timestamp');
                    var ts = tsEl ? tsEl.textContent.trim() : '';
                    var contentEl = items[di].querySelector('.console-item__content');
                    var contentText = '';
                    if (contentEl) {
                        var clone = contentEl.cloneNode(true);
                        var tsInClone = clone.querySelector('.timestamp');
                        if (tsInClone) tsInClone.remove();
                        contentText = clone.textContent.replace(/\s+/g, ' ').trim();
                    }
                    var url = items[di].querySelector('.console-item__url');
                    var urlText = url ? url.textContent.trim() : '';
                    var line = ts + ' ' + contentText;
                    if (urlText) line += '\n  ' + urlText;
                    if (line.trim()) lines.push(line.trim());
                }
            }

            var text = lines.join('\n\n');
            if (!text) { showToast('无日志', true); return; }
            copyText(text, lines.length);
        });
        item.appendChild(btn);
        space.appendChild(item);
    }

    function createToggleBtn() {
        if (document.querySelector('.ps-toggle-btn')) return;
        var btn = document.createElement('button');
        btn.className = 'ps-toggle-btn';
        btn.textContent = '⊞';
        btn.title = '切换筛选面板';
        document.body.appendChild(btn);
        btn.addEventListener('click', function () {
            var overlay = document.querySelector('.ps-f-overlay');
            if (!isPageSpyRoute()) return;
            if (!overlay) {
                createFloatingPanel();
                if (devtoolsMode) {
                    refreshConsoleData();
                    applyFilters();
                } else {
                    fetchLogData();
                }
                return;
            }
            overlay.classList.toggle('hidden');
            savePanelState(overlay.classList.contains('hidden') ? 'hidden' : 'visible');
        });
    }

    function waitAndInject() {
        if (!isPageSpyRoute()) { return; }

        if (isDevtoolsRoute()) {
            devtoolsMode = true;
            createCopyBtn();
            createToggleBtn();
            createFloatingPanel();
            refreshConsoleData();
            applyFilters();
            setupPageSpyKeywordSync();
            setupPageSpyLogLevelSync();
            return;
        }

        devtoolsMode = false;
        keywordSyncSetup = false;
        createToggleBtn();
        createFloatingPanel();
        fetchLogData();
    }

    var lastHash = '';
    setInterval(function () {
        var h = window.location.hash;
        if (h !== lastHash) {
            lastHash = h;
            if (isPageSpyRoute()) {
                if (isDevtoolsRoute()) {
                    setTimeout(waitAndInject, 1000);
                } else {
                    rawData = [];
                    filteredData = [];
                    state.isLoading = false;
                    state.error = null;
                    setTimeout(waitAndInject, 1000);
                }
            } else {
                removeFloatingUi();
            }
        }
    }, 800);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            lastHash = window.location.hash;
            setTimeout(waitAndInject, 1000);
        });
    } else {
        lastHash = window.location.hash;
        setTimeout(waitAndInject, 1000);
    }

})();
