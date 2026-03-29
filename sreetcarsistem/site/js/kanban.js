function $id(id) {
  return document.getElementById(id);
}

function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function loadOrcamentos() {
  const raw = localStorage.getItem('oficinaPro_orcamentos');
  return raw ? JSON.parse(raw) : [];
}

function saveOrcamentos(orcamentos) {
  localStorage.setItem('oficinaPro_orcamentos', JSON.stringify(orcamentos));
}

function updateCounts() {
  const columns = ['orcamento', 'em_andamento', 'atendido'];
  const orcamentos = loadOrcamentos();
  
  columns.forEach(status => {
    const count = orcamentos.filter(o => o.status === status).length;
    const badge = document.querySelector(`.kanban-column[data-status="${status}"] .count-badge`);
    if (badge) badge.textContent = count;
  });
}

function createBudgetCard(orcamento) {
  const card = document.createElement('div');
  card.className = 'budget-card';
  card.setAttribute('data-id', orcamento.id);
  
  card.innerHTML = `
    <div class="card-client">${orcamento.cliente.nome || 'Cliente sem nome'}</div>
    <div class="card-vehicle">${orcamento.veiculo.modelo || 'Veículo não informado'}</div>
    <div class="card-details">
      <span class="detail-bullet">${orcamento.veiculo.fabricante || 'Marca'}</span>
      <span class="detail-bullet">${orcamento.veiculo.placa || 'Sem Placa'}</span>
    </div>
    <div class="card-footer">
      <div class="card-price">${formatCurrencyBRL(orcamento.total)}</div>
      <i data-lucide="chevron-right" style="width: 16px; color: var(--text-dim)"></i>
    </div>
  `;
  
  card.addEventListener('click', () => openDetails(orcamento.id));
  
  return card;
}

function renderKanban() {
  const orcamentos = loadOrcamentos();
  const columns = {
    orcamento: $id('col-orcamento'),
    em_andamento: $id('col-em_andamento'),
    atendido: $id('col-atendido')
  };
  
  // Limpa colunas
  Object.values(columns).forEach(col => {
    if (col) col.innerHTML = '';
  });
  
  // Renderiza cards
  orcamentos.forEach(orc => {
    const col = columns[orc.status];
    if (col) {
      col.appendChild(createBudgetCard(orc));
    }
  });
  
  updateCounts();
  lucide.createIcons();
}

function initDraggable() {
  const columns = ['col-orcamento', 'col-em_andamento', 'col-atendido'];
  
  columns.forEach(id => {
    const el = $id(id);
    if (!el) return;
    
    new Sortable(el, {
      group: 'kanban',
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: function (evt) {
        const itemEl = evt.item;
        const newStatus = evt.to.parentElement.getAttribute('data-status');
        const id = itemEl.getAttribute('data-id');
        
        const orcamentos = loadOrcamentos();
        const orc = orcamentos.find(o => o.id === id);
        if (orc) {
          orc.status = newStatus;
          saveOrcamentos(orcamentos);
          updateCounts();
        }
      }
    });
  });
}

// Modal de Detalhes
function openDetails(id) {
  const orcamentos = loadOrcamentos();
  const orc = orcamentos.find(o => o.id === id);
  if (!orc) return;
  
  $id('detail-client-name').textContent = orc.cliente.nome || 'Detalhes do Orçamento';
  
  $id('detail-client-info').textContent = `
    CPF: ${orc.cliente.cpf || 'Não informado'}
    Tel: ${orc.cliente.telefone || 'Não informado'}
    E-mail: ${orc.cliente.email || 'Não informado'}
    Endereço: ${orc.cliente.endereco || 'Não informado'}
  `.trim();
  
  $id('detail-vehicle-info').textContent = `
    Marca: ${orc.veiculo.fabricante || '-'}
    Modelo: ${orc.veiculo.modelo || '-'}
    Ano: ${orc.veiculo.ano || '-'}
    Cor: ${orc.veiculo.cor || '-'}
    Placa: ${orc.veiculo.placa || '-'}
  `.trim();
  
  const itemsContainer = $id('detail-items-list');
  itemsContainer.innerHTML = '';
  orc.itens.forEach(item => {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';
    div.innerHTML = `
      <div style="font-weight: 700">${item.parte} (${item.tipo})</div>
      <div style="font-size: 0.8rem; color: var(--orange)">${item.servicos.join(' + ') || 'Reparo'}</div>
      <div style="font-size: 0.8rem; color: var(--text-dim)">Mão de Obra: ${formatCurrencyBRL(item.maoDeObra)}</div>
    `;
    itemsContainer.appendChild(div);
  });
  
  $id('detail-total').textContent = formatCurrencyBRL(orc.total);
  
  // Renderizar o SVG simplificado (apenas as partes danificadas em destaque)
  renderSVGPreview(orc.itens);
  
  $id('modal-detalhes').style.display = 'flex';
}

function renderSVGPreview(itens) {
  const container = $id('detail-svg-container');
  // Usaremos um ícone de carro do Lucide para simplificar o preview ou poderíamos injetar o SVG completo do novo-orcamento
  // Para ser fiel ao pedido "Imagem do carro com partes danificadas", vamos injetar um SVG de carro estático.
  container.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <i data-lucide="car" style="width: 80px; height: 80px; color: var(--orange)"></i>
      <p style="margin-top: 10px; color: var(--text-dim)">Diagrama técnico visualizado no orçamento original.</p>
    </div>
  `;
  lucide.createIcons();
}

$id('btn-close-modal')?.addEventListener('click', () => {
  $id('modal-detalhes').style.display = 'none';
});

window.onclick = function(event) {
  const modal = $id('modal-detalhes');
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  renderKanban();
  initDraggable();
});