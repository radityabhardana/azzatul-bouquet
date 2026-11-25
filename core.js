/**
 * AZZATUL BOUQUET — Core Shared Engine (State, Business Logic, SVG Renderer & Minimalist Storefront Shell)
 */

function safeReadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    if (fallback !== null && typeof fallback === 'object') {
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed;
  } catch (e) {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (typeof showToast === 'function') {
      showToast('Penyimpanan browser penuh! Hapus pesanan lama atau perkecil foto.', 'error');
    }
    return false;
  }
}

function getProducts() {
  const list = safeReadStorage(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS) || [];
  return list.map((p) => (p && p.category === 'Bunga Buatan' ? { ...p, category: 'Rangkaian Bunga' } : p));
}
function saveProducts(list) {
  return safeWriteStorage(STORAGE_KEYS.PRODUCTS, list);
}

function getInventory() {
  return safeReadStorage(STORAGE_KEYS.INVENTORY, SEED_INVENTORY) || [];
}
function saveInventory(list) {
  return safeWriteStorage(STORAGE_KEYS.INVENTORY, list);
}

function getStockLogs() {
  return safeReadStorage(STORAGE_KEYS.STOCK_LOGS, SEED_STOCK_LOGS) || [];
}
function saveStockLogs(list) {
  return safeWriteStorage(STORAGE_KEYS.STOCK_LOGS, list);
}

function getOrders() {
  return safeReadStorage(STORAGE_KEYS.ORDERS, SEED_ORDERS) || [];
}
function saveOrders(list) {
  return safeWriteStorage(STORAGE_KEYS.ORDERS, list);
}

function getExpenses() {
  return safeReadStorage(STORAGE_KEYS.EXPENSES, SEED_EXPENSES) || [];
}
function saveExpenses(list) {
  return safeWriteStorage(STORAGE_KEYS.EXPENSES, list);
}

function getOpnameLogs() {
  return safeReadStorage(STORAGE_KEYS.OPNAME_LOGS, SEED_OPNAME_LOGS) || [];
}
function saveOpnameLogs(list) {
  return safeWriteStorage(STORAGE_KEYS.OPNAME_LOGS, list);
}

function getAdminSession() {
  const sess = safeReadStorage(STORAGE_KEYS.ADMIN_SESSION, null);
  if (!sess || typeof sess !== 'object' || Array.isArray(sess) || !sess.username || !Array.isArray(sess.allowedTabs)) {
    return null;
  }
  const matched =
    typeof ADMIN_ACCOUNTS !== 'undefined' && Array.isArray(ADMIN_ACCOUNTS)
      ? ADMIN_ACCOUNTS.find((a) => a.username === sess.username)
      : null;
  const clean = {
    username: String(sess.username),
    displayName: String(sess.displayName || sess.name || matched?.displayName || matched?.name || sess.username),
    role: String(sess.role || matched?.role || ''),
    allowedTabs: [...sess.allowedTabs],
  };
  Object.defineProperty(clean, 'name', {
    value: String(matched?.name || sess.displayName || sess.username),
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(clean, 'roleLabel', {
    value: String(matched?.roleLabel || (clean.role === 'owner' ? 'Owner' : 'Perangkai & Admin WA')),
    enumerable: false,
    configurable: true,
  });
  return clean;
}

function saveAdminSession(account) {
  if (!account) {
    try {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      return true;
    } catch (e) {
      return false;
    }
  }
  const sanitized = {
    username: String(account.username || ''),
    displayName: String(account.displayName || account.name || account.username || ''),
    role: String(account.role || ''),
    allowedTabs: Array.isArray(account.allowedTabs) ? [...account.allowedTabs] : [],
  };
  return safeWriteStorage(STORAGE_KEYS.ADMIN_SESSION, sanitized);
}

function getDraftOrder() {
  return safeReadStorage(STORAGE_KEYS.DRAFT_ORDER, null);
}
function saveDraftOrder(draft) {
  return safeWriteStorage(STORAGE_KEYS.DRAFT_ORDER, draft);
}
function clearDraftOrder() {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_ORDER);
    return true;
  } catch (e) {
    return false;
  }
}

function getCheckoutFormState() {
  return safeReadStorage(STORAGE_KEYS.CHECKOUT_FORM, null);
}
function saveCheckoutFormState(state) {
  return safeWriteStorage(STORAGE_KEYS.CHECKOUT_FORM, state);
}
function clearCheckoutFormState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHECKOUT_FORM);
    return true;
  } catch (e) {
    return false;
  }
}

function getActiveInvoiceId() {
  return safeReadStorage(STORAGE_KEYS.ACTIVE_INVOICE, '');
}
function saveActiveInvoiceId(id) {
  if (!id) {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_INVOICE);
      return true;
    } catch (e) {
      return false;
    }
  }
  return safeWriteStorage(STORAGE_KEYS.ACTIVE_INVOICE, id);
}

function inferCustomItemInvId(it) {
  if (!it || typeof it !== 'object') return 'INV-08';
  if (it.invId) return it.invId;
  const id = String(it.id || '');
  if (id === 'money-sleeve-pcs') return 'INV-07';
  if (id === 'mini-bear' || id === 'grad-bear') return 'INV-06';
  if (id === 'polaroid-pcs' || id === 'photostrip-pcs') return 'INV-03';
  if (id === 'artificial-rose' || id === 'dried-babybreath' || id.startsWith('art-')) return 'INV-02';
  const cat = it.category || it.cat || 'Snack';
  if (cat === 'Snack') return 'INV-01';
  if (cat === 'Bunga & Boneka') return 'INV-02';
  if (cat === 'Foto & Uang') return 'INV-03';
  return 'INV-08';
}

function normalizeCustomFillItem(it) {
  if (!it || typeof it !== 'object') return it;
  const cat = it.category || it.cat || 'Snack';
  return {
    ...it,
    cat,
    category: cat,
    invId: inferCustomItemInvId(it),
    invQty: Number(it.invQty || 1),
  };
}

function getDefaultCustomFillItems() {
  const rawDefaults =
    typeof CUSTOM_FILL_CATALOG !== 'undefined' && Array.isArray(CUSTOM_FILL_CATALOG)
      ? CUSTOM_FILL_CATALOG
      : [...(CONFIGURATOR_OPTIONS.popularSnacks || []), ...(CONFIGURATOR_OPTIONS.mixExtraItems || [])];
  return rawDefaults.map(normalizeCustomFillItem);
}

function getCustomFillItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ITEMS);
    if (raw === null || raw === undefined) {
      return getDefaultCustomFillItems();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return getDefaultCustomFillItems();
    }
    return parsed.map(normalizeCustomFillItem);
  } catch (e) {
    return getDefaultCustomFillItems();
  }
}

function saveCustomFillItems(list) {
  return safeWriteStorage(STORAGE_KEYS.CUSTOM_ITEMS, Array.isArray(list) ? list.map(normalizeCustomFillItem) : []);
}

function initStore() {
  if (localStorage.getItem(STORAGE_KEYS.PRODUCTS) === null) saveProducts(SEED_PRODUCTS);
  if (localStorage.getItem(STORAGE_KEYS.INVENTORY) === null) saveInventory(SEED_INVENTORY);
  if (localStorage.getItem(STORAGE_KEYS.STOCK_LOGS) === null) saveStockLogs(SEED_STOCK_LOGS);
  if (localStorage.getItem(STORAGE_KEYS.ORDERS) === null) saveOrders(SEED_ORDERS);
  if (localStorage.getItem(STORAGE_KEYS.EXPENSES) === null) saveExpenses(SEED_EXPENSES);
  if (localStorage.getItem(STORAGE_KEYS.OPNAME_LOGS) === null) saveOpnameLogs(SEED_OPNAME_LOGS);
}

function resetDemoData() {
  saveProducts(SEED_PRODUCTS);
  saveInventory(SEED_INVENTORY);
  saveStockLogs(SEED_STOCK_LOGS);
  saveOrders(SEED_ORDERS);
  saveExpenses(SEED_EXPENSES);
  saveOpnameLogs(SEED_OPNAME_LOGS);
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.CHECKOUT_FORM);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_INVOICE);
  } catch (e) {}
  clearDraftOrder();
  clearCheckoutFormState();
  saveActiveInvoiceId('');
  saveAdminSession(null);
  showToast('Data studio berhasil dikembalikan ke pengaturan awal.', 'success');
  if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
    setTimeout(() => window.location.reload(), 650);
  }
}

function generateUniqueId(prefix, existingList = [], padLen = 2) {
  const pfx = String(prefix || '');
  const list = Array.isArray(existingList) ? existingList : [];
  const existingIds = new Set(
    list.map((entry) => (entry && typeof entry === 'object' ? String(entry.id || '') : String(entry || '')))
  );
  let maxNum = 0;
  existingIds.forEach((idStr) => {
    if (idStr.startsWith(pfx)) {
      const suffix = idStr.slice(pfx.length);
      if (/^\d+$/.test(suffix)) {
        const num = parseInt(suffix, 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  let nextNum = maxNum + 1;
  let candidate = pfx + String(nextNum).padStart(padLen, '0');
  while (existingIds.has(candidate)) {
    nextNum += 1;
    candidate = pfx + String(nextNum).padStart(padLen, '0');
  }
  return candidate;
}

if (typeof window !== 'undefined') {
  window.generateUniqueId = generateUniqueId;
}

// ---------- Formatters & Utilities ----------

function formatRupiah(num) {
  const n = Math.round(Number(num) || 0);
  const absFormatted = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-Rp ' : 'Rp ') + absFormatted;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return (
    d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
}

function formatDurationMinutes(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} jam` : `${h} jam ${rem} mnt`;
}

function formatWaPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return PAYMENT_ACCOUNTS.studioWaNumber;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function handleImgError(img) {
  if (!img || img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = '1';
  img.src = FALLBACK_IMAGE;
}

function getQueryParam(key) {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
  } catch (e) {
    return '';
  }
}

function showToast(message, tone = 'dark') {
  if (typeof document === 'undefined' || !document.body) return;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-20 lg:bottom-5 right-5 z-[80] flex flex-col gap-2 max-w-sm pointer-events-none no-print';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const toneClasses = {
    dark: 'bg-[#1F1C1B] text-white border-[#343835]',
    success: 'bg-[#2E5940] text-white border-[#224430]',
    warn: 'bg-[#8A5A00] text-white border-[#6E4600]',
    error: 'bg-[#B85D38] text-white border-[#681D30]',
  };
  toast.className = `pointer-events-auto px-4 py-3 rounded-2xl border text-xs font-medium shadow-md flex items-center gap-2.5 transition-all duration-300 ${toneClasses[tone] || toneClasses.dark}`;
  toast.innerHTML = `<i class="ph ph-info text-base shrink-0"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 280);
  }, 3200);
}

function copyTextToClipboard(text, label = 'Teks') {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast(`${label} berhasil disalin: ${text}`, 'success'),
      () => showToast(`${label}: ${text}`, 'dark')
    );
  } else {
    showToast(`${label}: ${text}`, 'dark');
  }
}

// ---------- Business Domain Helpers (FIFO, Configurator & Auto-BOM) ----------

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Menunggu Konfirmasi':
      return 'bg-[#FBF3DB] text-[#8A5A00] border border-[#EBD6A7]';
    case 'Pembayaran Terverifikasi':
      return 'bg-[#E9EFF5] text-[#28456C] border border-[#C6D5E6]';
    case 'Sedang Dirangkai':
      return 'bg-[#FBF2E6] text-[#B85D38] border border-[#E4C5CD]';
    case 'Siap Diambil/Dikirim':
      return 'bg-[#E9F2EC] text-[#2E5940] border border-[#C2DEC9]';
    case 'Selesai':
      return 'bg-[#F3ECE0] text-[#1F1C1B] border border-[#D8D0C5]';
    case 'Dibatalkan':
      return 'bg-[#F5E8EC] text-[#8A243B] border border-[#DEC1C9]';
    default:
      return 'bg-[#F3ECE0] text-[#6A625B] border border-[#E6DDD0]';
  }
}

function getPaymentBadgeClass(paymentStatus) {
  if (paymentStatus === 'Lunas') return 'bg-[#E9F2EC] text-[#2E5940] border border-[#C2DEC9]';
  if (paymentStatus === 'DP 50%') return 'bg-[#FBF3DB] text-[#8A5A00] border border-[#EBD6A7]';
  return 'bg-[#F3ECE0] text-[#6A625B] border border-[#E6DDD0]';
}

function getOrderSatinBloomCount(order) {
  if (!order || !Array.isArray(order.items)) return 0;
  return order.items.reduce((sum, item) => {
    if (item.satinBloomCount) return sum + Number(item.satinBloomCount) * (item.qty || 1);
    const invCount = (item.recipe || [])
      .filter((r) => ['INV-01', 'INV-02', 'INV-03', 'INV-07'].includes(r.invId))
      .reduce((s, r) => s + Number(r.qty || 0), 0);
    return sum + invCount * (item.qty || 1);
  }, 0);
}

function getFifoQueueMap() {
  const toSafeTimestamp = (val) => {
    const t = val ? new Date(val).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const activeOrders = getOrders()
    .filter(
      (o) =>
        o &&
        o.status !== 'Selesai' &&
        o.status !== 'Dibatalkan' &&
        (o.midtransPaid || o.paymentStatus === 'Lunas' || o.paymentProofImage || o.status !== 'Menunggu Konfirmasi')
    )
    .slice()
    .sort(
      (a, b) =>
        toSafeTimestamp(a.createdAt) - toSafeTimestamp(b.createdAt) ||
        String(a.id || '').localeCompare(String(b.id || ''))
    );

  const map = {};
  let runningMinutes = 0;
  activeOrders.forEach((order, index) => {
    const blooms = getOrderSatinBloomCount(order);
    const orderPrep = Math.max(25, blooms * 4);
    map[order.id] = {
      rank: index + 1,
      totalActive: activeOrders.length,
      aheadCount: index,
      estStartMinutes: runningMinutes,
      estFinishMinutes: runningMinutes + orderPrep,
      blooms,
    };
    runningMinutes += orderPrep;
  });
  return map;
}

function getDefaultPhotoStyleId() {
  return CONFIGURATOR_OPTIONS.photoStyles?.[0]?.id || 'polaroid-classic';
}

function getDefaultArtificialTypeId() {
  return CONFIGURATOR_OPTIONS.artificialTypes?.[0]?.id || 'mawar-satin';
}

function normalizePhotoStyleId(val) {
  const def = getDefaultPhotoStyleId();
  if (!val || val === 'polaroid_white') return def;
  return String(val);
}

function normalizeArtificialTypeId(val) {
  const def = getDefaultArtificialTypeId();
  if (!val || val === 'satin_rose') return def;
  return String(val);
}

function createDefaultConfigState() {
  return {
    sourceType: 'custom',
    productId: null,
    productName: '',
    bouquetType: 'snack',
    fillCount: 10,
    selectedSnacks: {},
    moneyDenom: 50000,
    moneySource: 'self',
    photoStyle: getDefaultPhotoStyleId(),
    artificialType: getDefaultArtificialTypeId(),
    satinColor: 'Burgundy Velvet',
    wrapStyle: 'korean',
    wrapColor: 'Cream Linen',
    ribbonColor: 'Champagne Gold',
    moneySlots: 0,
    customFillNote: '',
    addons: { photoPrint: false, artificialAccent: false, doll: false, led: false, goldTrim: false },
    referenceImage: '',
    referenceNote: '',
    cardTheme: 'ivory',
    cardTo: '',
    cardFrom: '',
    cardMessage: 'Selamat berbahagia, semoga momen spesial ini selalu membawa senyuman.',
  };
}

function buildDraftFromProduct(productId, sourceType = 'catalog') {
  const prod = getProducts().find((p) => p.id === productId);
  const base = createDefaultConfigState();
  if (!prod) return base;

  const p = prod.preset || {};
  return {
    ...base,
    sourceType,
    productId: prod.id,
    productName: prod.name,
    bouquetType: p.bouquetType || 'snack',
    fillCount: Number(p.fillCount || prod.satinBloomCount || 10),
    selectedSnacks: p.selectedSnacks && typeof p.selectedSnacks === 'object' ? { ...p.selectedSnacks } : {},
    moneyDenom: Number(p.moneyDenom || 50000),
    moneySource: p.moneySource === 'studio' ? 'studio' : 'self',
    photoStyle: normalizePhotoStyleId(p.photoStyle),
    artificialType: normalizeArtificialTypeId(p.artificialType),
    satinColor: p.satinColor || 'Burgundy Velvet',
    wrapStyle: p.wrapStyle || 'korean',
    wrapColor: p.wrapColor || 'Cream Linen',
    ribbonColor: p.ribbonColor || 'Champagne Gold',
    moneySlots: Number(p.moneySlots || 0),
    customFillNote: p.customFillNote || '',
    addons: {
      photoPrint: Boolean(p.addons?.photoPrint),
      artificialAccent: Boolean(p.addons?.artificialAccent),
      doll: Boolean(p.addons?.doll),
      led: Boolean(p.addons?.led),
      goldTrim: Boolean(p.addons?.goldTrim),
    },
    referenceImage: prod.image || '',
    referenceNote: `Dipilih dari koleksi: ${prod.name}`,
  };
}

function calculateConfigPricing(cfg) {
  const activeCfg = cfg || createDefaultConfigState();
  const bouquetObj =
    CONFIGURATOR_OPTIONS.bouquetTypes.find((b) => b.id === activeCfg.bouquetType) ||
    CONFIGURATOR_OPTIONS.bouquetTypes[0];
  const wrapStyleObj =
    CONFIGURATOR_OPTIONS.wrapStyles.find((w) => w.id === activeCfg.wrapStyle) ||
    CONFIGURATOR_OPTIONS.wrapStyles[0];
  const catalogProd = activeCfg.productId ? getProducts().find((p) => p.id === activeCfg.productId) : null;

  const activeFillCount = Number(activeCfg.fillCount || activeCfg.bloomCount || 10);
  const snackMap = activeCfg.selectedSnacks && typeof activeCfg.selectedSnacks === 'object' ? activeCfg.selectedSnacks : {};
  const allPickableCatalog = getCustomFillItems();
  const pickedSnackItems = allPickableCatalog
    .filter((sn) => bouquetObj.id !== 'snack' || (sn.category || sn.cat || 'Snack') === 'Snack')
    .map((sn) => ({ ...sn, qty: Number(snackMap[sn.id] || 0) }))
    .filter((sn) => sn.qty > 0);

  const pickedSnackCount = pickedSnackItems.reduce((s, sn) => s + sn.qty, 0);
  const pickedSnackPrice = pickedSnackItems.reduce((s, sn) => s + Number(sn.price || 0) * sn.qty, 0);
  const pickedSnackHpp = pickedSnackItems.reduce((s, sn) => s + Number(sn.hpp || 0) * sn.qty, 0);
  const useCustomSnackList = (bouquetObj.id === 'snack' || bouquetObj.id === 'mix') && pickedSnackCount > 0;

  const effectiveFillCount = useCustomSnackList ? pickedSnackCount : activeFillCount;
  const moneySlots = Number(activeCfg.moneySlots || 0);
  const pickedMoneySleeveQty = useCustomSnackList
    ? pickedSnackItems.filter((sn) => sn.id === 'money-sleeve-pcs').reduce((s, sn) => s + sn.qty, 0)
    : 0;

  const isExactCatalogBundle = Boolean(
    activeCfg.sourceType === 'catalog' &&
      catalogProd &&
      catalogProd.preset &&
      !useCustomSnackList &&
      catalogProd.preset.bouquetType === activeCfg.bouquetType &&
      Number(catalogProd.preset.fillCount || catalogProd.satinBloomCount || 10) === activeFillCount &&
      catalogProd.preset.wrapStyle === activeCfg.wrapStyle &&
      Number(catalogProd.preset.moneySlots || 0) === moneySlots &&
      normalizePhotoStyleId(catalogProd.preset.photoStyle) === normalizePhotoStyleId(activeCfg.photoStyle) &&
      normalizeArtificialTypeId(catalogProd.preset.artificialType) === normalizeArtificialTypeId(activeCfg.artificialType) &&
      Boolean(catalogProd.preset.addons?.photoPrint) === Boolean(activeCfg.addons?.photoPrint) &&
      Boolean(catalogProd.preset.addons?.artificialAccent) === Boolean(activeCfg.addons?.artificialAccent) &&
      Boolean(catalogProd.preset.addons?.doll) === Boolean(activeCfg.addons?.doll) &&
      Boolean(catalogProd.preset.addons?.led) === Boolean(activeCfg.addons?.led) &&
      Boolean(catalogProd.preset.addons?.goldTrim) === Boolean(activeCfg.addons?.goldTrim)
  );

  let addonsPrice = 0;
  let addonsHpp = 0;
  CONFIGURATOR_OPTIONS.addons.forEach((ad) => {
    if (activeCfg.addons && activeCfg.addons[ad.id]) {
      addonsPrice += ad.price;
      addonsHpp += ad.hpp;
    }
  });

  const moneySlotPrice = moneySlots * CONFIGURATOR_OPTIONS.moneySlots.slotPrice;
  const moneySlotHpp = moneySlots * CONFIGURATOR_OPTIONS.moneySlots.slotHpp;

  const totalMoneyBills = (bouquetObj.id === 'money' ? effectiveFillCount : 0) + moneySlots + pickedMoneySleeveQty;
  const moneyDenom = Number(activeCfg.moneyDenom || 50000);
  const moneySource = activeCfg.moneySource === 'studio' ? 'studio' : 'self';
  const moneyCashTotal = totalMoneyBills > 0 && moneySource === 'studio' ? totalMoneyBills * moneyDenom : 0;

  const fillPrice = useCustomSnackList ? pickedSnackPrice : activeFillCount * bouquetObj.pricePerUnit;
  const fillHpp = useCustomSnackList ? pickedSnackHpp : activeFillCount * bouquetObj.hppPerUnit;

  const itemizedCraftPrice = fillPrice + wrapStyleObj.price + addonsPrice + moneySlotPrice;
  const itemizedCraftHpp = fillHpp + wrapStyleObj.hpp + addonsHpp + moneySlotHpp;

  const craftSubtotal = isExactCatalogBundle ? Number(catalogProd.price) : itemizedCraftPrice;
  const craftHpp = isExactCatalogBundle ? Number(catalogProd.hpp) : itemizedCraftHpp;
  const totalPrice = craftSubtotal + moneyCashTotal;
  const hppTotal = craftHpp + moneyCashTotal;

  let recipe = [];
  if (isExactCatalogBundle && Array.isArray(catalogProd.recipe) && catalogProd.recipe.length > 0) {
    const catRecipeMap = {};
    catalogProd.recipe.forEach((r) => {
      if (r && r.invId) {
        catRecipeMap[r.invId] = (catRecipeMap[r.invId] || 0) + Number(r.qty || 0);
      }
    });
    const extraSlots = Math.max(0, moneySlots - Number(catalogProd.preset?.moneySlots || 0));
    if (extraSlots > 0) {
      const mInv = CONFIGURATOR_OPTIONS.moneySlots.invId;
      catRecipeMap[mInv] = (catRecipeMap[mInv] || 0) + extraSlots;
    }
    recipe = Object.entries(catRecipeMap)
      .filter(([, qty]) => qty > 0)
      .map(([invId, qty]) => ({ invId, qty }));
  } else {
    const recipeMap = {
      'INV-04': effectiveFillCount >= 12 ? 5 : 4,
      'INV-05': 1,
      'INV-08': 1,
    };

    if (useCustomSnackList) {
      pickedSnackItems.forEach((sn) => {
        const invKey = sn.invId || inferCustomItemInvId(sn);
        const mult = Number(sn.invQty || 1);
        recipeMap[invKey] = (recipeMap[invKey] || 0) + sn.qty * mult;
      });
    } else if (bouquetObj.id === 'mix') {
      const snackPart = Math.ceil(activeFillCount * 0.5);
      const photoPart = Math.max(2, Math.floor(activeFillCount * 0.3));
      const artPart = Math.max(1, activeFillCount - snackPart - photoPart);
      recipeMap['INV-01'] = (recipeMap['INV-01'] || 0) + snackPart;
      recipeMap['INV-03'] = (recipeMap['INV-03'] || 0) + photoPart;
      recipeMap['INV-02'] = (recipeMap['INV-02'] || 0) + artPart;
    } else if (bouquetObj.invId) {
      recipeMap[bouquetObj.invId] = (recipeMap[bouquetObj.invId] || 0) + activeFillCount;
    }

    CONFIGURATOR_OPTIONS.addons.forEach((ad) => {
      if (activeCfg.addons && activeCfg.addons[ad.id] && ad.invId) {
        recipeMap[ad.invId] = (recipeMap[ad.invId] || 0) + Number(ad.invQty || 1);
      }
    });

    if (moneySlots > 0) {
      const mInv = CONFIGURATOR_OPTIONS.moneySlots.invId;
      recipeMap[mInv] = (recipeMap[mInv] || 0) + moneySlots;
    }

    recipe = Object.entries(recipeMap)
      .filter(([, qty]) => qty > 0)
      .map(([invId, qty]) => ({ invId, qty }));
  }

  const prepMinutes = effectiveFillCount * bouquetObj.prepMinutesPerUnit + 15;

  return {
    isExactCatalogBundle,
    catalogProd,
    bouquetObj,
    flowerObj: bouquetObj,
    wrapStyleObj,
    fillPrice,
    bloomsPrice: fillPrice,
    fillHpp,
    addonsPrice,
    addonsHpp,
    moneySlotPrice,
    moneySlotHpp,
    itemizedCraftPrice,
    itemizedCraftHpp,
    craftSubtotal,
    craftHpp,
    moneyCashTotal,
    totalMoneyBills,
    pickedMoneySleeveQty,
    moneyDenom,
    moneySource,
    totalPrice,
    hppTotal,
    effectiveFillCount,
    satinBlooms: effectiveFillCount,
    fillCount: effectiveFillCount,
    pickedSnackItems,
    pickedSnackCount,
    pickedSnackPrice,
    pickedSnackHpp,
    useCustomSnackList,
    foldMinutes: prepMinutes,
    prepMinutes,
    recipe,
  };
}

function buildConfigSpecSummary(cfg, calc) {
  const activeCfg = cfg || createDefaultConfigState();
  const c = calc || calculateConfigPricing(activeCfg);
  const addonLabels = CONFIGURATOR_OPTIONS.addons
    .filter((a) => activeCfg.addons && activeCfg.addons[a.id])
    .map((a) => a.label);
  const parts = [
    `${c.bouquetObj.label} (${c.fillCount} ${c.bouquetObj.unitLabel} · Tema ${activeCfg.satinColor})`,
    `Wrap: ${activeCfg.wrapColor} (${c.wrapStyleObj.label})`,
    `Pita: ${activeCfg.ribbonColor}`,
  ];
  if (c.totalMoneyBills > 0) {
    const denomText = formatRupiah(c.moneyDenom);
    parts.push(
      `Uang: ${c.totalMoneyBills} lbr ${denomText} (${c.moneySource === 'studio' ? 'Dari Studio' : 'Uang Sendiri'})`
    );
  }
  if (c.useCustomSnackList && c.pickedSnackItems.length) {
    parts.push('Isi Pilihan: ' + c.pickedSnackItems.map((s) => `${s.qty}x ${s.name}`).join(', '));
  }
  if (activeCfg.bouquetType === 'photo' || activeCfg.bouquetType === 'mix') {
    const pStyle = (CONFIGURATOR_OPTIONS.photoStyles || []).find(
      (p) => p.id === normalizePhotoStyleId(activeCfg.photoStyle)
    );
    if (pStyle) parts.push(`Foto: ${pStyle.label}`);
  }
  if (activeCfg.bouquetType === 'artificial' || activeCfg.bouquetType === 'mix') {
    const aType = (CONFIGURATOR_OPTIONS.artificialTypes || []).find(
      (a) => a.id === normalizeArtificialTypeId(activeCfg.artificialType)
    );
    if (aType) parts.push(`Rangkaian Bunga: ${aType.label}`);
  }
  if (addonLabels.length) parts.push(addonLabels.join(' + '));
  if (activeCfg.customFillNote) parts.push(`Isi: ${activeCfg.customFillNote}`);
  return parts.join(' · ');
}

function buildConfigTitle(cfg, calc) {
  const activeCfg = cfg || createDefaultConfigState();
  const c = calc || calculateConfigPricing(activeCfg);
  if (c.isExactCatalogBundle && c.catalogProd) return c.catalogProd.name;
  const prefix = activeCfg.sourceType === 'reference' ? 'Custom Referensi' : 'Custom';
  return `${prefix} ${c.bouquetObj.label} (${c.fillCount} ${c.bouquetObj.unitLabel} · ${activeCfg.satinColor})`;
}

// ---------- SVG Live Custom Bouquet Renderer (Snack, Money, Photo, Artificial, Mix) ----------

let _abSvgUidCounter = 0;

function renderSatinPetalBloom(cx, cy, r, flowerType, colorObj, idx, gradId, shadowId) {
  return `<g filter="url(#${shadowId})">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})" stroke="${colorObj.darkHex}" stroke-width="0.9"/>
    <path d="M${cx - r * 0.85} ${cy - r * 0.12} C${cx - r * 0.6} ${cy - r * 0.82}, ${cx + r * 0.55} ${cy - r * 0.85}, ${cx + r * 0.82} ${cy - r * 0.08}" fill="none" stroke="#FFFFFF" stroke-width="1.4" opacity="0.48" stroke-linecap="round"/>
    <path d="M${cx - r * 0.72} ${cy + r * 0.12} C${cx - r * 0.75} ${cy - r * 0.55}, ${cx + r * 0.52} ${cy - r * 0.65}, ${cx + r * 0.68} ${cy + r * 0.16} C${cx + r * 0.46} ${cy + r * 0.76}, ${cx - r * 0.52} ${cy + r * 0.72}, ${cx - r * 0.72} ${cy + r * 0.12} Z" fill="${colorObj.hex}" stroke="${colorObj.darkHex}" stroke-width="0.9" opacity="0.95"/>
    <path d="M${cx - r * 0.46} ${cy - r * 0.06} C${cx - r * 0.24} ${cy - r * 0.54}, ${cx + r * 0.42} ${cy - r * 0.48}, ${cx + r * 0.46} ${cy + r * 0.04} C${cx + r * 0.3} ${cy + r * 0.48}, ${cx - r * 0.32} ${cy + r * 0.46}, ${cx - r * 0.46} ${cy - r * 0.06} Z" fill="${colorObj.lightHex}" stroke="${colorObj.darkHex}" stroke-width="0.9" opacity="0.92"/>
    <circle cx="${cx}" cy="${cy + 1}" r="${r * 0.21}" fill="${colorObj.darkHex}"/>
  </g>`;
}

function renderSnackItemSvg(x, y, deg, idx, themeColor, shadowId) {
  const palettes = [
    { bg: '#6D3224', accent: '#E8C56E', label: 'CHOCO' },
    { bg: '#C63D33', accent: '#FAF6EE', label: 'WAFER' },
    { bg: themeColor.hex, accent: '#FFFFFF', label: 'SNACK' },
    { bg: '#2B5373', accent: '#F2EBD9', label: 'CRISPY' },
  ];
  const p = palettes[idx % palettes.length];
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})" filter="url(#${shadowId})">
    <rect x="-18" y="-34" width="36" height="62" rx="4" fill="${p.bg}" stroke="#1F1C1B" stroke-opacity="0.25" stroke-width="1"/>
    <rect x="-13" y="-22" width="26" height="14" rx="2" fill="${p.accent}" opacity="0.92"/>
    <text x="0" y="-12" text-anchor="middle" font-family="monospace" font-size="6.5" font-weight="bold" fill="${p.bg}">${p.label}</text>
    <line x1="-12" y1="8" x2="12" y2="8" stroke="${p.accent}" stroke-width="1.5" opacity="0.6"/>
  </g>`;
}

function renderPolaroidItemSvg(x, y, deg, idx, themeColor, shadowId) {
  const tones = [themeColor.hex, '#58705A', '#D48A9A', '#293855'];
  const sky = tones[idx % tones.length];
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})" filter="url(#${shadowId})">
    <rect x="-20" y="-28" width="40" height="50" rx="2" fill="#FFFFFF" stroke="#D8D0C5" stroke-width="1.2"/>
    <rect x="-15" y="-23" width="30" height="30" rx="1" fill="${sky}" opacity="0.25"/>
    <circle cx="-6" cy="-14" r="4" fill="${sky}" opacity="0.85"/>
    <path d="M-15 7 L-5 -3 L3 4 L10 -1 L15 7 Z" fill="${sky}" opacity="0.75"/>
    <line x1="-10" y1="15" x2="10" y2="15" stroke="#B8AEA0" stroke-width="1.5" stroke-linecap="round"/>
  </g>`;
}

function renderMoneySlotSvg(x, y, deg, shadowId) {
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})" filter="url(#${shadowId})">
    <rect x="-15" y="-36" width="30" height="66" rx="2" fill="#E6EFE9" stroke="#2E5940" stroke-width="1.2"/>
    <rect x="-11" y="-31" width="22" height="56" fill="#FAF6EE" stroke="#A7C4B1" stroke-width="0.8"/>
    <text x="0" y="2" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="bold" fill="#2E5940">RP</text>
  </g>`;
}

function renderCustomBouquetSvg(cfg) {
  const activeCfg = cfg || createDefaultConfigState();
  const uid = 'absvg-' + (++_abSvgUidCounter);
  const ids = {
    bloomGrad: `satinBloomGrad-${uid}`,
    wrapBack: `wrapBackGrad-${uid}`,
    wrapFront: `wrapFrontGrad-${uid}`,
    ledWarm: `ledWarmGrad-${uid}`,
    petalShadow: `petalShadow-${uid}`,
    wrapShadow: `wrapShadow-${uid}`,
  };

  const bType = activeCfg.bouquetType || 'snack';
  const colorObj =
    CONFIGURATOR_OPTIONS.satinColors.find((c) => c.id === activeCfg.satinColor) ||
    CONFIGURATOR_OPTIONS.satinColors[0];
  const wrapCol =
    CONFIGURATOR_OPTIONS.wrapColors.find((w) => w.id === activeCfg.wrapColor) ||
    CONFIGURATOR_OPTIONS.wrapColors[0];
  const ribCol =
    CONFIGURATOR_OPTIONS.ribbonColors.find((r) => r.id === activeCfg.ribbonColor) ||
    CONFIGURATOR_OPTIONS.ribbonColors[0];

  const pickedQty =
    activeCfg.selectedSnacks && typeof activeCfg.selectedSnacks === 'object'
      ? Object.values(activeCfg.selectedSnacks).reduce((s, q) => s + Number(q || 0), 0)
      : 0;
  const count =
    (bType === 'snack' || bType === 'mix') && pickedQty > 0
      ? pickedQty
      : Number(activeCfg.fillCount || activeCfg.bloomCount || 10);

  const topWidth = activeCfg.wrapStyle === 'korean' ? 216 : activeCfg.wrapStyle === 'dome' ? 198 : 158;
  const lx = 180 - topWidth / 2;
  const rx = 180 + topWidth / 2;
  const goldTrim = Boolean(activeCfg.addons?.goldTrim);
  const strokeTrim = goldTrim ? '#E0A33A' : wrapCol.border;

  let extraMoneyHtml = '';
  if ((activeCfg.moneySlots || 0) > 0) {
    const bills = Math.min(9, Math.max(4, Math.round(activeCfg.moneySlots / 2)));
    for (let i = 0; i < bills; i++) {
      const ratio = bills === 1 ? 0.5 : i / (bills - 1);
      const deg = -44 + ratio * 88;
      const rad = (deg * Math.PI) / 180;
      const bx = 180 + Math.sin(rad) * 86;
      const by = 142 - Math.cos(rad) * 78;
      extraMoneyHtml += renderMoneySlotSvg(bx, by, deg, ids.petalShadow);
    }
  }

  const visualCount = Math.min(12, Math.max(5, Math.round(count * 0.75)));
  let mainFillHtml = '';
  let stemsHtml = '';

  if (bType === 'artificial') {
    const positions = [];
    const outerN = Math.ceil(count * 0.55);
    const innerN = count - outerN;
    for (let i = 0; i < outerN; i++) {
      const angle = (-64 + (i / Math.max(1, outerN - 1)) * 128) * (Math.PI / 180);
      positions.push({ x: 180 + Math.sin(angle) * 68, y: 152 - Math.cos(angle) * 44, r: count >= 15 ? 18 : 21 });
    }
    for (let j = 0; j < innerN; j++) {
      const ratio = innerN === 1 ? 0.5 : j / (innerN - 1);
      const angle = (-44 + ratio * 88) * (Math.PI / 180);
      const ringR = innerN === 1 ? 0 : 34;
      positions.push({ x: 180 + Math.sin(angle) * ringR, y: 155 - Math.cos(angle) * 20, r: count >= 15 ? 19 : 22 });
    }
    stemsHtml = positions
      .map(
        (pt) =>
          `<line x1="${pt.x.toFixed(1)}" y1="${(pt.y + pt.r * 0.6).toFixed(1)}" x2="180" y2="274" stroke="#2E5940" stroke-width="2.4" opacity="0.72"/>`
      )
      .join('');
    mainFillHtml = positions
      .map((pt, idx) =>
        renderSatinPetalBloom(
          Number(pt.x.toFixed(1)),
          Number(pt.y.toFixed(1)),
          pt.r,
          'artificial',
          colorObj,
          idx,
          ids.bloomGrad,
          ids.petalShadow
        )
      )
      .join('');
  } else {
    for (let i = 0; i < visualCount; i++) {
      const ratio = visualCount === 1 ? 0.5 : i / (visualCount - 1);
      const deg = -48 + ratio * 96;
      const rad = (deg * Math.PI) / 180;
      const rowOffset = i % 2 === 0 ? 0 : 18;
      const bx = 180 + Math.sin(rad) * (66 - rowOffset * 0.4);
      const by = 152 - Math.cos(rad) * (54 - rowOffset);
      stemsHtml += `<line x1="${bx.toFixed(1)}" y1="${(by + 16).toFixed(1)}" x2="180" y2="274" stroke="#8E7B64" stroke-width="2" opacity="0.65"/>`;

      if (bType === 'money') {
        mainFillHtml += renderMoneySlotSvg(bx, by, deg * 0.7, ids.petalShadow);
      } else if (bType === 'photo') {
        mainFillHtml += renderPolaroidItemSvg(bx, by, deg * 0.65, i, colorObj, ids.petalShadow);
      } else if (bType === 'snack') {
        mainFillHtml += renderSnackItemSvg(bx, by, deg * 0.6, i, colorObj, ids.petalShadow);
      } else {
        if (i % 3 === 0) mainFillHtml += renderSnackItemSvg(bx, by, deg * 0.55, i, colorObj, ids.petalShadow);
        else if (i % 3 === 1) mainFillHtml += renderPolaroidItemSvg(bx, by, deg * 0.6, i, colorObj, ids.petalShadow);
        else
          mainFillHtml += renderSatinPetalBloom(
            Number(bx.toFixed(1)),
            Number(by.toFixed(1)),
            19,
            'artificial',
            colorObj,
            i,
            ids.bloomGrad,
            ids.petalShadow
          );
      }
    }
  }

  let accentHtml = '';
  if (activeCfg.addons?.photoPrint && bType !== 'photo') {
    accentHtml +=
      renderPolaroidItemSvg(134, 152, -16, 0, colorObj, ids.petalShadow) +
      renderPolaroidItemSvg(226, 152, 16, 1, colorObj, ids.petalShadow);
  }
  if (activeCfg.addons?.artificialAccent && bType !== 'artificial') {
    accentHtml +=
      renderSatinPetalBloom(126, 178, 17, 'artificial', colorObj, 0, ids.bloomGrad, ids.petalShadow) +
      renderSatinPetalBloom(234, 178, 17, 'artificial', colorObj, 1, ids.bloomGrad, ids.petalShadow) +
      renderSatinPetalBloom(180, 192, 18, 'artificial', colorObj, 2, ids.bloomGrad, ids.petalShadow);
  }

  const foliageHtml = `
    <ellipse cx="114" cy="146" rx="18" ry="8" transform="rotate(-35 114 146)" fill="#58705A"/>
    <ellipse cx="246" cy="146" rx="18" ry="8" transform="rotate(35 246 146)" fill="#58705A"/>
  `;

  const dollHtml = activeCfg.addons?.doll
    ? `<g transform="translate(180, 174)" filter="url(#${ids.petalShadow})">
        <circle cx="-13" cy="-16" r="6" fill="#C99A6B" stroke="#7A5C49"/>
        <circle cx="13" cy="-16" r="6" fill="#C99A6B" stroke="#7A5C49"/>
        <circle cx="0" cy="-6" r="15" fill="#DFB68C" stroke="#7A5C49" stroke-width="1.2"/>
        <polygon points="-19,-18 0,-26 19,-18 0,-11" fill="#1F1C1B"/>
        <circle cx="-5" cy="-7" r="1.8" fill="#1F1C1B"/><circle cx="5" cy="-7" r="1.8" fill="#1F1C1B"/>
        <ellipse cx="0" cy="-2" rx="5" ry="3.5" fill="#FAF6EE"/><circle cx="0" cy="-3" r="1.6" fill="#1F1C1B"/>
        <ellipse cx="0" cy="16" rx="15" ry="13" fill="#1F1C1B"/>
        <path d="M-8 6 L0 17 L8 6" fill="#B85D38"/>
      </g>`
    : '';

  const ledHtml = activeCfg.addons?.led
    ? `<g class="led-warm-pulse">
        <circle cx="180" cy="144" r="102" fill="url(#${ids.ledWarm})"/>
        <circle cx="118" cy="134" r="3.5" fill="#FFE79B"/><circle cx="148" cy="104" r="3.5" fill="#FFE79B"/>
        <circle cx="212" cy="104" r="3.5" fill="#FFE79B"/><circle cx="242" cy="134" r="3.5" fill="#FFE79B"/>
        <circle cx="146" cy="176" r="3.2" fill="#FFE79B"/><circle cx="214" cy="176" r="3.2" fill="#FFE79B"/>
      </g>`
    : '';

  const bObj = CONFIGURATOR_OPTIONS.bouquetTypes.find((b) => b.id === bType) || CONFIGURATOR_OPTIONS.bouquetTypes[0];

  return `
    <svg viewBox="0 0 360 390" class="w-full max-w-[320px] h-auto" aria-label="Pratinjau Buket Custom">
      <defs>
        <radialGradient id="${ids.bloomGrad}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${colorObj.lightHex}"/>
          <stop offset="56%" stop-color="${colorObj.hex}"/>
          <stop offset="100%" stop-color="${colorObj.darkHex}"/>
        </radialGradient>
        <linearGradient id="${ids.wrapBack}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${wrapCol.hex}"/>
          <stop offset="100%" stop-color="${wrapCol.foldHex}"/>
        </linearGradient>
        <linearGradient id="${ids.wrapFront}" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="${wrapCol.hex}"/>
          <stop offset="65%" stop-color="${wrapCol.foldHex}"/>
          <stop offset="100%" stop-color="${wrapCol.border}"/>
        </linearGradient>
        <radialGradient id="${ids.ledWarm}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFE082" stop-opacity="0.58"/>
          <stop offset="60%" stop-color="#FFD54F" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#FFD54F" stop-opacity="0"/>
        </radialGradient>
        <filter id="${ids.petalShadow}" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#1F1C1B" flood-opacity="0.18"/>
        </filter>
        <filter id="${ids.wrapShadow}" x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#1F1C1B" flood-opacity="0.14"/>
        </filter>
      </defs>

      <ellipse cx="180" cy="356" rx="54" ry="8" fill="#1F1C1B" opacity="0.08"/>

      <g filter="url(#${ids.wrapShadow})">
        <polygon points="${lx},134 180,62 ${rx},134 214,270 146,270" fill="url(#${ids.wrapBack})" stroke="${strokeTrim}" stroke-width="${goldTrim ? 2.4 : 1.4}"/>
        ${
          activeCfg.wrapStyle === 'korean'
            ? `
          <polygon points="${lx - 22},156 140,104 180,148 164,268 144,268" fill="${wrapCol.hex}" stroke="${strokeTrim}" stroke-width="${goldTrim ? 2 : 1.2}" opacity="0.95"/>
          <polygon points="${rx + 22},156 220,104 180,148 196,268 216,268" fill="${wrapCol.hex}" stroke="${strokeTrim}" stroke-width="${goldTrim ? 2 : 1.2}" opacity="0.95"/>
        `
            : ''
        }
      </g>

      ${extraMoneyHtml}
      ${foliageHtml}
      ${stemsHtml}
      ${mainFillHtml}
      ${accentHtml}
      ${dollHtml}
      ${ledHtml}

      <g filter="url(#${ids.petalShadow})">
        <polygon points="${lx + 14},202 180,234 ${rx - 14},202 206,274 154,274" fill="url(#${ids.wrapFront})" stroke="${strokeTrim}" stroke-width="${goldTrim ? 2.2 : 1.4}"/>
        <line x1="180" y1="234" x2="180" y2="274" stroke="${wrapCol.border}" stroke-width="0.9" opacity="0.45"/>
        <polygon points="154,274 206,274 196,340 164,340" fill="${wrapCol.foldHex}" stroke="${strokeTrim}" stroke-width="1.4"/>
      </g>

      <g filter="url(#${ids.petalShadow})">
        <path d="M172 277 C160 296, 152 316, 148 326 L164 318 L176 280 Z" fill="${ribCol.hex}"/>
        <path d="M188 277 C200 296, 208 316, 212 326 L196 318 L184 280 Z" fill="${ribCol.hex}"/>
        <path d="M180 272 C142 250, 126 278, 166 281 Z" fill="${ribCol.hex}"/>
        <path d="M180 272 C218 250, 234 278, 194 281 Z" fill="${ribCol.hex}"/>
        <rect x="148" y="267" width="64" height="10" rx="3" fill="${ribCol.hex}"/>
        <rect x="173" y="264" width="14" height="15" rx="3" fill="${ribCol.hex}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.9"/>
      </g>

      <text x="180" y="376" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#6A625B">${escapeHtml(bObj.shortLabel)} · ${count} ${escapeHtml(bObj.unitLabel)} · ${escapeHtml(activeCfg.satinColor || '')}</text>
    </svg>
  `;
}

function renderBouquetPhotoPreview(cfg, imgClass = 'w-full max-h-[300px] object-cover rounded-2xl shadow-sm') {
  const activeCfg = cfg || createDefaultConfigState();
  const bObj =
    CONFIGURATOR_OPTIONS.bouquetTypes.find((b) => b.id === activeCfg.bouquetType) ||
    CONFIGURATOR_OPTIONS.bouquetTypes[0];
  const src = activeCfg.referenceImage || bObj.image || FALLBACK_IMAGE;
  return `<img src="${escapeHtml(src)}" onerror="handleImgError(this)" alt="${escapeHtml(bObj.label)}" class="${imgClass}" />`;
}

function renderSatinBouquetSvg(cfg) {
  return renderCustomBouquetSvg(cfg);
}

// ---------- Auto-BOM Inventory & Financial Helpers ----------

function deductInventoryByRecipe(order) {
  if (!order || order.stockDeducted) return false;
  const inventory = getInventory();
  const logs = getStockLogs();
  const needed = {};

  (order.items || []).forEach((item) => {
    const qtyMult = Number(item.qty || 1);
    (item.recipe || []).forEach((r) => {
      if (r && r.invId) {
        needed[r.invId] = (needed[r.invId] || 0) + Number(r.qty || 0) * qtyMult;
      }
    });
  });

  Object.entries(needed).forEach(([invId, deductQty]) => {
    if (deductQty <= 0) return;
    const item = inventory.find((i) => i.id === invId);
    if (item) {
      item.qty = Math.max(0, Number(item.qty || 0) - deductQty);
      logs.unshift({
        id: 'LOG-' + Date.now() + '-' + invId,
        timestamp: new Date().toISOString(),
        invId: item.id,
        itemName: item.name,
        type: 'KELUAR (PRODUKSI)',
        delta: -deductQty,
        ref: order.id,
        note: `Auto-BOM order ${order.customerName || '-'} (${order.status || '-'})`,
      });
    }
  });

  const saved = saveInventory(inventory);
  if (saved) {
    saveStockLogs(logs.slice(0, 120));
    order.stockDeducted = true;
    return true;
  }
  return false;
}

function restoreInventoryByRecipe(order) {
  if (!order || !order.stockDeducted) return false;
  const inventory = getInventory();
  const logs = getStockLogs();
  const restoreMap = {};

  (order.items || []).forEach((item) => {
    const qtyMult = Number(item.qty || 1);
    (item.recipe || []).forEach((r) => {
      if (r && r.invId) {
        restoreMap[r.invId] = (restoreMap[r.invId] || 0) + Number(r.qty || 0) * qtyMult;
      }
    });
  });

  Object.entries(restoreMap).forEach(([invId, restoreQty]) => {
    if (restoreQty <= 0) return;
    const item = inventory.find((i) => i.id === invId);
    if (item) {
      item.qty = Number(item.qty || 0) + restoreQty;
      logs.unshift({
        id: 'LOG-' + Date.now() + '-R-' + invId,
        timestamp: new Date().toISOString(),
        invId: item.id,
        itemName: item.name,
        type: 'MASUK (BATAL/RETUR)',
        delta: restoreQty,
        ref: order.id,
        note: `Pengembalian stok Auto-BOM order ${order.customerName || '-'} (${order.status || 'Dibatalkan'})`,
      });
    }
  });

  const saved = saveInventory(inventory);
  if (saved) {
    saveStockLogs(logs.slice(0, 120));
    order.stockDeducted = false;
    return true;
  }
  return false;
}

function getOrderPassThroughCash(order) {
  if (!order || typeof order !== 'object') return 0;
  if (order.moneyCashTotal !== undefined && order.moneyCashTotal !== null) {
    return Math.max(0, Number(order.moneyCashTotal) || 0);
  }
  if (Array.isArray(order.items) && order.items.length > 0) {
    let sum = 0;
    order.items.forEach((it) => {
      if (!it) return;
      const mult = Number(it.qty || 1);
      if (it.moneyCashTotal !== undefined && it.moneyCashTotal !== null) {
        sum += Math.max(0, Number(it.moneyCashTotal) || 0) * mult;
      } else if (it.config) {
        sum += Math.max(0, Number(calculateConfigPricing(it.config).moneyCashTotal) || 0) * mult;
      }
    });
    return sum;
  }
  return 0;
}

function getOrderStudioRevenue(order) {
  if (!order) return 0;
  const total = Math.max(0, Number(order.totalPrice || 0));
  const shipping = Math.max(0, Number(order.shippingFee || 0));
  const passThrough = getOrderPassThroughCash(order);
  return Math.max(0, total - shipping - passThrough);
}

function getOrderStudioCogs(order) {
  if (!order) return 0;
  if (order.craftHpp !== undefined && order.craftHpp !== null) {
    return Math.max(0, Number(order.craftHpp) || 0);
  }
  const rawHpp = Math.max(0, Number(order.hppTotal || 0));
  const passThrough = getOrderPassThroughCash(order);
  return rawHpp >= passThrough ? rawHpp - passThrough : rawHpp;
}

function computeFinancialMetrics() {
  const nonCancelled = getOrders().filter((o) => o && o.status !== 'Dibatalkan');
  const isPaid = (o) => o.paymentStatus === 'Lunas' || o.midtransPaid === true;

  const paidOrders = nonCancelled.filter(isPaid);
  const pendingOrders = nonCancelled.filter((o) => !isPaid(o));

  const totalCollected = paidOrders.reduce((s, o) => s + Math.max(0, Number(o.totalPrice || 0)), 0);
  const grossRevenue = paidOrders.reduce((s, o) => s + getOrderStudioRevenue(o), 0);
  const cogsTotal = paidOrders.reduce((s, o) => s + getOrderStudioCogs(o), 0);
  const pendingRevenue = pendingOrders.reduce((s, o) => s + getOrderStudioRevenue(o), 0);

  const expenses = getExpenses();
  const restockExpenseTotal = expenses
    .filter((e) => e && e.category === 'Restock Bahan Baku')
    .reduce((s, e) => s + Math.max(0, Number(e.amount || 0)), 0);
  const opexTotal = expenses
    .filter((e) => e && e.category !== 'Restock Bahan Baku')
    .reduce((s, e) => s + Math.max(0, Number(e.amount || 0)), 0);
  const expenseTotal = opexTotal + restockExpenseTotal;

  const netProfit = grossRevenue - cogsTotal - opexTotal;
  const avgMargin = grossRevenue > 0 ? Math.round(((grossRevenue - cogsTotal) / grossRevenue) * 100) : 0;

  return {
    validOrders: paidOrders,
    paidOrders,
    pendingOrders,
    pendingRevenue,
    totalCollected,
    grossRevenue,
    cogsTotal,
    opexTotal,
    restockExpenseTotal,
    expenseTotal,
    netProfit,
    avgMargin,
  };
}

// ---------- Print Modals (Receipt & Greeting Card A6) & Global Modal UX ----------

const GLOBAL_MODAL_IDS = [
  'receipt-modal',
  'greeting-card-modal',
  'offer-modal',
  'stock-action-modal',
  'product-modal',
  'custom-item-modal',
  'image-preview-modal',
];

function bindGlobalModalUx() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  GLOBAL_MODAL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (!el.getAttribute('role')) el.setAttribute('role', 'dialog');
      if (!el.getAttribute('aria-modal')) el.setAttribute('aria-modal', 'true');
    }
  });

  if (window._abGlobalModalUxBound) return;
  window._abGlobalModalUxBound = true;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModals = GLOBAL_MODAL_IDS.map((id) => document.getElementById(id)).filter(
      (el) => el && !el.classList.contains('hidden')
    );
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      topModal.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.id && GLOBAL_MODAL_IDS.includes(target.id)) {
      target.classList.add('hidden');
    }
  });
}

function ensureGlobalModals() {
  if (typeof document === 'undefined' || !document.body) return;
  if (!document.getElementById('receipt-modal')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="receipt-modal" role="dialog" aria-modal="true" aria-label="Nota Pesanan Azzatul Bouquet" class="fixed inset-0 z-50 hidden bg-[#1F1C1B]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white border border-[#E6DDD0] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
          <div class="no-print flex items-center justify-between pb-3 mb-4 border-b border-[#E6DDD0]">
            <span class="text-xs font-semibold text-[#6A625B]">Nota Pesanan Azzatul Bouquet</span>
            <button type="button" onclick="closeReceiptModal()" class="btn-outline w-8 h-8 inline-flex items-center justify-center cursor-pointer" aria-label="Tutup Nota">
              <i class="ph ph-x text-sm"></i>
            </button>
          </div>
          <div id="receipt-content"></div>
        </div>
      </div>

      <div id="greeting-card-modal" role="dialog" aria-modal="true" aria-label="Pratinjau Kartu Ucapan" class="fixed inset-0 z-50 hidden bg-[#1F1C1B]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white border border-[#E6DDD0] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-xl">
          <div class="no-print flex items-center justify-between pb-4 mb-5 border-b border-[#E6DDD0]">
            <div>
              <p class="text-[11px] text-[#B85D38] font-medium">Format A6 Siap Gunting</p>
              <h3 class="font-display text-2xl font-bold text-[#1F1C1B]">Pratinjau Kartu Ucapan</h3>
            </div>
            <button type="button" onclick="closeGreetingCardPrintModal()" class="btn-outline w-8 h-8 inline-flex items-center justify-center cursor-pointer" aria-label="Tutup Kartu">
              <i class="ph ph-x text-sm"></i>
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div class="no-print md:col-span-5 space-y-3 text-xs">
              <input type="hidden" id="print-card-order-id" />
              <div>
                <label class="block font-medium text-[#1F1C1B] mb-1">Tema Kartu</label>
                <select id="print-card-theme" onchange="updatePrintCardPreview()" class="w-full px-3 py-2 border border-[#D5CEC2] rounded-xl bg-white">
                  <option value="ivory">Warm Ivory</option>
                  <option value="blush">Soft Rose</option>
                  <option value="noir">Noir Gold</option>
                  <option value="mono">Clean White</option>
                </select>
              </div>
              <div>
                <label class="block font-medium text-[#1F1C1B] mb-1">Kepada</label>
                <input id="print-card-to" type="text" oninput="updatePrintCardPreview()" class="w-full px-3 py-2 border border-[#D5CEC2] rounded-xl" />
              </div>
              <div>
                <label class="block font-medium text-[#1F1C1B] mb-1">Isi Ucapan</label>
                <textarea id="print-card-message" rows="3" oninput="updatePrintCardPreview()" class="w-full px-3 py-2 border border-[#D5CEC2] rounded-xl"></textarea>
              </div>
              <div>
                <label class="block font-medium text-[#1F1C1B] mb-1">Dari</label>
                <input id="print-card-from" type="text" oninput="updatePrintCardPreview()" class="w-full px-3 py-2 border border-[#D5CEC2] rounded-xl" />
              </div>
              <button type="button" onclick="markCardPrintedAndPrint()" class="btn-accent w-full py-2.5 px-4 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-2">
                <i class="ph ph-printer text-sm"></i><span>Cetak Kartu Ucapan</span>
              </button>
            </div>
            <div class="md:col-span-7">
              <div class="p-3 border-2 border-dashed border-[#B8AEA0] bg-[#FAF6EE]">
                <div id="printable-greeting-card"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }
  bindGlobalModalUx();
}

function triggerPrintMode(modeClass) {
  const cls =
    modeClass === 'card' || modeClass === 'print-mode-card'
      ? 'print-mode-card'
      : modeClass === 'receipt' || modeClass === 'print-mode-receipt'
      ? 'print-mode-receipt'
      : String(modeClass || 'print-mode-receipt');

  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('print-mode-receipt', 'print-mode-card');
    document.body.classList.add(cls);
  }

  let cleaned = false;
  let fallbackTimer = null;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('print-mode-receipt', 'print-mode-card', cls);
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('afterprint', cleanup);
    }
  };

  if (typeof window !== 'undefined') {
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('afterprint', cleanup, { once: true });
    }
    fallbackTimer = setTimeout(cleanup, 60000);
    if (typeof window.print === 'function') {
      window.print();
    }
  } else {
    cleanup();
  }
}

function findOrderWithInvoiceFallback(orderId) {
  if (!orderId) return null;
  const fromOrders = getOrders().find((o) => o && o.id === orderId);
  if (fromOrders) return fromOrders;
  const activeInv = safeReadStorage(STORAGE_KEYS.ACTIVE_INVOICE, null);
  if (activeInv && typeof activeInv === 'object' && activeInv.id === orderId) {
    return activeInv;
  }
  return null;
}

function openReceiptModal(orderId) {
  ensureGlobalModals();
  const order = findOrderWithInvoiceFallback(orderId);
  const modal = document.getElementById('receipt-modal');
  const body = document.getElementById('receipt-content');
  if (!order || !modal || !body) return;

  const totalTagihan = Number(order.totalPrice || 0);
  const isPaid = order.paymentStatus === 'Lunas' || order.midtransPaid === true;
  const actualPaid = isPaid ? totalTagihan : 0;
  const remainingDue = Math.max(0, totalTagihan - actualPaid);
  const timeSuffixHtml = order.pickupTime ? ' · ' + escapeHtml(order.pickupTime) + ' WIB' : '';
  const timeSuffixWa = order.pickupTime ? ` ${order.pickupTime} WIB` : '';
  const itemsList = Array.isArray(order.items) ? order.items : [];

  const waText = encodeURIComponent(
    `Halo Azzatul Bouquet, konfirmasi pesanan ${order.id} a/n ${order.customerName || '-'}. Jadwal: ${order.pickupDate || '-'}${timeSuffixWa}. Total: ${formatRupiah(totalTagihan)}.`
  );

  body.innerHTML = `
    <div id="printable-receipt" class="space-y-4 text-xs">
      <div class="flex items-start justify-between border-b border-dashed border-[#D5CEC2] pb-4">
        <div>
          <h3 class="font-display text-2xl font-bold text-[#1F1C1B]">AZZATUL BOUQUET</h3>
          <p class="text-[#6A625B]">${escapeHtml(PAYMENT_ACCOUNTS.studioAddress)} · WA ${escapeHtml(PAYMENT_ACCOUNTS.studioWaDisplay)}</p>
        </div>
        <div class="text-right space-y-1">
          <p class="font-mono font-bold text-[#B85D38]">${escapeHtml(order.id)}</p>
          <span class="inline-block px-2 py-0.5 rounded-xl text-[10px] font-medium ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status || '-')}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 bg-[#FAF6EE] p-3 border border-[#E6DDD0] rounded-xl">
        <div>
          <p class="text-[#6A625B]">Pemesan</p>
          <p class="font-semibold text-[#1F1C1B]">${escapeHtml(order.customerName || '-')}</p>
          <p class="font-mono text-[#6A625B]">${escapeHtml(order.customerPhone || '-')}</p>
        </div>
        <div>
          <p class="text-[#6A625B]">Jadwal &amp; Pengiriman</p>
          <p class="font-semibold text-[#1F1C1B]">${escapeHtml(order.pickupDate || '-')}${timeSuffixHtml}</p>
          <p class="text-[#6A625B] truncate">${escapeHtml(order.address || '-')}</p>
        </div>
      </div>

      <div class="space-y-2 border-b border-dashed border-[#D5CEC2] pb-3">
        ${itemsList
          .map(
            (item) => `<div class="flex justify-between gap-3">
            <div><p class="font-semibold text-[#1F1C1B]">${Number(item.qty || 1)}x ${escapeHtml(item.name || 'Buket Custom')}</p><p class="text-[11px] text-[#6A625B]">${escapeHtml(item.specText || '')}</p></div>
            <span class="font-mono font-semibold text-[#1F1C1B] whitespace-nowrap">${formatRupiah(Number(item.price || 0) * Number(item.qty || 1))}</span>
          </div>`
          )
          .join('')}
      </div>

      <div class="space-y-1 border-b border-dashed border-[#D5CEC2] pb-3">
        <div class="flex justify-between text-[#6A625B]"><span>Subtotal</span><span class="font-mono">${formatRupiah(order.subtotal || totalTagihan)}</span></div>
        ${order.discountAmount > 0 ? `<div class="flex justify-between text-[#2E5940]"><span>Diskon (${escapeHtml(order.voucherCode)})</span><span class="font-mono">-${formatRupiah(order.discountAmount)}</span></div>` : ''}
        <div class="flex justify-between text-[#6A625B]"><span>Ongkos Kirim</span><span class="font-mono">${order.shippingFee > 0 ? formatRupiah(order.shippingFee) : 'Gratis'}</span></div>
        <div class="flex justify-between text-sm font-semibold text-[#1F1C1B] pt-1"><span>Total Tagihan</span><span class="font-mono">${formatRupiah(totalTagihan)}</span></div>
        <div class="flex justify-between pt-1">
          <span class="text-[#6A625B]">Pembayaran (${escapeHtml(order.paymentMethod || 'QRIS')})</span>
          <span class="font-mono font-semibold text-[#1F1C1B]">${escapeHtml(isPaid ? 'Lunas' : order.paymentStatus || 'Menunggu Verifikasi')}${remainingDue > 0 ? ` (Sisa ${formatRupiah(remainingDue)})` : ''}</span>
        </div>
      </div>

      <div class="p-3.5 border border-dashed border-[#B8AEA0] bg-[#FAF6EE] rounded-xl">
        <p class="font-semibold text-[#1F1C1B]">Kepada: ${escapeHtml(order.greetingCardObj?.to || order.customerName || '-')}</p>
        <p class="italic text-[#6A625B] my-1">"${escapeHtml(order.greetingCard || '-')}"</p>
        <p class="text-right font-medium text-[#1F1C1B]">Dari: ${escapeHtml(order.greetingCardObj?.from || 'Pengirim')}</p>
      </div>
    </div>

    <div class="no-print pt-4 mt-4 border-t border-[#E6DDD0] flex flex-wrap gap-2 justify-end">
      <a href="https://wa.me/${PAYMENT_ACCOUNTS.studioWaNumber}?text=${waText}" target="_blank" rel="noopener noreferrer" class="btn-outline px-3.5 py-2 text-xs font-semibold text-[#2E5940] border-[#2E5940] inline-flex items-center gap-1"><i class="ph ph-whatsapp-logo"></i><span>Kirim WA</span></a>
      <button type="button" onclick="triggerPrintMode('receipt')" class="btn-primary px-4 py-2 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"><i class="ph ph-printer"></i><span>Cetak Nota</span></button>
    </div>
  `;
  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('receipt-modal')?.classList.add('hidden');
}

function openGreetingCardPrintModal(orderId) {
  ensureGlobalModals();
  const order = findOrderWithInvoiceFallback(orderId);
  const modal = document.getElementById('greeting-card-modal');
  if (!order || !modal) return;

  const card = order.greetingCardObj || {};
  const themeSelect = document.getElementById('print-card-theme');
  document.getElementById('print-card-order-id').value = order.id;
  if (themeSelect) {
    themeSelect.value = CONFIGURATOR_OPTIONS.cardThemes.some((t) => t.id === card.theme) ? card.theme : 'ivory';
  }
  document.getElementById('print-card-to').value = card.to || order.customerName || '';
  document.getElementById('print-card-from').value = card.from || 'Pengirim';
  document.getElementById('print-card-message').value = card.message || order.greetingCard || '';

  updatePrintCardPreview();
  modal.classList.remove('hidden');
}

function closeGreetingCardPrintModal() {
  document.getElementById('greeting-card-modal')?.classList.add('hidden');
}

function updatePrintCardPreview() {
  const wrap = document.getElementById('printable-greeting-card');
  if (!wrap) return;
  const orderId = document.getElementById('print-card-order-id')?.value || '';
  const themeId = document.getElementById('print-card-theme')?.value || 'ivory';
  const toVal = document.getElementById('print-card-to')?.value || 'Penerima Spesial';
  const fromVal = document.getElementById('print-card-from')?.value || 'Pengirim';
  const msgVal = document.getElementById('print-card-message')?.value || '';
  const th = CONFIGURATOR_OPTIONS.cardThemes.find((t) => t.id === themeId) || CONFIGURATOR_OPTIONS.cardThemes[0];

  wrap.innerHTML = `
    <div style="background:${th.bg}; color:${th.text}; border-color:${th.border};" class="border p-8 min-h-[260px] flex flex-col justify-between text-center">
      <div class="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest opacity-65">
        <span>Azzatul Bouquet</span>
        <span>${escapeHtml(orderId)}</span>
      </div>
      <div class="space-y-3 my-4">
        <p class="font-mono text-[11px] uppercase tracking-wider font-semibold">Kepada: ${escapeHtml(toVal)}</p>
        <p class="font-display italic text-2xl leading-snug px-2">"${escapeHtml(msgVal || 'Selamat & berbahagia selalu.')}"</p>
      </div>
      <div class="flex items-center justify-between pt-3 border-t border-current/20 text-xs">
        <span class="font-mono text-[10px] opacity-65">Custom Bouquet Studio</span>
        <span class="font-semibold">Dari: ${escapeHtml(fromVal)}</span>
      </div>
    </div>
  `;
}

function markCardPrintedAndPrint() {
  const orderId = document.getElementById('print-card-order-id')?.value;
  if (!orderId) return;
  const theme = document.getElementById('print-card-theme')?.value || 'ivory';
  const to = document.getElementById('print-card-to')?.value.trim() || 'Penerima';
  const from = document.getElementById('print-card-from')?.value.trim() || 'Pengirim';
  const message = document.getElementById('print-card-message')?.value.trim() || '';

  const orders = getOrders();
  const target = orders.find((o) => o.id === orderId);
  if (target) {
    target.greetingCard = message || target.greetingCard;
    target.greetingCardObj = { theme, to, message, from };
    if (!target.checklist) target.checklist = { stemPrep: false, wrapping: false, cardPrint: false, qualityCheck: false };
    target.checklist.cardPrint = true;
    saveOrders(orders);
    if (typeof window.onGreetingCardUpdated === 'function') {
      window.onGreetingCardUpdated(orderId);
    }
  }

  updatePrintCardPreview();
  showToast(`Kartu ucapan A6 ${orderId} siap dicetak.`, 'success');
  triggerPrintMode('card');
}

// ---------- Minimalist Storefront Navbar & Footer ----------

function renderNavbar(activePage = 'home', transparentOnHero = false) {
  const target = document.getElementById('site-navbar');
  if (!target) return;

  const headerModeClass = transparentOnHero ? 'nav-overlay' : 'nav-scrolled';

  target.innerHTML = `
    <header id="main-site-header" class="site-header h-16 ${headerModeClass} no-print">
      <div class="max-w-6xl mx-auto h-full px-5 sm:px-8 flex items-center justify-between gap-4">
        <a href="index.html" class="font-display text-2xl font-normal tracking-tight shrink-0">
          Azzatul Bouquet<span class="text-[#E0A33A]">.</span>
        </a>
        <nav class="flex items-center gap-2 sm:gap-5 text-xs font-semibold">
          ${
            activePage === 'customize' || activePage === 'checkout'
              ? `<a href="index.html" class="px-3 py-1.5 rounded-full hover:bg-[#F3ECE0] text-[#6A625B] hover:text-[#1F1C1B] inline-flex items-center gap-1.5 transition"><i class="ph ph-arrow-left"></i><span>Beranda</span></a>`
              : `<a href="index.html" class="px-3 py-1.5 rounded-full hover:bg-[#F3ECE0] transition ${activePage === 'home' ? 'text-[#B85D38]' : ''}">Beranda</a>
          <a href="customize.html" class="px-3 py-1.5 rounded-full hover:bg-[#F3ECE0] transition">Katalog &amp; Custom</a>
          <a href="customize.html?step=2" class="btn-accent px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <span>Mulai Rangkai</span><i class="ph ph-arrow-right"></i>
          </a>`
          }
        </nav>
      </div>
      <div id="scroll-progress-bar"></div>
    </header>
    ${transparentOnHero ? '' : '<div class="h-16 no-print"></div>'}
  `;

  if (typeof window !== 'undefined') {
    window._abNavTransparentOnHero = Boolean(transparentOnHero);
    const syncNavScrollState = () => {
      const hdr = document.getElementById('main-site-header');
      if (!hdr || !window._abNavTransparentOnHero) return;
      if (window.scrollY > 40) {
        hdr.classList.remove('nav-overlay');
        hdr.classList.add('nav-scrolled');
      } else {
        hdr.classList.add('nav-overlay');
        hdr.classList.remove('nav-scrolled');
      }
    };
    if (!window._abNavScrollBound) {
      window._abNavScrollBound = true;
      window.addEventListener('scroll', syncNavScrollState, { passive: true });
    }
    syncNavScrollState();
  }
}

function renderFooter() {
  const target = document.getElementById('site-footer');
  if (!target) return;

  target.innerHTML = `
    <footer class="bg-[#FAF6EE] border-t border-[#E6DDD0] mt-20 no-print">
      <div class="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div class="space-y-1.5">
          <p class="font-display text-2xl font-bold tracking-wide text-[#1F1C1B]">AZZATUL BOUQUET</p>
          <p class="text-xs text-[#6A625B]">${escapeHtml(PAYMENT_ACCOUNTS.studioAddress)} · WhatsApp ${escapeHtml(PAYMENT_ACCOUNTS.studioWaDisplay)}</p>
        </div>

        <nav class="flex flex-wrap items-center gap-6 text-xs font-medium text-[#6A625B]">
          <a href="index.html" class="hover:text-[#1F1C1B] transition">Beranda</a>
          <a href="customize.html" class="hover:text-[#1F1C1B] transition">Buat Buket</a>
          <a href="checkout.html" class="hover:text-[#1F1C1B] transition">Pembayaran</a>
        </nav>
      </div>
      <div class="border-t border-[#E6DDD0] py-4 px-5 sm:px-8">
        <div class="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-[#5F5850]">
          <span>Azzatul Bouquet · Toko Buket Custom (Snack, Uang, Foto &amp; Rangkaian Bunga)</span>
          <a href="admin.html" class="hover:text-[#1F1C1B] transition">Kelola Toko</a>
        </div>
      </div>
    </footer>
  `;
}

function replayAnimation(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function initRevealObserver() {
  if (typeof document === 'undefined') return;
  const els = document.querySelectorAll('.reveal-block, .reveal-scale, .photo-reveal, .stagger-item');
  if (!els.length) return;
  if (typeof IntersectionObserver === 'undefined') {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
  );
  els.forEach((el) => obs.observe(el));
}

function initScrollEffects() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._abScrollEffectsBound) return;
  window._abScrollEffectsBound = true;

  let ticking = false;
  const update = () => {
    ticking = false;
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    const bar = document.getElementById('scroll-progress-bar');
    if (bar) {
      bar.style.width = `${Math.min(100, Math.round((scrollTop / maxScroll) * 1000) / 10)}%`;
    }
    const parallaxWrap = document.getElementById('hero-parallax-wrap');
    if (parallaxWrap && scrollTop < window.innerHeight * 1.2) {
      parallaxWrap.style.transform = `translate3d(0, ${(scrollTop * 0.16).toFixed(1)}px, 0)`;
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        if (typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(update);
        } else {
          update();
        }
      }
    },
    { passive: true }
  );
  update();
}

function bootstrapSharedPage(activePage, transparentOnHero = false) {
  initStore();
  ensureGlobalModals();
  renderNavbar(activePage, transparentOnHero);
  renderFooter();
  initRevealObserver();
  initScrollEffects();
  initCustomSelectEnhancer();
}

// ---------- Luxury Custom Editorial Dropdown Enhancer (Replaces Native OS Select Popups) ----------

let abSelectObserverStarted = false;
let abSelectSyncing = false;

function closeAllAbSelects(exceptWrap = null) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.ab-select-wrap.is-open').forEach((w) => {
    if (w !== exceptWrap) {
      w.classList.remove('is-open', 'drop-up');
      w.querySelector('.ab-select-trigger')?.setAttribute('aria-expanded', 'false');
    }
  });
}

function buildAbSelectUI(selectEl) {
  if (!selectEl || selectEl.multiple) return;
  if (selectEl.dataset.abEnhanced === '1') {
    if (typeof selectEl._abSync === 'function') selectEl._abSync();
    return;
  }
  selectEl.dataset.abEnhanced = '1';

  const wrap = document.createElement('div');
  wrap.className = 'ab-select-wrap' + (selectEl.classList.contains('w-full') ? ' is-full' : '');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ab-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const labelSpan = document.createElement('span');
  labelSpan.className = 'ab-select-label';

  const caret = document.createElement('i');
  caret.className = 'ph ph-caret-down ab-select-caret';

  trigger.appendChild(labelSpan);
  trigger.appendChild(caret);

  const menu = document.createElement('div');
  menu.className = 'ab-select-menu';
  menu.setAttribute('role', 'listbox');

  const protoDesc =
    typeof HTMLSelectElement !== 'undefined'
      ? Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')
      : null;

  const getNativeValue = () => (protoDesc && protoDesc.get ? protoDesc.get.call(selectEl) : selectEl.value);
  const setNativeValue = (val) => {
    if (protoDesc && protoDesc.set) {
      protoDesc.set.call(selectEl, val);
    } else {
      selectEl.value = val;
    }
  };

  function syncOptions() {
    const currentVal = getNativeValue();
    const opts = Array.from(selectEl.options || []);
    const sig =
      selectEl.selectedIndex +
      '|' +
      currentVal +
      '|' +
      opts.map((o) => o.value + ':' + o.textContent.trim()).join('||');
    if (selectEl._abLastSig === sig) return;
    selectEl._abLastSig = sig;

    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    labelSpan.textContent = selectedOpt ? selectedOpt.textContent.trim() : 'Pilih...';
    menu.innerHTML = '';
    opts.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = opt.value === currentVal;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.className = 'ab-select-option' + (isSelected ? ' is-selected' : '');
      btn.innerHTML = `<span>${escapeHtml(opt.textContent.trim())}</span>${isSelected ? '<i class="ph ph-check ab-select-option-check"></i>' : ''}`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (getNativeValue() !== opt.value) {
          setNativeValue(opt.value);
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncOptions();
        wrap.classList.remove('is-open', 'drop-up');
        trigger.setAttribute('aria-expanded', 'false');
      });
      menu.appendChild(btn);
    });
  }

  selectEl._abSync = syncOptions;

  if (protoDesc && protoDesc.get && protoDesc.set) {
    Object.defineProperty(selectEl, 'value', {
      configurable: true,
      enumerable: true,
      get() {
        return protoDesc.get.call(this);
      },
      set(val) {
        protoDesc.set.call(this, val);
        syncOptions();
      },
    });
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !wrap.classList.contains('is-open');
    closeAllAbSelects(wrap);
    if (willOpen) {
      syncOptions();
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      wrap.classList.toggle('drop-up', spaceBelow < 220 && rect.top > 220);
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    } else {
      wrap.classList.remove('is-open', 'drop-up');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  selectEl.addEventListener('change', syncOptions);

  if (selectEl.parentNode) {
    selectEl.parentNode.insertBefore(wrap, selectEl);
  }
  selectEl.classList.add('hidden');
  wrap.appendChild(selectEl);
  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  syncOptions();
}

function enhanceCustomSelects(root = document) {
  if (typeof document === 'undefined' || !root || abSelectSyncing) return;
  abSelectSyncing = true;
  try {
    root.querySelectorAll('select').forEach((sel) => {
      if (sel.dataset.abEnhanced === '1') {
        if (typeof sel._abSync === 'function') sel._abSync();
      } else {
        buildAbSelectUI(sel);
      }
    });
  } finally {
    abSelectSyncing = false;
  }
}

function enhanceAllSelectsIn(root = document) {
  return enhanceCustomSelects(root);
}

function initCustomSelectEnhancer() {
  if (typeof document === 'undefined') return;
  enhanceCustomSelects(document);
  if (abSelectObserverStarted) return;
  abSelectObserverStarted = true;

  document.addEventListener('click', () => closeAllAbSelects(null));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllAbSelects(null);
  });

  if (typeof MutationObserver !== 'undefined' && document.body) {
    const obs = new MutationObserver(() => {
      enhanceCustomSelects(document);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    bindGlobalModalUx();
    initCustomSelectEnhancer();
  });
}
