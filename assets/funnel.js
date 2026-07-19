/* Caring Companions — shared runtime for care-path (funnel) pages.
   Pages provide: #stage-hook with .fun-option[data-hook-label] buttons,
   #stage-question (progress + #q-text + #q-options + #q-back),
   #stage-result with #res-<field> slots, plus a config via CCFunnel.init. */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }

  window.CCFunnel = {
    // cfg: { questions, computeResult(state), hookKey?, progressLabel? }
    init: function (cfg) {
      var state = { stage: 'hook', qIndex: 0, answers: {} };
      var hook = el('stage-hook');
      var question = el('stage-question');
      var result = el('stage-result');

      function show(stage) {
        state.stage = stage;
        hook.hidden = stage !== 'hook';
        if (question) question.hidden = stage !== 'question';
        result.hidden = stage !== 'result';
        window.scrollTo({ top: 0 });
      }

      function renderQuestion() {
        var q = cfg.questions[state.qIndex];
        if (!q) return;
        el('q-num').textContent = String(state.qIndex + 1);
        el('q-count').textContent = String(cfg.questions.length);
        el('q-progress').style.width = Math.round(((state.qIndex + 1) / cfg.questions.length) * 100) + '%';
        el('q-text').textContent = q.text;
        var wrap = el('q-options');
        wrap.innerHTML = '';
        q.options.forEach(function (o) {
          var b = document.createElement('button');
          b.className = 'fun-q-option' + (state.answers[q.key] === o ? ' selected' : '');
          b.textContent = o;
          b.addEventListener('click', function () {
            state.answers[q.key] = o;
            if (state.qIndex + 1 >= cfg.questions.length) {
              renderResult();
              show('result');
            } else {
              state.qIndex += 1;
              renderQuestion();
            }
          });
          wrap.appendChild(b);
        });
      }

      function renderResult() {
        if (window.CCTrack) CCTrack('tool_completed', { tool: 'care-path' });
        if (cfg.onResult) { cfg.onResult(state); return; }
        var res = cfg.computeResult(state);
        Object.keys(res).forEach(function (k) {
          var slot = el('res-' + k);
          if (slot) slot.textContent = res[k];
        });
      }

      document.querySelectorAll('#stage-hook [data-hook-label]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (cfg.hookKey) state[cfg.hookKey] = b.getAttribute('data-hook-label');
          state.qIndex = 0;
          if (cfg.questions && cfg.questions.length) {
            renderQuestion();
            show('question');
          } else {
            renderResult();
            show('result');
          }
        });
      });

      var back = el('q-back');
      if (back) back.addEventListener('click', function () {
        if (state.qIndex === 0) show('hook');
        else { state.qIndex -= 1; renderQuestion(); }
      });

      var restart = el('res-back');
      if (restart) restart.addEventListener('click', function () {
        state.qIndex = 0;
        state.answers = {};
        show('hook');
      });
    }
  };
})();
