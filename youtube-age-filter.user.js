// ==UserScript==
// @name         YouTube Age Filter - Tampermonkey Menu Only
// @namespace    yt-age-filter-tampermonkey-menu-only
// @version      1.1
// @description  Filter YouTube videos by age using only Tampermonkey extension menu commands.
// @match        *://*.youtube.com/*
// @match        *://youtube.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    console.log('[YT Age Filter] v1.1 loaded');

    const AGE_LIMITS_DAYS = {
        '1m': 31,
        '3m': 93,
        '6m': 186,
        '1y': 366
    };

    const AGE_LABELS = {
        '1m': '1 month',
        '3m': '3 months',
        '6m': '6 months',
        '1y': '1 year'
    };

    let settings = {
        enabled: GM_getValue('enabled', true),
        maxAge: GM_getValue('maxAge', '1y'),
        hideUnknown: GM_getValue('hideUnknown', false)
    };

    let applyTimer = null;

    registerTampermonkeyMenu();

    waitForBody(() => {
        startObservers();

        setTimeout(applyFilter, 500);
        setTimeout(applyFilter, 1500);
        setTimeout(applyFilter, 3000);

        setInterval(applyFilter, 4000);
    });

    function registerTampermonkeyMenu() {
        GM_registerMenuCommand(`Status: ${settings.enabled ? 'ON' : 'OFF'} | Max: ${AGE_LABELS[settings.maxAge]}`, () => {
            showStatus();
        });

        GM_registerMenuCommand(settings.enabled ? 'Disable filter' : 'Enable filter', () => {
            GM_setValue('enabled', !settings.enabled);
            location.reload();
        });

        GM_registerMenuCommand('Set max age: 1 month', () => {
            GM_setValue('maxAge', '1m');
            location.reload();
        });

        GM_registerMenuCommand('Set max age: 3 months', () => {
            GM_setValue('maxAge', '3m');
            location.reload();
        });

        GM_registerMenuCommand('Set max age: 6 months', () => {
            GM_setValue('maxAge', '6m');
            location.reload();
        });

        GM_registerMenuCommand('Set max age: 1 year', () => {
            GM_setValue('maxAge', '1y');
            location.reload();
        });

        GM_registerMenuCommand(settings.hideUnknown ? 'Show videos with unknown dates' : 'Hide videos with unknown dates', () => {
            GM_setValue('hideUnknown', !settings.hideUnknown);
            location.reload();
        });

        GM_registerMenuCommand('Apply filter now', () => {
            applyFilter();
            showStatus();
        });

        GM_registerMenuCommand('Reset settings', () => {
            GM_setValue('enabled', true);
            GM_setValue('maxAge', '1y');
            GM_setValue('hideUnknown', false);

            settings = {
                enabled: true,
                maxAge: '1y',
                hideUnknown: false
            };

            applyFilter();
            alert('YT Age Filter reset to: enabled, max age 1 year, unknown dates shown.');
            location.reload();
        });
    }

    function showStatus() {
        const stats = applyFilter();

        alert(
            `YT Age Filter\n\n` +
            `Enabled: ${settings.enabled ? 'Yes' : 'No'}\n` +
            `Max age: ${AGE_LABELS[settings.maxAge]}\n` +
            `Hide unknown dates: ${settings.hideUnknown ? 'Yes' : 'No'}\n\n` +
            `Videos found: ${stats.total}\n` +
            `Checked: ${stats.checked}\n` +
            `Hidden: ${stats.hidden}\n` +
            `Unknown date: ${stats.unknown}`
        );
    }

    function waitForBody(callback) {
        if (document.body) {
            callback();
            return;
        }

        const timer = setInterval(() => {
            if (document.body) {
                clearInterval(timer);
                callback();
            }
        }, 100);
    }

    function startObservers() {
        const observer = new MutationObserver(() => {
            scheduleApply();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        window.addEventListener('yt-navigate-finish', () => {
            setTimeout(applyFilter, 500);
            setTimeout(applyFilter, 1500);
            setTimeout(applyFilter, 3000);
        });

        window.addEventListener('yt-page-data-updated', () => {
            scheduleApply();
        });

        window.addEventListener('popstate', () => {
            setTimeout(applyFilter, 1000);
        });
    }

    function scheduleApply() {
        clearTimeout(applyTimer);
        applyTimer = setTimeout(applyFilter, 350);
    }

    function getVideoElements() {
        return Array.from(document.querySelectorAll([
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-playlist-video-renderer',
            'ytd-reel-item-renderer'
        ].join(',')));
    }

    function applyFilter() {
        const videos = getVideoElements();
        const maxDays = AGE_LIMITS_DAYS[settings.maxAge];

        let checked = 0;
        let hidden = 0;
        let unknown = 0;

        for (const video of videos) {
            video.style.removeProperty('display');
            video.removeAttribute('data-ytaf-hidden');

            const ageText = getAgeText(video);
            const ageDays = parseAgeToDays(ageText);

            video.dataset.ytafAgeText = ageText || '';
            video.dataset.ytafAgeDays = ageDays === null ? '' : String(ageDays);

            if (ageDays === null) {
                unknown++;

                if (settings.enabled && settings.hideUnknown) {
                    hideVideo(video);
                    hidden++;
                }

                continue;
            }

            checked++;

            if (settings.enabled && ageDays > maxDays) {
                hideVideo(video);
                hidden++;
            }
        }

        console.log('[YT Age Filter] Applied:', {
            enabled: settings.enabled,
            maxAge: settings.maxAge,
            hideUnknown: settings.hideUnknown,
            total: videos.length,
            checked,
            hidden,
            unknown
        });

        return {
            total: videos.length,
            checked,
            hidden,
            unknown
        };
    }

    function hideVideo(video) {
        video.style.setProperty('display', 'none', 'important');
        video.setAttribute('data-ytaf-hidden', '1');
    }

    function getAgeText(video) {
        const candidates = video.querySelectorAll([
            '#metadata-line span',
            '.inline-metadata-item',
            'span.inline-metadata-item',
            'yt-formatted-string',
            'span'
        ].join(','));

        // querySelectorAll returns document order, so the first match can be a title
        // ("... 10 years ago") or a wrapper holding title + metadata. The shortest
        // matching text is the metadata item itself.
        let best = null;

        for (const el of candidates) {
            const text = normalize(el.textContent);

            if (!text) continue;

            if (looksLikeAge(text) && (best === null || text.length <= best.length)) {
                best = text;
            }
        }

        return best;
    }

    function normalize(text) {
        return String(text || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function looksLikeAge(text) {
        return parseAgeToDays(text) !== null;
    }

    function parseAgeToDays(text) {
        if (!text) return null;

        const clean = normalize(text);

        // Long ("3 months ago") and compact ("8h ago", "3mo ago", "2 wk ago") forms.
        let match = clean.match(/\b(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|wks?|months?|mos?|years?|yrs?|s|m|h|d|w|y)\s+ago\b/);

        if (match) {
            return unitToDays(Number(match[1]), match[2], 'en');
        }

        match = clean.match(/\bh[áa]\s+(\d+)\s+(segundo|segundos|minuto|minutos|hora|horas|dia|dias|semana|semanas|m[êe]s|meses|ano|anos)/);

        if (match) {
            return unitToDays(Number(match[1]), match[2], 'pt');
        }

        match = clean.match(/\b(\d+)\s+(segundo|segundos|minuto|minutos|hora|horas|dia|dias|semana|semanas|m[êe]s|meses|ano|anos)\s+atr[áa]s/);

        if (match) {
            return unitToDays(Number(match[1]), match[2], 'pt');
        }

        return null;
    }

    function unitToDays(value, unit, language) {
        if (!Number.isFinite(value)) return null;

        unit = unit.toLowerCase();

        if (language === 'en') {
            if (unit.startsWith('mo')) return value * 31;
            if (/^[smh]/.test(unit)) return 0; // seconds, minutes ("m"), hours
            if (unit.startsWith('d')) return value;
            if (unit.startsWith('w')) return value * 7;
            if (unit.startsWith('y')) return value * 366;
        }

        if (language === 'pt') {
            if (
                unit.startsWith('segundo') ||
                unit.startsWith('minuto') ||
                unit.startsWith('hora')
            ) {
                return 0;
            }

            if (unit.startsWith('dia')) return value;
            if (unit.startsWith('semana')) return value * 7;
            if (unit === 'mês' || unit === 'mes' || unit === 'meses') return value * 31;
            if (unit.startsWith('ano')) return value * 366;
        }

        return null;
    }
})();
