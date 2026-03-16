(() => {
  'use strict';

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
    setTimeout(() => { card.remove(); updateCounts(); }, 150);
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
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.id = `card-${cardCounter}`;
    card.innerHTML = `
      <div class="card-accent"></div>
      <button class="card-delete" title="Remove">&#x2715;</button>
      <div class="card-title">${escapeHtml(title)}</div>
      ${isBonus ? '<div class="bonus-tag">&#x2B50; Bonus</div>' : ''}
    `;
    // Wire up new card events
    card.addEventListener('dragstart', onDragStart);
    card.querySelector('.card-delete').addEventListener('click', function () {
      deleteCard(this);
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

  // ── INIT: wire up all existing elements ──

  function init() {
    // Cards: drag
    document.querySelectorAll('.card[draggable]').forEach(card => {
      card.addEventListener('dragstart', onDragStart);
    });

    // Cards: delete
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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
