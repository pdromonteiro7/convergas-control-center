/* Avaliação de atendimento — página pública (não usa nada do sistema interno). */
(function () {
  'use strict';
  var SITE = 'https://www.convergas.com.br/';
  var card = document.getElementById('card');
  var token = (location.pathname.match(/\/a\/([A-Za-z0-9]{20,48})/) || [])[1] || new URLSearchParams(location.search).get('t') || '';
  var info = {}, step = 0;
  var R = { nota: 0, rapidez: 0, comunicacao: 0, solucao: 0, recomenda: null, comentario: '', nome: '' };
  var LABEL = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];
  var STEPS = 4;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function star(cls) { return '<svg viewBox="0 0 24 24" class="' + (cls || '') + '" aria-hidden="true"><path d="M12 2.8l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.9l-5.5 2.82 1.05-6.12L3.1 9.27l6.15-.9z"/></svg>'; }
  function fmt(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function dots() { var h = '<div class="dots" aria-hidden="true">'; for (var i = 1; i <= STEPS; i++) h += '<i class="' + (i < step ? 'done' : i === step ? 'on' : '') + '"></i>'; return h + '</div>'; }

  function render(html, dir) {
    card.innerHTML = '<div class="pane ' + (dir < 0 ? 'in-l' : 'in-r') + '">' + html + '</div>';
    var f = card.querySelector('[autofocus]'); if (f && !('ontouchstart' in window)) f.focus();
  }
  function message(kind, title, text) {
    render('<div class="msg ' + kind + '"><span class="msg-ic">' + (kind === 'ok' ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 16.5v.5"/><circle cx="12" cy="12" r="9.2"/></svg>') + '</span>' +
      '<h1>' + esc(title) + '</h1><p>' + text + '</p><a class="btn primary" href="' + SITE + '" rel="noopener">Conhecer a Convergas</a></div>', 1);
  }

  function stepNota(dir) {
    step = 1;
    var who = info.contato ? ', ' + esc(info.contato) : '';
    render(dots() + '<p class="kick">Avaliação de atendimento' + (info.chamado ? ' · ' + esc(info.chamado) : '') + '</p>' +
      '<h1>Olá' + who + '! Como você avalia o nosso atendimento?</h1>' +
      '<p class="sub">' + (info.cliente ? 'Em nome de <b>' + esc(info.cliente) + '</b>. ' : '') + 'Toque em uma estrela.</p>' +
      '<div class="stars big" role="radiogroup" aria-label="Nota geral">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-label="' + n + ' de 5 — ' + LABEL[n] + '" data-n="' + n + '" class="' + (R.nota >= n ? 'on' : '') + '">' + star() + '</button>'; }).join('') + '</div>' +
      '<p class="lbl" id="lbl">' + (R.nota ? LABEL[R.nota] : '&nbsp;') + '</p>', dir);
    var btns = card.querySelectorAll('.stars button');
    btns.forEach(function (b) {
      b.addEventListener('mouseenter', function () { var n = +b.dataset.n; btns.forEach(function (x) { x.classList.toggle('hov', +x.dataset.n <= n); }); document.getElementById('lbl').textContent = LABEL[n]; });
      b.addEventListener('mouseleave', function () { btns.forEach(function (x) { x.classList.remove('hov'); }); document.getElementById('lbl').innerHTML = R.nota ? LABEL[R.nota] : '&nbsp;'; });
      b.addEventListener('click', function () { R.nota = +b.dataset.n; btns.forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= R.nota); x.classList.toggle('pop', +x.dataset.n === R.nota); }); document.getElementById('lbl').textContent = LABEL[R.nota]; setTimeout(function () { stepDetalhes(1); }, 520); });
    });
  }

  function stepDetalhes(dir) {
    step = 2;
    var rows = [['rapidez', 'Rapidez no retorno'], ['comunicacao', 'Comunicação e cordialidade'], ['solucao', 'Solução do problema']];
    render(dots() + '<p class="kick">Etapa 2 de 4</p><h1>Conte um pouco mais</h1><p class="sub">Avalie cada ponto do atendimento.</p>' +
      '<div class="aspects">' + rows.map(function (r) { return '<div class="asp"><span>' + r[1] + '</span><div class="stars sm" data-k="' + r[0] + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" aria-label="' + r[1] + ': ' + n + ' de 5" data-n="' + n + '" class="' + (R[r[0]] >= n ? 'on' : '') + '">' + star() + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div>' +
      '<div class="nav"><button type="button" class="btn ghost" id="back">Voltar</button><button type="button" class="btn primary" id="next">Continuar</button></div>', dir);
    card.querySelectorAll('.stars.sm').forEach(function (g) {
      var k = g.dataset.k;
      g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { R[k] = +b.dataset.n; g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= R[k]); }); g.parentNode.classList.remove('err'); }); });
    });
    document.getElementById('back').onclick = function () { stepNota(-1); };
    document.getElementById('next').onclick = function () {
      var falta = rows.filter(function (r) { return !R[r[0]]; });
      if (falta.length) { falta.forEach(function (r) { var el = card.querySelector('[data-k="' + r[0] + '"]').parentNode; el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); }); return; }
      stepNps(1);
    };
  }

  function stepNps(dir) {
    step = 3;
    var h = '<div class="nps" role="radiogroup" aria-label="Probabilidade de recomendar">';
    for (var i = 0; i <= 10; i++) h += '<button type="button" role="radio" data-n="' + i + '" class="' + (R.recomenda === i ? 'on' : '') + (i <= 6 ? ' lo' : i <= 8 ? ' mid' : ' hi') + '">' + i + '</button>';
    h += '</div><div class="nps-leg"><span>Nada provável</span><span>Muito provável</span></div>';
    render(dots() + '<p class="kick">Etapa 3 de 4</p><h1>Você recomendaria a Convergas a um colega?</h1><p class="sub">De 0 a 10.</p>' + h +
      '<div class="nav"><button type="button" class="btn ghost" id="back">Voltar</button><span></span></div>', dir);
    card.querySelectorAll('.nps button').forEach(function (b) { b.addEventListener('click', function () { R.recomenda = +b.dataset.n; card.querySelectorAll('.nps button').forEach(function (x) { x.classList.toggle('on', x === b); }); setTimeout(function () { stepComentario(1); }, 420); }); });
    document.getElementById('back').onclick = function () { stepDetalhes(-1); };
  }

  function stepComentario(dir) {
    step = 4;
    render(dots() + '<p class="kick">Etapa 4 de 4</p><h1>Quer deixar um comentário?</h1><p class="sub">Opcional — elogios, críticas ou sugestões.</p>' +
      '<textarea id="com" rows="4" maxlength="1500" placeholder="Escreva aqui…" autofocus>' + esc(R.comentario) + '</textarea>' +
      '<label class="fld"><span>Seu nome</span><input id="nome" maxlength="80" placeholder="Opcional" value="' + esc(R.nome || info.contato || '') + '"></label>' +
      '<div class="nav"><button type="button" class="btn ghost" id="back">Voltar</button><button type="button" class="btn primary" id="send">Enviar avaliação</button></div>', dir);
    document.getElementById('back').onclick = function () { R.comentario = document.getElementById('com').value; stepNps(-1); };
    document.getElementById('send').onclick = enviar;
  }

  function enviar() {
    var b = document.getElementById('send');
    R.comentario = document.getElementById('com').value; R.nome = document.getElementById('nome').value;
    b.disabled = true; b.innerHTML = '<span class="spin sm"></span>Enviando…';
    fetch('/api/avaliacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, resposta: R }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (j && j.ok) return obrigado();
        if (j && j.status === 'respondida') return message('ok', 'Avaliação já registrada', 'Esta avaliação já tinha sido respondida. Obrigado!');
        if (j && (j.status === 'expirada' || j.status === 'cancelada')) return message('warn', 'Este link expirou', 'O prazo para responder terminou. Se quiser, fale com o seu contato na Convergas.');
        b.disabled = false; b.textContent = 'Tentar de novo';
      })
      .catch(function () { b.disabled = false; b.textContent = 'Tentar de novo'; });
  }

  function obrigado() {
    step = 5; var s = 10;
    render('<div class="msg ok"><span class="msg-ic big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>' +
      '<h1>Obrigado' + (R.nome ? ', ' + esc(R.nome.split(' ')[0]) : '') + '!</h1><p>Sua avaliação foi registrada. Ela nos ajuda a melhorar cada atendimento.</p>' +
      '<a class="btn primary" href="' + SITE + '" rel="noopener">Conhecer a Convergas</a><p class="small" id="cd">Você será levado ao site da Convergas em ' + s + ' segundos.</p></div>', 1);
    var t = setInterval(function () { s--; var el = document.getElementById('cd'); if (el) el.textContent = 'Você será levado ao site da Convergas em ' + s + ' segundo' + (s === 1 ? '' : 's') + '.'; if (s <= 0) { clearInterval(t); location.replace(SITE); } }, 1000);
  }

  // início
  if (!token) { message('warn', 'Link inválido', 'Confira se o link foi copiado por completo.'); return; }
  fetch('/api/avaliacao?t=' + encodeURIComponent(token))
    .then(function (r) { return r.json().catch(function () { return {}; }); })
    .then(function (j) {
      info = j || {};
      if (j && j.ok && j.status === 'aberta') return stepNota(1);
      if (j && j.status === 'respondida') return message('ok', 'Avaliação já registrada', 'Recebemos a sua avaliação. Obrigado pelo retorno!');
      if (j && (j.status === 'expirada' || j.status === 'cancelada')) return message('warn', 'Este link expirou', 'Os links de avaliação valem por 3 dias. Se quiser avaliar, peça um novo link ao seu contato na Convergas.');
      message('warn', 'Link inválido', 'Não encontramos esta avaliação. Confira se o link foi copiado por completo.');
    })
    .catch(function () { message('warn', 'Sem conexão', 'Não foi possível carregar a avaliação. Verifique a internet e tente de novo.'); });
})();
