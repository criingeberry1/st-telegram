// ============================================================
// Telegram UI for SillyTavern — v3 (compact syntax)
// Author: your insomnia & claude code
//
// COMPACT SYNTAX (token-optimized for AI generation):
//   {telegram}
//   = Chat Name | status
//
//   'HH:MM'                          ← set base time (auto-increments on sender change)
//   Sender: message text             ← new sender
//   : another message                ← same sender continues
//   {4}: important msg               ← numbered (for reply references)
//   Sender (r#4): response           ← reply to message #4
//   Sender (v: transcription):       ← voice message
//   Sender (f: file.pdf): caption    ← file
//   Sender (p): caption              ← photo
//   Sender (vid): caption            ← video
//   Sender (s: pack😂):              ← custom sticker (pack + emoji)
//   Sender (s: 😂):                  ← sticker from any pack
//   Sender (c: Name):                ← contact
//   Sender !: failed message         ← send error
//   ~ 😍2 🔥                        ← reactions (attaches to previous message)
//   system message text              ← anything without colon = system
//
//   ALSO SUPPORTS full old syntax:
//   Sender 'HH:MM' (reply: Author | text) : message >> reactions
//
//   {/telegram}
// ============================================================
import { eventSource, event_types } from '../../../../script.js';

const EXT_NAME = 'telegram-ui';
const PARSED_ATTR = 'data-tg-parsed';

// ── Extension base URL (for loading stickers) ──
const EXT_BASE = new URL('.', import.meta.url).href;

// ── Sticker catalog (loaded async on init) ──
let stickerCatalog = null;

async function loadStickerCatalog() {
    try {
        const res = await fetch(EXT_BASE + 'stickers/catalog.json');
        if (res.ok) {
            stickerCatalog = await res.json();
            console.log(`[${EXT_NAME}] Sticker catalog loaded: ${Object.keys(stickerCatalog.map).length} packs`);
        }
    } catch (e) {
        console.warn(`[${EXT_NAME}] No sticker catalog found, using emoji fallback.`);
    }
}

// Resolve "(s: memes😂)" or "(s: 😂)" → image URL or null
// msgSeed = stable identifier for deterministic pick (e.g. message number)
function resolveSticker(data, msgSeed) {
    if (!data || !stickerCatalog) return null;
    const raw = data.trim();

    // Split into optional pack name + emoji
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
    const emojiMatch = raw.match(emojiRegex);
    if (!emojiMatch) return null;

    const emojiIdx = raw.indexOf(emojiMatch[0]);
    const packName = emojiIdx > 0 ? raw.slice(0, emojiIdx).trim() : null;
    const emoji = emojiMatch[0];
    const ext = stickerCatalog.ext || 'webp';

    let candidates = [];

    if (packName && stickerCatalog.map[packName]) {
        const packMap = stickerCatalog.map[packName];
        if (packMap[emoji]) {
            candidates = packMap[emoji].map(id => `stickers/${id}.${ext}`);
        }
    } else {
        for (const [, packMap] of Object.entries(stickerCatalog.map)) {
            if (packMap[emoji]) {
                candidates.push(...packMap[emoji].map(id => `stickers/${id}.${ext}`));
            }
        }
    }

    if (candidates.length === 0) return null;
    // Deterministic pick: hash the seed to always get the same sticker
    const pick = candidates[hashStr(String(msgSeed) + emoji) % candidates.length];
    return EXT_BASE + pick;
}

// ── SVG icons ──
const SVG = {
    back: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>',
    call: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 16.17v3.34c0 .5-.38.91-.88.95-.41.03-.75.04-1 .04-8.35 0-15.12-6.77-15.12-15.11 0-.26.01-.6.04-1.01C3.58 3.88 4 3.5 4.5 3.5h3.34c.24 0 .44.18.47.42l.06.53c.19 1.33.58 2.6 1.14 3.78.09.18.03.4-.14.53l-2.04 1.46c1.24 2.9 3.56 5.22 6.46 6.46l1.46-2.03c.12-.18.35-.23.54-.14 1.17.55 2.44.94 3.78 1.13l.52.06c.24.03.42.23.42.47Z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>',
    attach: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 13.5V8c0-2.21-1.79-4-4-4S6 5.79 6 8v5.5c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5V4h2v9.5c0 4.69-3.81 8.5-8.5 8.5S4 18.19 4 13.5V8c0-3.31 2.69-6 6-6s6 2.69 6 6v5.5c0 1.93-1.57 3.5-3.5 3.5S9 15.43 9 13.5V8h2v5.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5Z"/></svg>',
    send: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h6v-2H3V1.846a.48.48 0 01.74-.408L22.204 11.562a.48.48 0 010 .876L3.74 22.592A.48.48 0 013 22.154V13Z"/></svg>',
    play: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14v13.72a.5.5 0 00.76.43l10.5-6.86a.5.5 0 000-.86L8.76 4.71a.5.5 0 00-.76.43Z"/></svg>',
    photo: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 11.1L7 9.1l5.5 5.5L16 11.1l3 3V5H5v6.1ZM4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1Zm11.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z"/></svg>',
    video: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.1 9.7l4.26-2.98a.41.41 0 01.64.34v9.88a.41.41 0 01-.64.34L16.1 14.3v3.44c0 .45-.37.82-.82.82H3.82a.82.82 0 01-.82-.82V6.27c0-.45.37-.82.82-.82h11.45c.45 0 .82.37.82.82v3.44Z"/></svg>',
    file: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 9v11.993a1 1 0 01-.993 1.007H3.993A.993.993 0 013 21.008V2.992C3 2.455 3.447 2 3.998 2H14v6a1 1 0 001 1h6Zm0-2h-5V2.003L21 7Z"/></svg>',
    sticker: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.52 19.86c.08-1.2.36-2.35.83-3.4-1.54-.14-2.93-.78-4.02-1.75l1.33-1.49A5.5 5.5 0 0012 14.5c.18 0 .35-.01.52-.03 1.71-2.25 4.35-3.76 7.34-3.95C19.17 6.81 15.91 4 12 4a8 8 0 00-1.48 15.86Zm8.5-7.23c-3.23.22-5.78 2.77-6 6l6-6ZM22 12v.5l-9.5 9.99c-.17 0-.33 0-.5 0a10 10 0 110-20 10 10 0 0110 10ZM10 10a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0Zm7 0a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0Z"/></svg>',
    error: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z"/></svg>',
    check1: '<svg viewBox="0 0 5120 4280" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,4280) scale(1,-1)" fill="currentColor"><path d="M4471 3999 c-74 -24 -137 -76 -330 -273 -64 -65 -169 -171 -233 -235 -254 -252 -1131 -1129 -1260 -1259 -75 -75 -322 -322 -550 -549 -389 -388 -417 -414 -488 -447 -41 -20 -80 -36 -87 -36 -7 0 -30 17 -51 38 -20 21 -59 56 -87 77 -27 20 -85 72 -127 114 -43 42 -88 86 -100 98 -13 12 -47 45 -76 75 -29 29 -154 154 -277 277 l-224 223 -91 33 c-87 32 -93 32 -173 24 -115 -13 -168 -53 -218 -164 -12 -26 -20 -30 -57 -33 l-42 -3 0 -80 0 -79 39 0 c39 0 41 -2 73 -63 25 -48 87 -117 283 -317 137 -141 371 -381 519 -534 311 -321 407 -401 524 -440 74 -25 83 -26 155 -15 132 20 261 108 446 303 25 28 62 64 81 80 19 17 50 48 70 69 47 51 439 443 487 487 21 20 52 50 68 69 39 43 613 617 656 656 19 17 49 47 69 68 46 49 438 441 487 487 21 20 52 51 68 69 17 18 156 158 310 311 154 152 296 295 316 316 20 21 56 57 81 79 60 55 107 169 118 285 8 85 8 85 -25 135 -66 101 -104 134 -180 155 -85 24 -93 24 -174 -1z"/></g></svg>',
    check2: '<svg viewBox="0 0 4750 2860" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,2860) scale(1,-1)" fill="currentColor"><path d="M3217 2688 c-62 -21 -107 -59 -270 -227 -51 -52 -218 -220 -372 -373 -351 -350 -474 -473 -823 -823 -448 -450 -518 -515 -555 -514 -92 1 -94 3 -339 241 -128 125 -258 252 -288 282 -41 41 -74 63 -128 85 l-72 29 -65 -19 c-40 -13 -75 -31 -95 -50 -27 -28 -30 -36 -30 -98 0 -105 18 -128 441 -550 412 -413 446 -441 542 -441 119 0 75 -40 1225 1109 1172 1173 1105 1097 1082 1218 -15 78 -37 105 -108 133 -63 24 -71 24 -145 -2z"/><path d="M4323 2696 c-35 -7 -75 -23 -95 -38 -58 -45 -240 -218 -389 -372 -152 -157 -293 -298 -636 -637 -114 -114 -305 -305 -425 -425 -119 -121 -318 -320 -443 -443 -192 -190 -231 -234 -259 -290 -33 -66 -33 -66 -19 -121 16 -64 41 -93 103 -124 38 -19 55 -22 111 -17 61 6 71 10 125 56 32 28 131 124 219 214 88 91 283 286 434 435 150 149 342 340 425 425 153 156 398 401 781 781 170 168 218 222 252 282 l42 74 -15 60 c-9 32 -21 65 -27 73 -12 14 -113 82 -119 80 -2 -1 -31 -6 -65 -13z"/></g></svg>',
};

// ── Helpers ──
const NAME_COLORS = ['#fc5c51', '#fa790f', '#895dd5', '#0fb297', '#27a5e7', '#3391d4', '#7f69cc'];

function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
}

function getColorIndex(name) { return hashStr(name) % NAME_COLORS.length; }

function getInitials(name) {
    const clean = name.replace(/[_\-]/g, ' ');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (clean[0] || '?').toUpperCase();
}

function getRandomSize(seed) {
    const h = hashStr(seed || 'file');
    return h % 2 === 0 ? ((h % 50) / 10 + 0.1).toFixed(1) + ' MB' : ((h % 800) + 50) + ' KB';
}

function generateWaveform(seed, count) {
    count = count || 42;
    let h = hashStr(seed || 'voice');
    const bars = [];
    for (let i = 0; i < count; i++) { h = ((h << 5) - h + i) | 0; bars.push(Math.abs(h % 18) + 3); }
    return bars;
}

function generateVoiceDuration(seed) {
    const h = hashStr(seed || 'dur');
    const sec = (h % 50) + 3;
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function isDarkTheme() {
    const el = document.querySelector('#chat') || document.body;
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/\d+/g);
    if (m) { const [r, g, b] = m.map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5; }
    return true;
}

function parseReactions(raw) {
    if (!raw) return [];
    const results = [];
    for (const tok of raw.trim().split(/[\s,]+/)) {
        if (!tok) continue;
        const m = tok.match(/^(.+?)(\d+)?$/);
        if (m && m[1]) results.push({ emoji: m[1], count: parseInt(m[2]) || 1 });
    }
    return results;
}

function decodeEntities(str) {
    return str
        .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// ── Time auto-increment ──
function addMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    return String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

// ── Type parser (short + full names) ──
function parseTypeStr(raw) {
    if (!raw) return { type: null, data: null };
    raw = raw.trim();
    let m;
    // r#N → reply to message N
    if ((m = raw.match(/^r#(\d+)$/i))) return { type: 'reply', data: m[1] };
    // v / v: transcription → voice
    if ((m = raw.match(/^v(?::\s*(.*))?$/i))) return { type: 'voice', data: m[1] || null };
    // f: filename → file
    if ((m = raw.match(/^f:\s*(.+)$/i))) return { type: 'file', data: m[1] };
    // p → photo
    if (/^p$/i.test(raw)) return { type: 'photo', data: null };
    // vid → video
    if (/^vid$/i.test(raw)) return { type: 'video', data: null };
    // s: emoji → sticker
    if ((m = raw.match(/^s:\s*(.+)$/i))) return { type: 'sticker', data: m[1] };
    // c: name → contact
    if ((m = raw.match(/^c:\s*(.+)$/i))) return { type: 'contact', data: m[1] };
    // Full old names: reply, file, voice, photo, video, sticker, media, contact
    if ((m = raw.match(/^(reply|file|voice|photo|video|sticker|media|contact)(?::\s*(.*))?$/i))) {
        return { type: m[1].toLowerCase(), data: m[2] || null };
    }
    return { type: null, data: null };
}

// ── Find first colon NOT inside parentheses ──
function findSepColon(str) {
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') depth--;
        else if (str[i] === ':' && depth === 0) return i;
    }
    return -1;
}

// ══════════════════════════════════════
// MAIN PARSER
// ══════════════════════════════════════
function parseTelegramTags(htmlText) {
    let text = htmlText.replace(/ㅤ/g, ' ');
    const blockRegex = /\{\s*telegram\s*\}([\s\S]*?)\{\s*\/telegram\s*\}/gi;

    return text.replace(blockRegex, (_, content) => {
        let clean = content
            .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '= $1')
            .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '>> $1')
            .replace(/<\/?p>/gi, '')
            .trim();

        const lines = clean.split(/(?:<br\s*\/?>|\n)/i).filter(l => l.trim());
        const dark = isDarkTheme();
        const themeClass = dark ? 'tg-dark' : 'tg-light';

        let header = null;
        let messages = [];       // final message objects
        let msgsByNum = {};      // {num → msg} for reply lookup
        let autoNum = 0;         // auto-incrementing counter
        let lastSender = null;   // for sender continuation
        let baseTime = null;     // current time block
        let senderChanges = 0;   // count sender changes since time block

        lines.forEach(line => {
            let pure = decodeEntities(line.replace(/<[^>]*>/g, '')).trim();
            if (!pure) return;

            // ── 1. Header: "= Name | status" ──
            const hm = pure.match(/^=\s*(.+?)(?:\s*\|\s*(.+))?$/);
            if (hm) {
                header = { name: hm[1].trim(), status: (hm[2] || '').trim() };
                return;
            }

            // ── 2. Time block: "'HH:MM'" ──
            const tm = pure.match(/^'(\d{2}:\d{2})'$/);
            if (tm) {
                baseTime = tm[1];
                senderChanges = 0;
                return;
            }

            // ── 3. Reactions line: "~ emoji" or ">> emoji" ──
            const rm = pure.match(/^(?:~|>>)\s*(.+)$/);
            if (rm && messages.length > 0) {
                const reactions = parseReactions(rm[1]);
                if (reactions.length) {
                    messages[messages.length - 1].reactions = reactions;
                }
                return;
            }

            // ── 4. Try to parse as message ──

            // Strip optional {N} prefix
            let explicitNum = null;
            let rest = pure;
            const numM = rest.match(/^\{(\d+)\}\s*/);
            if (numM) {
                explicitNum = parseInt(numM[1]);
                rest = rest.slice(numM[0].length);
            }

            // Find separator colon (not inside parens)
            const colonIdx = findSepColon(rest);
            if (colonIdx === -1) {
                // No colon → system message
                messages.push({ system: pure });
                return;
            }

            let prefix = rest.slice(0, colonIdx).trim();
            let msgText = rest.slice(colonIdx + 1).trim();

            // ── Extract inline reactions from text: "text >> emoji" or "text ~ emoji" ──
            let reactions = [];
            // Try ~ first (preferred, ST-safe), then >> (backward compat)
            let rrIdx = msgText.lastIndexOf(' ~ ');
            if (rrIdx === -1) rrIdx = msgText.lastIndexOf('>>');
            if (rrIdx !== -1) {
                const sepLen = msgText[rrIdx] === '>' ? 2 : 3; // '>>' = 2, ' ~ ' matched at space so +3
                const rStr = msgText.substring(rrIdx + sepLen).trim();
                if (rStr) {
                    const parsed = parseReactions(rStr);
                    if (parsed.length) { reactions = parsed; msgText = msgText.substring(0, rrIdx).trim(); }
                }
            }

            // ── Parse prefix right-to-left: [Sender] ['HH:MM'] [(type)] [!] ──
            let err = false;
            if (prefix.endsWith('!')) { err = true; prefix = prefix.slice(0, -1).trim(); }

            // Extract (type) from end
            let typeInfo = { type: null, data: null };
            const typeM = prefix.match(/\(([^)]*)\)\s*$/);
            if (typeM) {
                typeInfo = parseTypeStr(typeM[1]);
                prefix = prefix.slice(0, typeM.index).trim();
            }

            // Extract 'HH:MM' from end
            let explicitTime = null;
            const timeM = prefix.match(/'(\d{2}:\d{2})'\s*$/);
            if (timeM) {
                explicitTime = timeM[1];
                prefix = prefix.slice(0, timeM.index).trim();
            }

            // What remains is the sender name (or empty for continuation)
            let sender = prefix || null;

            // Sender continuation logic
            if (sender) {
                if (sender !== lastSender) {
                    senderChanges++;
                    lastSender = sender;
                }
            } else {
                sender = lastSender || 'Unknown';
            }

            // Time logic: explicit > auto-increment from base
            let time;
            if (explicitTime) {
                time = explicitTime;
                // Also update base time when explicitly set on a message
                baseTime = explicitTime;
                senderChanges = 0;
            } else if (baseTime) {
                time = addMinutes(baseTime, senderChanges > 0 ? senderChanges - 1 : 0);
            } else {
                time = ''; // no time at all
            }

            // Auto-numbering
            autoNum++;
            const msgNum = explicitNum || autoNum;

            const msg = {
                num: msgNum,
                sender: sender,
                time: time,
                type: typeInfo.type,
                data: typeInfo.data,
                reactions: reactions,
                err: err,
                text: msgText,
            };

            messages.push(msg);
            msgsByNum[msgNum] = msg;

            // If explicit num was provided, sync autoNum
            if (explicitNum && explicitNum >= autoNum) {
                autoNum = explicitNum;
            }
        });

        // ── Auto-detect header ──
        if (!header) {
            const firstSender = messages.find(m => m.sender && m.sender.toLowerCase() !== 'me');
            header = { name: firstSender ? firstSender.sender : 'Chat', status: '' };
        }

        // ══════════════════════
        // BUILD HTML
        // ══════════════════════
        const hIdx = getColorIndex(header.name);
        let html = `<div class="tg-container ${themeClass}">`;

        // Header
        html += `<div class="tg-header">`;
        html += `<div class="tg-header-back">${SVG.back}</div>`;
        html += `<div class="tg-header-avatar tg-avatar-${hIdx + 1}">${getInitials(header.name)}</div>`;
        html += `<div class="tg-header-info">`;
        html += `<div class="tg-header-name">${header.name}</div>`;
        if (header.status) html += `<div class="tg-header-status">${header.status}</div>`;
        html += `</div>`;
        html += `<div class="tg-header-actions">`;
        html += `<div class="tg-header-btn">${SVG.call}</div>`;
        html += `<div class="tg-header-btn">${SVG.dots}</div>`;
        html += `</div></div>`;

        // Messages
        html += `<div class="tg-messages">`;
        messages.forEach((msg, i) => {
            if (msg.system) {
                html += `<div class="tg-system"><span class="tg-system-text">${msg.system}</span></div>`;
                return;
            }

            const isMe = msg.sender.toLowerCase() === 'me';
            const dir = isMe ? 'tg-out' : 'tg-in';
            const prev = i > 0 && !messages[i - 1].system ? messages[i - 1] : null;
            const next = i < messages.length - 1 && !messages[i + 1].system ? messages[i + 1] : null;
            const isPrevSame = prev && prev.sender === msg.sender;
            const isNextSame = next && next.sender === msg.sender;
            const hasTail = !isNextSame;
            const showName = !isMe && !isPrevSame;
            const cIdx = getColorIndex(msg.sender);
            const isSticker = msg.type === 'sticker';

            // ── Meta HTML ──
            let metaHtml = `<span class="tg-meta">`;
            if (msg.time) metaHtml += `<span class="tg-time">${msg.time}</span>`;
            if (isMe && !msg.err) metaHtml += `<span class="tg-checks tg-read">${SVG.check2}</span>`;
            metaHtml += `</span>`;

            // ── Sticker ──
            if (isSticker) {
                const stickerData = msg.data || msg.text || '😀';
                const stickerUrl = resolveSticker(stickerData, msg.num);
                html += `<div class="tg-msg-row ${dir} tg-sticker-row ${hasTail ? 'tg-has-tail' : ''}">`;
                if (stickerUrl) {
                    html += `<div class="tg-sticker tg-sticker-img"><img src="${stickerUrl}" alt="sticker" loading="lazy"></div>`;
                } else {
                    html += `<div class="tg-sticker">${stickerData}</div>`;
                }
                html += `<div class="tg-meta-standalone">${metaHtml}</div>`;
                if (msg.reactions.length) html += buildReactions(msg.reactions);
                html += `</div>`;
                return;
            }

            // ── Regular message ──
            const rowClasses = [
                'tg-msg-row', dir,
                hasTail ? 'tg-has-tail' : '',
                msg.err ? 'tg-msg-error' : '',
                !msg.type ? 'tg-text-only' : '',
                msg.type === 'voice' ? 'tg-voice-msg' : '',
            ].filter(Boolean).join(' ');

            html += `<div class="${rowClasses}">`;
            html += `<div class="tg-bubble">`;

            // Sender name
            if (showName) html += `<div class="tg-sender tg-name-${cIdx + 1}">${msg.sender}</div>`;

            // ── Reply (r#N or old format) ──
            if (msg.type === 'reply' && msg.data) {
                let replyAuthor, replyText;
                const refNum = parseInt(msg.data);
                if (!isNaN(refNum) && msgsByNum[refNum]) {
                    // Compact: r#N — look up message by number
                    const ref = msgsByNum[refNum];
                    replyAuthor = ref.sender;
                    replyText = ref.text || (ref.type === 'voice' ? '🎤 Voice message' : ref.type === 'photo' ? '📷 Photo' : '...');
                } else {
                    // Old format: "Author | text"
                    const pipeIdx = msg.data.indexOf('|');
                    if (pipeIdx !== -1) {
                        replyAuthor = msg.data.substring(0, pipeIdx).trim();
                        replyText = msg.data.substring(pipeIdx + 1).trim();
                    } else {
                        replyAuthor = '...';
                        replyText = msg.data;
                    }
                }
                const rColorIdx = getColorIndex(replyAuthor);
                html += `<div class="tg-reply">`;
                html += `<div class="tg-reply-bar" style="background:${NAME_COLORS[rColorIdx]}"></div>`;
                html += `<div class="tg-reply-content">`;
                html += `<div class="tg-reply-name tg-name-${rColorIdx + 1}">${replyAuthor}</div>`;
                html += `<div class="tg-reply-text">${replyText}</div>`;
                html += `</div></div>`;
            }

            // ── Voice ──
            if (msg.type === 'voice') {
                const waveform = generateWaveform(msg.data || msg.sender + msg.time);
                const dur = generateVoiceDuration(msg.data || msg.sender);
                html += `<div class="tg-voice">`;
                html += `<div class="tg-voice-play">${SVG.play}</div>`;
                html += `<div class="tg-voice-body">`;
                html += `<div class="tg-waveform">`;
                waveform.forEach(h => { html += `<div class="tg-waveform-bar" style="height:${h}px"></div>`; });
                html += `</div><div class="tg-voice-dur">${dur}</div>`;
                html += `</div></div>`;
                if (msg.data) html += `<div class="tg-voice-transcript">${msg.data}</div>`;
            }

            // ── Photo / Media ──
            if (msg.type === 'photo' || msg.type === 'media') {
                html += `<div class="tg-media-placeholder">${msg.type === 'photo' ? SVG.photo : SVG.video}</div>`;
            }

            // ── Video ──
            if (msg.type === 'video') html += `<div class="tg-media-placeholder">${SVG.video}</div>`;

            // ── File ──
            if (msg.type === 'file') {
                const fname = msg.data || 'document.pdf';
                html += `<div class="tg-file"><div class="tg-file-icon">${SVG.file}</div>`;
                html += `<div class="tg-file-info"><div class="tg-file-name">${fname}</div>`;
                html += `<div class="tg-file-size">${getRandomSize(fname)}</div></div></div>`;
            }

            // ── Contact ──
            if (msg.type === 'contact') {
                const cname = msg.data || 'Contact';
                const ccIdx = getColorIndex(cname);
                html += `<div class="tg-contact">`;
                html += `<div class="tg-contact-avatar tg-avatar-${ccIdx + 1}">${getInitials(cname)}</div>`;
                html += `<div class="tg-contact-name">${cname}</div></div>`;
            }

            // ── Text + meta ──
            if (msg.text) {
                html += `<div class="tg-text">${msg.text}<span class="tg-spacer"></span>${metaHtml}</div>`;
            } else {
                html += `<div class="tg-meta-standalone">${metaHtml}</div>`;
            }

            // Reactions (inside bubble, at the bottom)
            if (msg.reactions.length) html += buildReactions(msg.reactions);

            html += `</div>`; // .tg-bubble

            // Error badge
            if (msg.err) {
                html += `<div class="tg-error-badge">`;
                html += `<div class="tg-error-icon">${SVG.error}</div>`;
                html += `<span class="tg-error-label">Sending failed</span></div>`;
            }

            html += `</div>`; // .tg-msg-row
        });
        html += `</div>`; // .tg-messages

        // Input bar
        html += `<div class="tg-input-bar">`;
        html += `<div class="tg-input-btn">${SVG.sticker}</div>`;
        html += `<div class="tg-input-field">Message</div>`;
        html += `<div class="tg-input-btn">${SVG.attach}</div>`;
        html += `<div class="tg-input-send">${SVG.send}</div>`;
        html += `</div>`;

        html += `</div>`;
        return html;
    });
}

function buildReactions(reactions) {
    let html = '<div class="tg-reactions">';
    reactions.forEach(r => {
        html += `<div class="tg-reaction"><span class="tg-reaction-emoji">${r.emoji}</span>`;
        if (r.count > 1) html += `<span class="tg-reaction-count">${r.count}</span>`;
        html += `</div>`;
    });
    return html + '</div>';
}

// ── Render logic ──
function render() {
    $('.mes_text').each(function () {
        const $el = $(this);
        let h = $el.html();
        if (!h) return;

        // Replace ㅤ (Hangul filler) ALWAYS, even in already-parsed messages
        if (h.includes('ㅤ')) {
            h = h.replace(/ㅤ/g, ' ');
            $el.html(h);
            $el.removeAttr(PARSED_ATTR); // force re-parse after cleanup
        }

        if ($el.attr(PARSED_ATTR)) return;
        if (!h.toLowerCase().includes('telegram')) return;
        const n = parseTelegramTags(h);
        if (h !== n) { $el.html(n); $el.attr(PARSED_ATTR, '1'); }
    });
}

// Schedule render with multiple retries (streaming may not be done on first try)
let renderTimer = null;
function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    // First try fast, second try after streaming likely done
    setTimeout(render, 100);
    renderTimer = setTimeout(render, 500);
}

function resetParsed() {
    $(`.mes_text[${PARSED_ATTR}]`).removeAttr(PARSED_ATTR);
    scheduleRender();
}

jQuery(async () => {
    await loadStickerCatalog();
    eventSource.on(event_types.CHAT_CHANGED, resetParsed);
    eventSource.on(event_types.MESSAGE_RECEIVED, scheduleRender);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, scheduleRender);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, scheduleRender);
    eventSource.on(event_types.MESSAGE_UPDATED, resetParsed);
    // Initial render with retries
    setTimeout(render, 300);
    setTimeout(render, 800);
    setTimeout(render, 1500);
    console.log(`[${EXT_NAME}] v3 loaded.`);
});
