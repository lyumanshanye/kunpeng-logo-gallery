'use strict';
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const STORAGE_KEY = 'kunpeng-gallery-favorites-v1';
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
catch { favorites = new Set(); }
let data, batchMap, visible = [], batch = 'all', reference = 'all', favoritesOnly = false, query = '', current = null, sequence = [], toastTimer;
const detailDialog = $('#detail-dialog');
const compareDialog = $('#compare-dialog');

let masonryFrame;
function layoutMasonry() {
  const gallery = $('#gallery');
  const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0;
  const measurements = [...gallery.querySelectorAll('.art-card')].map(card =>
    [card, Math.ceil(card.getBoundingClientRect().height + gap)]
  );
  for (const [card, span] of measurements) card.style.gridRowEnd = `span ${Math.max(1, span)}`;
}
function scheduleMasonry() {
  cancelAnimationFrame(masonryFrame);
  masonryFrame = requestAnimationFrame(layoutMasonry);
}
const masonryObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleMasonry) : null;
window.addEventListener('resize', scheduleMasonry);

function announce(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 1800);
}
function syncModalState() {
  document.body.classList.toggle('modal-open', detailDialog.open || compareDialog.open);
}
function updateFavoriteCount() {
  $('#favorite-count').textContent = favorites.size;
  $('#favorites-filter').setAttribute('aria-pressed', String(favoritesOnly));
}
function toggleFavorite(id) {
  const removing = favorites.has(id);
  if (removing) favorites.delete(id); else favorites.add(id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites])); }
  catch { announce('当前浏览器无法持久保存收藏'); }
  updateFavoriteCount();
  if (favoritesOnly) renderGallery();
  else {
    document.querySelectorAll('.favorite-button').forEach(button => {
      if (button.dataset.favorite === id) {
        button.setAttribute('aria-pressed', String(!removing));
        button.textContent = removing ? '♡' : '♥';
        button.setAttribute('aria-label', (removing ? '收藏 ' : '取消收藏 ') + button.dataset.name);
      }
    });
  }
  if (current?.id === id) updateDetailFavorite();
}
function updateDetailFavorite() {
  const selected = favorites.has(current.id);
  $('#detail-favorite').textContent = selected ? '♥ 已收藏' : '♡ 收藏';
  $('#detail-favorite').setAttribute('aria-pressed', String(selected));
}
function card(item) {
  const selected = favorites.has(item.id);
  const title = escapeHTML(item.name);
  return `<article class="art-card" data-id="${item.id}">
    <button class="art-link" data-open="${item.id}" aria-label="查看 ${title} ${item.number}">
      <img src="${item.preview}" width="${item.width}" height="${item.height}" style="--ratio:${item.width}/${item.height}" alt="${title}，${batchMap[item.batch].short}，方案 ${item.number}" loading="lazy" decoding="async">
      <span class="card-expand" aria-hidden="true">↗</span>
    </button>
    <div class="card-footer"><div><p class="card-name">${title}</p><div class="card-meta"><strong>${item.batch.toUpperCase()} / ${item.number}</strong>${item.reference ? `<button class="group-open" data-compare="${item.reference}" aria-label="查看参考 ${item.reference} 的变体">参考 ${item.reference} ↗</button>` : `<span>${batchMap[item.batch].short}</span>`}</div></div>
    <button class="favorite-button" data-favorite="${item.id}" data-name="${title}" aria-label="${selected ? '取消收藏' : '收藏'} ${title}" aria-pressed="${selected}">${selected ? '♥' : '♡'}</button></div>
  </article>`;
}
function renderGallery() {
  $('#reference-select').innerHTML = '<option value="all">全部参考</option>' + Object.values(data.references).filter(ref => batch === 'all' || data.items.some(item => item.batch === batch && item.reference === ref.id)).map(ref => `<option value="${escapeHTML(ref.id)}">${escapeHTML(ref.id)} · ${escapeHTML(ref.name)}</option>`).join('');
  $('#reference-select').value = reference;
  const search = query.toLocaleLowerCase().trim();
  visible = data.items.filter(item =>
    (batch === 'all' || item.batch === batch) &&
    (reference === 'all' || item.reference === reference) &&
    (!favoritesOnly || favorites.has(item.id)) &&
    (!search || [item.name, item.number, item.id, batchMap[item.batch].title, item.reference ? '参考 ' + item.reference : ''].join(' ').toLocaleLowerCase().includes(search))
  );
  $('#gallery').innerHTML = visible.map(card).join('');
  masonryObserver?.disconnect();
  document.querySelectorAll('#gallery .art-card').forEach(card => masonryObserver?.observe(card));
  document.querySelectorAll('#gallery img').forEach(img => img.addEventListener('load', scheduleMasonry, {once: true}));
  scheduleMasonry();
  $('#gallery').setAttribute('aria-busy', 'false');
  const context = reference !== 'all' ? `参考 ${reference} · ${data.references[reference].name}` : batch === 'all' ? `${data.batches.length}轮探索` : batchMap[batch].short;
  $('#result-summary').textContent = `${visible.length} 个方案 · ${favoritesOnly ? '我的收藏' : context}`;
  $('#empty-state').hidden = visible.length > 0;
  $('#empty-copy').textContent = favoritesOnly && favorites.size === 0 ? '点击作品旁的爱心，把喜欢的方案留在这里。' : '试试其他名称，或重置筛选。';
  $('#gallery-end').hidden = visible.length === 0;
  $('#clear-filters').hidden = batch === 'all' && reference === 'all' && !favoritesOnly && !query;
  $('#reference-select-label').hidden = batch !== 'all' && !data.items.some(item => item.batch === batch && item.reference);
  document.querySelectorAll('[data-batch]').forEach(button => {
    button.classList.toggle('active', button.dataset.batch === batch);
    button.setAttribute('aria-pressed', String(button.dataset.batch === batch));
  });
  updateFavoriteCount();
}
function resetFilters() {
  batch = 'all'; reference = 'all'; favoritesOnly = false; query = '';
  $('#search').value = ''; $('#reference-select').value = 'all';
  renderGallery();
}
function openDetail(id, preserveSequence = false) {
  const item = data.items.find(item => item.id === id);
  if (!item) return;
  current = item;
  if (!preserveSequence) sequence = visible.some(candidate => candidate.id === id) ? [...visible] : data.items;
  $('#detail-art').innerHTML = `<img src="${item.original}" alt="${escapeHTML(item.name)}，方案 ${item.number}">`;
  $('#detail-batch').textContent = batchMap[item.batch].title;
  $('#detail-title').textContent = item.name;
  $('#detail-number').textContent = `${item.batch.toUpperCase()} / ${item.number}`;
  $('#detail-description').textContent = item.description || batchMap[item.batch].description;
  $('#detail-prompt').textContent = item.prompt;
  $('#download-original').href = item.original;
  $('#download-original').download = `kunpeng-${item.id}.png`;
  $('#reference-panel').hidden = !item.reference;
  if (item.reference) {
    const ref = data.references[item.reference];
    $('#detail-reference').src = ref.image;
    $('#detail-reference').alt = `参考 ${ref.id}：${ref.name}`;
    $('#siblings').innerHTML = data.items.filter(other => other.reference === item.reference).map(other => `<button class="sibling ${other.id === item.id ? 'active' : ''}" data-sibling="${other.id}" aria-label="查看方案 ${other.number}" aria-pressed="${other.id === item.id}"><img src="${other.preview}" alt="方案 ${other.number}"><span>${other.number}</span></button>`).join('');
  }
  const index = sequence.findIndex(other => other.id === item.id);
  $('#detail-position').textContent = `${index + 1} / ${sequence.length}`;
  $('#previous-item').disabled = index <= 0;
  $('#next-item').disabled = index >= sequence.length - 1;
  updateDetailFavorite();
  if (!detailDialog.open) detailDialog.showModal();
  syncModalState();
  history.replaceState(null, '', '#' + item.id);
}
function navigateDetail(delta) {
  const index = sequence.findIndex(item => item.id === current?.id);
  if (index + delta >= 0 && index + delta < sequence.length) openDetail(sequence[index + delta].id, true);
}
function openCompare(id) {
  const ref = data.references[id];
  $('#compare-title').textContent = `参考 ${id} · ${ref.name}`;
  $('#compare-grid').innerHTML = `<div class="compare-tile"><img src="${ref.image}" alt="原参考 ${id}"><span>原参考 ${id}</span></div>` + data.items.filter(item => item.reference === id).map(item => `<button class="compare-tile" data-open-comparison="${item.id}" aria-label="查看变体 ${item.number}"><img src="${item.preview}" alt="变体 ${item.number}"><span>${item.number}</span></button>`).join('');
  if (!compareDialog.open) compareDialog.showModal();
  syncModalState();
}
async function initialize() {
  $('#load-error').hidden = true;
  try {
    const response = await fetch('gallery.json');
    if (!response.ok) throw new Error('Gallery unavailable');
    data = await response.json();
    batchMap = Object.fromEntries(data.batches.map(batch => [batch.id, batch]));
    const validIDs = new Set(data.items.map(item => item.id));
    favorites = new Set([...favorites].filter(id => validIDs.has(id)));
    $('#batch-tabs').innerHTML = `<button class="tab active" data-batch="all" aria-pressed="true">全部作品 <span>${data.total}</span></button>` + data.batches.map(batch => `<button class="tab" data-batch="${batch.id}" aria-pressed="false">${batch.short} <span>${batch.count}</span></button>`).join('');
    $('#reference-select').innerHTML = '<option value="all">全部参考</option>' + Object.values(data.references).map(ref => `<option value="${ref.id}">${ref.id} · ${ref.name}</option>`).join('');
    renderGallery();
    if (location.hash) openDetail(decodeURIComponent(location.hash.slice(1)));
  } catch {
    $('#load-error').hidden = false;
    $('#result-summary').textContent = '作品载入失败';
    $('#gallery').setAttribute('aria-busy', 'false');
  }
}
$('#batch-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-batch]');
  if (!button || !data) return;
  batch = button.dataset.batch;
  if (batch !== 'all' && !data.items.some(item => item.batch === batch && item.reference === reference)) { reference = 'all'; $('#reference-select').value = 'all'; }
  renderGallery();
  if (window.scrollY > $('.collection').offsetTop) $('.collection').scrollIntoView({behavior:'smooth', block:'start'});
});
$('#favorites-filter').addEventListener('click', () => { if (!data) return; favoritesOnly = !favoritesOnly; renderGallery(); });
$('#search').addEventListener('input', event => { query = event.target.value; if (data) renderGallery(); });
$('#reference-select').addEventListener('change', event => {
  reference = event.target.value;
  if (reference !== 'all') batch = data.items.find(item => item.reference === reference)?.batch || 'all';
  renderGallery();
});
$('#clear-filters').addEventListener('click', resetFilters);
$('#empty-reset').addEventListener('click', resetFilters);
$('#retry-load').addEventListener('click', initialize);
$('#gallery').addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  const compare = event.target.closest('[data-compare]');
  const open = event.target.closest('[data-open]');
  if (favorite) toggleFavorite(favorite.dataset.favorite);
  else if (compare) openCompare(compare.dataset.compare);
  else if (open) openDetail(open.dataset.open);
});
$('#close-dialog').addEventListener('click', () => detailDialog.close());
$('#close-compare').addEventListener('click', () => compareDialog.close());
detailDialog.addEventListener('close', () => { syncModalState(); history.replaceState(null, '', location.pathname + location.search); });
compareDialog.addEventListener('close', syncModalState);
for (const dialog of [detailDialog, compareDialog]) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
$('#detail-favorite').addEventListener('click', () => { if (current) toggleFavorite(current.id); });
$('#previous-item').addEventListener('click', () => navigateDetail(-1));
$('#next-item').addEventListener('click', () => navigateDetail(1));
$('#compare-group').addEventListener('click', () => { if (current?.reference) openCompare(current.reference); });
$('#reference-image-button').addEventListener('click', () => { if (current?.reference) openCompare(current.reference); });
$('#siblings').addEventListener('click', event => { const button = event.target.closest('[data-sibling]'); if (button) openDetail(button.dataset.sibling); });
$('#compare-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-open-comparison]');
  if (button) { compareDialog.close(); openDetail(button.dataset.openComparison); }
});
document.addEventListener('keydown', event => {
  if (!detailDialog.open || compareDialog.open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); navigateDetail(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); navigateDetail(1); }
});
initialize();
