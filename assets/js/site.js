/* Agrociel — interações do site (sem dependências) */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) root.classList.add('js');
  var CFG = window.AGROCIEL || {};
  var WA_NUMBER = '5591993099267';
  function wa(text) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text); }
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* horário da central: segunda a sábado, 8h às 18h (Brasília) */
  var now = new Date(Date.now() - 3 * 3600e3), wd = now.getUTCDay(), hr = now.getUTCHours();
  var isOpen = wd >= 1 && wd <= 6 && hr >= 8 && hr < 18;
  $$('[data-status]').forEach(function (el) {
    el.classList.toggle('off', !isOpen);
    var t = el.querySelector('span'); if (t) t.textContent = isOpen ? 'Central online agora' : 'Fora do horário: deixe sua mensagem';
  });

  /* cabeçalho */
  var header = $('.header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* menus suspensos */
  $$('[data-mega]').forEach(function (btn) {
    var menu = d.getElementById(btn.getAttribute('aria-controls')), li = btn.parentElement, timer;
    function set(v) { btn.setAttribute('aria-expanded', v ? 'true' : 'false'); menu.classList.toggle('is-open', v); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); var v = btn.getAttribute('aria-expanded') !== 'true'; $$('[data-mega]').forEach(function (b) { if (b !== btn) { b.setAttribute('aria-expanded', 'false'); d.getElementById(b.getAttribute('aria-controls')).classList.remove('is-open'); } }); set(v); });
    li.addEventListener('mouseenter', function () { clearTimeout(timer); set(true); });
    li.addEventListener('mouseleave', function () { timer = setTimeout(function () { set(false); }, 160); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
  });
  d.addEventListener('click', function () { $$('[data-mega]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); d.getElementById(b.getAttribute('aria-controls')).classList.remove('is-open'); }); });

  /* menu do celular */
  var drawer = $('#drawer');
  function closeAnim(el, ms) { if (reduce) { el.classList.remove('is-open'); return; } el.classList.add('is-closing'); el.classList.remove('is-open'); setTimeout(function () { el.classList.remove('is-closing'); }, ms); }
  function drawerSet(v) { if (!drawer) return; if (v) drawer.classList.add('is-open'); else if (drawer.classList.contains('is-open')) closeAnim(drawer, 240); d.body.style.overflow = v ? 'hidden' : ''; $('.menu-btn').setAttribute('aria-expanded', v ? 'true' : 'false'); if (v) $('.drawer-close').focus(); }
  if (drawer) {
    $('.menu-btn').addEventListener('click', function () { drawerSet(true); });
    $$('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', function () { drawerSet(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) drawerSet(false); });
  }

  /* buscador de serviços */
  var finder = $('[data-finder]');
  if (finder && CFG.services) {
    var input = $('input', finder), list = $('.finder-list', finder), active = -1, items = [];
    var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    function render(q) {
      var n = norm(q.trim()); active = -1;
      if (!n) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
      items = CFG.services.filter(function (s) { return norm(s.name + ' ' + s.area + ' ' + (s.keys || '')).indexOf(n) > -1; }).slice(0, 8);
      list.innerHTML = items.length ? items.map(function (s, i) { return '<li role="option" id="fo-' + i + '" aria-selected="false"><a href="' + s.url + '">' + s.name + '<small>' + s.area + '</small></a></li>'; }).join('')
        : '<li class="finder-empty">Não encontramos esse serviço. Fale com a central pelo WhatsApp que a gente orienta.</li>';
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function mark() { $$('li[role=option]', list).forEach(function (li, i) { li.setAttribute('aria-selected', i === active ? 'true' : 'false'); }); input.setAttribute('aria-activedescendant', active > -1 ? 'fo-' + active : ''); }
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); mark(); }
      else if (e.key === 'Escape') { list.hidden = true; }
    });
    finder.addEventListener('submit', function (e) { e.preventDefault(); var go = items[active > -1 ? active : 0]; if (go) location.href = go.url; else if (input.value.trim()) window.open(wa('Olá! Procuro o serviço: ' + input.value.trim()), '_blank', 'noopener'); });
    d.addEventListener('click', function (e) { if (!finder.contains(e.target)) list.hidden = true; });
  }

  /* abas das três frentes */
  $$('[role=tablist]').forEach(function (tl) {
    var tabs = $$('[role=tab]', tl);
    function sel(t, focus) { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; d.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); if (focus) t.focus(); }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { sel(t); });
      t.addEventListener('keydown', function (e) { var k = e.key, n = null; if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length]; if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length]; if (n) { e.preventDefault(); sel(n, true); } });
    });
  });

  /* filtros das categorias */
  $$('[data-filters]').forEach(function (bar) {
    var scope = d.getElementById(bar.getAttribute('data-filters'));
    $$('.chip', bar).forEach(function (c) {
      c.addEventListener('click', function () {
        $$('.chip', bar).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        var g = c.getAttribute('data-group');
        $$('.card', scope).forEach(function (card) { card.hidden = g !== 'all' && card.getAttribute('data-group') !== g; });
      });
    });
  });

  /* perguntas frequentes: a resposta abre e fecha deslizando */
  $$('.faq-list details').forEach(function (det) {
    var sum = $('summary', det), body = $('p', det), anim = null;
    if (!sum || !body || reduce) return;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (anim) anim.cancel();
      var opening = !det.open, start = det.offsetHeight;
      if (opening) det.open = true;
      var end = opening ? det.offsetHeight : sum.offsetHeight;
      body.style.opacity = opening ? '1' : '0';
      det.style.overflow = 'hidden';
      anim = det.animate({ height: [start + 'px', end + 'px'] }, { duration: opening ? 280 : 220, easing: 'cubic-bezier(.23,1,.32,1)' });
      anim.onfinish = function () { if (!opening) det.open = false; det.style.overflow = ''; body.style.opacity = ''; anim = null; };
    });
  });

  /* "Como funciona": a linha das etapas se preenche com a rolagem */
  var how = $('[data-how]');
  if (how && !reduce && matchMedia('(min-width: 901px)').matches) {
    var hs = $('.how-steps', how), hsteps = $$('.step', how), hTick = false;
    var hUpdate = function () {
      hTick = false;
      var r = how.getBoundingClientRect(), total = r.height - innerHeight;
      var p = Math.min(1, Math.max(0, -r.top / (total * .8)));
      hs.style.setProperty('--p', p.toFixed(3));
      hsteps.forEach(function (st, i) { st.classList.toggle('is-on', p >= i / hsteps.length - .001 + .02); });
    };
    window.addEventListener('scroll', function () { if (!hTick) { hTick = true; requestAnimationFrame(hUpdate); } }, { passive: true });
    window.addEventListener('resize', hUpdate); hUpdate();
  }

  /* revelação ao rolar */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    var groups = new Map();
    $$('[data-rv]').forEach(function (el) { var p = el.parentElement, n = groups.get(p) || 0; groups.set(p, n + 1); el.classList.add('rv'); el.style.setProperty('--d', Math.min(n, 6)); io.observe(el); });
  }

  /* formulário de agendamento */
  var modal = $('#agendar'), form = modal && $('form', modal), lastFocus;
  function modalSet(v, service) {
    if (!modal) return;
    if (v) { lastFocus = d.activeElement; if (service) { var s = form.servico; for (var i = 0; i < s.options.length; i++) if (s.options[i].value === service) s.selectedIndex = i; } }
    if (v) modal.classList.add('is-open'); else if (modal.classList.contains('is-open')) closeAnim(modal, 180); d.body.style.overflow = v ? 'hidden' : '';
    if (v) setTimeout(function () { form.nome.focus(); }, 50); else if (lastFocus) lastFocus.focus();
  }
  $$('[data-agendar]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); modalSet(true, b.getAttribute('data-agendar')); }); });
  if (modal) {
    $$('[data-modal-close]', modal).forEach(function (b) { b.addEventListener('click', function () { modalSet(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) modalSet(false); });
    form.telefone.addEventListener('input', function () {
      var v = form.telefone.value.replace(/\D/g, '').slice(0, 11), o = v;
      if (v.length > 2) o = '(' + v.slice(0, 2) + ') ' + v.slice(2);
      if (v.length > 7) o = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
      form.telefone.value = o;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var ok = true;
      [['nome', function (v) { return v.trim().length >= 3; }], ['telefone', function (v) { return v.replace(/\D/g, '').length >= 10; }], ['cidade', function (v) { return v.trim().length >= 2; }], ['servico', function (v) { return !!v; }]].forEach(function (f) {
        var el = form[f[0]], good = f[1](el.value); el.closest('.field').classList.toggle('invalid', !good); el.setAttribute('aria-invalid', good ? 'false' : 'true'); if (!good && ok) { el.focus(); ok = false; }
      });
      if (!ok) return;
      var msg = 'Olá! Vim pelo site da Agrociel e quero agendar um atendimento.\n\n' +
        'Nome: ' + form.nome.value.trim() + '\nWhatsApp: ' + form.telefone.value + '\nCidade: ' + form.cidade.value.trim() +
        '\nServiço: ' + form.servico.value + (form.melhor.value ? '\nMelhor horário: ' + form.melhor.value : '');
      window.open(wa(msg), '_blank', 'noopener');
      modalSet(false); form.reset();
    });
  }

  /* botão flutuante */
  var fab = $('.fab');
  if (fab) {
    var fbtn = $('.fab-btn', fab), panel = $('.fab-panel', fab), bubble = $('.fab-bubble', fab);
    var hideB = function () { bubble.classList.remove('is-shown'); };
    var setF = function (v) { panel.hidden = !v; fab.classList.toggle('is-open', v); fbtn.setAttribute('aria-expanded', v ? 'true' : 'false'); if (v) hideB(); };
    fbtn.addEventListener('click', function (e) { e.stopPropagation(); setF(panel.hidden); });
    bubble.addEventListener('click', function (e) { e.stopPropagation(); setF(true); });
    $('.fab-x', fab).addEventListener('click', function (e) { e.stopPropagation(); hideB(); });
    $('.fab-opt.agenda', fab).addEventListener('click', function () { setF(false); modalSet(true, CFG.service || ''); });
    d.addEventListener('click', function (e) { if (!panel.hidden && !fab.contains(e.target)) setF(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setF(false); fbtn.focus(); } });
    var callOut = function () { if (reduce || !panel.hidden) return; fbtn.classList.remove('call-out'); void fbtn.offsetWidth; fbtn.classList.add('call-out'); };
    setTimeout(callOut, 3000); setInterval(callOut, 30000);
    var seen = false; try { seen = sessionStorage.getItem('agBubble') === '1'; } catch (_) {}
    if (!seen) setTimeout(function () { if (panel.hidden) { bubble.classList.add('is-shown'); setTimeout(hideB, 14000); } try { sessionStorage.setItem('agBubble', '1'); } catch (_) {} }, 4500);
  }
})();
