/**
 * Azzatul Bouquet — Exact-Match Admin Cloner & Full Interactive Prototype
 * 1. Menghapus frame 05C–05F versi lama (yang dibangun manual) bila ada.
 * 2. Meng-clone 05B langsung agar font, sidebar, header, KPI, & kartu 100% IDENTIK.
 * 3. Memasang koneksi Prototype penuh di seluruh layar Pelanggan & semua 5 tab Admin.
 */

(async function main() {
  const page = figma.currentPage;

  // --- Helpers ---
  async function loadNodeFonts(textNode) {
    const segs = textNode.getStyledTextSegments(['fontName']);
    const seen = new Set();
    for (const seg of segs) {
      const fn = seg.fontName;
      const key = fn.family + '::' + fn.style;
      if (!seen.has(key)) {
        seen.add(key);
        await figma.loadFontAsync(fn);
      }
    }
  }

  async function setTextSafe(textNode, newStr) {
    if (!textNode || textNode.type !== 'TEXT') return;
    try {
      await loadNodeFonts(textNode);
      textNode.characters = String(newStr);
    } catch (e) {}
  }

  // 1. Remove old auto-generated 05C–05F frames so we start completely clean
  const oldGenNames = [
    '05C — Portal Admin: Workshop & Bahan Custom',
    '05D — Portal Admin: Stok Bahan & Opname',
    '05E — Portal Admin: Kelola Katalog Produk',
    '05F — Portal Admin: Keuangan & Laporan HPP',
  ];
  const allTopAndSectionFrames = [];
  for (const ch of [...page.children]) {
    if (ch.type === 'FRAME') allTopAndSectionFrames.push(ch);
    else if (ch.type === 'SECTION') {
      for (const sc of [...ch.children]) {
        if (sc.type === 'FRAME') allTopAndSectionFrames.push(sc);
      }
    }
  }
  for (const f of allTopAndSectionFrames) {
    if (oldGenNames.includes(f.name)) {
      f.remove();
    }
  }

  // 2. Collect all existing screen frames
  function collectScreens() {
    const list = [];
    for (const child of page.children) {
      if (child.type === 'FRAME' && child.width >= 280 && child.height >= 400) {
        list.push(child);
      } else if (child.type === 'SECTION') {
        for (const sc of child.children) {
          if (sc.type === 'FRAME' && sc.width >= 280 && sc.height >= 400) {
            list.push(sc);
          }
        }
      }
    }
    list.sort((a, b) => {
      const rowA = Math.round(a.y / 300);
      const rowB = Math.round(b.y / 300);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });
    return list;
  }

  let rawFrames = collectScreens();
  if (rawFrames.length < 2) {
    figma.notify('Ditemukan kurang dari 2 frame layar.');
    figma.closePlugin();
    return;
  }

  function frameSig(frame) {
    return (
      frame.name + ' ' +
      frame.findAllWithCriteria({ types: ['TEXT'] }).slice(0, 50).map((t) => t.characters).join(' ')
    ).toLowerCase();
  }

  function matchScreens(frames) {
    const meta = frames.map((f) => ({ frame: f, sig: frameSig(f), nameL: f.name.toLowerCase() }));
    const used = new Set();
    const byName = (re) => {
      const m = meta.find((x) => !used.has(x.frame.id) && re.test(x.nameL));
      if (m) { used.add(m.frame.id); return m.frame; }
      return null;
    };
    const bySig = (re) => {
      const m = meta.find((x) => !used.has(x.frame.id) && re.test(x.sig));
      if (m) { used.add(m.frame.id); return m.frame; }
      return null;
    };

    const adminLogin    = byName(/05a|login\s*gate|admin.*login|login.*admin/);
    const adminOrders   = byName(/05b|dashboard\s*antr|portal\s*admin.*antrean|admin.*order/);
    const adminWorkshop = byName(/05c|portal\s*admin.*workshop/);
    const adminStock    = byName(/05d|portal\s*admin.*stok/);
    const adminCatalog  = byName(/05e|portal\s*admin.*katalog/);
    const adminFinance  = byName(/05f|portal\s*admin.*keuangan/);

    const landing      = byName(/01a|01\b|landing|hero|beranda/);
    const about        = byName(/01b|about|tentang|curtain|etalase/);
    const step1        = byName(/02a|step\s*1|langkah\s*1|mulai|template/);
    const reference    = byName(/referensi|reference|upload|unggah/);
    const step2        = byName(/02b|step\s*2|langkah\s*2|isi/);
    const step3        = byName(/02c|step\s*3|langkah\s*3|wrap/);
    const step4        = byName(/02d|step\s*4|langkah\s*4|ucapan/);
    const checkoutForm = byName(/03a|03\b|04a|checkout(?!.*qris|.*invoice|.*lunas)|jadwal|data\s*pemesan/);
    const checkoutQris = byName(/03b|04b|qris|invoice|pembayaran/);
    const receipt      = byName(/03c|04c|nota|receipt|lunas|sukses/);

    return {
      landing:       landing || bySig(/buat buket|rangkai buket.*lokasi toko/),
      about:         about || bySig(/tentang azzatul|kategori buket|ulasan pelanggan/),
      step1:         step1 || bySig(/pilih template|rangkai dari nol/),
      reference:     reference || bySig(/unggah foto referensi|upload foto referensi/),
      step2:         step2 || bySig(/pilih jenis buket|ukuran & jumlah|pilih snack/),
      step3:         step3 || bySig(/gaya wrapping|warna cellophane|pita pengikat/),
      step4:         step4 || bySig(/kartu ucapan|ringkasan buket/),
      checkoutForm:  checkoutForm || bySig(/data pemesan|jadwal ambil|kode promo/),
      checkoutQris:  checkoutQris || bySig(/scan qris|menunggu pembayaran|perbarui qr/),
      receipt:       receipt || bySig(/pembayaran selesai|cetak nota/),
      adminLogin:    adminLogin || bySig(/masuk portal admin|owner123|crafter123/),
      adminOrders:   adminOrders || bySig(/antrean fifo & kelola pesanan/),
      adminWorkshop,
      adminStock,
      adminCatalog,
      adminFinance,
    };
  }

  let S = matchScreens(rawFrames);

  // 3. Clone 05B directly to create PIXEL-IDENTICAL 05C, 05D, 05E, 05F!
  //    Preserves 100% of 05B's exact sidebar, serif/sans/mono fonts, KPI cards, and card styling!
  function getSidebarTabNodes(adminFrame) {
    const texts = adminFrame.findAllWithCriteria({ types: ['TEXT'] });
    const leftTexts = texts.filter((t) => {
      const box = t.absoluteBoundingBox;
      const fBox = adminFrame.absoluteBoundingBox;
      return box && fBox && (box.x - fBox.x) < adminFrame.width * 0.24;
    });

    function findRowContainer(t) {
      let cur = t;
      while (cur && cur.parent && cur.parent.id !== adminFrame.id) {
        const p = cur.parent;
        if (p.type === 'FRAME' && p.height >= 26 && p.height <= 64 && p.width < adminFrame.width * 0.25) {
          return p;
        }
        cur = p;
      }
      return t;
    }

    const matchTab = (re) => {
      const t = leftTexts.find((x) => re.test(x.characters.toLowerCase()));
      return t ? { text: t, box: findRowContainer(t) } : null;
    };

    return {
      orders:   matchTab(/antrean|pesanan/),
      workshop: matchTab(/workshop|bahan/),
      stock:    matchTab(/stok|opname/),
      catalog:  matchTab(/katalog/),
      finance:  matchTab(/keuangan|laporan/),
      home:     matchTab(/lihat toko|beranda|etalase/),
      logout:   matchTab(/keluar|logout/),
    };
  }

  function swapActiveSidebarStyle(cloneFrame, activeKey) {
    const tabs = getSidebarTabNodes(cloneFrame);
    const activeOrderBox = tabs.orders && tabs.orders.box;
    const targetTab = tabs[activeKey];
    if (!activeOrderBox || !targetTab || !targetTab.box || activeOrderBox.id === targetTab.box.id) return;

    // Copy active fill/cornerRadius from Tab 1 (Antrean) onto the target tab, and make Tab 1 transparent
    try {
      const activeFills = JSON.parse(JSON.stringify(activeOrderBox.fills || []));
      const inactiveFills = JSON.parse(JSON.stringify(targetTab.box.fills || []));
      const activeTextFills = tabs.orders.text ? JSON.parse(JSON.stringify(tabs.orders.text.fills || [])) : null;
      const inactiveTextFills = targetTab.text ? JSON.parse(JSON.stringify(targetTab.text.fills || [])) : null;

      targetTab.box.fills = activeFills;
      if ('cornerRadius' in activeOrderBox && 'cornerRadius' in targetTab.box) {
        targetTab.box.cornerRadius = activeOrderBox.cornerRadius;
      }
      activeOrderBox.fills = inactiveFills;

      if (activeTextFills && inactiveTextFills && tabs.orders.text && targetTab.text) {
        targetTab.text.fills = activeTextFills;
        tabs.orders.text.fills = inactiveTextFills;
      }
    } catch (e) {}
  }

  async function replaceContentInClonedAdmin(cloneFrame, spec) {
    const fBox = cloneFrame.absoluteBoundingBox;
    if (!fBox) return;

    // Find all TEXT nodes in the RIGHT main area (x > 24% of frame width), sorted top-to-bottom, left-to-right
    const rightTexts = cloneFrame.findAllWithCriteria({ types: ['TEXT'] })
      .filter((t) => {
        const b = t.absoluteBoundingBox;
        return b && (b.x - fBox.x) > cloneFrame.width * 0.24;
      })
      .sort((a, b) => {
        const ay = a.absoluteBoundingBox.y;
        const by = b.absoluteBoundingBox.y;
        if (Math.abs(ay - by) > 12) return ay - by;
        return a.absoluteBoundingBox.x - b.absoluteBoundingBox.x;
      });

    // Replace main heading (largest font size text in right area)
    let headingNode = null;
    for (const t of rightTexts) {
      const sz = typeof t.fontSize === 'number' ? t.fontSize : 0;
      if (!headingNode || sz > (typeof headingNode.fontSize === 'number' ? headingNode.fontSize : 0)) {
        headingNode = t;
      }
    }
    if (headingNode) {
      await setTextSafe(headingNode, spec.title);
    }

    // Replace subtitle/kicker right above heading
    if (headingNode && headingNode.absoluteBoundingBox) {
      const hy = headingNode.absoluteBoundingBox.y;
      const kicker = rightTexts.find((t) => t.id !== headingNode.id && t.absoluteBoundingBox.y < hy && (hy - t.absoluteBoundingBox.y) < 40);
      if (kicker) await setTextSafe(kicker, spec.kicker);
    }

    // Replace text snippets inside the right area using targeted exact/regex replacements so layout never breaks!
    for (const t of rightTexts) {
      if (headingNode && t.id === headingNode.id) continue;
      const txt = t.characters.trim();
      for (const [pattern, repl] of spec.replacements) {
        if (pattern.test(txt)) {
          await setTextSafe(t, repl);
          break;
        }
      }
    }
  }

  const cloneSpecs = [
    {
      prop: 'adminWorkshop',
      activeKey: 'workshop',
      frameName: '05C — Portal Admin: Workshop & Bahan Custom',
      kicker: 'BENGKEL WORKSHOP · ISIAN CUSTOM',
      title: 'Workshop & Bahan Custom',
      replacements: [
        [/^antrean fifo$/i, 'Semua Bahan'],
        [/^papan kanban$/i, '+ Tambah Bahan'],
        [/menunggu.*antrean|total pesanan|antrean aktif/i, 'Total Item Custom'],
        [/menunggu verifikasi/i, 'Kategori Snack'],
        [/sedang dirangkai/i, 'Bunga, Foto & Uang'],
        [/selesai hari ini|total selesai/i, 'Sinkron Studio'],
        [/^1$/, '22'],
        [/^0$/, '12'],
        [/^kelola bahan & isian custom/i, 'Daftar Bahan Isian Custom Aktif (22 Item)'],
        [/^ord-|^kk-|^ab-/i, 'ITEM-01 · SilverQueen 58g (Snack)'],
        [/^rp\s*[\d.,]+$/i, 'Rp 16.500'],
      ],
    },
    {
      prop: 'adminStock',
      activeKey: 'stock',
      frameName: '05D — Portal Admin: Stok Bahan & Opname',
      kicker: 'INVENTORI AUTO-BOM · CEK BERKALA',
      title: 'Stok Bahan Baku & Opname',
      replacements: [
        [/^antrean fifo$/i, 'Stok Bahan'],
        [/^papan kanban$/i, '+ Stock Opname'],
        [/menunggu.*antrean|total pesanan|antrean aktif/i, 'Total SKU Bahan'],
        [/menunggu verifikasi/i, 'Stok Aman'],
        [/sedang dirangkai/i, 'Perlu Restock'],
        [/selesai hari ini|total selesai/i, 'Auto-BOM Aktif'],
        [/^1$/, '9'],
        [/^0$/, '2'],
        [/^kelola bahan & isian custom/i, 'Pantauan Stok Bahan Baku & Peringatan Minimum'],
        [/^ord-|^kk-|^ab-/i, 'INV-04 · Kertas Cellophane Matte (Sisa 18 Lembar)'],
        [/^rp\s*[\d.,]+$/i, 'Perlu Restock'],
      ],
    },
    {
      prop: 'adminCatalog',
      activeKey: 'catalog',
      frameName: '05E — Portal Admin: Kelola Katalog Produk',
      kicker: 'ETALASE TEMPLATE SIAP PAKAI',
      title: 'Kelola Katalog Produk',
      replacements: [
        [/^antrean fifo$/i, '8 Template'],
        [/^papan kanban$/i, '+ Produk Baru'],
        [/menunggu.*antrean|total pesanan|antrean aktif/i, 'Total Produk'],
        [/menunggu verifikasi/i, 'Kategori Aktif'],
        [/sedang dirangkai/i, 'Best Seller'],
        [/selesai hari ini|total selesai/i, 'Status Katalog'],
        [/^1$/, '8'],
        [/^0$/, '5'],
        [/^kelola bahan & isian custom/i, 'Daftar Paket Buket Katalog Azzatul Bouquet'],
        [/^ord-|^kk-|^ab-/i, 'PRD-04 · All-in-One Wisuda (Terjual 92)'],
        [/^rp\s*[\d.,]+$/i, 'Rp 165.000'],
      ],
    },
    {
      prop: 'adminFinance',
      activeKey: 'finance',
      frameName: '05F — Portal Admin: Keuangan & Laporan HPP',
      kicker: 'AKUNTANSI STUDIO · EKSPOR CSV',
      title: 'Keuangan & Laporan HPP',
      replacements: [
        [/^antrean fifo$/i, 'Ringkasan'],
        [/^papan kanban$/i, 'Export CSV'],
        [/menunggu.*antrean|total pesanan|antrean aktif/i, 'Omzet Lunas'],
        [/menunggu verifikasi/i, 'Total HPP Bahan'],
        [/sedang dirangkai/i, 'Biaya Operasional'],
        [/selesai hari ini|total selesai/i, 'Laba Bersih'],
        [/^1$/, 'Rp 2,8jt'],
        [/^0$/, 'Rp 1,3jt'],
        [/^kelola bahan & isian custom/i, 'Catatan Pengeluaran & Margin Laba Bersih'],
        [/^ord-|^kk-|^ab-/i, 'EXP-01 · Belanja Snack, Slot Uang & Cellophane'],
        [/^rp\s*[\d.,]+$/i, 'Rp 1.345.000'],
      ],
    },
  ];

  let createdAdminScreens = 0;
  const newlyCreated = [];
  if (S.adminOrders) {
    let cursorX = S.adminOrders.x + S.adminOrders.width + 100;
    const parentContainer = S.adminOrders.parent || page;

    for (const spec of cloneSpecs) {
      const cloned = S.adminOrders.clone();
      cloned.name = spec.frameName;
      cloned.x = cursorX;
      cloned.y = S.adminOrders.y;
      parentContainer.appendChild(cloned);

      swapActiveSidebarStyle(cloned, spec.activeKey);
      await replaceContentInClonedAdmin(cloned, spec);

      S[spec.prop] = cloned;
      newlyCreated.push(cloned);
      cursorX += cloned.width + 100;
      createdAdminScreens++;
    }

    if (parentContainer.type === 'SECTION' && newlyCreated.length > 0) {
      const rightMost = Math.max(...newlyCreated.map((n) => n.x + n.width));
      if (rightMost + 80 > parentContainer.width) {
        parentContainer.resizeWithoutConstraints(rightMost + 80, parentContainer.height);
      }
    }
  }

  rawFrames = collectScreens();
  S = matchScreens(rawFrames);

  // 4. Comprehensive Interactive Prototype Wiring across ALL screens
  const customerChain = [
    S.landing, S.about, S.step1, S.step2, S.step3, S.step4, S.checkoutForm, S.checkoutQris, S.receipt
  ].filter(Boolean);

  const adminScreens = [
    S.adminOrders, S.adminWorkshop, S.adminStock, S.adminCatalog, S.adminFinance
  ].filter(Boolean);

  function navReaction(destinationId) {
    return [{
      trigger: { type: 'ON_CLICK' },
      actions: [{
        type: 'NODE',
        destinationId,
        navigation: 'NAVIGATE',
        transition: {
          type: 'SMART_ANIMATE',
          easing: { type: 'EASE_OUT' },
          duration: 0.25,
        },
        preserveScrollPosition: false,
      }],
    }];
  }

  function backReaction() {
    return [{
      trigger: { type: 'ON_CLICK' },
      actions: [{ type: 'BACK' }],
    }];
  }

  function findClickableTarget(textNode, screenFrame) {
    let cur = textNode;
    let best = textNode;
    while (cur && cur.parent && cur.parent.id !== screenFrame.id) {
      const p = cur.parent;
      if (p.type === 'FRAME' || p.type === 'INSTANCE' || p.type === 'COMPONENT' || p.type === 'GROUP') {
        const smallEnough = p.width < screenFrame.width * 0.72 && p.height <= 110;
        const looksInteractive = /btn|button|cta|pill|tab|nav|card|link|item|menu|back|close|step/i.test(p.name) ||
          (p.type === 'FRAME' && p.cornerRadius !== 0 && p.height <= 76);
        if (smallEnough && (looksInteractive || p.height <= 58)) {
          best = p;
        } else {
          break;
        }
      }
      cur = p;
    }
    return best;
  }

  let wiredCount = 0;
  const wiredNodeIds = new Set();

  async function wireNode(node, reaction) {
    if (!node || !('setReactionsAsync' in node) || wiredNodeIds.has(node.id)) return false;
    try {
      await node.setReactionsAsync(reaction);
      wiredNodeIds.add(node.id);
      wiredCount++;
      return true;
    } catch (e) {
      return false;
    }
  }

  // 4A. Wire ALL 5 Admin Sidebar Tabs + Lihat Toko + Keluar on EVERY Admin dashboard screen!
  for (const adm of adminScreens) {
    const tabs = getSidebarTabNodes(adm);
    const map = [
      [tabs.orders,   S.adminOrders],
      [tabs.workshop, S.adminWorkshop],
      [tabs.stock,    S.adminStock],
      [tabs.catalog,  S.adminCatalog],
      [tabs.finance,  S.adminFinance],
      [tabs.home,     S.landing],
      [tabs.logout,   S.adminLogin],
    ];
    for (const [tabObj, dest] of map) {
      if (tabObj && dest && dest.id !== adm.id) {
        await wireNode(tabObj.box || tabObj.text, navReaction(dest.id));
      }
    }
  }

  // 4B. Wire ALL buttons, links, cards, step pills, & back actions on EVERY screen!
  for (let idx = 0; idx < rawFrames.length; idx++) {
    const screen = rawFrames[idx];
    const isAdmin = adminScreens.some((a) => a.id === screen.id) || (S.adminLogin && S.adminLogin.id === screen.id);
    const custIdx = customerChain.findIndex((c) => c.id === screen.id);
    const nextCust = custIdx >= 0 && custIdx + 1 < customerChain.length ? customerChain[custIdx + 1] : null;
    const prevCust = custIdx > 0 ? customerChain[custIdx - 1] : null;
    const screenTexts = screen.findAllWithCriteria({ types: ['TEXT'] });

    let screenWired = 0;

    for (const t of screenTexts) {
      const raw = t.characters.trim();
      if (!raw || raw.length > 56) continue;
      const lbl = raw.toLowerCase();
      let dest = null;
      let isBack = false;

      if (S.adminLogin && screen.id === S.adminLogin.id) {
        if (/masuk|login|owner|perangkai|crafter/.test(lbl) && S.adminOrders) dest = S.adminOrders;
        else if (/beranda|toko|←/.test(lbl) && S.landing) dest = S.landing;
      } else if (!isAdmin) {
        if (/^(beranda|home|kembali ke beranda|selesai & kembali|tutup)$/.test(lbl) && S.landing && screen.id !== S.landing.id) {
          dest = S.landing;
        } else if (/^azzatul bouquet\.?$/.test(lbl) && S.landing && screen.id !== S.landing.id) {
          dest = S.landing;
        } else if (/kelola toko|portal admin|kelola studio|masuk admin|admin/.test(lbl) && S.adminLogin) {
          dest = S.adminLogin;
        } else if (/upload foto referensi|unggah foto referensi|referensi sendiri|foto referensi/.test(lbl) && S.reference && screen.id !== S.reference.id) {
          dest = S.reference;
        } else if (/tentang|lihat katalog|jelajahi|info & katalog|scroll|koleksi/.test(lbl) && S.about && screen.id !== S.about.id) {
          dest = S.about;
        } else if (/rangkai buket|buat buket|mulai rangkai|rangkai dari nol|ubah detail|kustomisasi|mulai sekarang/.test(lbl)) {
          dest = (screen.id === S.step1?.id ? S.step2 : (S.step1 || S.step2));
        } else if (/^(buket snack|snack populer|money bouquet|buket uang|buket foto|foto polaroid|rangkaian bunga|mix custom)/.test(lbl) && (S.step2 || S.step1)) {
          dest = (screen.id === S.step2?.id ? S.step3 : (S.step2 || S.step1));
        } else if (/^1\.|langkah 1|mulai/.test(lbl) && S.step1 && screen.id !== S.step1.id && lbl.length <= 18) {
          dest = S.step1;
        } else if (/^2\.|langkah 2|atur isi|lanjut atur isi/.test(lbl) && S.step2 && screen.id !== S.step2.id) {
          dest = S.step2;
        } else if (/^3\.|langkah 3|wrapping|kemas/.test(lbl) && S.step3 && screen.id !== S.step3.id && lbl.length <= 22) {
          dest = S.step3;
        } else if (/^4\.|langkah 4|ucapan|ringkasan/.test(lbl) && S.step4 && screen.id !== S.step4.id && lbl.length <= 22) {
          dest = S.step4;
        } else if (/pesan langsung|lanjut.*checkout|lanjut.*bayar|ke pembayaran|checkout/.test(lbl) && S.checkoutForm && screen.id !== S.checkoutForm.id) {
          dest = S.checkoutForm;
        } else if (/buat pesanan|bayar qris|bayar sekarang|lanjut qris|konfirmasi pesanan/.test(lbl) && S.checkoutQris && screen.id !== S.checkoutQris.id) {
          dest = S.checkoutQris;
        } else if (/simulasi bayar|sudah bayar|cetak nota|lihat nota|bayar lunas/.test(lbl) && S.receipt && screen.id !== S.receipt.id) {
          dest = S.receipt;
        } else if (/^kembali|←|sebelumnya/.test(lbl)) {
          if (prevCust) dest = prevCust;
          else isBack = true;
        } else if (/lanjut|selanjutnya|berikutnya|→/.test(lbl) && nextCust) {
          dest = nextCust;
        }
      }

      if (isBack) {
        const target = findClickableTarget(t, screen);
        if (await wireNode(target, backReaction())) screenWired++;
      } else if (dest && dest.id !== screen.id) {
        const target = findClickableTarget(t, screen);
        if (await wireNode(target, navReaction(dest.id))) screenWired++;
      }
    }

    if (screenWired === 0 && !isAdmin) {
      const nextFrame = nextCust || rawFrames[(idx + 1) % rawFrames.length];
      if (nextFrame && nextFrame.id !== screen.id) {
        await wireNode(screen, navReaction(nextFrame.id));
      }
    }
  }

  // 5. Flow Starting Points
  const flows = [];
  const customerStart = S.landing || customerChain[0] || rawFrames[0];
  if (customerStart) {
    flows.push({ nodeId: customerStart.id, name: 'Alur Pelanggan — Azzatul Bouquet' });
  }
  const adminStart = S.adminLogin || S.adminOrders;
  if (adminStart && (!customerStart || adminStart.id !== customerStart.id)) {
    flows.push({ nodeId: adminStart.id, name: 'Portal Admin — Azzatul Bouquet' });
  }
  if (flows.length > 0) {
    page.flowStartingPoints = flows;
  }

  if (newlyCreated.length > 0) {
    figma.viewport.scrollAndZoomIntoView([S.adminOrders, ...newlyCreated]);
  }

  figma.notify(
    `Selesai! ${createdAdminScreens} screen Admin (05C–05F) di-clone 100% mirip 05B & ${wiredCount} koneksi prototype aktif di ${rawFrames.length} screen.`,
    { timeout: 6000 }
  );
  figma.closePlugin();
})();
