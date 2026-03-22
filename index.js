// ============================================================
// Telegram UI for SillyTavern — v2
// Author: your insomnia & claude code
//
// SYNTAX:
//   {telegram}
//   = Chat Name | status text
//   system message text
//   Sender 'HH:MM' : message text
//   Sender 'HH:MM' : message text >> 😍2 🔥
//   Sender 'HH:MM' (reply: Author | quoted text) : response
//   Sender 'HH:MM' (voice: transcription) :
//   Sender 'HH:MM' (file: filename.pdf) : caption
//   Sender 'HH:MM' (photo) : caption
//   Sender 'HH:MM' (video) : caption
//   Sender 'HH:MM' (sticker: 😎) :
//   Sender 'HH:MM' (contact: Contact Name) :
//   Sender 'HH:MM' ! : failed message
//   {/telegram}
// ============================================================
import { eventSource, event_types } from '../../../../script.js';

const EXT_NAME = 'telegram-ui';
const PARSED_ATTR = 'data-tg-parsed';

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
    file: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 8v12a1 1 0 01-1 1H3a1 1 0 01-1-1V7h19a1 1 0 011 1ZM12.414 5H2V4a1 1 0 011-1h7.414l2 2Z"/></svg>',
    sticker: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.52 19.86c.08-1.2.36-2.35.83-3.4-1.54-.14-2.93-.78-4.02-1.75l1.33-1.49A5.5 5.5 0 0012 14.5c.18 0 .35-.01.52-.03 1.71-2.25 4.35-3.76 7.34-3.95C19.17 6.81 15.91 4 12 4a8 8 0 00-1.48 15.86Zm8.5-7.23c-3.23.22-5.78 2.77-6 6l6-6ZM22 12v.5l-9.5 9.99c-.17 0-.33 0-.5 0a10 10 0 110-20 10 10 0 0110 10ZM10 10a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0Zm7 0a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0Z"/></svg>',
    error: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9Zm-.9-6.3v1.8h1.8v-1.8h-1.8Zm0-7.2v5.4h1.8V7.5h-1.8Z"/></svg>',
    check2: '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M12.354 4.646a.5.5 0 010 .708l-6 6a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L6 10.293l5.646-5.647a.5.5 0 01.708 0Z" fill="currentColor"/><path d="M9.354 4.646a.5.5 0 010 .708l-6 6a.5.5 0 01-.708 0l-1-1a.5.5 0 11.708-.708L3 10.293l5.646-5.647a.5.5 0 01.708 0Z" fill="currentColor" opacity="0.65"/></svg>',
};

// ── Color palette ──
const NAME_COLORS = ['#fc5c51', '#fa790f', '#895dd5', '#0fb297', '#27a5e7', '#3391d4', '#7f69cc'];

function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
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
    count = count || 28;
    let h = hashStr(seed || 'voice');
    const bars = [];
    for (let i = 0; i < count; i++) {
        h = ((h << 5) - h + i) | 0;
        bars.push(Math.abs(h % 18) + 3);
    }
    return bars;
}

function generateVoiceDuration(seed) {
    const h = hashStr(seed || 'dur');
    const sec = (h % 50) + 3;
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

// ── Theme detection ──
function isDarkTheme() {
    const el = document.querySelector('#chat') || document.body;
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/\d+/g);
    if (m) {
        const [r, g, b] = m.map(Number);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
    }
    return true;
}

// ── Reaction parser: "😂3 ❤1 👍" → [{emoji, count}] ──
function parseReactions(raw) {
    if (!raw) return [];
    const results = [];
    const tokens = raw.trim().split(/[\s,]+/);
    for (const tok of tokens) {
        if (!tok) continue;
        const m = tok.match(/^(.+?)(\d+)?$/);
        if (m && m[1]) {
            results.push({ emoji: m[1], count: parseInt(m[2]) || 1 });
        }
    }
    return results;
}

// ── Main parser ──
function parseTelegramTags(htmlText) {
    let text = htmlText.replace(/ㅤ/g, ' ');
    const blockRegex = /\{\s*telegram\s*\}([\s\S]*?)\{\s*\/telegram\s*\}/gi;

    return text.replace(blockRegex, (_, content) => {
        // Pre-process: restore ST markdown conversions before stripping tags
        let clean = content
            .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '= $1') // restore headings → = prefix
            .replace(/<\/?p>/gi, '')
            .trim();

        const lines = clean.split(/(?:<br\s*\/?>|\n)/i).filter(l => l.trim());
        const dark = isDarkTheme();
        const themeClass = dark ? 'tg-dark' : 'tg-light';

        let header = null;
        let messages = [];

        lines.forEach(line => {
            let pure = line.replace(/<[^>]*>/g, '').trim();
            if (!pure) return;

            // ── Header: "= ChatName | status" ──
            const hm = pure.match(/^=\s*(.+?)(?:\s*\|\s*(.+))?$/);
            if (hm) {
                header = { name: hm[1].trim(), status: (hm[2] || '').trim() };
                return;
            }

            // ── Message line ──
            // Name captured as anything before the first 'HH:MM' (robust for any unicode)
            // Format: Sender 'HH:MM' (type: data) ! : text >> reactions
            const mm = pure.match(
                /^([^']+?)\s+'(\d{2}:\d{2})'\s*(?:\((reply|file|voice|photo|video|sticker|media|contact|location)(?::\s*(.*?))?\))?\s*(!)?\s*:\s*([\s\S]*)$/i
            );
            if (mm) {
                let msgText = mm[6].trim();
                let reactions = [];

                // ── Extract reactions from end of text: "text >> 😍2 🔥" ──
                const reactSplit = msgText.lastIndexOf('>>');
                if (reactSplit !== -1) {
                    const reactStr = msgText.substring(reactSplit + 2).trim();
                    if (reactStr) {
                        reactions = parseReactions(reactStr);
                        if (reactions.length > 0) {
                            msgText = msgText.substring(0, reactSplit).trim();
                        }
                    }
                }

                messages.push({
                    sender: mm[1].trim(),
                    time: mm[2],
                    type: mm[3] ? mm[3].toLowerCase() : null,
                    data: mm[4] || null,
                    reactions: reactions,
                    err: !!mm[5],
                    text: msgText,
                });
            } else {
                // System message (date separators, join notifications, etc.)
                messages.push({ system: pure });
            }
        });

        // Auto-detect header from first non-Me sender if not specified
        if (!header) {
            const firstSender = messages.find(m => m.sender && m.sender.toLowerCase() !== 'me');
            header = {
                name: firstSender ? firstSender.sender : 'Chat',
                status: '',
            };
        }

        const hIdx = getColorIndex(header.name);

        // ════════════════════════════════════
        // BUILD HTML (no inline styles, no SVG tails)
        // ════════════════════════════════════
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

            // ── Sticker (no bubble) ──
            if (isSticker) {
                html += `<div class="tg-msg-row ${dir} tg-sticker-row ${hasTail ? 'tg-has-tail' : ''}">`;
                html += `<div class="tg-sticker">${msg.data || msg.text || '😀'}</div>`;
                html += `<div class="tg-meta"><span class="tg-time">${msg.time}</span>`;
                if (isMe && !msg.err) html += `<span class="tg-checks tg-read">${SVG.check2}</span>`;
                html += `</div>`;
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
            ].filter(Boolean).join(' ');

            html += `<div class="${rowClasses}">`;
            html += `<div class="tg-bubble">`;

            // Sender name
            if (showName) {
                html += `<div class="tg-sender tg-name-${cIdx + 1}">${msg.sender}</div>`;
            }

            // ── Reply ──
            if (msg.type === 'reply' && msg.data) {
                // Format: "Author | quoted text"
                const pipeIdx = msg.data.indexOf('|');
                let replyAuthor, replyText;
                if (pipeIdx !== -1) {
                    replyAuthor = msg.data.substring(0, pipeIdx).trim();
                    replyText = msg.data.substring(pipeIdx + 1).trim();
                } else {
                    // Fallback: entire data is the quoted text, author unknown
                    replyAuthor = '...';
                    replyText = msg.data;
                }
                const replyColorIdx = getColorIndex(replyAuthor);
                html += `<div class="tg-reply">`;
                html += `<div class="tg-reply-bar" style="background:${NAME_COLORS[replyColorIdx]}"></div>`;
                html += `<div class="tg-reply-content">`;
                html += `<div class="tg-reply-name tg-name-${replyColorIdx + 1}">${replyAuthor}</div>`;
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
                waveform.forEach(h => {
                    html += `<div class="tg-waveform-bar" style="height:${h}px"></div>`;
                });
                html += `</div>`;
                html += `<div class="tg-voice-dur">${dur}</div>`;
                html += `</div></div>`;
                if (msg.data) {
                    html += `<div class="tg-voice-transcript">${msg.data}</div>`;
                }
            }

            // ── Photo / Media ──
            if (msg.type === 'photo' || msg.type === 'media') {
                html += `<div class="tg-media-placeholder">${msg.type === 'photo' ? SVG.photo : SVG.video}</div>`;
            }

            // ── Video ──
            if (msg.type === 'video') {
                html += `<div class="tg-media-placeholder">${SVG.video}</div>`;
            }

            // ── File ──
            if (msg.type === 'file') {
                const fname = msg.data || 'document.pdf';
                html += `<div class="tg-file">`;
                html += `<div class="tg-file-icon">${SVG.file}</div>`;
                html += `<div class="tg-file-info">`;
                html += `<div class="tg-file-name">${fname}</div>`;
                html += `<div class="tg-file-size">${getRandomSize(fname)}</div>`;
                html += `</div></div>`;
            }

            // ── Contact ──
            if (msg.type === 'contact') {
                const cname = msg.data || 'Contact';
                const ccIdx = getColorIndex(cname);
                html += `<div class="tg-contact">`;
                html += `<div class="tg-contact-avatar tg-avatar-${ccIdx + 1}">${getInitials(cname)}</div>`;
                html += `<div class="tg-contact-name">${cname}</div>`;
                html += `</div>`;
            }

            // ── Text ──
            if (msg.text) {
                html += `<div class="tg-text">${msg.text}</div>`;
            }

            // ── Meta (time + checks) ──
            html += `<div class="tg-meta">`;
            html += `<span class="tg-time">${msg.time}</span>`;
            if (isMe && !msg.err) {
                html += `<span class="tg-checks tg-read">${SVG.check2}</span>`;
            }
            html += `</div>`;

            html += `</div>`; // .tg-bubble

            // ── Error badge (below bubble, won't break alignment) ──
            if (msg.err) {
                html += `<div class="tg-error-badge">`;
                html += `<div class="tg-error-icon">${SVG.error}</div>`;
                html += `<span class="tg-error-label">Sending failed</span>`;
                html += `</div>`;
            }

            // ── Reactions ──
            if (msg.reactions.length) {
                html += buildReactions(msg.reactions);
            }

            html += `</div>`; // .tg-msg-row
        });
        html += `</div>`; // .tg-messages

        // Input bar (decorative)
        html += `<div class="tg-input-bar">`;
        html += `<div class="tg-input-btn">${SVG.sticker}</div>`;
        html += `<div class="tg-input-field">Message</div>`;
        html += `<div class="tg-input-btn">${SVG.attach}</div>`;
        html += `<div class="tg-input-send">${SVG.send}</div>`;
        html += `</div>`;

        html += `</div>`; // .tg-container
        return html;
    });
}

function buildReactions(reactions) {
    let html = '<div class="tg-reactions">';
    reactions.forEach(r => {
        html += `<div class="tg-reaction">`;
        html += `<span class="tg-reaction-emoji">${r.emoji}</span>`;
        html += `<span class="tg-reaction-count">${r.count > 1 ? r.count : ''}</span>`;
        html += `</div>`;
    });
    html += '</div>';
    return html;
}

// ── Render logic ──
let renderScheduled = false;

function render() {
    renderScheduled = false;
    $('.mes_text').each(function () {
        const $el = $(this);
        if ($el.attr(PARSED_ATTR)) return;
        const h = $el.html();
        if (!h || !h.toLowerCase().includes('telegram')) return;
        const n = parseTelegramTags(h);
        if (h !== n) {
            $el.html(n);
            $el.attr(PARSED_ATTR, '1');
        }
    });
}

function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => setTimeout(render, 100));
}

function resetParsed() {
    $(`.mes_text[${PARSED_ATTR}]`).removeAttr(PARSED_ATTR);
    scheduleRender();
}

// ── Init ──
jQuery(async () => {
    eventSource.on(event_types.CHAT_CHANGED, resetParsed);
    eventSource.on(event_types.MESSAGE_RECEIVED, scheduleRender);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, scheduleRender);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, scheduleRender);
    eventSource.on(event_types.MESSAGE_UPDATED, () => {
        $(`.mes_text[${PARSED_ATTR}]`).removeAttr(PARSED_ATTR);
        scheduleRender();
    });
    setTimeout(render, 600);
    console.log(`[${EXT_NAME}] Loaded.`);
});
