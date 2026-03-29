function formatCurrencyBRL(value) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  } catch {
    return `R$ ${Number(value).toFixed(2)}`;
  }
}

function yyyyMmDdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setTextFirst(ids, value) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      return;
    }
  }
}

function safeParseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem('oficinaPro_orcamentos');
  if (!raw) return [];
  const data = safeParseJSON(raw, []);
  return Array.isArray(data) ? data : [];
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 domingo, 1 segunda...
  const diff = (day + 6) % 7; // segunda=0, domingo=6
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekSunday(startMonday) {
  const d = new Date(startMonday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'orcamento') return 'espera';
  if (s === 'em_andamento') return 'andamento';
  if (s === 'atendido') return 'concluido';
  return s;
}

function getBudgetTotal(o) {
  return Number(o?.total ?? o?.valor ?? 0) || 0;
}

function getBudgetCost(o) {
  return Number(o?.custo ?? 0) || 0;
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits;
}

function getClientKey(o) {
  const phoneDigits = normalizePhone(o?.cliente?.telefone || o?.telefone);
  if (phoneDigits) return `tel:${phoneDigits}`;

  const placa = String(o?.veiculo?.placa || o?.placa || '').trim();
  if (placa) return `placa:${placa.toLowerCase()}`;

  const n = String(o?.cliente?.nome || o?.cliente || '').trim();
  return n ? `nome:${n.toLowerCase()}` : '';
}

function computeMetrics(orcamentos, now) {
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfWeekSunday(weekStart);

  const weeklyCount = orcamentos.filter(o => {
    const d = parseLocalDate(o?.date);
    if (!d) return false;
    return d >= weekStart && d <= weekEnd;
  }).length;

  const concluded = orcamentos.filter(o => normalizeStatus(o?.status) === 'concluido');
  const bruto = concluded.reduce((sum, o) => sum + getBudgetTotal(o), 0);
  const lucro = concluded.reduce((sum, o) => sum + (getBudgetTotal(o) - getBudgetCost(o)), 0);

  const uniqueClients = new Set();
  for (const o of concluded) {
    const key = getClientKey(o);
    if (key) uniqueClients.add(key);
  }

  return {
    orcamentosSemana: weeklyCount,
    brutoConcluido: bruto,
    lucroConcluido: lucro,
    clientesConcluidos: uniqueClients.size
  };
}

async function initDashboard() {
  setText('metric-orcamentos-dia', '0');
  setText('metric-total-bruto', 'R$ 0,00');
  setTextFirst(['metric-total-lucro-value', 'metric-total-lucro'], 'R$ 0,00');
  setText('metric-atendidos', '00');

  try {
    const orcamentos = loadFromLocalStorage();
    const metrics = computeMetrics(orcamentos, new Date());

    setText('metric-orcamentos-dia', String(metrics.orcamentosSemana));
    setText('metric-total-bruto', formatCurrencyBRL(metrics.brutoConcluido));
    setTextFirst(['metric-total-lucro-value', 'metric-total-lucro'], formatCurrencyBRL(metrics.lucroConcluido));
    setText('metric-atendidos', String(metrics.clientesConcluidos).padStart(2, '0'));
  } catch (err) {
    console.error(err);
    setText('metric-orcamentos-dia', '—');
    setText('metric-total-bruto', '—');
    setTextFirst(['metric-total-lucro-value', 'metric-total-lucro'], '—');
    setText('metric-atendidos', '—');
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);

