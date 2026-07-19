/* Caring Companions — floating "Ask Cara" widget (site-wide)
   Chat backend: the cara-chat Supabase Edge Function (deployed on the shared
   hub project). If it's ever unreachable, Cara falls back to a warm hand-off
   to phone/consultation. Override with window.CC_CARA_ENDPOINT if needed. */
(function () {
  'use strict';

  var CARA_CHAT_ENDPOINT = window.CC_CARA_ENDPOINT ||
    'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/cara-chat';

  // Resolve site root from this script's URL so links work from any subfolder.
  var SITE_ROOT = './';
  try {
    var src = document.currentScript && document.currentScript.src;
    if (src) SITE_ROOT = new URL('..', src).href;
  } catch (e) { /* keep relative fallback */ }
  function page(path) {
    try { return new URL(path, SITE_ROOT).href; } catch (e) { return path; }
  }

  if (document.getElementById('cara-widget-launcher')) return;

  function init() {
    var btn = document.createElement('button');
    btn.id = 'cara-widget-launcher';
    btn.textContent = 'Ask Cara';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#0D365F;color:#faf9f6;border:none;border-radius:999px;padding:14px 22px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.22)';

    var panel = document.createElement('div');
    panel.id = 'cara-widget-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask Cara');
    panel.style.cssText = 'position:fixed;bottom:78px;right:20px;z-index:99999;display:none;flex-direction:column;background:#ffffff;border:1px solid #e4e1d8;border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,0.2);width:320px;max-height:min(70vh,520px);font-family:Inter,Helvetica,Arial,sans-serif;overflow:hidden';

    var header = document.createElement('div');
    header.style.cssText = 'padding:16px 18px 12px;border-bottom:1px solid #ede9e0';
    var title = document.createElement('p');
    title.style.cssText = "font-family:'Source Serif 4',Georgia,serif;font-size:16px;font-weight:600;color:#0D365F;margin:0 0 3px";
    title.textContent = 'Cara';
    var sub = document.createElement('p');
    sub.style.cssText = 'font-size:12px;color:#8a978f;margin:0';
    sub.textContent = 'Ask a question, or reach us directly below';
    header.appendChild(title);
    header.appendChild(sub);

    var messagesEl = document.createElement('div');
    messagesEl.id = 'cara-widget-messages';
    messagesEl.style.cssText = 'flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;max-height:240px;min-height:80px';

    var inputRow = document.createElement('div');
    inputRow.style.cssText = 'padding:10px 12px;border-top:1px solid #ede9e0;display:flex;gap:8px';
    var inputEl = document.createElement('input');
    inputEl.id = 'cara-widget-input';
    inputEl.type = 'text';
    inputEl.placeholder = 'Type a question...';
    inputEl.setAttribute('aria-label', 'Ask Cara a question');
    inputEl.style.cssText = 'flex:1;border:1px solid #dfe6e2;border-radius:8px;padding:9px 11px;font-size:13.5px;font-family:inherit;color:#16283a;min-width:0';
    var sendBtn = document.createElement('button');
    sendBtn.id = 'cara-widget-send';
    sendBtn.textContent = 'Send';
    sendBtn.style.cssText = 'background:#0D365F;color:#faf9f6;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer';
    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);

    var footer = document.createElement('div');
    footer.style.cssText = 'padding:12px 18px 16px;border-top:1px solid #ede9e0;display:flex;flex-direction:column;gap:8px';
    var consultLink = document.createElement('a');
    consultLink.href = page('cara.html');
    consultLink.textContent = 'Start a Full Consultation';
    consultLink.style.cssText = 'display:block;text-align:center;background:#0D365F;color:#faf9f6;border-radius:8px;padding:10px;font-size:13px;font-weight:600;text-decoration:none';
    var actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:8px';
    var callLink = document.createElement('a');
    callLink.href = 'tel:14172348494';
    callLink.textContent = 'Call Us';
    callLink.style.cssText = 'flex:1;text-align:center;background:transparent;color:#0D365F;border:1.5px solid #dfe6e2;border-radius:8px;padding:9px;font-size:12.5px;font-weight:600;text-decoration:none';
    var msgLink = document.createElement('a');
    msgLink.href = page('contact.html');
    msgLink.textContent = 'Message Us';
    msgLink.style.cssText = 'flex:1;text-align:center;background:transparent;color:#55677a;border:1.5px solid #dfe6e2;border-radius:8px;padding:9px;font-size:12.5px;font-weight:600;text-decoration:none';
    actionRow.appendChild(callLink);
    actionRow.appendChild(msgLink);
    footer.appendChild(consultLink);
    footer.appendChild(actionRow);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(inputRow);
    panel.appendChild(footer);
    document.body.appendChild(panel);
    document.body.appendChild(btn);

    var history = [];

    function addBubble(text, who) {
      var b = document.createElement('div');
      var isUser = who === 'user';
      b.style.cssText = 'max-width:85%;padding:8px 11px;border-radius:10px;font-size:13px;line-height:1.5;white-space:pre-wrap;' +
        (isUser ? 'align-self:flex-end;background:#16283a;color:#faf9f6' : 'align-self:flex-start;background:#f2f0e9;color:#2c3d4d');
      b.textContent = text;
      messagesEl.appendChild(b);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return b;
    }
    addBubble('Hi, I am Cara. Ask me anything about home care, Medicaid, VA benefits, or getting started, or use the options below.', 'cara');

    var OFFLINE_REPLY = 'Thanks for your question! Live chat is coming soon. In the meantime, a real care coordinator can help right away - call (417) 234-8494 (24/7), or tap "Start a Full Consultation" below and Cara will walk you through it step by step.';

    function askCara(messages) {
      if (!CARA_CHAT_ENDPOINT) {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(OFFLINE_REPLY); }, 500);
        });
      }
      return fetch(CARA_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages })
      }).then(function (res) {
        if (!res.ok) throw new Error('Bad response');
        return res.json();
      }).then(function (data) {
        return data.reply || '';
      });
    }

    function send() {
      var text = inputEl.value.replace(/^\s+|\s+$/g, '');
      if (!text) return;
      inputEl.value = '';
      addBubble(text, 'user');
      if (history.length === 0 && window.CCTrack) CCTrack('cara_chat_used');
      history.push({ role: 'user', content: text });
      var thinking = document.createElement('div');
      thinking.style.cssText = 'align-self:flex-start;background:#f2f0e9;color:#8a978f;padding:8px 11px;border-radius:10px;font-size:13px;font-style:italic';
      thinking.textContent = 'Cara is typing...';
      messagesEl.appendChild(thinking);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      askCara(history.slice()).then(function (reply) {
        thinking.remove();
        var replyText = (reply || '').replace(/^\s+|\s+$/g, '') || 'I am not sure about that. Give us a call at (417) 234-8494 and a care coordinator can help.';
        addBubble(replyText, 'cara');
        history.push({ role: 'assistant', content: replyText });
      }).catch(function () {
        thinking.remove();
        addBubble('Sorry, I am having trouble responding right now. Please call (417) 234-8494 or message us below.', 'cara');
      });
    }
    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

    btn.addEventListener('click', function () {
      var isOpen = panel.style.display === 'flex';
      panel.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) inputEl.focus();
    });
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
