function $id(id) {
  return document.getElementById(id);
}

let state = null;

function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function yyyyMmDdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fileSafeSegment(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const norm = typeof raw.normalize === 'function' ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : raw;
  const cleaned = norm
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return cleaned.slice(0, 60);
}

function buildPdfFilenameFromState(fallbackId) {
  const nome = fileSafeSegment(state?.cliente?.nome);
  const modelo = fileSafeSegment(state?.veiculo?.modelo);
  const parts = ['orc', nome, modelo].filter(Boolean);
  const base = parts.length > 1 ? parts.join('-') : `orc-${fileSafeSegment(fallbackId) || 'orcamento'}`;
  return `${base}.pdf`;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function maskCpf(value) {
  const d = digitsOnly(value).slice(0, 11);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 9);
  const e = d.slice(9, 11);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `${a}.${b}`;
  if (d.length <= 9) return `${a}.${b}.${c}`;
  return `${a}.${b}.${c}-${e}`;
}

function maskPhone(value) {
  const d = digitsOnly(value).slice(0, 11);
  const a = d.slice(0, 2);
  const b = d.slice(2, 7);
  const c = d.slice(7, 11);
  if (d.length <= 2) return a ? `(${a}` : '';
  if (d.length <= 7) return `(${a}) ${b}`.trim();
  return `(${a}) ${b}-${c}`.trim();
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCaseName(value) {
  const clean = normalizeWhitespace(value);
  if (!clean) return '';
  const words = clean.split(' ');
  return words
    .map((w, idx) => {
      const parts = w.split('-').filter(Boolean);
      const mapped = parts.map((p, pIdx) => {
        const lower = p.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      });
      return mapped.join('-');
    })
    .join(' ');
}

function normalizeClientName(value) {
  const noDigits = String(value || '').replace(/\d/g, '');
  return titleCaseName(noDigits);
}

function isValidEmail(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v);
}

function isValidCpfDigits(cpfDigits) {
  const cpf = digitsOnly(cpfDigits);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(9);
  const d2 = calc(10);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function setInvalid(el, invalid) {
  if (!el) return;
  el.classList.toggle('is-invalid', Boolean(invalid));
}

function setupClienteFormUX() {
  const elNome = $id('cliente-nome');
  const elCpf = $id('cliente-cpf');
  const elTel = $id('cliente-telefone');
  const elEmailUser = $id('cliente-email-user');
  const elEmailDomain = $id('cliente-email-domain');
  const elEmail = $id('cliente-email');
  const elEnd = $id('cliente-endereco');

  if (elNome) {
    elNome.addEventListener('input', () => {
      const next = String(elNome.value || '').replace(/\d/g, '');
      if (next !== elNome.value) elNome.value = next;
    });
    elNome.addEventListener('blur', () => {
      elNome.value = normalizeClientName(elNome.value);
    });
  }

  if (elCpf) {
    elCpf.addEventListener('input', () => {
      elCpf.value = maskCpf(elCpf.value);
      const digits = digitsOnly(elCpf.value);
      setInvalid(elCpf, digits.length === 11 ? !isValidCpfDigits(digits) : false);
    });
    elCpf.addEventListener('blur', () => {
      const digits = digitsOnly(elCpf.value);
      if (!digits) {
        setInvalid(elCpf, false);
        return;
      }
      setInvalid(elCpf, digits.length !== 11 || !isValidCpfDigits(digits));
      elCpf.value = maskCpf(digits);
    });
  }

  if (elTel) {
    elTel.addEventListener('input', () => {
      elTel.value = maskPhone(elTel.value);
    });
    elTel.addEventListener('blur', () => {
      elTel.value = maskPhone(elTel.value);
    });
  }

  if (elEmailUser && elEmailDomain && elEmail) {
    const syncEmail = () => {
      let user = String(elEmailUser.value || '').trim().toLowerCase();
      user = user.replace(/\s+/g, '');

      if (user.includes('@')) {
        const [u, d] = user.split('@');
        user = u || '';
        if (d) {
          const dom = String(d).toLowerCase();
          const option = Array.from(elEmailDomain.options).find(o => String(o.value).toLowerCase() === dom);
          if (option) elEmailDomain.value = option.value;
        }
      }

      user = user.replace(/@/g, '');
      elEmailUser.value = user;

      const domain = String(elEmailDomain.value || '').trim().toLowerCase();
      const full = user && domain ? `${user}@${domain}` : user;
      elEmail.value = full;

      setInvalid(elEmailUser, full ? !isValidEmail(full) : false);
    };

    elEmailUser.addEventListener('input', syncEmail);
    elEmailDomain.addEventListener('change', syncEmail);
    elEmailUser.addEventListener('blur', syncEmail);
    syncEmail();
  } else if (elEmail) {
    elEmail.addEventListener('input', () => {
      const next = String(elEmail.value || '').toLowerCase();
      if (next !== elEmail.value) elEmail.value = next;
      const v = String(elEmail.value || '').trim();
      setInvalid(elEmail, v ? !isValidEmail(v) : false);
    });
    elEmail.addEventListener('blur', () => {
      const v = String(elEmail.value || '').trim().toLowerCase();
      elEmail.value = v;
      setInvalid(elEmail, v ? !isValidEmail(v) : false);
    });
  }

  if (elEnd) {
    elEnd.addEventListener('input', () => {
      elEnd.value = String(elEnd.value || '').replace(/\s{2,}/g, ' ');
    });
    elEnd.addEventListener('blur', () => {
      elEnd.value = normalizeWhitespace(elEnd.value);
    });
  }
}

function safeParseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadOrcamentosFromLocalStorage() {
  const raw = localStorage.getItem('oficinaPro_orcamentos');
  if (!raw) return [];
  const parsed = safeParseJSON(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveOrcamentosToLocalStorage(orcamentos) {
  localStorage.setItem('oficinaPro_orcamentos', JSON.stringify(orcamentos));
}

function computeCustoTotal(itens) {
  return itens.reduce((acc, item) => {
    if (item && item.tipo === 'grupo') return acc + (Number(item.valorTotal) || 0);
    return acc + (Number(item.maoDeObra) || 0);
  }, 0);
}

function renderItemsList(itens) {
  const container = $id('items-list');
  if (!container) return;

  container.innerHTML = '';

  if (!itens.length) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = 'Nenhum item adicionado.';
    container.appendChild(p);
    return;
  }

  for (const item of itens) {
    if (item.tipo === 'grupo') {
      const card = document.createElement('div');
      card.className = 'item-card';

      const statusBar = document.createElement('div');
      statusBar.className = 'item-status-bar';
      card.appendChild(statusBar);

      const content = document.createElement('div');
      content.className = 'item-content';

      const header = document.createElement('div');
      header.className = 'item-header';

      const titleGroup = document.createElement('div');
      titleGroup.className = 'item-title-group';

      const strong = document.createElement('strong');
      strong.textContent = 'Grupo de peças';

      const typeBadge = document.createElement('span');
      typeBadge.className = 'item-type-badge';
      typeBadge.textContent = 'GRUPO';

      titleGroup.appendChild(strong);
      titleGroup.appendChild(typeBadge);
      header.appendChild(titleGroup);
      content.appendChild(header);

      const listWrap = document.createElement('div');
      listWrap.className = 'group-selected-list';

      const ul = document.createElement('ul');
      const pecas = Array.isArray(item.pecas) ? item.pecas : [];
      for (const p of pecas) {
        const li = document.createElement('li');
        li.textContent = p?.nome || '';
        ul.appendChild(li);
      }
      listWrap.appendChild(ul);
      content.appendChild(listWrap);

      const footer = document.createElement('div');
      footer.className = 'item-footer';

      const price = document.createElement('div');
      price.className = 'item-price';
      price.innerHTML = `<span>Total:</span> ${formatCurrencyBRL(Number(item.valorTotal) || 0)}`;

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'btn-remove';
      btnRemove.setAttribute('aria-label', `Remover grupo`);
      btnRemove.innerHTML = '<i data-lucide="trash-2"></i>';
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        state.itens = state.itens.filter(x => x.id !== item.id);
        refreshUI();
      });

      footer.appendChild(price);
      footer.appendChild(btnRemove);
      content.appendChild(footer);

      card.appendChild(content);
      card.addEventListener('click', () => openGroupModalForEdit(item.id));

      container.appendChild(card);
      continue;
    }

    const card = document.createElement('div');
    card.className = 'item-card';

    // Barra lateral colorida
    const statusBar = document.createElement('div');
    statusBar.className = 'item-status-bar';
    card.appendChild(statusBar);

    const content = document.createElement('div');
    content.className = 'item-content';

    // Header: Nome e Tipo
    const header = document.createElement('div');
    header.className = 'item-header';
    
    const titleGroup = document.createElement('div');
    titleGroup.className = 'item-title-group';
    
    const strong = document.createElement('strong');
    strong.textContent = item.parte;
    
    const typeBadge = document.createElement('span');
    typeBadge.className = 'item-type-badge';
    if (item.tipo === 'Recuperação' || item.tipo === 'Lanternagem') {
      typeBadge.textContent = 'REPARO';
    } else {
      typeBadge.textContent = item.tipo;
    }
    
    titleGroup.appendChild(strong);
    titleGroup.appendChild(typeBadge);
    header.appendChild(titleGroup);
    content.appendChild(header);

    // Tags de Serviços
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'item-tags';

    // Tag baseada no tipo de dano
    if (item.tipo === 'Lanternagem') {
      const tag = document.createElement('div');
      tag.className = 'tag-pill';
      tag.innerHTML = '<i data-lucide="hammer"></i> Lanternagem';
      tagsContainer.appendChild(tag);
    } else if (item.tipo === 'Recuperação') {
      const tag = document.createElement('div');
      tag.className = 'tag-pill';
      tag.innerHTML = '<i data-lucide="wrench"></i> Recuperação';
      tagsContainer.appendChild(tag);
    }

    // Tags de Pintura e Polimento
    if (Array.isArray(item.servicos)) {
      if (item.servicos.includes('Pintura')) {
        const tag = document.createElement('div');
        tag.className = 'tag-pill';
        tag.innerHTML = '<i data-lucide="paint-bucket"></i> Pintura';
        tagsContainer.appendChild(tag);
      }
      if (item.servicos.includes('Polimento')) {
        const tag = document.createElement('div');
        tag.className = 'tag-pill';
        tag.innerHTML = '<i data-lucide="sparkles"></i> Polimento';
        tagsContainer.appendChild(tag);
      }
    }
    
    if (tagsContainer.children.length > 0) {
      content.appendChild(tagsContainer);
    }

    // Footer: Preço e Botão Remover
    const footer = document.createElement('div');
    footer.className = 'item-footer';

    const price = document.createElement('div');
    price.className = 'item-price';
    price.innerHTML = `<span>M.O:</span> ${formatCurrencyBRL(item.maoDeObra)}`;

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove';
    btnRemove.setAttribute('aria-label', `Remover ${item.parte}`);
    btnRemove.innerHTML = '<i data-lucide="trash-2"></i>';
    btnRemove.addEventListener('click', () => {
      state.itens = state.itens.filter(x => x.id !== item.id);
      refreshUI();
    });

    footer.appendChild(price);
    footer.appendChild(btnRemove);
    content.appendChild(footer);

    card.appendChild(content);
    container.appendChild(card);
  }

  // Atualiza ícones inseridos dinamicamente
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function renderCarDamages(itens) {
  const partes = new Set();
  for (const item of itens) {
    if (!item) continue;
    if (item.tipo === 'grupo') {
      const pecas = Array.isArray(item.pecas) ? item.pecas : [];
      for (const p of pecas) {
        if (p?.nome) partes.add(p.nome);
      }
      continue;
    }
    if (item.parte) partes.add(item.parte);
  }
  const parts = document.querySelectorAll('[data-parte]');
  for (const el of parts) {
    const parte = el.getAttribute('data-parte');
    if (partes.has(parte)) el.classList.add('damaged');
    else el.classList.remove('damaged');
  }
}

function renderSummary() {
  const valorTotal = computeCustoTotal(state.itens);
  const valorEl = $id('valor-total-final');

  if (valorEl) {
    valorEl.textContent = formatCurrencyBRL(valorTotal);
  }
  
  // Atualiza o estado global para persistência
  state.valorCobrado = valorTotal;
}

function buildPdfContent() {
  const cont = $id('orcamento-pdf');
  if (!cont || !state) return;

  // Garante que o SVG está com as marcações atualizadas antes de clonar
  renderCarDamages(state.itens);

  const todayStr = yyyyMmDdLocal(new Date());
  const orcNumber = state.tempPdfNumber || ('ORC-' + String(Date.now()).slice(-6));
  state.tempPdfNumber = orcNumber;
  const valorTotal = computeCustoTotal(state.itens);

  const svgEl = document.querySelector('.svg-wrapper .car-svg-ativo');
  const svgHtml = (() => {
    if (!svgEl) return '<div style="text-align:center; color:#999;">Sem diagrama</div>';

    const clone = svgEl.cloneNode(true);
    // Força namespaces para garantir renderização
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    // Define largura amigável ao A4
    clone.setAttribute('width', '560');
    clone.removeAttribute('height');

    const parts = clone.querySelectorAll('.car-part-active');
    for (const el of parts) {
      const damaged = el.classList.contains('damaged');
      if (damaged) {
        el.setAttribute('fill', '#ff6a00');
        el.setAttribute('stroke', '#ff6a00');
        el.setAttribute('stroke-width', '3');
      } else {
        el.setAttribute('fill', '#666666');
        el.setAttribute('stroke', '#999999');
        el.setAttribute('stroke-width', '1.5');
      }
    }
    const bases = clone.querySelectorAll('.car-base-outline');
    for (const b of bases) {
      b.setAttribute('fill', '#252525');
      b.setAttribute('stroke', '#444444');
      b.setAttribute('stroke-width', '5');
    }
    clone.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));

    try {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(clone);
      const svg64 = btoa(unescape(encodeURIComponent(svgStr)));
      const imgSrc = `data:image/svg+xml;base64,${svg64}`;
      return `<div class="svg-wrapper"><img src="${imgSrc}" alt="Diagrama do carro" /></div>`;
    } catch {
      // Fallback para inline direto
      return `<div class="svg-wrapper">${clone.outerHTML}</div>`;
    }
  })();

  const itensRows = (state.itens || []).map(i => {
    if (i && i.tipo === 'grupo') {
      const pecasTxt = (i.pecas || []).map(p => p.nome).filter(Boolean).join(' • ');
      return `
        <tr>
          <td>Grupo (${(i.pecas||[]).length})</td>
          <td>${pecasTxt || '-'}</td>
          <td style="text-align:right;">${formatCurrencyBRL(Number(i.valorTotal) || 0)}</td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>${i.parte || '-'}</td>
        <td>${[i.tipo || '-', ...(i.servicos || [])].join(' + ')}</td>
        <td style="text-align:right;">${formatCurrencyBRL(Number(i.maoDeObra) || 0)}</td>
      </tr>
    `;
  }).join('');

  cont.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-logo">Oficina<span style="color:#ff6a00">Pro</span></div>
      <div class="pdf-title">
        <div style="font-weight:900; font-size:1.2rem;">Orçamento - ${state.cliente?.nome || '—'}</div>
        <div style="color:#666;">Nº: ${orcNumber}</div>
        <div style="color:#666;">Data: ${todayStr}</div>
        <div class="pdf-badge">Gerado via Sistema</div>
      </div>
    </div>

    <div class="pdf-section">
      <div class="pdf-grid">
        <div class="field">
          <label>Cliente</label>
          <span>${state.cliente?.nome || '—'}</span>
        </div>
        <div class="field">
          <label>Telefone</label>
          <span>${state.cliente?.telefone || '—'}</span>
        </div>
        <div class="field">
          <label>CPF</label>
          <span>${state.cliente?.cpf ? maskCpf(state.cliente.cpf) : '—'}</span>
        </div>
        <div class="field">
          <label>Email</label>
          <span>${state.cliente?.email || '—'}</span>
        </div>
        <div class="field field-wide">
          <label>Endereço</label>
          <span>${state.cliente?.endereco || '—'}</span>
        </div>
        <div class="field">
          <label>Veículo</label>
          <span>${state.veiculo?.fabricante || ''} ${state.veiculo?.modelo || ''}</span>
        </div>
        <div class="field">
          <label>Ano</label>
          <span>${state.veiculo?.ano || '—'}</span>
        </div>
        <div class="field">
          <label>Placa / Cor</label>
          <span>${state.veiculo?.placa || '—'} • ${state.veiculo?.cor || '—'}</span>
        </div>
      </div>
    </div>

    <div class="pdf-section pdf-car">
      ${svgHtml}
    </div>

    <div class="pdf-section">
      <table class="pdf-table">
        <thead>
          <tr>
            <th>Peça</th>
            <th>Serviço</th>
            <th style="text-align:right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${itensRows || '<tr><td colspan="3" style="text-align:center; color:#777;">Nenhum item</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="pdf-summary">
      <div class="row total"><span>Valor Total</span> <span>${formatCurrencyBRL(valorTotal)}</span></div>
    </div>
  `;
}

function syncStateFromInputsForPdf() {
  if (!state) return;

  state.cliente.nome = normalizeClientName($id('cliente-nome')?.value || '');
  state.cliente.cpf = digitsOnly($id('cliente-cpf')?.value || '');
  state.cliente.telefone = maskPhone($id('cliente-telefone')?.value || '');
  const emailUser = String($id('cliente-email-user')?.value || '').trim().toLowerCase().replace(/\s+/g, '');
  const emailDomain = String($id('cliente-email-domain')?.value || '').trim().toLowerCase();
  const full = emailUser && emailDomain ? `${emailUser.replace(/@/g, '')}@${emailDomain}` : String($id('cliente-email')?.value || '').trim().toLowerCase();
  const hidden = $id('cliente-email');
  if (hidden) hidden.value = full;
  state.cliente.email = full;
  state.cliente.endereco = normalizeWhitespace($id('cliente-endereco')?.value || '');

  state.veiculo.fabricante = ($id('veiculo-fabricante')?.value || '').trim();
  state.veiculo.modelo = ($id('veiculo-modelo')?.value || '').trim();
  state.veiculo.ano = ($id('veiculo-ano')?.value || '').trim();
  state.veiculo.cor = ($id('veiculo-cor')?.value || '').trim();
  state.veiculo.placa = ($id('veiculo-placa')?.value || '').trim();
}

function exportPdf() {
  syncStateFromInputsForPdf();
  buildPdfContent();
  const el = $id('orcamento-pdf');
  if (!el || typeof html2pdf === 'undefined') {
    alert('Não foi possível gerar o PDF. Verifique a conexão ou recarregue a página.');
    return;
  }
  el.style.display = 'block';
  requestAnimationFrame(() => {
    const targetHeightPx = 1020;
    const h = el.scrollHeight || 0;
    const scale = h > targetHeightPx ? Math.max(0.72, Math.min(1, targetHeightPx / h)) : 1;

    const prevStyle = {
      position: el.style.position,
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      margin: el.style.margin,
      transformOrigin: el.style.transformOrigin,
      transform: el.style.transform
    };

    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '0';
    el.style.margin = '0';
    el.style.width = '700px';
    el.style.transformOrigin = 'top center';
    el.style.transform = scale === 1 ? 'translateX(-50%)' : `translateX(-50%) scale(${scale})`;

    const opt = {
      margin: 8,
      filename: buildPdfFilenameFromState(state?.tempPdfNumber),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(el)
      .save()
      .then(() => {
        el.style.position = prevStyle.position;
        el.style.left = prevStyle.left;
        el.style.top = prevStyle.top;
        el.style.width = prevStyle.width;
        el.style.margin = prevStyle.margin;
        el.style.transformOrigin = prevStyle.transformOrigin;
        el.style.transform = prevStyle.transform;
        el.style.display = 'none';
      })
      .catch(() => {
        el.style.position = prevStyle.position;
        el.style.left = prevStyle.left;
        el.style.top = prevStyle.top;
        el.style.width = prevStyle.width;
        el.style.margin = prevStyle.margin;
        el.style.transformOrigin = prevStyle.transformOrigin;
        el.style.transform = prevStyle.transform;
        el.style.display = 'none';
      });
  });
}

function loadPdfStore() {
  try {
    const raw = localStorage.getItem('oficinaPro_orcamentoPdfs');
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function savePdfStore(store) {
  localStorage.setItem('oficinaPro_orcamentoPdfs', JSON.stringify(store));
}

async function generatePdfDataUriFromCurrentPage(filenameBase) {
  const el = $id('orcamento-pdf');
  if (!el || typeof html2pdf === 'undefined') return null;

  el.style.display = 'block';

  const opt = {
    margin: 8,
    filename: `${filenameBase}.pdf`,
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const worker = html2pdf().set(opt).from(el).toPdf();
    const pdf = await worker.get('pdf');
    if (!pdf) return null;
    return pdf.output('datauristring');
  } catch {
    return null;
  } finally {
    el.style.display = 'none';
    el.style.transform = '';
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.margin = '';
    el.style.width = '';
    el.style.transformOrigin = '';
  }
}

function refreshUI() {
  renderItemsList(state.itens);
  renderCarDamages(state.itens);
  renderSummary();
}

function openModal(parte) {
  state.modal.aberto = true;
  state.modal.parte = parte;
  state.modal.tipo = ''; // Reseta para vazio para forçar escolha
  state.modal.servicos = []; 
  state.modal.maoDeObra = 0;

  const modalTitle = $id('modal-parte');
  if (modalTitle) modalTitle.textContent = parte;

  // Reseta inputs visuais
  if ($id('dano-tipo')) $id('dano-tipo').value = '';
  if ($id('service-pintura')) $id('service-pintura').checked = false;
  if ($id('service-polimento')) $id('service-polimento').checked = false;
  
  const moInput = $id('dano-mao-obra');
  if (moInput) moInput.value = '';

  const overlay = $id('modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeModal() {
  state.modal.aberto = false;
  const overlay = $id('modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function adicionarDano() {
  // Valida se o serviço principal foi escolhido
  const tipo = $id('dano-tipo').value;
  if (!tipo) {
    alert('Por favor, escolha o serviço principal (Troca, Recuperação ou Lanternagem).');
    return;
  }

  // Coleta serviços selecionados
  const servicos = [];
  if ($id('service-pintura') && $id('service-pintura').checked) servicos.push('Pintura');
  if ($id('service-polimento') && $id('service-polimento').checked) servicos.push('Polimento');

  const novoItem = {
    id: Date.now(),
    parte: state.modal.parte,
    tipo: tipo,
    servicos: servicos,
    maoDeObra: Number($id('dano-mao-obra').value) || 0
  };

  state.itens.push(novoItem);

  // Fecha modal
  state.modal.aberto = false;
  closeModal();

  refreshUI();
}

function initNovoOrcamentoPage() {
  // Estado
  state = {
    cliente: { nome: '', cpf: '', telefone: '', email: '', endereco: '' },
    veiculo: { fabricante: '', modelo: '', ano: '', cor: '', placa: '' },
    itens: [],
    valorCobrado: 0,
    selecao: {
      ativo: false,
      pecasSelecionadas: [],
      grupoEditId: null
    },
    modal: {
      aberto: false,
      parte: '',
      tipo: '',
      servicos: [],
      maoDeObra: 0
    }
  };
  window.state = state;
  setupClienteFormUX();

  const btnToggleSelect = $id('btn-toggle-select-parts');
  const selectCounter = $id('select-counter');
  const selectFloating = $id('select-floating');

  const groupOverlay = $id('group-modal-overlay');
  const groupPartsList = $id('group-parts-list');
  const groupTotalInput = $id('group-total-input');
  const groupError = $id('group-modal-error');
  const btnCancelGroup = $id('btn-cancelar-grupo');
  const btnConfirmGroup = $id('btn-confirmar-grupo');

  function setHoverText(text, isError) {
    const hoverFeedback = $id('hover-feedback');
    if (!hoverFeedback) return;
    hoverFeedback.textContent = text;
    hoverFeedback.style.opacity = isError ? '1' : '1';
  }

  function openGroupModal(title) {
    if (!groupOverlay) return;
    if (groupError) groupError.style.display = 'none';
    if (groupTotalInput) groupTotalInput.value = '';
    if (groupPartsList) {
      const pecas = state.selecao.grupoEditId
        ? (state.itens.find(i => i.id === state.selecao.grupoEditId)?.pecas || [])
        : state.selecao.pecasSelecionadas;

      const titleEl = document.createElement('div');
      titleEl.className = 'group-title';
      titleEl.textContent = title;

      const ul = document.createElement('ul');
      for (const p of pecas) {
        const li = document.createElement('li');
        li.textContent = p?.nome || '';
        ul.appendChild(li);
      }

      groupPartsList.innerHTML = '';
      groupPartsList.appendChild(titleEl);
      groupPartsList.appendChild(ul);
    }
    if (state.selecao.grupoEditId) {
      const it = state.itens.find(i => i.id === state.selecao.grupoEditId);
      if (groupTotalInput) groupTotalInput.value = String(Number(it?.valorTotal) || '');
    }
    groupOverlay.style.display = 'flex';
    if (groupTotalInput) groupTotalInput.focus();
  }

  function closeGroupModal() {
    if (!groupOverlay) return;
    groupOverlay.style.display = 'none';
    if (groupError) groupError.style.display = 'none';
    state.selecao.grupoEditId = null;
  }

  function updateSelectionUI() {
    if (btnToggleSelect) {
      if (state.selecao.ativo) {
        btnToggleSelect.classList.add('active');
        btnToggleSelect.textContent = 'Finalizar Seleção';
      } else {
        btnToggleSelect.classList.remove('active');
        btnToggleSelect.textContent = 'Selecionar Peças';
      }
    }

    const count = state.selecao.pecasSelecionadas.length;
    if (selectCounter) {
      selectCounter.style.display = state.selecao.ativo ? 'block' : 'none';
      selectCounter.textContent = `${count} peça${count === 1 ? '' : 's'} selecionada${count === 1 ? '' : 's'}`;
    }

    if (selectFloating) {
      if (!state.selecao.ativo) {
        selectFloating.style.display = 'none';
      } else {
        selectFloating.style.display = 'block';
        const items = state.selecao.pecasSelecionadas.slice(0, 6);
        const more = Math.max(0, state.selecao.pecasSelecionadas.length - items.length);
        const lis = items.map(p => `<li>${p.nome}</li>`).join('');
        selectFloating.innerHTML = `
          <div class="floating-title">
            <span>${count} peça${count === 1 ? '' : 's'} selecionada${count === 1 ? '' : 's'}</span>
            <span style="color: rgba(255,255,255,0.45); font-weight: 800;">Modo seleção</span>
          </div>
          <ul>${lis}${more ? `<li>+${more} outra(s)</li>` : ''}</ul>
        `;
      }
    }

    const parts = document.querySelectorAll('[data-parte]');
    const set = new Set(state.selecao.pecasSelecionadas.map(p => p.nome));
    for (const el of parts) {
      const parte = el.getAttribute('data-parte');
      if (state.selecao.ativo && set.has(parte)) el.classList.add('selected-temp');
      else el.classList.remove('selected-temp');
    }
  }

  function toggleSelectionMode() {
    if (!state.selecao.ativo) {
      state.selecao.ativo = true;
      state.selecao.pecasSelecionadas = [];
      updateSelectionUI();
      setHoverText('Modo seleção: clique nas peças para selecionar.', false);
      return;
    }

    if (!state.selecao.pecasSelecionadas.length) {
      setHoverText('Selecione pelo menos 1 peça antes de finalizar.', true);
      updateSelectionUI();
      return;
    }

    state.selecao.grupoEditId = null;
    openGroupModal('Peças selecionadas');
  }

  function togglePartSelection(parteNome) {
    const idx = state.selecao.pecasSelecionadas.findIndex(p => p.nome === parteNome);
    if (idx >= 0) state.selecao.pecasSelecionadas.splice(idx, 1);
    else state.selecao.pecasSelecionadas.push({ nome: parteNome });
    updateSelectionUI();
  }

  function confirmGroup() {
    const raw = groupTotalInput ? groupTotalInput.value : '';
    const valor = raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(valor) || valor <= 0) {
      if (groupError) {
        groupError.textContent = 'Informe o valor total do conjunto.';
        groupError.style.display = 'block';
      }
      return;
    }

    if (state.selecao.grupoEditId) {
      const id = state.selecao.grupoEditId;
      state.itens = state.itens.map(i => i.id === id ? { ...i, valorTotal: valor } : i);
      closeGroupModal();
      refreshUI();
      return;
    }

    if (!state.selecao.pecasSelecionadas.length) {
      if (groupError) {
        groupError.textContent = 'Selecione pelo menos 1 peça.';
        groupError.style.display = 'block';
      }
      return;
    }

    const novoGrupo = {
      id: Date.now(),
      tipo: 'grupo',
      pecas: state.selecao.pecasSelecionadas.map(p => ({ nome: p.nome })),
      valorTotal: valor,
      servico: null
    };

    state.itens.push(novoGrupo);
    state.selecao.pecasSelecionadas = [];
    state.selecao.ativo = false;
    closeGroupModal();
    updateSelectionUI();
    refreshUI();
  }

  function cancelGroup() {
    if (state.selecao.grupoEditId) {
      closeGroupModal();
      return;
    }
    closeGroupModal();
    updateSelectionUI();
  }

  if (btnToggleSelect) btnToggleSelect.addEventListener('click', toggleSelectionMode);
  if (btnCancelGroup) btnCancelGroup.addEventListener('click', cancelGroup);
  if (btnConfirmGroup) btnConfirmGroup.addEventListener('click', confirmGroup);
  if (groupOverlay) {
    groupOverlay.addEventListener('click', (e) => {
      if (e.target === groupOverlay) cancelGroup();
    });
  }

  window.openGroupModalForEdit = (id) => {
    state.selecao.grupoEditId = id;
    openGroupModal('Editar grupo');
  };

  const btnExport = $id('btn-export-pdf');
  if (btnExport) btnExport.addEventListener('click', exportPdf);

  const btnAddDano = $id('btn-adicionar-dano');
  if (btnAddDano) btnAddDano.addEventListener('click', adicionarDano);

  const btnCancelDano = $id('btn-cancelar-dano');
  if (btnCancelDano) btnCancelDano.addEventListener('click', closeModal);

  // Ícones/partes do carro
  const partesClickable = document.querySelectorAll('[data-parte]');
  const hoverFeedback = $id('hover-feedback');
  if (hoverFeedback) hoverFeedback.textContent = 'Selecione uma parte...';

  for (const el of partesClickable) {
    el.addEventListener('mouseenter', () => {
      const parteNome = el.getAttribute('data-parte') || '';
      if (hoverFeedback) {
        if (state.selecao.ativo) hoverFeedback.textContent = `Selecionar: ${parteNome}`;
        else hoverFeedback.textContent = `Avariar: ${parteNome}`;
      }
    });

    el.addEventListener('mouseleave', () => {
      if (hoverFeedback) {
        if (state.selecao.ativo) {
          const c = state.selecao.pecasSelecionadas.length;
          hoverFeedback.textContent = `Modo seleção: ${c} peça${c === 1 ? '' : 's'} selecionada${c === 1 ? '' : 's'}`;
        } else {
          hoverFeedback.textContent = 'Selecione uma parte...';
        }
      }
    });

    el.addEventListener('click', () => {
      const parte = el.getAttribute('data-parte');
      if (!parte) return;
      if (state.selecao.ativo) {
        togglePartSelection(parte);
        return;
      }
      openModal(parte);
    });
  }

  // Salvar orçamento
  const btnSave = $id('btn-salvar-orcamento');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      syncStateFromInputsForPdf();

      const elCpf = $id('cliente-cpf');
      const elEmailUi = $id('cliente-email-user') || $id('cliente-email');
      const elEmail = $id('cliente-email');
      const elTel = $id('cliente-telefone');
      const elNome = $id('cliente-nome');
      const elEnd = $id('cliente-endereco');

      if (elNome) elNome.value = state.cliente.nome;
      if (elCpf) elCpf.value = state.cliente.cpf ? maskCpf(state.cliente.cpf) : '';
      if (elTel) elTel.value = state.cliente.telefone;
      if (elEmail) elEmail.value = state.cliente.email;
      if (elEnd) elEnd.value = state.cliente.endereco;

      if (state.cliente.cpf && !isValidCpfDigits(state.cliente.cpf)) {
        setInvalid(elCpf, true);
        alert('CPF inválido.');
        elCpf?.focus();
        return;
      }

      if (state.cliente.email && !isValidEmail(state.cliente.email)) {
        setInvalid(elEmailUi, true);
        alert('Email inválido.');
        elEmailUi?.focus();
        return;
      }

      const telDigits = digitsOnly(state.cliente.telefone);
      if (state.cliente.telefone && telDigits.length !== 11) {
        alert('Telefone deve ter 11 dígitos.');
        elTel?.focus();
        return;
      }

      const valorTotal = computeCustoTotal(state.itens);
      const orcStatus = $id('orc-status')?.value || 'espera';
      const todayStr = yyyyMmDdLocal(new Date());

      if (!state.itens.length) {
        alert('Adicione pelo menos um dano/itens antes de salvar.');
        return;
      }

      const orcamento = {
        id: `orc-${Date.now()}`,
        date: todayStr,
        status: orcStatus,
        total: valorTotal,
        cliente: state.cliente,
        veiculo: state.veiculo,
        itens: state.itens.map(i => {
          if (i.tipo === 'grupo') {
            return {
              id: i.id,
              tipo: 'grupo',
              pecas: Array.isArray(i.pecas) ? i.pecas.map(p => ({ nome: p.nome })) : [],
              valorTotal: Number(i.valorTotal) || 0,
              servico: null
            };
          }
          return {
            id: i.id,
            parte: i.parte,
            tipo: i.tipo,
            servicos: i.servicos,
            maoDeObra: Number(i.maoDeObra) || 0
          };
        })
      };

      const existentes = loadOrcamentosFromLocalStorage();
      existentes.push(orcamento);
      saveOrcamentosToLocalStorage(existentes);

      try {
        state.tempPdfNumber = orcamento.id;
        syncStateFromInputsForPdf();
        buildPdfContent();
        const base = buildPdfFilenameFromState(orcamento.id).replace(/\.pdf$/i, '');
        const dataUri = await generatePdfDataUriFromCurrentPage(base);
        if (dataUri) {
          const store = loadPdfStore();
          store[orcamento.id] = { dataUri, createdAt: Date.now() };
          savePdfStore(store);
        }
      } catch {}

      alert('Orçamento salvo com sucesso!');
      window.location.href = '../index.html';
    });
  }

  refreshUI();
  updateSelectionUI();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    lucide.createIcons();
  }
  initNovoOrcamentoPage();
});
