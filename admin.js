/**
 * AZZATUL BOUQUET — Portal Operasional Admin (admin.js)
 * FIFO Production, Offer Adjustment WA, A6 Card Print, Pre-Made Batch Workshop, Periodic Stock Opname, Finance.
 */

let adminActiveTab = 'orders';
let adminOrderFilter = 'Semua';
let adminOrderViewMode = 'list';
let adminOrderSearch = '';
let adminCustomItemCat = 'Semua';

// Sinkronkan perubahan status pesanan ke ACTIVE_INVOICE tab pelanggan bila ID-nya sama.
function syncActiveInvoiceIfMatches(order) {
  if (!order || !order.id) return;
  try {
    const inv = safeReadStorage(STORAGE_KEYS.ACTIVE_INVOICE, null);
    if (inv && typeof inv === 'object' && inv.id === order.id) {
      ['paymentStatus', 'paidAmount', 'midtransPaid', 'amountDue', 'status', 'totalPrice', 'offerStatus', 'offerNote'].forEach((k) => {
        if (order[k] !== undefined) inv[k] = order[k];
      });
      safeWriteStorage(STORAGE_KEYS.ACTIVE_INVOICE, inv);
    }
  } catch (e) {}
}

function handleAdminStorageSync(event) {
  if (!event || event.key !== STORAGE_KEYS.ORDERS) return;
  if (!getAdminSession()) return;
  if (adminActiveTab === 'orders' || adminActiveTab === 'finance') renderAdminTab();
}

function initAdminPage() {
  initStore();
  ensureGlobalModals();

  window.onGreetingCardUpdated = function () {
    if (getAdminSession() && adminActiveTab === 'orders') renderAdminTab();
  };

  if (!window._adminStorageBound) {
    window._adminStorageBound = true;
    window.addEventListener('storage', handleAdminStorageSync);
  }

  const tabParam = getQueryParam('tab');
  if (tabParam) adminActiveTab = tabParam;

  const sess = getAdminSession();
  if (sess) {
    showAdminDashboardShell(sess);
  } else {
    document.getElementById('admin-login-gate')?.classList.remove('hidden');
    document.getElementById('admin-app-shell')?.classList.add('hidden');
  }
}

function handleAdminLogin(event) {
  event.preventDefault();
  const u = (document.getElementById('admin-login-user')?.value || '').trim();
  const p = (document.getElementById('admin-login-pass')?.value || '').trim();
  const found = ADMIN_ACCOUNTS.find((a) => a.username === u && a.password === p);
  const errEl = document.getElementById('admin-login-err');

  if (!found) {
    if (errEl) {
      errEl.textContent = 'Username atau kata sandi salah. Gunakan owner/owner123 atau crafter/crafter123.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  errEl?.classList.add('hidden');
  saveAdminSession(found);
  showToast(`Selamat datang kembali, ${found.name}!`, 'success');
  showAdminDashboardShell(found);
}

function quickDemoLogin(username) {
  const found = ADMIN_ACCOUNTS.find((a) => a.username === username);
  if (!found) return;
  saveAdminSession(found);
  showToast(`Login demo sebagai ${found.name} (${found.roleLabel}).`, 'success');
  showAdminDashboardShell(found);
}

function handleAdminLogout() {
  saveAdminSession(null);
  document.getElementById('admin-app-shell')?.classList.add('hidden');
  document.getElementById('admin-login-gate')?.classList.remove('hidden');
  showToast('Anda keluar dari Portal Admin.', 'dark');
}

function showAdminDashboardShell(sess) {
  document.getElementById('admin-login-gate')?.classList.add('hidden');
  document.getElementById('admin-app-shell')?.classList.remove('hidden');

  if (!sess.allowedTabs.includes(adminActiveTab)) {
    adminActiveTab = sess.allowedTabs[0] || 'orders';
  }

  const initials = String(sess.name || 'A')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document.getElementById('admin-user-pill').innerHTML = `
    <div class="flex items-center gap-3">
      <span class="w-9 h-9 rounded-full bg-[#B85D38]/20 border border-[#B85D38]/40 text-[#E0A33A] font-mono text-xs font-bold inline-flex items-center justify-center shrink-0">${escapeHtml(initials)}</span>
      <div class="min-w-0">
        <p class="font-semibold text-[#FAF6EE] truncate">${escapeHtml(sess.name)}</p>
        <p class="font-mono text-[10px] text-[#E0A33A] truncate">${escapeHtml(sess.roleLabel)}</p>
      </div>
    </div>
  `;

  renderAdminSidebar(sess);
  const resetBtn = document.getElementById('admin-reset-demo-btn');
  if (resetBtn) resetBtn.classList.toggle('hidden', sess.role !== 'owner');
  renderAdminTab();
}

function confirmResetDemoData() {
  if (!confirm('Reset seluruh data demo ke pengaturan awal? Semua pesanan, stok, katalog, dan pengeluaran akan dikembalikan ke data contoh.')) return;
  resetDemoData();
}

function toggleAdminMobileNav(forceState) {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-mobile-backdrop');
  if (!sidebar) return;
  const isCurrentlyOpen = !sidebar.classList.contains('-translate-x-full');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;
  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  }
}

function switchAdminTab(tab) {
  const sess = getAdminSession();
  if (!sess || !sess.allowedTabs.includes(tab)) {
    showToast('Role akun ini tidak memiliki akses ke menu tersebut.', 'warn');
    return;
  }
  adminActiveTab = tab;
  toggleAdminMobileNav(false);
  renderAdminSidebar(sess);
  renderAdminTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAdminSidebar(sess) {
  const navItems = [
    { id: 'orders', label: 'Antrean FIFO & Order', icon: 'ph-queue' },
    { id: 'satin', label: 'Workshop Isi & Bahan', icon: 'ph-package' },
    { id: 'inventory', label: 'Stok & Cek Berkala', icon: 'ph-archive' },
    { id: 'products', label: 'Kelola Katalog', icon: 'ph-books' },
    { id: 'finance', label: 'Keuangan & Laporan', icon: 'ph-chart-line-up' },
  ];

  const navEl = document.getElementById('admin-sidebar-nav');
  if (!navEl) return;

  navEl.innerHTML = navItems
    .filter((item) => sess.allowedTabs.includes(item.id))
    .map((item) => {
      const active = item.id === adminActiveTab;
      return `<button type="button" onclick="switchAdminTab('${item.id}')"
        class="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 text-left transition cursor-pointer ${
          active ? 'bg-[#B85D38] text-white font-semibold shadow-xs' : 'text-[#D5C9BA] hover:bg-[#241F1C] hover:text-white'
        }">
        <i class="ph ${item.icon} text-base"></i><span>${escapeHtml(item.label)}</span>
      </button>`;
    })
    .join('');
}

function renderAdminTab() {
  if (adminActiveTab === 'orders') renderAdminOrdersTab();
  else if (adminActiveTab === 'satin') renderAdminSatinTab();
  else if (adminActiveTab === 'inventory') renderAdminInventoryTab();
  else if (adminActiveTab === 'products') renderAdminProductsTab();
  else if (adminActiveTab === 'finance') renderAdminFinanceTab();
}

// ---------- TAB 1: ANTREAN FIFO & PESANAN ----------

function setAdminOrderFilter(st) {
  adminOrderFilter = st;
  renderAdminOrdersTab();
}

function setAdminOrderSearch(val) {
  adminOrderSearch = String(val || '');
  const clearBtn = document.getElementById('admin-order-search-clear');
  if (clearBtn) clearBtn.classList.toggle('hidden', !adminOrderSearch.trim());
  renderAdminOrdersBodyOnly();
}

function clearAdminOrderSearch() {
  adminOrderSearch = '';
  const input = document.getElementById('admin-order-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('admin-order-search-clear');
  if (clearBtn) clearBtn.classList.add('hidden');
  renderAdminOrdersBodyOnly();
}

function matchesAdminOrderSearch(o, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const itemText = (o.items || []).map((it) => `${it.name || ''} ${it.specText || ''}`).join(' ');
  const haystack = `${o.id || ''} ${o.customerName || ''} ${o.customerPhone || ''} ${o.deliveryType || ''} ${o.paymentMethod || ''} ${o.status || ''} ${o.referenceNote || ''} ${itemText}`.toLowerCase();
  return haystack.includes(q);
}

function setAdminOrderViewMode(mode) {
  adminOrderViewMode = mode;
  renderAdminOrdersTab();
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  order.status = newStatus;

  if (newStatus === 'Dibatalkan') {
    const wasDeducted = Boolean(order.stockDeducted);
    if (wasDeducted) restoreInventoryByRecipe(order);
    showToast(`Pesanan ${orderId} dibatalkan${wasDeducted ? ' & stok Auto-BOM dikembalikan' : ''}.`, 'warn');
  } else if (['Sedang Dirangkai', 'Siap Diambil/Dikirim', 'Selesai'].includes(newStatus) && !order.stockDeducted) {
    deductInventoryByRecipe(order);
    showToast(`Status ${orderId} diubah ke ${newStatus} & stok Auto-BOM dipotong.`, 'success');
  } else {
    showToast(`Status ${orderId} diperbarui: ${newStatus}`, 'success');
  }

  if (newStatus === 'Selesai') creditProductSold(order);

  saveOrders(orders);
  syncActiveInvoiceIfMatches(order);
  renderAdminOrdersTab();
}

function creditProductSold(order) {
  if (!order || order.soldCredited) return;
  const products = getProducts();
  let changed = false;
  (order.items || []).forEach((it) => {
    if (!it || !it.id) return;
    const prod = products.find((p) => p.id === it.id);
    if (prod) {
      prod.sold = Number(prod.sold || 0) + Number(it.qty || 1);
      changed = true;
    }
  });
  if (changed) {
    saveProducts(products);
    order.soldCredited = true;
  }
}

function assignOrderFlorist(orderId, florist) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;
  order.florist = florist;
  saveOrders(orders);
  showToast(`Perangkai ${orderId} ditetapkan ke ${florist}.`, 'dark');
}

function toggleOrderChecklist(orderId, field) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;
  if (!order.checklist) order.checklist = { stemPrep: false, wrapping: false, cardPrint: false, qualityCheck: false };
  order.checklist[field] = !order.checklist[field];
  saveOrders(orders);
  renderAdminOrdersTab();
}

function markOrderPaidOff(orderId) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;
  order.paymentStatus = 'Lunas';
  order.paidAmount = order.totalPrice;
  order.midtransPaid = true;
  order.amountDue = 0;
  if (order.status === 'Menunggu Konfirmasi') order.status = 'Pembayaran Terverifikasi';
  saveOrders(orders);
  syncActiveInvoiceIfMatches(order);
  showToast(`Pembayaran ${orderId} ditandai Lunas.`, 'success');
  renderAdminOrdersTab();
}

function deleteAdminOrder(orderId) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order && !confirm(`Hapus pesanan ${orderId} a/n ${order.customerName || '-'}? Aksi ini tidak bisa dibatalkan.`)) return;
  if (order && order.stockDeducted) restoreInventoryByRecipe(order);
  saveOrders(orders.filter((o) => o.id !== orderId));
  showToast(`Order ${orderId} dihapus.`, 'warn');
  renderAdminOrdersTab();
}

function openOrderOfferModal(orderId) {
  const order = getOrders().find((o) => o.id === orderId);
  if (!order) return;
  document.getElementById('offer-order-id').value = order.id;
  document.getElementById('offer-customer-label').textContent = `${order.id} · ${order.customerName} (${order.customerPhone})`;
  document.getElementById('offer-request-label').textContent = order.referenceNote || order.items[0]?.specText || '-';
  document.getElementById('offer-status-select').value = order.offerStatus || 'Ditawarkan Alternatif via WA';
  document.getElementById('offer-price-input').value = order.totalPrice;
  document.getElementById('offer-note-input').value = order.offerNote || '';
  document.getElementById('offer-modal')?.classList.remove('hidden');
}

function closeOrderOfferModal() {
  document.getElementById('offer-modal')?.classList.add('hidden');
}

function openAdminLightbox(src) {
  const img = document.getElementById('admin-lightbox-img');
  if (!img || !src) return;
  img.src = src;
  document.getElementById('admin-lightbox')?.classList.remove('hidden');
}

function closeAdminLightbox() {
  document.getElementById('admin-lightbox')?.classList.add('hidden');
  const img = document.getElementById('admin-lightbox-img');
  if (img) img.src = '';
}

function applyOrderOfferFromForm() {
  const orderId = document.getElementById('offer-order-id').value;
  const statusVal = document.getElementById('offer-status-select').value;
  const priceVal = Number(document.getElementById('offer-price-input').value || 0);
  const noteVal = document.getElementById('offer-note-input').value.trim();

  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.offerStatus = statusVal;
  order.offerNote = noteVal;
  order.totalPrice = priceVal;
  if (order.paymentStatus !== 'Lunas') {
    order.amountDue = Math.max(0, priceVal - Number(order.paidAmount || 0));
  }
  saveOrders(orders);
  syncActiveInvoiceIfMatches(order);
  return order;
}

function saveOrderOffer(event) {
  event.preventDefault();
  const order = applyOrderOfferFromForm();
  if (!order) return;
  closeOrderOfferModal();
  showToast(`Penawaran ${order.id} berhasil disimpan.`, 'success');
  renderAdminOrdersTab();
}

function sendOfferToWa() {
  const order = applyOrderOfferFromForm();
  if (!order) return;
  const noteVal = order.offerNote;

  const phone = formatWaPhone(order.customerPhone);
  const msg = encodeURIComponent(
    `Halo Kak ${order.customerName}, kami dari Azzatul Bouquet Studio mengonfirmasi pesanan ${order.id}. Terkait request buket custom Anda, kami menawarkan penyesuaian: "${noteVal || 'sesuai ketersediaan isian & wrapping terbaru'}" dengan total akhir ${formatRupiah(order.totalPrice)}. Apakah bisa kami lanjutkan ke proses rangkai?`
  );
  if (typeof window !== 'undefined') window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
  showToast(`Penawaran ${order.id} disimpan & WhatsApp dibuka.`, 'success');
  renderAdminOrdersTab();
}

function handleKanbanDragStart(event, orderId) {
  event.dataTransfer.setData('text/plain', orderId);
}

function handleKanbanDrop(event, targetStatus) {
  event.preventDefault();
  const orderId = event.dataTransfer.getData('text/plain');
  if (orderId) updateOrderStatus(orderId, targetStatus);
}

function renderAdminOrdersTab() {
  const wrap = document.getElementById('admin-tab-content');
  if (!wrap) return;

  const allOrders = getOrders();
  const fifoMap = getFifoQueueMap();
  const activeCount = Object.keys(fifoMap).length;
  const pendingOffer = allOrders.filter((o) => o.offerStatus === 'Menunggu Penawaran' && o.status !== 'Dibatalkan').length;
  const readyCount = allOrders.filter((o) => o.status === 'Siap Diambil/Dikirim').length;

  const sortedOrders = allOrders
    .filter((o) => adminOrderFilter === 'Semua' || o.status === adminOrderFilter)
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const statusesForFilter = ['Semua', ...ORDER_STATUSES];

  wrap.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DFD5] pb-5">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#B85D38]">Prioritas Pengerjaan FIFO</p>
          <h1 class="font-display text-3xl sm:text-4xl font-semibold text-[#1F1C1B]">Antrean FIFO &amp; Kelola Pesanan</h1>
        </div>
        <div class="inline-flex rounded-2xl border border-[#D8D0C5] bg-white overflow-hidden text-xs">
          <button type="button" onclick="setAdminOrderViewMode('list')" class="px-3.5 py-2 font-semibold cursor-pointer ${adminOrderViewMode === 'list' ? 'bg-[#1F1C1B] text-white' : 'text-[#5E635F]'}">Daftar FIFO</button>
          <button type="button" onclick="setAdminOrderViewMode('kanban')" class="px-3.5 py-2 font-semibold cursor-pointer ${adminOrderViewMode === 'kanban' ? 'bg-[#1F1C1B] text-white' : 'text-[#5E635F]'}">Papan Kanban</button>
        </div>
      </div>

      <!-- KPI Strip -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Antrean FIFO Aktif</p>
          <p class="font-display text-3xl font-bold text-[#B85D38] mt-1">${activeCount}</p>
        </div>
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Perlu Penawaran WA</p>
          <p class="font-display text-3xl font-bold text-[#8A5A00] mt-1">${pendingOffer}</p>
        </div>
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Siap Diambil / Kirim</p>
          <p class="font-display text-3xl font-bold text-[#2E5940] mt-1">${readyCount}</p>
        </div>
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Total Semua Order</p>
          <p class="font-display text-3xl font-bold text-[#1F1C1B] mt-1">${allOrders.length}</p>
        </div>
      </div>

      <!-- Search Bar + Status Filter Chips -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          ${statusesForFilter
            .map((st) => {
              const active = st === adminOrderFilter;
              return `<button type="button" onclick="setAdminOrderFilter('${escapeHtml(st)}')"
                class="px-3 py-1.5 text-xs font-medium rounded-2xl border cursor-pointer transition ${
                  active ? 'bg-[#1F1C1B] text-white border-[#1F1C1B]' : 'bg-white text-[#5E635F] border-[#E5DFD5] hover:border-[#1F1C1B]'
                }">${escapeHtml(st)}</button>`;
            })
            .join('')}
        </div>

        <div class="relative w-full lg:w-80 shrink-0">
          <i class="ph ph-magnifying-glass text-base text-[#6A625B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          <input id="admin-order-search-input" type="text" value="${escapeHtml(adminOrderSearch)}"
            oninput="setAdminOrderSearch(this.value)"
            placeholder="Cari kode, nama, WA, atau buket..."
            class="w-full pl-10 pr-9 py-2.5 text-xs bg-white border border-[#E6DDD0] rounded-full focus:outline-none focus:border-[#1F1C1B] transition" />
          <button id="admin-order-search-clear" type="button" onclick="clearAdminOrderSearch()"
            class="${adminOrderSearch.trim() ? '' : 'hidden'} w-6 h-6 rounded-full hover:bg-[#FAF6EE] text-[#6A625B] hover:text-[#1F1C1B] absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center cursor-pointer"
            title="Hapus pencarian">
            <i class="ph ph-x text-xs"></i>
          </button>
        </div>
      </div>

      <div id="admin-orders-body"></div>
    </div>
  `;

  renderAdminOrdersBodyOnly();
}

function renderAdminOrdersBodyOnly() {
  const bodyEl = document.getElementById('admin-orders-body');
  if (!bodyEl) return;

  const allOrders = getOrders();
  const fifoMap = getFifoQueueMap();
  const matchedOrders = allOrders.filter((o) => matchesAdminOrderSearch(o, adminOrderSearch));
  const sortedOrders = matchedOrders
    .filter((o) => adminOrderFilter === 'Semua' || o.status === adminOrderFilter)
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (adminOrderViewMode === 'kanban') {
    const cols = ORDER_STATUSES.slice(0, 5);
    bodyEl.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
        ${cols
          .map((colStatus) => {
            const list = matchedOrders
              .filter((o) => o.status === colStatus)
              .slice()
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            return `
              <div ondragover="event.preventDefault()" ondrop="handleKanbanDrop(event, '${escapeHtml(colStatus)}')"
                class="bg-[#F3ECE0] border border-[#E5DFD5] rounded-2xl p-3 space-y-3 min-h-[260px]">
                <div class="flex items-center justify-between border-b border-[#D8D0C5] pb-2">
                  <span class="text-xs font-semibold text-[#1F1C1B]">${escapeHtml(colStatus)}</span>
                  <span class="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-[#D8D0C5] rounded-xl">${list.length}</span>
                </div>
                ${list
                  .map((o) => {
                    const fifo = fifoMap[o.id];
                    return `
                      <div draggable="true" ondragstart="handleKanbanDragStart(event, '${escapeHtml(o.id)}')"
                        class="bg-white border border-[#E5DFD5] rounded-2xl p-3 space-y-2 cursor-grab text-xs shadow-xs">
                        <div class="flex items-center justify-between gap-1">
                          <span class="font-mono font-bold text-[#B85D38]">${escapeHtml(o.id)}</span>
                          ${fifo ? `<span class="font-mono text-[10px] px-1.5 py-0.5 bg-[#1F1C1B] text-white rounded-xl">FIFO #${String(fifo.rank).padStart(2, '0')}</span>` : ''}
                        </div>
                        <p class="font-semibold text-[#1F1C1B]">${escapeHtml(o.customerName)}</p>
                        <p class="text-[11px] text-[#5E635F] line-clamp-2">${escapeHtml(o.items[0]?.name || '')}</p>
                        <div class="flex items-center justify-between pt-1 border-t border-[#E5DFD5]">
                          <span class="font-mono text-[11px] font-bold text-[#1F1C1B]">${formatRupiah(o.totalPrice)}</span>
                          <div class="flex gap-1">
                            <button type="button" onclick="openGreetingCardPrintModal('${escapeHtml(o.id)}')" class="px-1.5 py-1 border border-[#E5DFD5] rounded-xl hover:border-[#B85D38] cursor-pointer" title="Cetak Kartu A6"><i class="ph ph-cardholder"></i></button>
                            <button type="button" onclick="openOrderOfferModal('${escapeHtml(o.id)}')" class="px-1.5 py-1 border border-[#E5DFD5] rounded-xl hover:border-[#B85D38] cursor-pointer" title="Tawar WA"><i class="ph ph-whatsapp-logo"></i></button>
                          </div>
                        </div>
                        <select onchange="updateOrderStatus('${escapeHtml(o.id)}', this.value)" aria-label="Ubah status ${escapeHtml(o.id)}" class="w-full mt-1 px-2 py-1 text-[11px] font-semibold rounded-xl border border-[#D8D0C5] bg-[#FAF6EE] cursor-pointer">
                          ${ORDER_STATUSES.map((st) => `<option value="${escapeHtml(st)}" ${o.status === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('')}
                        </select>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
    return;
  }

  bodyEl.innerHTML = sortedOrders.length
    ? `<div class="space-y-4">
        ${sortedOrders
          .map((o) => {
            const fifo = fifoMap[o.id];
            const ck = o.checklist || {};
            return `
              <div class="editorial-card p-5 space-y-4 text-xs">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E5DFD5] pb-3.5">
                  <div class="flex flex-wrap items-center gap-2">
                    ${fifo ? `<span class="font-mono text-xs font-bold px-2.5 py-1 bg-[#1F1C1B] text-white rounded-2xl">FIFO #${String(fifo.rank).padStart(2, '0')}</span>` : ''}
                    <span class="font-mono text-sm font-bold text-[#B85D38]">${escapeHtml(o.id)}</span>
                    <span class="font-mono text-[10px] px-2 py-0.5 bg-[#F3ECE0] border border-[#E5DFD5] rounded-2xl">${escapeHtml(o.source)}</span>
                    <span class="px-2.5 py-0.5 rounded-2xl font-medium ${getPaymentBadgeClass(o.paymentStatus)}">${escapeHtml(o.paymentStatus)} (${escapeHtml(o.paymentMethod)})</span>
                    ${o.stockDeducted ? `<span class="font-mono text-[10px] text-[#2E5940]"><i class="ph ph-check-circle mr-0.5"></i>Auto-BOM Terpotong</span>` : ''}
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <select onchange="updateOrderStatus('${escapeHtml(o.id)}', this.value)" class="px-2.5 py-1.5 text-xs font-semibold rounded-2xl border border-[#D8D0C5] bg-white">
                      ${ORDER_STATUSES.map((st) => `<option value="${escapeHtml(st)}" ${o.status === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('')}
                    </select>
                    <select onchange="assignOrderFlorist('${escapeHtml(o.id)}', this.value)" class="px-2.5 py-1.5 text-xs rounded-2xl border border-[#D8D0C5] bg-white">
                      ${FLORISTS.map((f) => `<option value="${escapeHtml(f)}" ${o.florist === f ? 'selected' : ''}>${escapeHtml(f)}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div class="md:col-span-5 space-y-1.5">
                    <p class="font-semibold text-sm text-[#1F1C1B]">${escapeHtml(o.customerName)} <span class="font-mono text-xs text-[#5E635F] font-normal">(${escapeHtml(o.customerPhone)})</span></p>
                    <p class="text-[#5E635F]"><i class="ph ph-calendar-blank mr-1"></i>Target: ${escapeHtml(o.pickupDate)} ${escapeHtml(o.pickupTime)} WIB · ${escapeHtml(o.deliveryType)}</p>
                    <p class="text-[#1F1C1B] font-medium">${escapeHtml(o.items[0]?.name || '')}</p>
                    <p class="text-[11px] text-[#5E635F]">${escapeHtml(o.items[0]?.specText || '')}</p>
                    <p class="font-mono text-sm font-bold text-[#B85D38] pt-1">${formatRupiah(o.totalPrice)}</p>
                  </div>

                  <div class="md:col-span-4 space-y-2 bg-[#FAF6EE] p-3 border border-[#E5DFD5] rounded-2xl">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-[#1F1C1B]">Request &amp; Penawaran</span>
                      <span class="font-mono text-[10px] text-[#B85D38]">${escapeHtml(o.offerStatus || '-')}</span>
                    </div>
                    <p class="text-[11px] text-[#5E635F]">${escapeHtml(o.referenceNote || 'Tidak ada catatan khusus.')}</p>
                    ${o.offerNote ? `<p class="text-[11px] text-[#2E5940]"><strong>Balasan:</strong> ${escapeHtml(o.offerNote)}</p>` : ''}
                    ${
                      o.referenceImage || o.paymentProofImage
                        ? `<div class="pt-1.5 border-t border-[#E5DFD5] flex flex-wrap items-center gap-2">
                            ${
                              o.referenceImage
                                ? `<button type="button" onclick="openAdminLightbox(this.querySelector('img').src)" class="cursor-pointer shrink-0" title="Perbesar foto referensi pelanggan"><img src="${escapeHtml(o.referenceImage)}" alt="Foto referensi pelanggan" class="w-12 h-12 rounded-lg object-cover border border-[#E5DFD5]" /></button><span class="text-[10px] font-semibold text-[#5E635F]">Foto referensi</span>`
                                : ''
                            }
                            ${
                              o.paymentProofImage
                                ? `<button type="button" onclick="openAdminLightbox(this.querySelector('img').src)" class="cursor-pointer shrink-0" title="Perbesar bukti bayar"><img src="${escapeHtml(o.paymentProofImage)}" alt="Bukti bayar" class="w-12 h-12 rounded-lg object-cover border border-[#E5DFD5]" /></button><span class="text-[10px] font-semibold text-[#2E5940]">Bukti bayar</span>`
                                : ''
                            }
                          </div>`
                        : ''
                    }
                  </div>

                  <div class="md:col-span-3 space-y-1.5">
                    <p class="font-mono text-[10px] uppercase text-[#5E635F] mb-1">SOP 4-Tahap Akurasi</p>
                    ${[
                      { k: 'stemPrep', lbl: '1. Isi & Rangka Siap' },
                      { k: 'wrapping', lbl: '2. Wrapping & Pita Sesuai' },
                      { k: 'cardPrint', lbl: '3. Kartu Ucapan A6 Cetak' },
                      { k: 'qualityCheck', lbl: '4. Cek Akhir (QC)' },
                    ]
                      .map(
                        (step) => `<label class="flex items-center gap-2 cursor-pointer text-[11px] text-[#1F1C1B]">
                        <input type="checkbox" ${ck[step.k] ? 'checked' : ''} onchange="toggleOrderChecklist('${escapeHtml(o.id)}', '${step.k}')" class="accent-[#B85D38]" />
                        <span>${step.lbl}</span>
                      </label>`
                      )
                      .join('')}
                  </div>
                </div>

                <div class="pt-3 border-t border-[#E5DFD5] flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="openOrderOfferModal('${escapeHtml(o.id)}')" class="btn-outline px-3 py-1.5 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1">
                      <i class="ph ph-whatsapp-logo text-[#2E5940]"></i><span>Tawar / Sesuaikan WA</span>
                    </button>
                    <button type="button" onclick="openGreetingCardPrintModal('${escapeHtml(o.id)}')" class="btn-outline px-3 py-1.5 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1">
                      <i class="ph ph-printer text-[#B85D38]"></i><span>Cetak Kartu A6</span>
                    </button>
                    <button type="button" onclick="openReceiptModal('${escapeHtml(o.id)}', true)" class="btn-outline px-3 py-1.5 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1">
                      <i class="ph ph-receipt"></i><span>Nota Studio</span>
                    </button>
                    ${
                      o.paymentStatus !== 'Lunas' && o.status !== 'Dibatalkan'
                        ? `<button type="button" onclick="markOrderPaidOff('${escapeHtml(o.id)}')" class="btn-primary px-3 py-1.5 text-[11px] font-semibold cursor-pointer">Verifikasi Lunas</button>`
                        : ''
                    }
                  </div>
                  <button type="button" onclick="deleteAdminOrder('${escapeHtml(o.id)}')" class="text-[11px] text-[#B85D38] hover:underline cursor-pointer">Hapus</button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>`
    : `<div class="editorial-card p-8 text-center text-xs text-[#5E635F]">Belum ada pesanan pada filter status ini.</div>`;
}

// ---------- TAB 2: WORKSHOP ISI & BAHAN BUKET CUSTOM ----------

function setAdminCustomItemCat(cat) {
  adminCustomItemCat = cat;
  renderAdminSatinTab();
}

function openCustomItemModal(itemId = '') {
  const modal = document.getElementById('custom-item-modal');
  if (!modal) return;
  const list = getCustomFillItems();
  const existing = itemId ? list.find((i) => i.id === itemId) : null;

  document.getElementById('custom-item-modal-title').textContent = existing ? 'Edit Bahan Custom' : 'Tambah Bahan Custom';
  document.getElementById('cim-id').value = existing ? existing.id : '';
  document.getElementById('cim-name').value = existing ? existing.name : '';
  document.getElementById('cim-cat').value = existing ? existing.cat || 'Snack' : 'Snack';
  document.getElementById('cim-cat').dispatchEvent(new Event('change'));
  document.getElementById('cim-variant').value = existing ? existing.variant || '' : '';
  document.getElementById('cim-price').value = existing ? existing.price : 10000;
  document.getElementById('cim-hpp').value = existing ? existing.hpp : 5000;

  modal.classList.remove('hidden');
}

function closeCustomItemModal() {
  document.getElementById('custom-item-modal')?.classList.add('hidden');
}

function saveAdminCustomItem(event) {
  event.preventDefault();
  const id = (document.getElementById('cim-id')?.value || '').trim();
  const name = (document.getElementById('cim-name')?.value || '').trim();
  const cat = document.getElementById('cim-cat')?.value || 'Snack';
  const variant = (document.getElementById('cim-variant')?.value || '').trim();
  const price = Math.max(500, Number(document.getElementById('cim-price')?.value || 0));
  const hpp = Math.max(0, Number(document.getElementById('cim-hpp')?.value || 0));

  if (!name) return;

  const list = getCustomFillItems().slice();
  if (id) {
    const idx = list.findIndex((i) => i.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], name, cat, variant, price, hpp };
    }
    showToast(`Bahan "${name}" diperbarui & langsung aktif di halaman Custom!`, 'success');
  } else {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
    const newId = `${slug}-${Date.now().toString(36).slice(-4)}`;
    list.unshift({ id: newId, cat, name, variant, price, hpp });
    showToast(`Bahan "${name}" ditambahkan & langsung muncul di halaman Custom!`, 'success');
  }

  saveCustomFillItems(list);
  closeCustomItemModal();
  renderAdminSatinTab();
}

function deleteAdminCustomItem(itemId) {
  const list = getCustomFillItems();
  const target = list.find((i) => i.id === itemId);
  if (!target) return;
  if (!confirm(`Hapus bahan "${target.name}" dari daftar pilihan custom?`)) return;
  saveCustomFillItems(list.filter((i) => i.id !== itemId));
  showToast(`Bahan "${target.name}" dihapus.`, 'dark');
  renderAdminSatinTab();
}

function renderAdminSatinTab() {
  const wrap = document.getElementById('admin-tab-content');
  if (!wrap) return;
  const inv = getInventory();
  const invSnack = inv.find((i) => i.id === 'INV-01') || { qty: 0 };
  const invArt = inv.find((i) => i.id === 'INV-02') || { qty: 0 };
  const invPhoto = inv.find((i) => i.id === 'INV-03') || { qty: 0 };
  const invMoney = inv.find((i) => i.id === 'INV-07') || { qty: 0 };
  const workshopLogs = getStockLogs().filter((l) => l.type.includes('SATIN') || l.type.includes('WORKSHOP') || l.type.includes('RESTOCK'));

  const allCustomItems = getCustomFillItems();
  const customCats = ['Semua', 'Snack', 'Bunga & Boneka', 'Foto & Uang', 'Kado & Aksesoris'];
  const filteredCustomItems = allCustomItems.filter((it) => adminCustomItemCat === 'Semua' || (it.cat || 'Snack') === adminCustomItemCat);

  wrap.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DFD5] pb-5">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#B85D38]">Persiapan &amp; Pilihan Isian Buket</p>
          <h1 class="font-display text-3xl sm:text-4xl font-semibold text-[#1F1C1B]">Workshop Isi &amp; Bahan Custom</h1>
          <p class="text-xs text-[#5E635F] mt-1">Tambah/edit bahan isian yang muncul di halaman Rangkai Buket Custom pembeli, serta kelola stok bahan siap rangkai.</p>
        </div>
        <button type="button" onclick="openCustomItemModal('')"
          class="btn-accent px-5 py-2.5 text-xs font-semibold cursor-pointer inline-flex items-center gap-2 shrink-0">
          <i class="ph ph-plus-circle text-base"></i><span>Tambah Bahan Custom</span>
        </button>
      </div>

      <!-- KELOLA BAHAN ISIAN CUSTOMIZER -->
      <div class="editorial-card p-5 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DDD0] pb-4">
          <div>
            <h2 class="font-display text-2xl text-[#1F1C1B]">Daftar Bahan &amp; Isian Custom (${allCustomItems.length} Item)</h2>
            <p class="text-xs text-[#6A625B]">Setiap bahan yang kamu tambah/ubah di sini langsung otomatis tampil di halaman <strong>/customize</strong>.</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${customCats
              .map((cat) => {
                const active = cat === adminCustomItemCat;
                return `<button type="button" onclick="setAdminCustomItemCat('${escapeHtml(cat)}')"
                  class="px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition ${
                    active ? 'bg-[#1F1C1B] text-white' : 'bg-[#FAF6EE] border border-[#E6DDD0] text-[#6A625B] hover:border-[#1F1C1B]'
                  }">${escapeHtml(cat)}</button>`;
              })
              .join('')}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
          ${filteredCustomItems
            .map(
              (it) => `
            <div class="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E6DDD0] flex items-center justify-between gap-3">
              <div class="min-w-0 space-y-0.5">
                <span class="inline-block font-mono text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-[#E6DDD0] text-[#B85D38]">${escapeHtml(it.cat || 'Snack')}</span>
                <p class="font-semibold text-[#1F1C1B] truncate">${escapeHtml(it.name)}</p>
                <p class="text-[11px] text-[#6A625B] truncate">${escapeHtml(it.variant || '-')}</p>
                <p class="font-mono text-[11px] pt-0.5">
                  <strong class="text-[#B85D38]">${formatRupiah(it.price)}</strong>
                  <span class="text-[#8E857C]"> · HPP ${formatRupiah(it.hpp || 0)}</span>
                </p>
              </div>
              <div class="flex flex-col gap-1.5 shrink-0">
                <button type="button" onclick="openCustomItemModal('${escapeHtml(it.id)}')"
                  class="px-2.5 py-1 rounded-full bg-white border border-[#D5C9BA] hover:border-[#1F1C1B] text-[10px] font-semibold text-[#1F1C1B] cursor-pointer">Edit</button>
                <button type="button" onclick="deleteAdminCustomItem('${escapeHtml(it.id)}')"
                  class="px-2.5 py-1 rounded-full bg-white border border-[#E6DDD0] hover:border-[#B85D38] text-[10px] font-medium text-[#B85D38] cursor-pointer">Hapus</button>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="editorial-card p-5">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Snack Assorted</p>
          <p class="font-display text-4xl font-bold text-[#B85D38] mt-1">${invSnack.qty} <span class="text-sm font-sans font-normal text-[#5E635F]">pcs</span></p>
        </div>
        <div class="editorial-card p-5">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Rangkaian Bunga / Satin</p>
          <p class="font-display text-4xl font-bold text-[#1F1C1B] mt-1">${invArt.qty} <span class="text-sm font-sans font-normal text-[#5E635F]">tangkai</span></p>
        </div>
        <div class="editorial-card p-5">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Foto Polaroid Siap</p>
          <p class="font-display text-4xl font-bold text-[#1F1C1B] mt-1">${invPhoto.qty} <span class="text-sm font-sans font-normal text-[#5E635F]">lembar</span></p>
        </div>
        <div class="editorial-card p-5">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Slot Uang Plastik</p>
          <p class="font-display text-4xl font-bold text-[#2E5940] mt-1">${invMoney.qty} <span class="text-sm font-sans font-normal text-[#5E635F]">slot</span></p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onsubmit="recordSatinBatch(event)" class="lg:col-span-5 editorial-card p-5 space-y-4 text-xs">
          <h2 class="font-display text-2xl font-semibold text-[#1F1C1B] border-b border-[#E5DFD5] pb-2">Catat Batch Persiapan / Restock Isi</h2>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Jenis Isian Buket</label>
            <select id="satin-target-inv" class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl bg-white">
              <option value="INV-01">Paket Snack Assorted (pcs)</option>
              <option value="INV-02">Bunga Buatan / Pita Satin Pre-Made (tangkai)</option>
              <option value="INV-03">Cetak Foto Polaroid + Laminasi (lembar)</option>
              <option value="INV-07">Rangka Slot Uang Plastik (slot)</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#1F1C1B] mb-1">Jumlah Ditambahkan</label>
              <input id="satin-bloom-qty" type="number" min="1" value="15" required class="w-full px-3 py-2 font-mono border border-[#D8D0C5] rounded-2xl" />
            </div>
            <div>
              <label class="block font-semibold text-[#1F1C1B] mb-1">Durasi Kerja (Menit)</label>
              <input id="satin-duration" type="number" min="5" value="45" required class="w-full px-3 py-2 font-mono border border-[#D8D0C5] rounded-2xl" />
            </div>
          </div>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Staf Penanggung Jawab</label>
            <select id="satin-crafter" class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl bg-white">
              ${FLORISTS.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn-accent w-full py-2.5 font-semibold cursor-pointer">
            Simpan Batch &amp; Tambah Stok Isian
          </button>
        </form>

        <div class="lg:col-span-7 editorial-card p-5 space-y-3 text-xs">
          <h2 class="font-display text-2xl font-semibold text-[#1F1C1B] border-b border-[#E5DFD5] pb-2">Riwayat Persiapan &amp; Restock Isi</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-[#E5DFD5] font-mono text-[10px] uppercase text-[#5E635F]">
                  <th class="py-2 pr-3">Waktu</th>
                  <th class="py-2 pr-3">Aktivitas</th>
                  <th class="py-2 pr-3">Perubahan</th>
                  <th class="py-2">Catatan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5DFD5]">
                ${workshopLogs
                  .map(
                    (l) => `<tr>
                    <td class="py-2.5 pr-3 font-mono text-[10px] text-[#5E635F] whitespace-nowrap">${formatDateTime(l.timestamp)}</td>
                    <td class="py-2.5 pr-3 font-semibold text-[#1F1C1B]">${escapeHtml(l.itemName)}</td>
                    <td class="py-2.5 pr-3 font-mono font-bold ${l.delta > 0 ? 'text-[#2E5940]' : 'text-[#B85D38]'}">${l.delta > 0 ? '+' + l.delta : l.delta}</td>
                    <td class="py-2.5 text-[#5E635F]">${escapeHtml(l.note)}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function recordSatinBatch(event) {
  event.preventDefault();
  const targetInvId = document.getElementById('satin-target-inv').value;
  const addQty = Number(document.getElementById('satin-bloom-qty').value || 0);
  const crafter = document.getElementById('satin-crafter').value;
  const duration = Number(document.getElementById('satin-duration').value || 0);

  if (!(addQty > 0)) {
    showToast('Jumlah isian yang ditambahkan harus lebih dari 0.', 'warn');
    return;
  }

  const inventory = getInventory();
  const targetItem = inventory.find((i) => i.id === targetInvId);
  const logs = getStockLogs();
  const batchCode = 'BATCH-' + String(Date.now()).slice(-4);

  if (targetItem) {
    targetItem.qty = Number(targetItem.qty) + addQty;
    logs.unshift({
      id: 'LOG-' + Date.now() + '-W',
      timestamp: new Date().toISOString(),
      invId: targetItem.id,
      itemName: targetItem.name,
      type: 'WORKSHOP (MASUK)',
      delta: addQty,
      ref: batchCode,
      note: `Batch persiapan +${addQty} ${targetItem.unit} (${duration} mnt) oleh ${crafter}`,
    });
  }

  saveInventory(inventory);
  saveStockLogs(logs.slice(0, 120));
  showToast(`+${addQty} stok isian ditambahkan ke gudang studio.`, 'success');
  renderAdminSatinTab();
}

// ---------- TAB 3: INVENTARIS & CEK STOK BERKALA (OPNAME) ----------

function renderAdminInventoryTab() {
  const wrap = document.getElementById('admin-tab-content');
  if (!wrap) return;
  const inv = getInventory();
  const opnameLogs = getOpnameLogs();

  wrap.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DFD5] pb-5">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#B85D38]">Cek &amp; Penyesuaian Stok Berkala</p>
          <h1 class="font-display text-3xl sm:text-4xl font-semibold text-[#1F1C1B]">Inventaris Bahan &amp; Stock Opname</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="quickConfirmAllOpname('Mingguan')" class="btn-accent px-4 py-2 text-xs font-semibold cursor-pointer">
            Konfirmasi Cek Mingguan Semua (1-Klik)
          </button>
          <button type="button" onclick="quickConfirmAllOpname('Bulanan')" class="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer">
            Cek Bulanan
          </button>
        </div>
      </div>

      <!-- 9-Item Inventory Table -->
      <div class="editorial-card p-5 space-y-3 text-xs">
        <h2 class="font-display text-2xl font-semibold text-[#1F1C1B]">Daftar 9 Bahan Baku Studio</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[#E5DFD5] font-mono text-[10px] uppercase text-[#5E635F]">
                <th class="py-2 pr-3">Kode &amp; Nama Bahan</th>
                <th class="py-2 pr-3">Kategori</th>
                <th class="py-2 pr-3">Stok Saat Ini</th>
                <th class="py-2 pr-3">Batas Aman</th>
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5DFD5]">
              ${inv
                .map((i) => {
                  const isSafe = Number(i.qty) >= Number(i.minQty);
                  return `<tr>
                    <td class="py-3 pr-3">
                      <span class="font-mono text-[10px] text-[#5E635F] block">${escapeHtml(i.id)}</span>
                      <span class="font-semibold text-[#1F1C1B]">${escapeHtml(i.name)}</span>
                    </td>
                    <td class="py-3 pr-3 text-[#5E635F]">${escapeHtml(i.category)}</td>
                    <td class="py-3 pr-3 font-mono font-bold text-[#1F1C1B]">${i.qty} ${escapeHtml(i.unit)}</td>
                    <td class="py-3 pr-3 font-mono text-[#5E635F]">${i.minQty} ${escapeHtml(i.unit)}</td>
                    <td class="py-3 pr-3">
                      <span class="px-2 py-0.5 rounded-2xl font-mono text-[10px] font-semibold ${
                        isSafe ? 'bg-[#E9F2EC] text-[#2E5940]' : 'bg-[#FBF3DB] text-[#8A5A00]'
                      }">${isSafe ? 'Aman' : 'Perlu Restock'}</span>
                    </td>
                    <td class="py-3 text-right">
                      <button type="button" onclick="openStockActionModal('${escapeHtml(i.id)}', 'in')" class="btn-outline px-2.5 py-1 text-[11px] font-semibold cursor-pointer">+ Restock</button>
                    </td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Opname Form + Logs -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onsubmit="submitStockOpname(event)" class="lg:col-span-5 editorial-card p-5 space-y-3 text-xs">
          <h2 class="font-display text-2xl font-semibold text-[#1F1C1B] border-b border-[#E5DFD5] pb-2">Form Cek Stok Per Bahan</h2>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Periode Pengecekan</label>
            <select id="opn-period" class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl bg-white">
              <option value="Mingguan">Cek Rutin Mingguan</option>
              <option value="Bulanan">Audit Bulanan</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Bahan yang Dicek</label>
            <select id="opn-inv-id" onchange="syncOpnamePhysical()" class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl bg-white">
              ${inv.map((i) => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)} (Sistem: ${i.qty} ${escapeHtml(i.unit)})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Jumlah Fisik Aktual</label>
            <input id="opn-physical" type="number" min="0" required value="${inv[0]?.qty || 0}" class="w-full px-3 py-2 font-mono border border-[#D8D0C5] rounded-2xl" />
          </div>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Catatan Hasil Cek</label>
            <input id="opn-note" type="text" required value="Stok fisik sesuai catatan sistem, kondisi baik." class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl" />
          </div>
          <button type="submit" class="btn-primary w-full py-2.5 font-semibold cursor-pointer">Catat Hasil Cek Stok</button>
        </form>

        <div class="lg:col-span-7 editorial-card p-5 space-y-3 text-xs">
          <h2 class="font-display text-2xl font-semibold text-[#1F1C1B] border-b border-[#E5DFD5] pb-2">Riwayat Cek Stok Berkala</h2>
          <div class="space-y-2.5">
            ${opnameLogs
              .map(
                (l) => `<div class="p-3 bg-[#FAF6EE] border border-[#E5DFD5] rounded-2xl space-y-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-mono text-[10px] font-bold text-[#B85D38]">${escapeHtml(l.id)} · ${escapeHtml(l.period)} · ${escapeHtml(l.date)}</span>
                  <span class="font-mono text-[10px] px-2 py-0.5 bg-[#E9F2EC] text-[#2E5940] rounded-2xl">${escapeHtml(l.status)}</span>
                </div>
                <p class="font-semibold text-[#1F1C1B]">${escapeHtml(l.itemName)}</p>
                <p class="text-[11px] text-[#5E635F]">Sistem: ${l.systemQty} | Fisik: ${l.physicalQty} (Selisih ${l.diff}) — ${escapeHtml(l.note)}</p>
              </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function openStockActionModal(invId, mode) {
  const item = getInventory().find((i) => i.id === invId);
  if (!item) return;
  const modeVal = mode === 'out' ? 'out' : 'in';
  document.getElementById('stock-modal-inv-id').value = item.id;
  document.getElementById('stock-modal-mode').value = modeVal;
  document.getElementById('stock-modal-item-name').textContent = `${item.name} (Saat ini: ${item.qty} ${item.unit})`;
  document.getElementById('stock-modal-qty').value = 10;
  document.getElementById('stock-modal-note').value = '';
  document.getElementById('stock-action-modal')?.classList.remove('hidden');
}

function closeStockActionModal() {
  document.getElementById('stock-action-modal')?.classList.add('hidden');
}

function submitStockAction(event) {
  event.preventDefault();
  const invId = document.getElementById('stock-modal-inv-id').value;
  const mode = document.getElementById('stock-modal-mode').value === 'out' ? 'out' : 'in';
  const qty = Number(document.getElementById('stock-modal-qty').value || 0);
  const note = document.getElementById('stock-modal-note').value.trim();
  const inv = getInventory();
  const item = inv.find((i) => i.id === invId);
  if (!item || qty <= 0) return;

  const delta = mode === 'out' ? -qty : qty;
  item.qty = Math.max(0, Number(item.qty) + delta);
  const logs = getStockLogs();
  logs.unshift({
    id: 'LOG-' + Date.now(),
    timestamp: new Date().toISOString(),
    invId: item.id,
    itemName: item.name,
    type: mode === 'out' ? 'KELUAR (KOREKSI)' : 'MASUK (RESTOCK)',
    delta,
    ref: mode === 'out' ? 'KOREKSI' : 'RESTOCK',
    note,
  });

  saveInventory(inv);
  saveStockLogs(logs.slice(0, 120));
  closeStockActionModal();
  showToast(
    mode === 'out'
      ? `Stok ${item.name} dikoreksi -${qty} ${item.unit}.`
      : `Stok ${item.name} bertambah +${qty} ${item.unit}.`,
    'success'
  );
  renderAdminInventoryTab();
}

function syncOpnamePhysical() {
  const invId = document.getElementById('opn-inv-id')?.value;
  const item = getInventory().find((i) => i.id === invId);
  const el = document.getElementById('opn-physical');
  if (item && el) el.value = item.qty;
}

function submitStockOpname(event) {
  event.preventDefault();
  const period = document.getElementById('opn-period').value;
  const invId = document.getElementById('opn-inv-id').value;
  const physicalQty = Number(document.getElementById('opn-physical').value || 0);
  const note = document.getElementById('opn-note').value.trim();

  const inv = getInventory();
  const item = inv.find((i) => i.id === invId);
  if (!item) return;

  const systemQty = Number(item.qty);
  const diff = physicalQty - systemQty;
  if (diff !== 0) {
    item.qty = physicalQty;
    saveInventory(inv);

    const stockLogs = getStockLogs();
    stockLogs.unshift({
      id: 'LOG-' + Date.now() + '-OPN',
      timestamp: new Date().toISOString(),
      invId: item.id,
      itemName: item.name,
      type: 'PENYESUAIAN OPNAME',
      delta: diff,
      ref: 'OPNAME',
      note: `Penyesuaian opname ${period}: sistem ${systemQty} → fisik ${physicalQty} ${item.unit}`,
    });
    saveStockLogs(stockLogs.slice(0, 120));
  }

  const sess = getAdminSession();
  const logs = getOpnameLogs();
  logs.unshift({
    id: generateUniqueId('OPN-', logs),
    date: getTodayDateString(0),
    period,
    auditor: sess ? sess.name : 'Admin',
    itemName: item.name,
    systemQty,
    physicalQty,
    diff,
    status: diff === 0 ? 'Sesuai — Aman' : 'Disesuaikan',
    note,
  });

  saveOpnameLogs(logs);
  showToast(`Hasil cek stok ${item.name} tersimpan.`, 'success');
  renderAdminInventoryTab();
}

function quickConfirmAllOpname(period = 'Mingguan') {
  const inv = getInventory();
  const totalQty = inv.reduce((s, i) => s + Number(i.qty || 0), 0);
  const sess = getAdminSession();
  const logs = getOpnameLogs();
  logs.unshift({
    id: generateUniqueId('OPN-', logs),
    date: getTodayDateString(0),
    period,
    auditor: sess ? sess.name : 'Owner',
    itemName: `Seluruh Bahan Studio (${inv.length} Item)`,
    systemQty: totalQty,
    physicalQty: totalQty,
    diff: 0,
    status: 'Sesuai — Aman',
    note: `Konfirmasi pengecekan ${period.toLowerCase()} menyeluruh: seluruh bahan & stok studio aman.`,
  });
  saveOpnameLogs(logs);
  showToast(`Cek stok ${period} semua bahan tercatat aman.`, 'success');
  renderAdminInventoryTab();
}

// ---------- TAB 4: KELOLA KATALOG PRODUK ----------

function renderAdminProductsTab() {
  const wrap = document.getElementById('admin-tab-content');
  if (!wrap) return;
  const products = getProducts();

  wrap.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DFD5] pb-5">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#B85D38]">Manajemen Etalase</p>
          <h1 class="font-display text-3xl sm:text-4xl font-semibold text-[#1F1C1B]">Kelola Katalog Buket</h1>
        </div>
        <button type="button" onclick="openProductModal()" class="btn-accent px-4 py-2 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
          <i class="ph ph-plus"></i><span>Tambah Buket Katalog</span>
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${products
          .map(
            (p) => `
          <div class="editorial-card overflow-hidden flex flex-col">
            <div class="photo-frame aspect-[4/3]">
              <img src="${escapeHtml(p.image)}" onerror="handleImgError(this)" alt="${escapeHtml(p.name)}" />
            </div>
            <div class="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
              <div>
                <span class="font-mono text-[10px] text-[#B85D38]">${escapeHtml(p.id)} · ${escapeHtml(p.category)}</span>
                <h3 class="font-display text-xl font-semibold text-[#1F1C1B] mt-0.5">${escapeHtml(p.name)}</h3>
                <p class="text-[#5E635F] mt-1 line-clamp-2">${escapeHtml(p.description)}</p>
              </div>
              <div class="pt-3 border-t border-[#E5DFD5] space-y-2">
                <div class="flex justify-between font-mono">
                  <span class="font-bold text-[#B85D38]">${formatRupiah(p.price)}</span>
                  <span class="text-[#5E635F]">HPP ${formatRupiah(p.hpp)} · Stok ${p.stock}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" onclick="openProductModal('${escapeHtml(p.id)}')" class="btn-outline py-1.5 font-semibold cursor-pointer">Edit</button>
                  <button type="button" onclick="deleteAdminProduct('${escapeHtml(p.id)}')" class="py-1.5 border border-[#DEC1C9] text-[#B85D38] rounded-2xl font-semibold cursor-pointer hover:bg-[#FBF2E6]">Hapus</button>
                </div>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

const ADMIN_PRODUCT_CATEGORY_PRESETS = {
  'Buket Snack': {
    type: 'snack',
    fillCount: 10,
    note: 'Snack assorted pilihan (cokelat/wafer/biskuit)',
    recipe: [
      { invId: 'INV-01', qty: 10 },
      { invId: 'INV-04', qty: 5 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  'Buket Uang': {
    type: 'money',
    fillCount: 10,
    note: '10 slot uang plastik + aksen Rangkaian Bunga',
    recipe: [
      { invId: 'INV-07', qty: 10 },
      { invId: 'INV-02', qty: 3 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  'Buket Foto': {
    type: 'photo',
    fillCount: 10,
    note: '10 foto polaroid custom berlaminasi',
    recipe: [
      { invId: 'INV-03', qty: 10 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  'Rangkaian Bunga': {
    type: 'artificial',
    fillCount: 15,
    note: '15 tangkai Rangkaian Bunga pita satin/silk artificial',
    recipe: [
      { invId: 'INV-02', qty: 15 },
      { invId: 'INV-04', qty: 6 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  'Mix Custom': {
    type: 'mix',
    fillCount: 10,
    note: 'Mix snack + foto polaroid + Rangkaian Bunga',
    recipe: [
      { invId: 'INV-01', qty: 6 },
      { invId: 'INV-03', qty: 4 },
      { invId: 'INV-02', qty: 3 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
};

function buildDefaultProductExtras(category) {
  const d = ADMIN_PRODUCT_CATEGORY_PRESETS[category] || ADMIN_PRODUCT_CATEGORY_PRESETS['Buket Snack'];
  const preset = createDefaultConfigState();
  preset.bouquetType = d.type;
  preset.fillCount = d.fillCount;
  preset.customFillNote = d.note;
  return { preset, recipe: d.recipe.map((r) => ({ ...r })) };
}

function openProductModal(productId = '') {
  const prod = productId ? getProducts().find((p) => p.id === productId) : null;
  document.getElementById('product-modal-title').textContent = prod ? `Edit ${prod.id}` : 'Tambah Produk Katalog Baru';
  document.getElementById('pm-id').value = prod ? prod.id : '';
  document.getElementById('pm-name').value = prod ? prod.name : '';
  const catEl = document.getElementById('pm-cat');
  catEl.value = prod ? prod.category : 'Buket Snack';
  if (typeof catEl._abSync === 'function') catEl._abSync();
  document.getElementById('pm-stock').value = prod ? prod.stock : 10;
  document.getElementById('pm-price').value = prod ? prod.price : 150000;
  document.getElementById('pm-hpp').value = prod ? prod.hpp : 65000;
  document.getElementById('pm-img').value = prod ? prod.image : HERO_MEDIA.mainHero;
  document.getElementById('pm-desc').value = prod ? prod.description : '';
  document.getElementById('product-modal')?.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('product-modal')?.classList.add('hidden');
}

function saveAdminProduct(event) {
  event.preventDefault();
  const id = document.getElementById('pm-id').value;
  const products = getProducts();
  const fields = {
    name: document.getElementById('pm-name').value.trim(),
    category: document.getElementById('pm-cat').value,
    stock: Number(document.getElementById('pm-stock').value || 0),
    price: Number(document.getElementById('pm-price').value || 0),
    hpp: Number(document.getElementById('pm-hpp').value || 0),
    image: document.getElementById('pm-img').value.trim(),
    description: document.getElementById('pm-desc').value.trim(),
  };

  if (id) {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const prev = products[idx];
    const next = { ...prev, ...fields };
    if (fields.category !== prev.category) {
      const extras = buildDefaultProductExtras(fields.category);
      next.preset = { ...(prev.preset || createDefaultConfigState()), bouquetType: extras.preset.bouquetType };
    }
    products[idx] = next;
  } else {
    const extras = buildDefaultProductExtras(fields.category);
    products.unshift({
      id: generateUniqueId('PRD-', products),
      ...fields,
      sold: 0,
      satinBloomCount: extras.preset.fillCount,
      satinMinutesPerBloom: 3,
      dimensions: '48 x 34 cm',
      prepMinutes: 35,
      tags: ['Katalog Studio'],
      preset: extras.preset,
      recipe: extras.recipe,
    });
  }

  saveProducts(products);
  closeProductModal();
  showToast('Produk katalog tersimpan.', 'success');
  renderAdminProductsTab();
}

function deleteAdminProduct(id) {
  if (!confirm(`Hapus produk ${id} dari katalog? Aksi ini tidak bisa dibatalkan.`)) return;
  saveProducts(getProducts().filter((p) => p.id !== id));
  showToast(`Produk ${id} dihapus dari katalog.`, 'warn');
  renderAdminProductsTab();
}

// ---------- TAB 5: KEUANGAN & LAPORAN ----------

function renderAdminFinanceTab() {
  const wrap = document.getElementById('admin-tab-content');
  if (!wrap) return;
  const m = computeFinancialMetrics();
  const expenses = getExpenses();

  wrap.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DFD5] pb-5">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#B85D38]">Laporan Laba Rugi Studio</p>
          <h1 class="font-display text-3xl sm:text-4xl font-semibold text-[#1F1C1B]">Keuangan &amp; Export CSV</h1>
        </div>
        <button type="button" onclick="exportOrdersCsv()" class="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
          <i class="ph ph-download-simple"></i><span>Export Laporan Order (CSV)</span>
        </button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Omzet Kotor (${m.validOrders.length} Order)</p>
          <p class="font-display text-3xl font-bold text-[#1F1C1B] mt-1">${formatRupiah(m.grossRevenue)}</p>
        </div>
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Total HPP Bahan</p>
          <p class="font-display text-3xl font-bold text-[#8A5A00] mt-1">${formatRupiah(m.cogsTotal)}</p>
        </div>
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Pengeluaran Studio</p>
          <p class="font-display text-3xl font-bold text-[#B85D38] mt-1">${formatRupiah(m.expenseTotal)}</p>
        </div>
        <div class="editorial-card p-4">
          <p class="font-mono text-[10px] uppercase text-[#5E635F]">Laba Bersih (Margin ${m.avgMargin}%)</p>
          <p class="font-display text-3xl font-bold text-[#2E5940] mt-1">${formatRupiah(m.netProfit)}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onsubmit="addAdminExpense(event)" class="lg:col-span-5 editorial-card p-5 space-y-3 text-xs">
          <h2 class="font-display text-2xl font-semibold text-[#1F1C1B] border-b border-[#E5DFD5] pb-2">Catat Pengeluaran Operasional</h2>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Kategori</label>
            <select id="exp-cat" class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl bg-white">
              <option value="Restock Bahan Baku">Restock Bahan Baku</option>
              <option value="Operasional Studio">Operasional Studio</option>
              <option value="Kemasan & Kartu A6">Kemasan &amp; Kartu A6</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Keterangan</label>
            <input id="exp-desc" type="text" required placeholder="Contoh: Beli 5 Roll Pita Satin Gold" class="w-full px-3 py-2 border border-[#D8D0C5] rounded-2xl" />
          </div>
          <div>
            <label class="block font-semibold text-[#1F1C1B] mb-1">Nominal (Rp)</label>
            <input id="exp-amount" type="number" min="1000" required class="w-full px-3 py-2 font-mono border border-[#D8D0C5] rounded-2xl" />
          </div>
          <button type="submit" class="btn-accent w-full py-2.5 font-semibold cursor-pointer">Simpan Pengeluaran</button>
        </form>

        <div class="lg:col-span-7 editorial-card p-5 space-y-3 text-xs">
          <h2 class="font-display text-2xl font-semibold text-[#1F1C1B] border-b border-[#E5DFD5] pb-2">Daftar Pengeluaran Studio</h2>
          <div class="space-y-2">
            ${expenses
              .map(
                (e) => `<div class="p-3 bg-[#FAF6EE] border border-[#E5DFD5] rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <span class="font-mono text-[10px] text-[#B85D38]">${escapeHtml(e.date)} · ${escapeHtml(e.category)}</span>
                  <p class="font-semibold text-[#1F1C1B]">${escapeHtml(e.description)}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <span class="font-mono font-bold text-[#B85D38]">${formatRupiah(e.amount)}</span>
                  <button type="button" onclick="deleteAdminExpense('${escapeHtml(e.id)}')" class="text-[#5E635F] hover:text-[#B85D38] cursor-pointer"><i class="ph ph-trash"></i></button>
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function addAdminExpense(event) {
  event.preventDefault();
  const category = document.getElementById('exp-cat').value;
  const description = document.getElementById('exp-desc').value.trim();
  const amount = Number(document.getElementById('exp-amount').value || 0);
  if (!description || amount <= 0) return;

  const list = getExpenses();
  list.unshift({
    id: 'EXP-' + String(Date.now()).slice(-4),
    date: getTodayDateString(0),
    category,
    description,
    amount,
  });
  saveExpenses(list);
  showToast('Pengeluaran studio dicatat.', 'success');
  renderAdminFinanceTab();
}

function deleteAdminExpense(id) {
  if (!confirm('Hapus catatan pengeluaran ini?')) return;
  saveExpenses(getExpenses().filter((e) => e.id !== id));
  showToast('Pengeluaran dihapus.', 'warn');
  renderAdminFinanceTab();
}

function csvSafeCell(value) {
  let s = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportOrdersCsv() {
  const orders = getOrders();
  const headers = ['ID', 'TanggalMasuk', 'Pelanggan', 'NoWA', 'Sumber', 'Total', 'HPP', 'MetodeBayar', 'StatusBayar', 'StatusOrder'];
  const rows = orders.map((o) => [
    o.id,
    o.createdAt,
    o.customerName || '',
    o.customerPhone || '',
    o.source || '',
    o.totalPrice,
    o.hppTotal,
    o.paymentMethod || '',
    o.paymentStatus || '',
    o.status || '',
  ]);
  const csvContent = [headers, ...rows].map((r) => r.map(csvSafeCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-azzatul-bouquet-${getTodayDateString(0)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Laporan CSV berhasil diunduh.', 'success');
}

window.addEventListener('azzatul-cloud-sync', () => {
  if (getAdminSession()) {
    renderAdminTab();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage();
  if (typeof syncStoreFromCloud === 'function') {
    syncStoreFromCloud();
    setInterval(() => {
      if (!document.hidden && getAdminSession()) {
        syncStoreFromCloud();
      }
    }, 8000);
  }
});
