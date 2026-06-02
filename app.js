/* ============================================================
   MEDICAL OS v4 — Application Logic
   ============================================================ */

const YEAR_META = {
  1: { label: '1er Año', sub: 'Ciencias Básicas',              emoji: '🔬', color: '#6366f1', grad: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  2: { label: '2do Año', sub: 'Anatomía y Fisiología',         emoji: '🫀', color: '#8b5cf6', grad: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
  3: { label: '3er Año', sub: 'Patología y Farmacología',      emoji: '💊', color: '#ec4899', grad: 'linear-gradient(135deg,#ec4899,#f472b6)' },
  4: { label: '4to Año', sub: 'Clínica Médica',                emoji: '🩺', color: '#f59e0b', grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  5: { label: '5to Año', sub: 'Especialidades',                emoji: '🏥', color: '#10b981', grad: 'linear-gradient(135deg,#10b981,#34d399)' },
  6: { label: '6to Año', sub: 'Internado',                     emoji: '👨‍⚕️', color: '#0ea5e9', grad: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
  7: { label: '7mo Año', sub: 'Residencia y Especialización',  emoji: '🎓', color: '#ef4444', grad: 'linear-gradient(135deg,#ef4444,#f87171)' },
};

// ── State ──────────────────────────────────────────────────
let state = JSON.parse(localStorage.getItem('medos-state') || 'null') || {
  notes: [],
  classes: {},
  flashcards: [],
  studiedToday: 0,
  streak: 1,
  lastStudyDate: null,
  palette: 'chromatic',
};

// ── Default 2do año data ───────────────────────────────────
const DEFAULT_YEAR2 = [
  {
    id: 'w-anatomia', name: 'Anatomía', desc: 'Morfología del cuerpo humano',
    total: 60, completed: 0,
    eras: [
      {
        id: 'era1', label: 'ERA 1',
        topics: [
          { id: 't1', label: 'Introducción a la Anatomía', done: false, content: [] },
          { id: 't2', label: 'Sistema Óseo — Generalidades', done: false, content: [] },
          { id: 't3', label: 'Columna Vertebral', done: false, content: [] },
        ]
      },
      {
        id: 'era2', label: 'ERA 2',
        topics: [
          { id: 't4', label: 'Miembro Superior', done: false, content: [] },
          { id: 't5', label: 'Miembro Inferior', done: false, content: [] },
          { id: 't6', label: 'Articulaciones', done: false, content: [] },
        ]
      },
      {
        id: 'era3', label: 'ERA 3',
        topics: [
          { id: 't7', label: 'Sistema Muscular', done: false, content: [] },
          { id: 't8', label: 'Tórax y Abdomen', done: false, content: [] },
          { id: 't9', label: 'Pelvis y Periné', done: false, content: [] },
        ]
      }
    ]
  },
  {
    id: 'w-heg', name: 'HEG', desc: 'Histología, Embriología y Genética',
    total: 40, completed: 0, eras: []
  },
  {
    id: 'w-aps2', name: 'APS II', desc: 'Atención Primaria de Salud II',
    total: 30, completed: 0, eras: []
  },
];

function seedYear2() {
  if (!state.classes['2'] || state.classes['2'].length === 0) {
    state.classes['2'] = JSON.parse(JSON.stringify(DEFAULT_YEAR2));
    save();
  }
}

function save() { localStorage.setItem('medos-state', JSON.stringify(state)); }

// ── Helpers ────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

function getYearProgress(year) {
  const classes = state.classes[year] || [];
  if (!classes.length) return 0;
  const total = classes.reduce((s, c) => s + (c.total || 0), 0);
  const done  = classes.reduce((s, c) => s + (c.completed || 0), 0);
  return total ? Math.round((done / total) * 100) : 0;
}

function getTotalProgress() {
  let total = 0;
  for (let y = 1; y <= 7; y++) total += getYearProgress(y);
  return Math.round(total / 7);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Palette ────────────────────────────────────────────────
const PALETTES = [
  { id: 'chromatic', name: 'Chromatic', desc: 'Arcoíris iridiscente', preview: 'linear-gradient(135deg,#a0c4ff,#c084fc,#ff9d6c,#a0c4ff)' },
  { id: 'minimal',   name: 'Minimal',   desc: 'Blanco y negro puro',   preview: 'linear-gradient(135deg,#fff,#888,#fff)' },
  { id: 'midnight',  name: 'Midnight',  desc: 'Azul profundo',         preview: 'linear-gradient(135deg,#3b82f6,#60a5fa,#93c5fd)' },
  { id: 'warm',      name: 'Warm',      desc: 'Dorado y ámbar',        preview: 'linear-gradient(135deg,#f59e0b,#fbbf24,#fde68a)' },
  { id: 'violet',    name: 'Violet',    desc: 'Violeta místico',       preview: 'linear-gradient(135deg,#8b5cf6,#a78bfa,#c4b5fd)' },
  { id: 'emerald',   name: 'Emerald',   desc: 'Verde esmeralda',       preview: 'linear-gradient(135deg,#10b981,#34d399,#6ee7b7)' },
];

function applyPalette(id) {
  document.documentElement.setAttribute('data-palette', id);
  state.palette = id;
  save();
  document.querySelectorAll('.palette-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.palette === id);
  });
}

function renderSettings() {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = PALETTES.map(p => `
    <div class="palette-card ${p.id === state.palette ? 'selected' : ''}" data-palette="${p.id}">
      <div class="palette-preview" style="background:${p.preview}"></div>
      <div class="palette-name">${p.name}</div>
      <div class="palette-desc">${p.desc}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.palette-card').forEach(card => {
    card.addEventListener('click', () => applyPalette(card.dataset.palette));
  });
}

// ── Navigation ─────────────────────────────────────────────
let currentView = 'dashboard';
let currentYear = 1;

function showView(viewId, year) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById('view-' + viewId);
  if (view) view.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (navItem) navItem.classList.add('active');

  currentView = viewId;

  if (viewId === 'year' && year) {
    currentYear = parseInt(year);
    renderYearView(currentYear);
    const yearNav = document.querySelector(`.nav-item[data-year="${year}"]`);
    if (yearNav) yearNav.classList.add('active');
  }

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'flashcards') renderFlashcards();
  if (viewId === 'progress') renderProgress();
  if (viewId === 'settings') renderSettings();

  document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' });
  initScrollReveal();
}

// ── Dashboard ──────────────────────────────────────────────
function renderDashboard() {
  updateTotalProgress();
  renderYearGrid();
  renderRecentNotes();
  updateStats();
  updatePills();
}

function updateTotalProgress() {
  const pct = getTotalProgress();
  document.getElementById('totalProgressValue').textContent = pct + '%';
  document.getElementById('totalProgressBar').style.width = pct + '%';
  document.getElementById('ringProgress').style.strokeDashoffset = 314 - (314 * pct / 100);
  document.getElementById('ringText').textContent = pct + '%';
  const done = [1,2,3,4,5,6,7].filter(y => getYearProgress(y) === 100).length;
  document.getElementById('totalProgressSub').textContent = `${done} de 7 años completados`;
}

function renderYearGrid() {
  const grid = document.getElementById('yearGrid');
  grid.innerHTML = '';
  for (let y = 1; y <= 7; y++) {
    const meta = YEAR_META[y];
    const pct  = getYearProgress(y);
    const classes = state.classes[y] || [];
    const card = document.createElement('div');
    card.className = 'year-card glass-card scroll-reveal';
    card.style.setProperty('--card-grad', meta.grad);
    card.style.setProperty('--card-shadow', meta.color + '33');
    card.innerHTML = `
      <div class="card-glow"></div>
      <div class="yc-icon" style="background:${meta.grad}">${meta.emoji}</div>
      <div class="yc-num">Año ${y}</div>
      <div class="yc-title">${meta.label}</div>
      <div class="yc-sub">${meta.sub}</div>
      <div class="yc-progress-bar">
        <div class="yc-progress-fill" style="width:${pct}%;background:${meta.grad}"></div>
      </div>
      <div class="yc-progress-val">${pct}% · ${classes.length} materias</div>
    `;
    card.addEventListener('click', () => showView('year', y));
    grid.appendChild(card);
  }
}

function renderRecentNotes() {
  const container = document.getElementById('recentNotes');
  const recent = [...state.notes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  if (!recent.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><p>No hay notas aún. ¡Crea tu primera nota!</p></div>`;
    return;
  }
  container.innerHTML = recent.map(n => noteCardHTML(n)).join('');
  container.querySelectorAll('.note-card').forEach(el => {
    el.addEventListener('click', () => openNoteDetail(el.dataset.noteId));
  });
}

function noteCardHTML(n) {
  const meta = YEAR_META[n.year];
  return `
    <div class="note-card glass-card scroll-reveal" data-note-id="${n.id}">
      <div class="nc-subject">${n.subject}</div>
      <div class="nc-title">${n.title}</div>
      <div class="nc-preview">${n.content}</div>
      <div class="nc-footer">
        <span class="nc-date">${formatDate(n.date)}</span>
        <span class="nc-year-badge" style="background:${meta.grad}">${meta.label}</span>
      </div>
    </div>
  `;
}

function updateStats() {
  document.getElementById('stat-notes').textContent = state.notes.length;
  document.getElementById('stat-flashcards').textContent = state.flashcards.length;
  document.getElementById('stat-studied').textContent = state.flashcards.filter(f => f.studied).length;
  document.getElementById('stat-streak').textContent = state.streak;
}

function updatePills() {
  for (let y = 1; y <= 7; y++) {
    const pill = document.getElementById('pill-' + y);
    if (pill) pill.textContent = getYearProgress(y) + '%';
  }
}

// ── Year View (accordion) ──────────────────────────────────
function renderYearView(year) {
  const meta = YEAR_META[year];
  document.getElementById('yearTitle').textContent = meta.label;
  document.getElementById('yearSubtitle').textContent = meta.sub;

  const pct = getYearProgress(year);
  const classes = state.classes[year] || [];
  const notes = state.notes.filter(n => n.year == year);

  document.getElementById('yearProgressValue').textContent = pct + '%';
  document.getElementById('yearProgressFill').style.width = pct + '%';
  document.getElementById('yearProgressStats').textContent = `${classes.length} materias · ${notes.length} notas`;

  renderSubjectAccordions(year);
}

function renderSubjectAccordions(year) {
  const container = document.getElementById('classesList');
  const classes = state.classes[year] || [];

  if (!classes.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><p>No hay materias aún. ¡Crea tu primera materia!</p></div>`;
    return;
  }

  container.innerHTML = classes.map(cls => subjectCardHTML(cls, year)).join('');
  attachSubjectEvents(container, year);
}

function subjectCardHTML(cls, year) {
  const meta = YEAR_META[year];
  const pct = cls.total ? Math.round((cls.completed / cls.total) * 100) : 0;
  const erasHTML = (cls.eras || []).map(era => eraHTML(era, cls.id)).join('');

  return `
    <div class="subject-card" data-subject-id="${cls.id}">
      <div class="subject-header">
        <div class="subject-chevron">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 5l3 4 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="subject-name-wrap">
          <span class="subject-name">${cls.name}</span>
          <input class="subject-name-input" value="${cls.name}" style="display:none" />
        </div>
        <div class="subject-edit-btns" style="display:none;gap:4px">
          <button class="cc-btn subject-save-name" data-id="${cls.id}">✓</button>
          <button class="cc-btn subject-cancel-name">✗</button>
        </div>
        <div class="subject-meta">
          <span class="subject-pct">${pct}%</span>
          <div class="subject-actions">
            <button class="cc-btn subject-edit-btn" data-id="${cls.id}" title="Editar nombre">✎</button>
            <button class="cc-btn subject-delete-btn" data-id="${cls.id}" title="Eliminar">✕</button>
          </div>
        </div>
      </div>
      <div class="subject-body">
        <div class="subject-body-inner">
          <div class="subject-bar-wrap">
            <div class="subject-mini-bar">
              <div class="subject-mini-fill" style="width:${pct}%;background:${meta.grad}"></div>
            </div>
            <span style="font-size:11px;color:var(--text-muted)">${cls.completed}/${cls.total} clases</span>
          </div>
          ${cls.desc ? `<div class="subject-desc" style="margin-top:8px;font-size:12px;color:var(--text-secondary)">${cls.desc}</div>` : ''}
          <div class="era-panels" style="margin-top:14px">
            ${erasHTML || '<div style="font-size:13px;color:var(--text-muted);padding:4px 0">Sin ERAs aún.</div>'}
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:center">
            <button class="cc-btn subject-increment" data-id="${cls.id}">✓ +1 clase</button>
            <button class="cc-btn add-era-btn" data-subject-id="${cls.id}">+ ERA</button>
            <button class="cc-btn cc-add-note" data-class-id="${cls.id}" data-class-name="${cls.name}">📝 Nota</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function eraHTML(era, subjectId) {
  const done  = era.topics.filter(t => t.done).length;
  const total = era.topics.length;
  return `
    <div class="era-panel" data-era-id="${era.id}" data-subject-id="${subjectId}">
      <div class="era-panel-header">
        <span class="era-panel-title">
          <span class="era-panel-chevron">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4l3 4 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>
          ${era.label}
        </span>
        <span class="era-panel-count">${done}/${total}</span>
        <button class="era-add-topic text-btn" data-era-id="${era.id}" data-subject-id="${subjectId}" style="font-size:11px;margin-left:auto">+ Tema</button>
      </div>
      <div class="era-panel-body">
        <div class="era-topic-list">
          ${era.topics.map(t => topicHTML(t, era.id, subjectId)).join('')}
        </div>
      </div>
    </div>
  `;
}

function topicHTML(t, eraId, subjectId) {
  return `
    <div class="era-topic-item ${t.done ? 'done' : ''}"
         data-topic-id="${t.id}" data-era-id="${eraId}" data-subject-id="${subjectId}">
      <div class="era-topic-check topic-check-btn"
           data-topic-id="${t.id}" data-era-id="${eraId}" data-subject-id="${subjectId}">
        ${t.done ? '✓' : ''}
      </div>
      <span class="era-topic-label topic-label"
            data-topic-id="${t.id}" data-era-id="${eraId}" data-subject-id="${subjectId}">${t.label}</span>
      ${(t.content || []).length > 0 ? '<span style="font-size:10px;color:var(--text-muted);margin-left:auto">●</span>' : ''}
    </div>
  `;
}

function attachSubjectEvents(container, year) {
  // Toggle accordion
  container.querySelectorAll('.subject-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('.subject-edit-btn') || e.target.closest('.subject-delete-btn') ||
          e.target.closest('.subject-edit-btns') || e.target.closest('.subject-meta')) return;
      const card = header.closest('.subject-card');
      card.classList.toggle('expanded');
    });
  });

  // Edit name
  container.querySelectorAll('.subject-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('.subject-card');
      card.querySelector('.subject-name').style.display = 'none';
      card.querySelector('.subject-name-input').style.display = 'inline-block';
      card.querySelector('.subject-name-input').focus();
      card.querySelector('.subject-edit-btns').style.display = 'flex';
      btn.style.display = 'none';
      card.querySelector('.subject-delete-btn').style.display = 'none';
    });
  });

  container.querySelectorAll('.subject-cancel-name').forEach(btn => {
    btn.addEventListener('click', e => {
      const card = btn.closest('.subject-card');
      card.querySelector('.subject-name').style.display = '';
      card.querySelector('.subject-name-input').style.display = 'none';
      card.querySelector('.subject-edit-btns').style.display = 'none';
      card.querySelector('.subject-edit-btn').style.display = '';
      card.querySelector('.subject-delete-btn').style.display = '';
    });
  });

  container.querySelectorAll('.subject-save-name').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const card = btn.closest('.subject-card');
      const newName = card.querySelector('.subject-name-input').value.trim();
      if (!newName) return;
      const cls = (state.classes[year] || []).find(c => c.id === id);
      if (cls) { cls.name = newName; save(); }
      renderSubjectAccordions(year);
    });
  });

  // Delete subject
  container.querySelectorAll('.subject-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta materia?')) return;
      const id = btn.dataset.id;
      state.classes[year] = (state.classes[year] || []).filter(c => c.id !== id);
      save();
      renderYearView(year);
      updatePills();
    });
  });

  // Increment class
  container.querySelectorAll('.subject-increment').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const cls = (state.classes[year] || []).find(c => c.id === id);
      if (cls && cls.completed < cls.total) { cls.completed++; save(); renderYearView(year); updatePills(); }
    });
  });

  // Add note from subject
  container.querySelectorAll('.cc-add-note').forEach(btn => {
    btn.addEventListener('click', () => openNoteModal(year, btn.dataset.className));
  });

  // Topic check
  container.querySelectorAll('.topic-check-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { topicId, eraId, subjectId } = btn.dataset;
      toggleTopicDone(year, subjectId, eraId, topicId);
    });
  });

  // Open topic content
  container.querySelectorAll('.topic-label').forEach(label => {
    label.addEventListener('click', () => {
      const { topicId, eraId, subjectId } = label.dataset;
      openTopicModal(year, subjectId, eraId, topicId);
    });
  });

  // ERA panel toggle
  container.querySelectorAll('.era-panel-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('.era-add-topic')) return;
      header.closest('.era-panel').classList.toggle('expanded');
    });
  });

  // Add ERA
  container.querySelectorAll('.add-era-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const subjectId = btn.dataset.subjectId;
      const label = prompt('Nombre del ERA (ej: ERA 4):');
      if (!label) return;
      const cls = (state.classes[year] || []).find(c => c.id === subjectId);
      if (cls) {
        if (!cls.eras) cls.eras = [];
        cls.eras.push({ id: 'era-' + uid(), label, topics: [] });
        save();
        renderSubjectAccordions(year);
        // Re-expand the card
        const card = document.querySelector(`[data-subject-id="${subjectId}"].subject-card`);
        if (card) card.classList.add('expanded');
      }
    });
  });

  // Add topic
  container.querySelectorAll('.era-add-topic').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { eraId, subjectId } = btn.dataset;
      const label = prompt('Nombre del tema:');
      if (!label) return;
      const cls = (state.classes[year] || []).find(c => c.id === subjectId);
      if (cls) {
        const era = (cls.eras || []).find(e => e.id === eraId);
        if (era) {
          era.topics.push({ id: 't-' + uid(), label, done: false, content: [] });
          save();
          renderSubjectAccordions(year);
          const card = document.querySelector(`.subject-card[data-subject-id="${subjectId}"]`);
          if (card) card.classList.add('expanded');
        }
      }
    });
  });
}

function toggleTopicDone(year, subjectId, eraId, topicId) {
  const cls = (state.classes[year] || []).find(c => c.id === subjectId);
  if (!cls) return;
  const era = (cls.eras || []).find(e => e.id === eraId);
  if (!era) return;
  const topic = era.topics.find(t => t.id === topicId);
  if (!topic) return;
  topic.done = !topic.done;
  save();
  renderSubjectAccordions(year);
  // Re-expand
  const card = document.querySelector(`.subject-card[data-subject-id="${subjectId}"]`);
  if (card) card.classList.add('expanded');
}

// ── Topic Content Modal ────────────────────────────────────
let topicContext = null; // { year, subjectId, eraId, topicId }
let topicBlocks = [];

function openTopicModal(year, subjectId, eraId, topicId) {
  const cls = (state.classes[year] || []).find(c => c.id === subjectId);
  if (!cls) return;
  const era = (cls.eras || []).find(e => e.id === eraId);
  if (!era) return;
  const topic = era.topics.find(t => t.id === topicId);
  if (!topic) return;

  topicContext = { year, subjectId, eraId, topicId };
  topicBlocks = JSON.parse(JSON.stringify(topic.content || []));

  document.getElementById('topicModalTitle').textContent = topic.label;
  renderTopicBlocks();
  document.getElementById('topicModal').classList.add('open');
}

function renderTopicBlocks() {
  const body = document.getElementById('topicModalBody');
  if (!topicBlocks.length) {
    body.innerHTML = `<div class="empty-state"><p>Sin contenido aún. Agrega texto o imágenes.</p></div>`;
    return;
  }
  body.innerHTML = topicBlocks.map((b, i) => {
    if (b.type === 'text') {
      return `<div class="content-block">
        <textarea class="glass-input content-text" data-idx="${i}" rows="4">${b.data}</textarea>
        <button class="cc-btn danger block-remove" data-idx="${i}">✕</button>
      </div>`;
    } else {
      return `<div class="content-block">
        <img src="${b.data}" alt="imagen" class="content-img" />
        <button class="cc-btn danger block-remove" data-idx="${i}">✕</button>
      </div>`;
    }
  }).join('');

  body.querySelectorAll('.content-text').forEach(ta => {
    ta.addEventListener('input', () => {
      topicBlocks[parseInt(ta.dataset.idx)].data = ta.value;
    });
  });

  body.querySelectorAll('.block-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      topicBlocks.splice(parseInt(btn.dataset.idx), 1);
      renderTopicBlocks();
    });
  });
}

// ── Flashcards ─────────────────────────────────────────────
let fcFilter = 'all';
let fcQueue = [];
let fcIndex = 0;

function renderFlashcards() {
  const all = state.flashcards.filter(f => fcFilter === 'all' || f.year == fcFilter);
  renderFcGrid(all);
  setupFcStudy(all);
}

function renderFcGrid(cards) {
  const grid = document.getElementById('flashcardsGrid');
  if (!cards.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🃏</div><p>No hay flashcards para este filtro.</p></div>`;
    return;
  }
  grid.innerHTML = cards.map(f => `
    <div class="fc-grid-card glass-card scroll-reveal">
      <div class="fg-subject">${f.subject} · Año ${f.year}</div>
      <div class="fg-question">${f.question}</div>
      <span class="fg-badge">${f.studied ? '✓ Estudiada' : 'Pendiente'}</span>
    </div>
  `).join('');
}

function setupFcStudy(cards) {
  fcQueue = [...cards];
  fcIndex = 0;
  const container = document.getElementById('fcCardContainer');
  const empty     = document.getElementById('fcEmpty');
  if (!fcQueue.length) {
    container.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  container.style.display = 'block';
  empty.style.display = 'none';
  showFcCard(0);
}

function showFcCard(idx) {
  if (!fcQueue.length) return;
  const card = fcQueue[idx % fcQueue.length];
  const el = document.getElementById('fcCard');
  el.classList.remove('flipped');
  document.getElementById('fcTag').textContent = `${card.subject} · Año ${card.year}`;
  document.getElementById('fcQuestion').textContent = card.question;
  document.getElementById('fcAnswer').textContent = card.answer;
  document.getElementById('fcCounter').textContent = `${(idx % fcQueue.length) + 1} / ${fcQueue.length}`;
  document.getElementById('fcProgressFill').style.width = ((idx % fcQueue.length + 1) / fcQueue.length * 100) + '%';
}

// ── Progress View ──────────────────────────────────────────
function renderProgress() {
  const barsContainer = document.getElementById('yearBars');
  barsContainer.innerHTML = '';
  for (let y = 1; y <= 7; y++) {
    const meta = YEAR_META[y];
    const pct  = getYearProgress(y);
    const div  = document.createElement('div');
    div.className = 'year-bar-item';
    div.innerHTML = `
      <div class="yb-label">${meta.label}</div>
      <div class="yb-bar"><div class="yb-fill" style="width:${pct}%;background:${meta.grad}"></div></div>
      <div class="yb-val">${pct}%</div>
    `;
    barsContainer.appendChild(div);
  }
  renderAchievements();
}

const ACHIEVEMENTS = [
  { id: 'first-note',   icon: '📝', name: 'Primera Nota',     desc: 'Creaste tu primera nota',       condition: () => state.notes.length >= 1 },
  { id: 'ten-notes',    icon: '📚', name: 'Estudioso',         desc: '10 notas creadas',               condition: () => state.notes.length >= 10 },
  { id: 'first-card',   icon: '🃏', name: 'Primer Flash',      desc: 'Creaste tu primera flashcard',   condition: () => state.flashcards.length >= 1 },
  { id: 'ten-cards',    icon: '🎴', name: 'Coleccionista',     desc: '10 flashcards creadas',          condition: () => state.flashcards.length >= 10 },
  { id: 'first-class',  icon: '🏫', name: 'Primera Materia',   desc: 'Creaste tu primera materia',     condition: () => Object.values(state.classes).flat().length >= 1 },
  { id: 'year1-50',     icon: '⭐', name: 'Medio 1er Año',     desc: '50% del 1er año completado',     condition: () => getYearProgress(1) >= 50 },
  { id: 'year1-100',    icon: '🏆', name: '1er Año Completo',  desc: '1er año al 100%',               condition: () => getYearProgress(1) === 100 },
  { id: 'all-done',     icon: '🎓', name: 'Médico',            desc: 'Todos los años completados',     condition: () => [1,2,3,4,5,6,7].every(y => getYearProgress(y) === 100) },
];

function renderAchievements() {
  const grid = document.getElementById('achievementGrid');
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.condition();
    return `
      <div class="achievement-card glass-card ${unlocked ? 'unlocked' : ''}">
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>
    `;
  }).join('');
}

// ── Note Detail ────────────────────────────────────────────
let selectedNoteId = null;

function openNoteDetail(noteId) {
  const note = state.notes.find(n => n.id === noteId);
  if (!note) return;
  selectedNoteId = noteId;
  const meta = YEAR_META[note.year];
  document.getElementById('noteDetailTitle').textContent = note.title;
  document.getElementById('noteDetailMeta').textContent = `${meta.label} · ${note.subject} · ${formatDate(note.date)}`;
  document.getElementById('noteDetailBody').textContent = note.content;
  document.getElementById('noteDetailTags').innerHTML = (note.tags || []).map(t => `<span class="note-tag">${t}</span>`).join('');
  document.getElementById('noteDetailModal').classList.add('open');
}

// ── Modals ─────────────────────────────────────────────────
function openNoteModal(year, subject) {
  if (year) document.getElementById('noteYear').value = year;
  if (subject) document.getElementById('noteSubject').value = subject;
  document.getElementById('noteModal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── MedChat AI ─────────────────────────────────────────────
function sendSuggestion(text) {
  document.getElementById('chatInput').value = text;
  sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  const sugg = document.getElementById('chatSuggestions');
  if (sugg) sugg.remove();
  appendMessage('user', text);
  const typingId = 'typing-' + uid();
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg ai';
  typingEl.id = typingId;
  typingEl.innerHTML = `<div class="chat-msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
  document.getElementById('chatMessages').appendChild(typingEl);
  scrollChat();
  setTimeout(() => {
    typingEl.remove();
    appendMessage('ai', generateResponse(text));
  }, 800 + Math.random() * 600);
}

function appendMessage(role, text) {
  const messages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="chat-msg-bubble">${text.replace(/\n/g, '<br>')}</div>`;
  messages.appendChild(div);
  scrollChat();
}

function scrollChat() {
  const msgs = document.getElementById('chatMessages');
  msgs.scrollTop = msgs.scrollHeight;
}

function generateResponse(query) {
  const q = query.toLowerCase();
  const matchingNotes = state.notes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.subject.toLowerCase().includes(q) ||
    (n.tags || []).some(t => t.toLowerCase().includes(q))
  );

  if (q.includes('progreso') || q.includes('avance')) {
    const pct = getTotalProgress();
    const lines = [1,2,3,4,5,6,7].map(y => `• ${YEAR_META[y].label}: ${getYearProgress(y)}%`);
    return `📊 **Tu progreso actual:**\n\nProgreso total: ${pct}%\n\n${lines.join('\n')}`;
  }
  if (q.includes('flashcard') || q.includes('flash')) {
    const total = state.flashcards.length;
    const studied = state.flashcards.filter(f => f.studied).length;
    return `🃏 Tienes **${total} flashcards** en total, de las cuales **${studied} han sido estudiadas**.\n\nVe a la sección de Flashcards para estudiar.`;
  }
  if (q.includes('año') && /[1-7]/.test(q)) {
    const year = parseInt(q.match(/[1-7]/)[0]);
    const meta = YEAR_META[year];
    const classes = state.classes[year] || [];
    const notes = state.notes.filter(n => n.year == year);
    const pct = getYearProgress(year);
    return `📚 **${meta.label} — ${meta.sub}**\n\n• Progreso: ${pct}%\n• Materias: ${classes.length}\n• Notas: ${notes.length}\n${classes.length ? '\nMaterias: ' + classes.map(c => c.name).join(', ') : ''}`;
  }
  if (q.includes('materia') || q.includes('asignatura')) {
    const all = Object.entries(state.classes).flatMap(([y, cs]) => cs.map(c => `Año ${y}: ${c.name}`));
    if (!all.length) return 'No tienes materias registradas aún. ¡Ve a un año y crea tu primera materia!';
    return `📚 Tus materias registradas:\n\n${all.map(m => '• ' + m).join('\n')}`;
  }
  if (q.includes('nota') || q.includes('notas')) {
    if (!state.notes.length) return 'No tienes notas aún. ¡Crea tu primera nota usando el botón "Nueva Nota"!';
    const recent = [...state.notes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    return `📝 Tienes **${state.notes.length} notas**. Las más recientes:\n\n${recent.map(n => `• ${n.title} (${n.subject})`).join('\n')}`;
  }
  if (matchingNotes.length) {
    if (matchingNotes.length === 1) {
      const n = matchingNotes[0];
      return `📄 **${n.title}** — ${n.subject}\n\n${n.content.slice(0, 300)}${n.content.length > 300 ? '...' : ''}`;
    }
    return `🔍 Encontré **${matchingNotes.length} notas** relacionadas:\n\n${matchingNotes.slice(0, 5).map(n => `• **${n.title}** (${n.subject})`).join('\n')}`;
  }
  const generic = [
    'Puedo ayudarte con información sobre tus notas, flashcards, progreso por año o materias. ¿Qué te gustaría saber?',
    'Prueba preguntarme: "¿Cuáles son mis notas de anatomía?" o "¿Cuál es mi progreso?"',
    '¡Recuerda que solo puedo acceder a la información que has guardado en MEDICAL OS! Agrega más notas para obtener mejores respuestas.',
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}

// ── Scroll reveal ──────────────────────────────────────────
function initScrollReveal() {
  setTimeout(() => {
    const els = document.querySelectorAll('.scroll-reveal:not(.revealed)');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('revealed'), i * 60);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => observer.observe(el));
  }, 100);
}

// ── Parallax on scroll ─────────────────────────────────────
function initParallax() {
  const main = document.getElementById('main');
  main.addEventListener('scroll', () => {
    const y = main.scrollTop;
    document.querySelectorAll('.parallax-header').forEach(h => {
      h.style.transform = `translateY(${y * 0.3}px)`;
      h.style.opacity = Math.max(0.3, 1 - y * 0.002);
    });
    document.querySelectorAll('.orb').forEach((orb, i) => {
      const speed = [0.1, 0.15, 0.08, 0.12][i];
      const dir   = i % 2 === 0 ? 1 : -1;
      orb.style.transform = `translate(${dir * y * speed * 0.5}px, ${-y * speed}px) scale(${1 + y * 0.0001})`;
    });
  });
}

// ── Particles ──────────────────────────────────────────────
function initParticles() {
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      bottom:${-size}px;
      animation-duration:${Math.random() * 20 + 15}s;
      animation-delay:${Math.random() * 15}s;
      opacity:${Math.random() * 0.4 + 0.1};
    `;
    document.body.appendChild(p);
  }
}

// ── Sidebar toggle ─────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebarToggle');

  toggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
      sidebar.classList.remove('collapsed');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      const year = item.dataset.year;
      showView(view, year);
      if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
    });
  });

  document.getElementById('backBtn').addEventListener('click', () => showView('dashboard'));
}

// ── Modals init ────────────────────────────────────────────
function initModals() {
  // Note modal
  document.getElementById('addNoteBtn').addEventListener('click', () => openNoteModal());
  document.getElementById('closeNoteModal').addEventListener('click', () => closeModal('noteModal'));
  document.getElementById('cancelNoteBtn').addEventListener('click', () => closeModal('noteModal'));

  document.getElementById('saveNoteBtn').addEventListener('click', () => {
    const year    = parseInt(document.getElementById('noteYear').value);
    const subject = document.getElementById('noteSubject').value.trim();
    const title   = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const tags    = document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(Boolean);
    if (!subject || !title || !content) return alert('Por favor completa todos los campos obligatorios.');
    const note = { id: uid(), year, subject, title, content, tags, date: new Date().toISOString() };
    state.notes.unshift(note);
    if (!state.classes[year]) state.classes[year] = [];
    const existing = state.classes[year].find(c => c.name === subject);
    if (!existing) state.classes[year].push({ id: uid(), name: subject, desc: '', total: 20, completed: 0, eras: [] });
    save();
    closeModal('noteModal');
    document.getElementById('noteSubject').value = '';
    document.getElementById('noteTitle').value   = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteTags').value    = '';
    renderDashboard();
    if (currentView === 'year') renderYearView(currentYear);
  });

  // Note detail modal
  document.getElementById('closeNoteDetail').addEventListener('click', () => closeModal('noteDetailModal'));
  document.getElementById('closeNoteDetailBtn').addEventListener('click', () => closeModal('noteDetailModal'));
  document.getElementById('deleteNoteBtn').addEventListener('click', () => {
    if (!selectedNoteId) return;
    if (!confirm('¿Eliminar esta nota?')) return;
    state.notes = state.notes.filter(n => n.id !== selectedNoteId);
    save();
    closeModal('noteDetailModal');
    renderDashboard();
    if (currentView === 'year') renderYearView(currentYear);
  });

  // Flashcard modal
  document.getElementById('addFlashcardBtn').addEventListener('click', () => {
    document.getElementById('flashcardModal').classList.add('open');
  });
  document.getElementById('closeFlashcardModal').addEventListener('click', () => closeModal('flashcardModal'));
  document.getElementById('cancelFcBtn').addEventListener('click', () => closeModal('flashcardModal'));
  document.getElementById('saveFcBtn').addEventListener('click', () => {
    const year     = parseInt(document.getElementById('fcYear').value);
    const subject  = document.getElementById('fcSubject').value.trim();
    const question = document.getElementById('fcQuestion').value.trim();
    const answer   = document.getElementById('fcAnswer').value.trim();
    if (!subject || !question || !answer) return alert('Por favor completa todos los campos.');
    state.flashcards.push({ id: uid(), year, subject, question, answer, studied: false });
    save();
    closeModal('flashcardModal');
    document.getElementById('fcSubject').value  = '';
    document.getElementById('fcQuestion').value = '';
    document.getElementById('fcAnswer').value   = '';
    renderFlashcards();
  });

  // Class modal
  document.getElementById('addClassBtn').addEventListener('click', () => {
    document.getElementById('classModal').classList.add('open');
  });
  document.getElementById('closeClassModal').addEventListener('click', () => closeModal('classModal'));
  document.getElementById('cancelClassBtn').addEventListener('click', () => closeModal('classModal'));
  document.getElementById('saveClassBtn').addEventListener('click', () => {
    const name  = document.getElementById('className').value.trim();
    const desc  = document.getElementById('classDesc').value.trim();
    const total = parseInt(document.getElementById('classTotal').value) || 20;
    if (!name) return alert('Por favor ingresa el nombre de la materia.');
    if (!state.classes[currentYear]) state.classes[currentYear] = [];
    state.classes[currentYear].push({ id: uid(), name, desc, total, completed: 0, eras: [] });
    save();
    closeModal('classModal');
    document.getElementById('className').value = '';
    document.getElementById('classDesc').value = '';
    renderYearView(currentYear);
  });

  // Topic content modal
  document.getElementById('closeTopicModal').addEventListener('click', () => closeModal('topicModal'));
  document.getElementById('topicAddText').addEventListener('click', () => {
    topicBlocks.push({ type: 'text', data: '' });
    renderTopicBlocks();
  });
  document.getElementById('topicAddImage').addEventListener('click', () => {
    document.getElementById('topicImageInput').click();
  });
  document.getElementById('topicImageInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      topicBlocks.push({ type: 'image', data: ev.target.result });
      renderTopicBlocks();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  document.getElementById('topicSave').addEventListener('click', () => {
    if (!topicContext) return;
    const { year, subjectId, eraId, topicId } = topicContext;
    const cls = (state.classes[year] || []).find(c => c.id === subjectId);
    if (!cls) return;
    const era = (cls.eras || []).find(e => e.id === eraId);
    if (!era) return;
    const topic = era.topics.find(t => t.id === topicId);
    if (!topic) return;
    topic.content = JSON.parse(JSON.stringify(topicBlocks));
    save();
    closeModal('topicModal');
    renderSubjectAccordions(year);
    const card = document.querySelector(`.subject-card[data-subject-id="${subjectId}"]`);
    if (card) card.classList.add('expanded');
  });

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

// ── Flashcard interactions ─────────────────────────────────
function initFlashcardInteractions() {
  const fcCard = document.getElementById('fcCard');
  fcCard.addEventListener('click', () => fcCard.classList.toggle('flipped'));

  document.getElementById('fcPass').addEventListener('click', () => {
    if (fcQueue[fcIndex]) {
      const real = state.flashcards.find(f => f.id === fcQueue[fcIndex].id);
      if (real) { real.studied = true; save(); }
    }
    fcIndex = (fcIndex + 1) % fcQueue.length;
    fcCard.classList.remove('flipped');
    setTimeout(() => showFcCard(fcIndex), 50);
  });

  document.getElementById('fcFail').addEventListener('click', () => {
    fcIndex = (fcIndex + 1) % fcQueue.length;
    fcCard.classList.remove('flipped');
    setTimeout(() => showFcCard(fcIndex), 50);
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fcFilter = btn.dataset.filter;
      renderFlashcards();
    });
  });
}

// ── Chat interactions ──────────────────────────────────────
function initChat() {
  const input   = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  window.medOS = { sendSuggestion };
}

// ── Streak tracking ────────────────────────────────────────
function checkStreak() {
  const today = new Date().toDateString();
  if (state.lastStudyDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (state.lastStudyDate === yesterday) {
    state.streak = (state.streak || 0) + 1;
  } else {
    state.streak = 1;
  }
  state.lastStudyDate = today;
  save();
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved palette
  applyPalette(state.palette || 'chromatic');

  checkStreak();
  seedYear2();

  initSidebar();
  initModals();
  initFlashcardInteractions();
  initChat();
  initParallax();
  initParticles();

  renderDashboard();
  initScrollReveal();
});
