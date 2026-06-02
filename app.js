/* ============================================================
   MEDICAL OS — Application Logic
   ============================================================ */

const YEAR_META = {
  1: { label: '1er Año', sub: 'Ciencias Básicas', emoji: '🔬', color: '#6366f1', grad: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  2: { label: '2do Año', sub: 'Anatomía y Fisiología', emoji: '🫀', color: '#8b5cf6', grad: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
  3: { label: '3er Año', sub: 'Patología y Farmacología', emoji: '💊', color: '#ec4899', grad: 'linear-gradient(135deg,#ec4899,#f472b6)' },
  4: { label: '4to Año', sub: 'Clínica Médica', emoji: '🩺', color: '#f59e0b', grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  5: { label: '5to Año', sub: 'Especialidades', emoji: '🏥', color: '#10b981', grad: 'linear-gradient(135deg,#10b981,#34d399)' },
  6: { label: '6to Año', sub: 'Internado', emoji: '👨‍⚕️', color: '#0ea5e9', grad: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
  7: { label: '7mo Año', sub: 'Residencia y Especialización', emoji: '🎓', color: '#ef4444', grad: 'linear-gradient(135deg,#ef4444,#f87171)' },
};

// ── State ──────────────────────────────────────────────────
let state = JSON.parse(localStorage.getItem('medos-state') || 'null') || {
  notes: [],       // { id, year, subject, title, content, tags, date }
  classes: {},     // { "1": [{ id, name, desc, total, completed }], ... }
  flashcards: [],  // { id, year, subject, question, answer, studied }
  studiedToday: 0,
  streak: 1,
  lastStudyDate: null,
};

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

  // Scroll to top
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
    card.style.setProperty('--card-accent', meta.grad);
    card.innerHTML = `
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

// ── Year View ──────────────────────────────────────────────
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

  renderClassesList(year);
}

function renderClassesList(year) {
  const container = document.getElementById('classesList');
  const classes = state.classes[year] || [];

  if (!classes.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><p>No hay materias aún. ¡Crea tu primera materia!</p></div>`;
    return;
  }

  container.innerHTML = classes.map(cls => classCardHTML(cls, year)).join('');

  // Attach note buttons
  container.querySelectorAll('.cc-add-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const classId = btn.dataset.classId;
      const cls = classes.find(c => c.id === classId);
      openNoteModal(year, cls ? cls.name : '');
    });
  });

  // Attach class progress buttons
  container.querySelectorAll('.cc-increment').forEach(btn => {
    btn.addEventListener('click', () => {
      const classId = btn.dataset.classId;
      const cls = (state.classes[year] || []).find(c => c.id === classId);
      if (cls && cls.completed < cls.total) {
        cls.completed++;
        save();
        renderYearView(year);
        updatePills();
      }
    });
  });

  // Toggle notes
  container.querySelectorAll('.cc-toggle-notes').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById('notes-panel-' + btn.dataset.classId);
      if (panel) panel.classList.toggle('hidden');
    });
  });

  // Note click
  container.querySelectorAll('.note-card').forEach(el => {
    el.addEventListener('click', () => openNoteDetail(el.dataset.noteId));
  });
}

function classCardHTML(cls, year) {
  const meta = YEAR_META[year];
  const pct = cls.total ? Math.round((cls.completed / cls.total) * 100) : 0;
  const notes = state.notes.filter(n => n.subject === cls.name && n.year == year);

  return `
    <div class="class-card glass-card">
      <div class="cc-header">
        <div>
          <div class="cc-name">${cls.name}</div>
          <div class="cc-desc">${cls.desc || ''}</div>
        </div>
        <div class="cc-right">
          <div class="cc-percent">${pct}%</div>
          <div class="cc-actions">
            <button class="cc-btn cc-increment" data-class-id="${cls.id}" title="Marcar clase completada">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              +1 clase
            </button>
          </div>
        </div>
      </div>
      <div class="cc-bar">
        <div class="cc-fill" style="width:${pct}%;background:${meta.grad}"></div>
      </div>
      <div class="cc-footer">
        <span class="cc-notes-count">${cls.completed}/${cls.total} clases · ${notes.length} notas</span>
        <div style="display:flex;gap:8px">
          <button class="cc-btn cc-toggle-notes" data-class-id="${cls.id}">
            📝 Ver notas
          </button>
          <button class="cc-btn cc-add-note" data-class-id="${cls.id}">
            + Nota
          </button>
        </div>
      </div>
      <div class="class-notes" id="notes-panel-${cls.id}" style="display:${notes.length ? 'block' : 'none'}">
        <div class="class-notes-grid">
          ${notes.map(n => noteCardHTML(n)).join('')}
        </div>
      </div>
    </div>
  `;
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
  { id: 'first-note',  icon: '📝', name: 'Primera Nota', desc: 'Creaste tu primera nota', condition: () => state.notes.length >= 1 },
  { id: 'ten-notes',  icon: '📚', name: 'Estudioso', desc: '10 notas creadas', condition: () => state.notes.length >= 10 },
  { id: 'first-card', icon: '🃏', name: 'Primer Flash', desc: 'Creaste tu primera flashcard', condition: () => state.flashcards.length >= 1 },
  { id: 'ten-cards',  icon: '🎴', name: 'Coleccionista', desc: '10 flashcards creadas', condition: () => state.flashcards.length >= 10 },
  { id: 'first-class',icon: '🏫', name: 'Primera Materia', desc: 'Creaste tu primera materia', condition: () => Object.values(state.classes).flat().length >= 1 },
  { id: 'year1-50',   icon: '⭐', name: 'Medio 1er Año', desc: '50% del 1er año completado', condition: () => getYearProgress(1) >= 50 },
  { id: 'year1-100',  icon: '🏆', name: '1er Año Completo', desc: '1er año al 100%', condition: () => getYearProgress(1) === 100 },
  { id: 'all-done',   icon: '🎓', name: 'Médico', desc: 'Todos los años completados', condition: () => [1,2,3,4,5,6,7].every(y => getYearProgress(y) === 100) },
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

  // Remove suggestions
  const sugg = document.getElementById('chatSuggestions');
  if (sugg) sugg.remove();

  appendMessage('user', text);

  // Typing indicator
  const typingId = 'typing-' + uid();
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg ai';
  typingEl.id = typingId;
  typingEl.innerHTML = `<div class="chat-msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
  document.getElementById('chatMessages').appendChild(typingEl);
  scrollChat();

  setTimeout(() => {
    typingEl.remove();
    const response = generateResponse(text);
    appendMessage('ai', response);
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

  // Notes search
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

  // Nav items
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

// ── Save note ──────────────────────────────────────────────
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

    // Ensure class exists
    if (!state.classes[year]) state.classes[year] = [];
    const existing = state.classes[year].find(c => c.name === subject);
    if (!existing) {
      state.classes[year].push({ id: uid(), name: subject, desc: '', total: 20, completed: 0 });
    }

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
    state.classes[currentYear].push({ id: uid(), name, desc, total, completed: 0 });

    save();
    closeModal('classModal');
    document.getElementById('className').value = '';
    document.getElementById('classDesc').value = '';
    renderYearView(currentYear);
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

  // Filter buttons
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
  const input  = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');

  sendBtn.addEventListener('click', sendChatMessage);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
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
  } else if (state.lastStudyDate !== today) {
    state.streak = 1;
  }
  state.lastStudyDate = today;
  save();
}

// ── Init ───────────────────────────────────────────────────
function init() {
  checkStreak();
  initSidebar();
  initModals();
  initFlashcardInteractions();
  initChat();
  initParallax();
  initParticles();
  renderDashboard();
  initScrollReveal();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openNoteModal(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
