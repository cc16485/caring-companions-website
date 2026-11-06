/* Caring Companions: floating "Ask Cara" widget (site-wide)
   Chat backend: the cara-chat Supabase Edge Function (deployed on the shared
   hub project). If it's ever unreachable, Cara falls back to a warm hand-off
   to a phone call. Override with window.CC_CARA_ENDPOINT if needed. */
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
    // Our own speech bubble from the brand sprite, drawn inline so the floating
    // launcher never waits on another request to look finished.
    btn.innerHTML =
      '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="flex:0 0 auto;">'
      + '<path d="M4 4h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4.5 3.5V15H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" '
      + 'fill="#1F7A8C" stroke="#faf9f6" stroke-width="1.6" stroke-linejoin="round"/>'
      + '<circle cx="7.2" cy="9.5" r="1.15" fill="#faf9f6"/>'
      + '<circle cx="10.7" cy="9.5" r="1.15" fill="#faf9f6"/>'
      + '<circle cx="14.2" cy="9.5" r="1.15" fill="#faf9f6"/>'
      + '</svg><span>Ask Cara</span>';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-label', 'Ask Cara, our free care advisor');
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#0D365F;color:#faf9f6;border:none;border-radius:999px;padding:13px 22px 13px 18px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.22);display:inline-flex;align-items:center;gap:9px;line-height:1';

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
    messagesEl.style.cssText = 'flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;max-height:300px;min-height:80px';

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
    // 2026-11-06 (her call): no "Start a Full Consultation" here; it went to a page that does not reach the office.
    var actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:8px';
    var callLink = document.createElement('a');
    callLink.href = 'tel:14172348494';
    callLink.textContent = 'Call Us';
    callLink.style.cssText = 'flex:1;text-align:center;background:transparent;color:#0D365F;border:1.5px solid #dfe6e2;border-radius:8px;padding:9px;font-size:12.5px;font-weight:600;text-decoration:none';
    var msgLink = document.createElement('a');
    // 2026-11-06 (her ask): Text Us, a text to the office line, in place of Message Us (the contact form)
    msgLink.href = 'sms:+14172348494';
    msgLink.textContent = 'Text Us';
    msgLink.style.cssText = 'flex:1;text-align:center;background:transparent;color:#0D365F;border:1.5px solid #dfe6e2;border-radius:8px;padding:9px;font-size:12.5px;font-weight:600;text-decoration:none';
    actionRow.appendChild(callLink);
    actionRow.appendChild(msgLink);
    footer.appendChild(actionRow);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(inputRow);
    panel.appendChild(footer);
    document.body.appendChild(panel);
    document.body.appendChild(btn);

    var history = [];

    /* One chat, one id (2026-11-05). Every message in this visit carries the same
       session_id, so the Hub's "Ask Cara chats" page can show the whole
       conversation instead of single questions. Kept for this browser tab only. */
    var CHAT_KEY = 'cc_cara_chat';
    var chat = (function () {
      var c = null;
      try { c = JSON.parse(sessionStorage.getItem(CHAT_KEY) || 'null'); } catch (e) { c = null; }
      if (!c || !/^c[a-z0-9]{8}$/.test(c.id || '')) c = { id: 'c' + Math.random().toString(36).slice(2, 10).padEnd(8, '0'), offer: '' };
      return c;
    })();
    function chatSave() { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(chat)); } catch (e) { /* this tab only */ } }
    chatSave();

    /* Call back (her call, 2026-11-05; a button since 11-06): "Have someone call
       me" under Cara's answers opens this card. What they leave becomes a Hub
       lead through lead-intake (source Website), with this chat's id in the note
       so the office can read what they asked. A person makes the call; nothing
       here texts or calls the family. Once they have sent it, it is not offered
       again in this chat. */
    var LEAD_ENDPOINT = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/lead-intake?token=cclead_b36832b06f2bb8d58b7d6302';
    var GREETING = /^(hi+|hey+|hello+|howdy|good (morning|afternoon|evening)|thanks?( you)?|thank you|ok(ay)?|yes|no|test)[\s!.,?]*$/i;
    var firstQuestion = '';
    function inputCss() { return 'width:100%;box-sizing:border-box;border:1px solid #dfe6e2;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;color:#16283a'; }
    function offerCallback() {
      if (chat.offer === 'sent') return;
      chat.offer = 'shown'; chatSave();
      var card = document.createElement('div');
      card.style.cssText = 'align-self:stretch;background:#EAF4F6;border:1px solid #cfe3e7;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.45;color:#2c3d4d;display:flex;flex-direction:column;gap:7px';
      var ask = document.createElement('div');
      ask.textContent = 'Would you like someone from our office to call you? Leave your name and number and a Care Coordinator will reach out.';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px';
      var yes = document.createElement('button');
      yes.textContent = 'Yes, please call me';
      yes.style.cssText = 'flex:1;background:#0D365F;color:#faf9f6;border:none;border-radius:8px;padding:8px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit';
      var no = document.createElement('button');
      no.textContent = 'No thanks';
      no.style.cssText = 'background:transparent;color:#55677a;border:1.5px solid #dfe6e2;border-radius:8px;padding:8px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit';
      row.appendChild(yes); row.appendChild(no);
      card.appendChild(ask); card.appendChild(row);
      messagesEl.appendChild(card);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      no.addEventListener('click', function () { card.remove(); });
      yes.addEventListener('click', function () {
        row.remove();
        var name = document.createElement('input');
        name.type = 'text'; name.placeholder = 'Your name'; name.setAttribute('aria-label', 'Your name'); name.autocomplete = 'name';
        var phone = document.createElement('input');
        phone.type = 'tel'; phone.placeholder = 'Phone number'; phone.setAttribute('aria-label', 'Phone number'); phone.autocomplete = 'tel';
        var when = document.createElement('input');
        when.type = 'text'; when.placeholder = 'Best time to call (optional)'; when.setAttribute('aria-label', 'Best time to call');
        [name, phone, when].forEach(function (el) { el.style.cssText = inputCss(); card.appendChild(el); });
        var note = document.createElement('div');
        note.style.cssText = 'font-size:11.5px;color:#55677a';
        note.textContent = 'We will only use your number to reach you about care.';
        var err = document.createElement('div');
        err.style.cssText = 'font-size:12px;color:#a33;display:none';
        var go = document.createElement('button');
        go.textContent = 'Send';
        go.style.cssText = 'background:#0D365F;color:#faf9f6;border:none;border-radius:8px;padding:8px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit';
        card.appendChild(note); card.appendChild(err); card.appendChild(go);
        name.focus();
        messagesEl.scrollTop = messagesEl.scrollHeight;
        go.addEventListener('click', function () {
          var n = name.value.replace(/^\s+|\s+$/g, ''), p = phone.value.replace(/^\s+|\s+$/g, '');
          var digits = p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
          err.style.display = 'none';
          if (!n) { err.textContent = 'Please add your name.'; err.style.display = 'block'; name.focus(); return; }
          if (digits.length !== 10) { err.textContent = 'Please add a 10 digit phone number.'; err.style.display = 'block'; phone.focus(); return; }
          go.disabled = true; go.textContent = 'Sending...';
          var q = firstQuestion.length > 300 ? firstQuestion.slice(0, 297) + '...' : firstQuestion;
          var body = {
            name: n, phone: p,
            message: 'Asked for a call back in Ask Cara on the website (Ask Cara chat ' + chat.id + '). First question: "' + q + '"',
            best_time: when.value.replace(/^\s+|\s+$/g, '')
          };
          try { var ref = window.CCPartnerRef && CCPartnerRef.read(); if (ref) body.partner_code = ref.code; } catch (e) { /* no partner link */ }
          fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (res) { if (!res.ok) throw new Error('lead-intake HTTP ' + res.status); return res.json(); })
            .then(function () {
              chat.offer = 'sent'; chatSave();
              if (window.CCTrack) CCTrack('lead_submitted');
              card.innerHTML = '';
              var done = document.createElement('div');
              done.textContent = 'Thank you, ' + n.split(/\s+/)[0] + '. We have your number, and a Care Coordinator will give you a call.';
              card.appendChild(done);
              messagesEl.scrollTop = messagesEl.scrollHeight;
            })
            .catch(function () {
              go.disabled = false; go.textContent = 'Send';
              err.textContent = 'Sorry, that did not go through. Please try again, or call us at (417) 234-8494.';
              err.style.display = 'block';
            });
        });
      });
    }

    function addBubble(text, who) {
      var b = document.createElement('div');
      var isUser = who === 'user';
      b.style.cssText = 'max-width:85%;padding:8px 11px;border-radius:10px;font-size:13px;line-height:1.5;white-space:pre-wrap;' +
        (isUser ? 'align-self:flex-end;background:#16283a;color:#faf9f6' : 'align-self:flex-start;background:#f2f0e9;color:#2c3d4d');
      if (isUser) b.textContent = text; else linkify(b, text);
      messagesEl.appendChild(b);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return b;
    }

    /* Links in Cara's answers can be tapped (2026-11-06). Only our own sites and
       phone numbers become links; everything else stays plain text. */
    var LINKS = /((?:https?:\/\/)?(?:www\.)?(?:mo-care\.com|caringcds\.com)(?:\/[^\s,;)]*)?)|(\(\d{3}\) \d{3}-\d{4})/g;
    function linkify(el, text) {
      var at = 0, m;
      LINKS.lastIndex = 0;
      while ((m = LINKS.exec(text))) {
        var raw = m[0], tail = '';
        if (m[1]) { var t = raw.match(/[.!?]+$/); if (t) { tail = t[0]; raw = raw.slice(0, -tail.length); } }
        el.appendChild(document.createTextNode(text.slice(at, m.index)));
        var a = document.createElement('a');
        a.textContent = raw;
        a.style.cssText = 'color:#1F7A8C;font-weight:600;text-decoration:underline';
        if (m[2]) a.href = 'tel:1' + raw.replace(/\D/g, '');
        else {
          var url = /^https?:/.test(raw) ? raw : 'https://' + raw;
          if (/caringcds\.com/.test(url)) { a.target = '_blank'; a.rel = 'noopener'; }
          a.href = url;
        }
        el.appendChild(a);
        if (tail) el.appendChild(document.createTextNode(tail));
        at = m.index + m[0].length;
      }
      el.appendChild(document.createTextNode(text.slice(at)));
    }

    /* Buttons (2026-11-06, her ask: "styled options for someone to choose from").
       Topics: tapping one asks Cara that topic's approved question, so she answers
       from the same approved answers as a typed question. Next steps: after each
       answer, the buttons that fit what she answered from. Fixed here, so Cara can
       never make up a link or a phone number. */
    var TOPICS = [
      ['Care for a loved one', 'What services do you offer?'],
      ['What care costs', 'How much does home care cost?'],
      ['Ways to pay', 'How can we pay for care?'],
      ['Medicaid or CDS', 'Do you accept Medicaid?'],
      ['Working for us', 'How do I apply for a job?']
    ];
    var READ_MORE = {
      K111: ['care-paths/dementia.html', 'Read about dementia care'],
      K112: ['services/overnight-care.html', 'Read about overnight care'],
      K113: ['services/24-hour-care.html', 'Read about 24-hour care'],
      K114: ['services/respite-care.html', 'Read about respite care'],
      K128: ['services/personal-care.html', 'Read about Personal Care'],
      K129: ['services/companion-care.html', 'Read about Wellness Care'],
      K130: ['care-paths/hospital-discharge.html', 'Read about care after the hospital'],
      K102: ['care-paths/paying-for-care.html', 'See rates and ways to pay'],
      K105: ['care-paths/paying-for-care.html', 'See rates and ways to pay'],
      K106: ['care-paths/paying-for-care.html', 'See rates and ways to pay'],
      K107: ['care-paths/paying-for-care.html', 'See rates and ways to pay'],
      K108: ['care-paths/paying-for-care.html', 'See rates and ways to pay'],
      K124: ['family-academy.html', 'See the Family Care Academy']
    };
    var JOBS = { K116: 1, K117: 1 }, CDS = { K104: 1, K131: 1 };
    var BTN = 'display:inline-block;border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;line-height:1.2;';
    var MAIN = BTN + 'background:#0D365F;color:#faf9f6;border:1.5px solid #0D365F;';
    var SOFT = BTN + 'background:#fff;color:#0D365F;border:1.5px solid #cfe3e7;';
    function row() {
      var r = document.createElement('div');
      r.className = 'cara-buttons';
      r.style.cssText = 'align-self:flex-start;display:flex;flex-wrap:wrap;gap:6px';
      return r;
    }
    function linkBtn(r, label, href, main, newTab) {
      var a = document.createElement('a');
      a.textContent = label; a.href = href; a.style.cssText = main ? MAIN : SOFT;
      if (newTab) { a.target = '_blank'; a.rel = 'noopener'; }
      r.appendChild(a);
    }
    function clearButtons() {
      var old = messagesEl.querySelectorAll('.cara-buttons');
      for (var i = 0; i < old.length; i++) old[i].remove();
    }
    function nextSteps(ids) {
      var r = row(), first = ids[0] || '';
      if (CDS[first]) {
        linkBtn(r, 'Visit caringcds.com', 'https://caringcds.com', true, true);
        linkBtn(r, 'Call CDS at (417) 218-2888', 'tel:14172182888');
      } else if (JOBS[first]) {
        linkBtn(r, 'Apply now', page('apply.html'), true);
      } else {
        if (chat.offer !== 'sent') {
          var call = document.createElement('button');
          call.textContent = 'Have someone call me'; call.style.cssText = MAIN;
          call.addEventListener('click', function () { r.remove(); offerCallback(); });
          r.appendChild(call);
        }
        linkBtn(r, 'Book a free in-home assessment', page('book.html'));
        for (var i = 0; i < ids.length; i++) {
          if (READ_MORE[ids[i]]) { linkBtn(r, READ_MORE[ids[i]][1], page(READ_MORE[ids[i]][0])); break; }
        }
      }
      messagesEl.appendChild(r);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function showTopics() {
      var r = row();
      TOPICS.forEach(function (t) {
        var b = document.createElement('button');
        b.textContent = t[0]; b.style.cssText = SOFT;
        b.addEventListener('click', function () { ask(t[1], t[0]); });
        r.appendChild(b);
      });
      messagesEl.appendChild(r);
    }
    addBubble('Hi, I am Cara. What can I help you with? Tap a topic, or type your own question.', 'cara');
    showTopics();

    var OFFLINE_REPLY = 'Thanks for your question! Live chat is coming soon. In the meantime, you can call our Springfield office at (417) 234-8494, or tap "Text Us" below and a Care Coordinator will answer.';

    function askCara(messages) {
      if (!CARA_CHAT_ENDPOINT) {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({ reply: OFFLINE_REPLY, ids: [] }); }, 500);
        });
      }
      return fetch(CARA_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, session_id: chat.id })
      }).then(function (res) {
        if (!res.ok) throw new Error('Bad response');
        return res.json();
      }).then(function (data) {
        return { reply: data.reply || '', ids: (data.knowledge && data.knowledge.ids) || [] };
      });
    }

    function send() {
      var text = inputEl.value.replace(/^\s+|\s+$/g, '');
      if (!text) return;
      inputEl.value = '';
      ask(text, text);
    }
    // shown: what the visitor sees in their bubble (a topic button's label); text: what Cara is asked.
    function ask(text, shown) {
      clearButtons();
      addBubble(shown, 'user');
      if (history.length === 0 && window.CCTrack) CCTrack('cara_chat_used');
      history.push({ role: 'user', content: text });
      var thinking = document.createElement('div');
      thinking.style.cssText = 'align-self:flex-start;background:#f2f0e9;color:#8a978f;padding:8px 11px;border-radius:10px;font-size:13px;font-style:italic';
      thinking.textContent = 'Cara is typing...';
      messagesEl.appendChild(thinking);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      askCara(history.slice()).then(function (res) {
        thinking.remove();
        var replyText = (res.reply || '').replace(/^\s+|\s+$/g, '') || 'I am not sure about that. Give us a call at (417) 234-8494 and a care coordinator can help.';
        addBubble(replyText, 'cara');
        history.push({ role: 'assistant', content: replyText });
        if (!GREETING.test(text)) { if (!firstQuestion) firstQuestion = text; nextSteps(res.ids); }
      }).catch(function () {
        thinking.remove();
        addBubble('Sorry, I am having trouble responding right now. Please call (417) 234-8494 or message us below.', 'cara');
        nextSteps([]);
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
