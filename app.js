(() => {
  'use strict';

  const STORAGE_KEY = 'planning-board-v1';

  const LANE_NAMES = {
    obj1: 'Sales Process & Methodology',
    obj2: 'Partner GTM & Growth Execution',
    obj3: 'Revenue Intelligence & Reporting',
    obj4: 'Technology Enablement & Automation',
    obj5: 'Operational Excellence & Program Mgmt',
    obj6: 'Team & Org Leadership',
  };

  const COL_NAMES = {
    unassigned: 'In Flight',
    q2: 'Q2 2026',
    q3: 'Q3 2026',
    q4: 'Q4 2026',
    q1next: 'Q1 2027',
  };

  let dragId = null;
  let cardCounter = 1000;
  let pendingCell = null;

  // ── PERSISTENCE ──

  function cardToData(card) {
    return {
      id: card.id,
      title: card.querySelector('.card-title').textContent,
      note: card.querySelector('.card-note')?.textContent ?? null,
      bonusLabel: card.querySelector('.bonus-tag')?.textContent ?? null,
    };
  }

  function saveBoard() {
    const state = {};
    document.querySelectorAll('.cell').forEach(cell => {
      const key = `${cell.dataset.lane}_${cell.dataset.col}`;
      state[key] = Array.from(cell.querySelectorAll('.card')).map(cardToData);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showSavedToast();
  }

  function showSavedToast() {
    let toast = document.getElementById('save-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'save-toast';
      toast.textContent = 'Saved';
      Object.assign(toast.style, {
        position: 'fixed', bottom: '18px', right: '18px',
        background: '#1c1917', color: '#fff',
        fontSize: '10px', fontFamily: "'DM Sans', sans-serif",
        fontWeight: '600', padding: '6px 12px',
        borderRadius: '6px', opacity: '0',
        transition: 'opacity 0.2s', pointerEvents: 'none',
        zIndex: '200',
      });
      document.body.appendChild(toast);
    }
    clearTimeout(toast._timer);
    toast.style.opacity = '1';
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 1200);
  }

  function loadBoard() {
    let state;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      state = JSON.parse(raw);
    } catch {
      return false;
    }

    document.querySelectorAll('.cell').forEach(cell => {
      const key = `${cell.dataset.lane}_${cell.dataset.col}`;
      if (!state[key]) return;
      // Remove seed cards from HTML
      cell.querySelectorAll('.card').forEach(c => c.remove());
      // Restore saved cards
      const addBtn = cell.querySelector('.cell-add-btn');
      state[key].forEach(data => {
        const card = createCardElement(data);
        if (addBtn) cell.insertBefore(card, addBtn);
        else cell.appendChild(card);
      });
    });
    return true;
  }

  // Sync cardCounter so new IDs never collide with restored ones
  function syncCounter() {
    document.querySelectorAll('.card[id^="card-"]').forEach(card => {
      const n = parseInt(card.id.slice(5), 10);
      if (n >= cardCounter) cardCounter = n + 1;
    });
  }

  // ── CARD FACTORY ──

  function createCardElement(data) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.id = data.id;
    card.innerHTML = `
      <div class="card-accent"></div>
      <button class="card-delete" title="Remove">&#x2715;</button>
      <div class="card-title">${escapeHtml(data.title)}</div>
      ${data.note       ? `<div class="card-note">${escapeHtml(data.note)}</div>` : ''}
      ${data.bonusLabel ? `<div class="bonus-tag">${escapeHtml(data.bonusLabel)}</div>` : ''}
    `;
    card.addEventListener('dragstart', onDragStart);
    card.querySelector('.card-delete').addEventListener('click', function () {
      deleteCard(this);
    });
    card.addEventListener('dblclick', function (e) {
      startEditing(this);
      e.stopPropagation();
    });
    return card;
  }

  // ── INLINE EDIT ──

  function startEditing(card) {
    const titleEl = card.querySelector('.card-title');
    if (titleEl.contentEditable === 'true') return; // already editing

    const original = titleEl.textContent;
    card.draggable = false;
    card.classList.add('editing');
    titleEl.contentEditable = 'true';
    titleEl.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function commit() {
      const text = titleEl.textContent.trim();
      titleEl.contentEditable = 'false';
      card.draggable = true;
      card.classList.remove('editing');
      if (text) {
        titleEl.textContent = text;
        saveBoard();
      } else {
        titleEl.textContent = original; // revert if cleared
      }
    }

    function cancel() {
      titleEl.contentEditable = 'false';
      card.draggable = true;
      card.classList.remove('editing');
      titleEl.textContent = original;
    }

    titleEl.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        titleEl.removeEventListener('keydown', onKey);
        titleEl.removeEventListener('blur', onBlur);
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        titleEl.removeEventListener('keydown', onKey);
        titleEl.removeEventListener('blur', onBlur);
        cancel();
      }
    });

    function onBlur() {
      titleEl.removeEventListener('blur', onBlur);
      commit();
    }
    titleEl.addEventListener('blur', onBlur);
  }

  // ── DRAG & DROP ──

  function onDragStart(e) {
    dragId = e.currentTarget.id;
    setTimeout(() => document.getElementById(dragId)?.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove('drag-over');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!dragId) return;
    const card = document.getElementById(dragId);
    const addBtn = e.currentTarget.querySelector('.cell-add-btn');
    if (card) {
      if (addBtn) e.currentTarget.insertBefore(card, addBtn);
      else e.currentTarget.appendChild(card);
    }
    dragId = null;
    saveBoard();
    updateCounts();
  }

  document.addEventListener('dragend', () => {
    document.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
  });

  // ── DELETE ──

  function deleteCard(btn) {
    const card = btn.closest('.card');
    card.style.transition = 'opacity 0.15s, transform 0.15s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.92)';
    setTimeout(() => {
      card.remove();
      saveBoard();
      updateCounts();
    }, 150);
  }

  // ── ADD MODAL ──

  function openAdd(btn) {
    pendingCell = btn.closest('.cell');
    const { lane, col } = pendingCell.dataset;
    document.getElementById('modal-context').textContent =
      `${LANE_NAMES[lane] || lane}  ·  ${COL_NAMES[col] || col}`;
    document.getElementById('modal-input').value = '';
    document.getElementById('modal-bonus-check').checked = false;
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('modal-input').focus(), 180);
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    pendingCell = null;
  }

  function confirmAdd() {
    const title = document.getElementById('modal-input').value.trim();
    if (!title || !pendingCell) return;
    const isBonus = document.getElementById('modal-bonus-check').checked;
    cardCounter++;
    const card = createCardElement({
      id: `card-${cardCounter}`,
      title,
      note: null,
      bonusLabel: isBonus ? '⭐ Bonus' : null,
    });

    const addBtn = pendingCell.querySelector('.cell-add-btn');
    if (addBtn) pendingCell.insertBefore(card, addBtn);
    else pendingCell.appendChild(card);

    card.style.opacity = '0';
    card.style.transform = 'translateY(4px)';
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });

    closeModal();
    saveBoard();
    updateCounts();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── COUNTS ──

  function updateCounts() {
    Object.keys(COL_NAMES).forEach(col => {
      const cells = document.querySelectorAll(`.cell[data-col="${col}"]`);
      let n = 0;
      cells.forEach(c => n += c.querySelectorAll('.card').length);
      const el = document.getElementById(`hcount-${col}`);
      if (el) el.textContent = n ? `${n} initiative${n !== 1 ? 's' : ''}` : '';
    });

    Object.keys(LANE_NAMES).forEach(lane => {
      const cells = document.querySelectorAll(`.cell[data-lane="${lane}"]`);
      let n = 0;
      cells.forEach(c => n += c.querySelectorAll('.card').length);
      const el = document.getElementById(`lcount-${lane}`);
      if (el) el.textContent = `${n} initiative${n !== 1 ? 's' : ''}`;
    });
  }

  // ── INIT ──

  function init() {
    // Restore saved state (replaces seed cards from HTML if found)
    loadBoard();
    syncCounter();

    // Cards: drag, delete, edit
    document.querySelectorAll('.card[draggable]').forEach(card => {
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dblclick', function (e) {
        startEditing(this);
        e.stopPropagation();
      });
    });
    document.querySelectorAll('.card-delete').forEach(btn => {
      btn.addEventListener('click', function () { deleteCard(this); });
    });

    // Cells: drag target
    document.querySelectorAll('.cell').forEach(cell => {
      cell.addEventListener('dragover', onDragOver);
      cell.addEventListener('dragleave', onDragLeave);
      cell.addEventListener('drop', onDrop);
    });

    // Add buttons
    document.querySelectorAll('.cell-add-btn[data-add]').forEach(btn => {
      btn.addEventListener('click', function () { openAdd(this); });
    });

    // Modal controls
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', confirmAdd);
    document.getElementById('modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.getElementById('modal-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmAdd(); }
    });

    updateCounts();
    // Always persist the current state on load (captures seed data on first visit,
    // re-confirms restored state on subsequent visits)
    saveBoard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
