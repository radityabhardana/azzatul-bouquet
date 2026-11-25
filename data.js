/**
 * AZZATUL BOUQUET — Database & Konfigurasi Studio Buket Custom
 * Menjual berbagai buket custom: Snack, Uang, Foto/Polaroid, Rangkaian Bunga (Artificial/Pita Satin), Boneka, dll.
 * Tanpa bunga asli/segar — 100% awet dan bebas dikustomisasi.
 */

const STORAGE_KEYS = {
  PRODUCTS: 'kalakreasi_v6_products',
  INVENTORY: 'kalakreasi_v6_inventory',
  STOCK_LOGS: 'kalakreasi_v6_stock_logs',
  ORDERS: 'kalakreasi_v7_orders',
  EXPENSES: 'kalakreasi_v6_expenses',
  OPNAME_LOGS: 'kalakreasi_v6_opname_logs',
  ADMIN_SESSION: 'kalakreasi_v6_admin_session',
  DRAFT_ORDER: 'kalakreasi_v6_draft_order',
  CHECKOUT_FORM: 'kalakreasi_v6_checkout_form',
  ACTIVE_INVOICE: 'kalakreasi_v6_active_invoice',
  CUSTOM_ITEMS: 'kalakreasi_v7_custom_items',
};

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#F8F5F0"/>
      <rect x="36" y="36" width="728" height="528" fill="none" stroke="#E5DFD5" stroke-width="2"/>
      <polygon points="320,250 400,190 480,250 430,360 370,360" fill="#F3EFE8" stroke="#882B42" stroke-width="2"/>
      <rect x="360" y="215" width="32" height="52" rx="3" fill="#882B42" opacity="0.9"/>
      <rect x="404" y="210" width="34" height="56" rx="3" fill="#1C1F1D" opacity="0.85"/>
      <rect x="382" y="232" width="36" height="44" rx="2" fill="#FFFFFF" stroke="#D8D0C5" stroke-width="1.5"/>
      <text x="400" y="445" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="600" fill="#1C1F1D" letter-spacing="3">AZZATUL BOUQUET</text>
      <text x="400" y="472" text-anchor="middle" font-family="monospace" font-size="12" fill="#882B42">CUSTOM BOUQUET · SNACK · MONEY · PHOTO · ARTIFICIAL</text>
    </svg>`
  );

const HERO_MEDIA = {
  mainHero: 'assets/snack-bouquet.jpg',
  atelierDetail: 'assets/polaroid-bouquet.jpg',
  workshopStory: 'assets/money-bouquet.jpg',
};

const GALLERY_IMAGES = [
  {
    id: 'GAL-01',
    title: 'Choco & Snack Tower Wrap',
    subtitle: 'Buket snack favorit dengan wrapping Cream Linen elegan',
    url: 'assets/snack-bouquet.jpg',
  },
  {
    id: 'GAL-02',
    title: 'Money Bouquet & Artificial Rose',
    subtitle: 'Slot uang rapi aman tanpa lem + Rangkaian Bunga anti layu',
    url: 'assets/money-bouquet.jpg',
  },
  {
    id: 'GAL-03',
    title: 'Memory Polaroid & LED Warm',
    subtitle: 'Cetak foto polaroid laminasi + lampu LED untuk momen spesial',
    url: 'assets/polaroid-bouquet.jpg',
  },
  {
    id: 'GAL-04',
    title: 'Custom Mix Gift Studio',
    subtitle: 'Gabungkan snack, boneka, foto & Rangkaian Bunga dalam satu buket',
    url: 'assets/mix-bouquet.jpg',
  },
];

const PAYMENT_ACCOUNTS = {
  studioName: 'Azzatul Bouquet',
  studioAddress: 'Klapa Nunggal, Cileungsi — Kab. Bogor (6°26\'52.3"S 106°57\'38.2"E)',
  studioMapsUrl: 'https://www.google.com/maps/place/6%C2%B026%2752.3%22S+106%C2%B057%2738.2%22E/@-6.4478556,106.9580317,17z/data=!3m1!4b1!4m4!3m3!8m2!3d-6.4478556!4d106.9606066',
  studioMapsEmbed: 'https://maps.google.com/maps?q=-6.4478556,106.9606066&z=17&output=embed',
  studioWaDisplay: '+62 881-0249-11087',
  studioWaNumber: '62881024911087',
  qrisMerchant: 'AZZATUL BOUQUET — CILEUNGSI',
  qrisNmid: 'ID1026641320803',
  qrisImage: 'assets/qris.jpg',
  qrisStaticPayload: '00020101021126610014COM.GO-JEK.WWW01189360091437285170490210G7285170490303UMI51440014ID.CO.QRIS.WWW0215ID10266413208030303UMI5204899953033605802ID5921Raditya Bagus Hardana6006BEKASI61051743162140703A0111035216304270B',
};

const CONFIGURATOR_OPTIONS = {
  bouquetTypes: [
    {
      id: 'snack',
      label: 'Buket Snack & Jajan',
      shortLabel: 'Snack',
      unitLabel: 'item snack',
      pricePerUnit: 8500,
      hppPerUnit: 4500,
      prepMinutesPerUnit: 3,
      invId: 'INV-01',
      image: 'assets/snack-bouquet.jpg',
      desc: 'Cokelat, wafer, biskuit & minuman favorit dirangkai rapi bertingkat',
    },
    {
      id: 'money',
      label: 'Buket Uang (Money Bouquet)',
      shortLabel: 'Uang',
      unitLabel: 'slot uang',
      pricePerUnit: 4000,
      hppPerUnit: 1000,
      prepMinutesPerUnit: 3,
      invId: 'INV-07',
      image: 'assets/money-bouquet.jpg',
      desc: 'Jasa rangkai slot plastik aman tanpa lem (uang bisa diisi studio / sendiri)',
    },
    {
      id: 'photo',
      label: 'Buket Foto / Polaroid',
      shortLabel: 'Foto',
      unitLabel: 'foto',
      pricePerUnit: 7500,
      hppPerUnit: 2500,
      prepMinutesPerUnit: 4,
      invId: 'INV-03',
      image: 'assets/polaroid-bouquet.jpg',
      desc: 'Cetak foto polaroid laminasi anti pudar + hiasan pita & daun artificial',
    },
    {
      id: 'artificial',
      label: 'Rangkaian Bunga (Artificial/Satin)',
      shortLabel: 'Rangkaian Bunga',
      unitLabel: 'tangkai',
      pricePerUnit: 10500,
      hppPerUnit: 4200,
      prepMinutesPerUnit: 6,
      invId: 'INV-02',
      image: 'assets/artificial-bouquet.jpg',
      desc: 'Bunga pita satin & silk artificial awet selamanya dan mudah dirawat',
    },
    {
      id: 'mix',
      label: 'Buket Mix Custom (Snack + Foto + Rangkaian Bunga)',
      shortLabel: 'Mix Custom',
      unitLabel: 'isian mix',
      pricePerUnit: 11000,
      hppPerUnit: 5000,
      prepMinutesPerUnit: 5,
      invId: 'INV-01',
      image: 'assets/mix-bouquet.jpg',
      desc: 'Kombinasi bebas snack, foto polaroid, & Rangkaian Bunga dalam satu buket',
    },
  ],
  // Alias backward-compatibility bila ada modul lama membaca flowerTypes
  get flowerTypes() {
    return this.bouquetTypes;
  },
  fillCounts: [
    { count: 5, label: 'Petite', desc: '5 isian ringkas' },
    { count: 7, label: 'Classic', desc: '7 isian proporsional' },
    { count: 10, label: 'Signature', desc: '10 isian penuh' },
    { count: 15, label: 'Grand', desc: '15 isian meriah' },
    { count: 20, label: 'Deluxe', desc: '20 isian jumbo' },
  ],
  popularSnacks: [
    { id: 'tango', cat: 'Snack', category: 'Snack', name: 'Tango Wafer', variant: 'Cokelat / Vanila', price: 6000, hpp: 3200, invId: 'INV-01', invQty: 1 },
    { id: 'beng-beng', cat: 'Snack', category: 'Snack', name: 'Beng-Beng', variant: 'Wafer Karamel Cokelat', price: 5000, hpp: 2500, invId: 'INV-01', invQty: 1 },
    { id: 'silverqueen', cat: 'Snack', category: 'Snack', name: 'SilverQueen 58g', variant: 'Cashew / Almond', price: 16000, hpp: 11500, invId: 'INV-01', invQty: 1 },
    { id: 'pocky', cat: 'Snack', category: 'Snack', name: 'Pocky Stick', variant: 'Chocolate / Strawberry', price: 11000, hpp: 7200, invId: 'INV-01', invQty: 1 },
    { id: 'oreo', cat: 'Snack', category: 'Snack', name: 'Oreo Roll / Pack', variant: 'Original / Vanilla', price: 7000, hpp: 4000, invId: 'INV-01', invQty: 1 },
    { id: 'chitato', cat: 'Snack', category: 'Snack', name: 'Chitato Mini', variant: 'Sapi Panggang', price: 6500, hpp: 3600, invId: 'INV-01', invQty: 1 },
    { id: 'kitkat', cat: 'Snack', category: 'Snack', name: 'KitKat 2F', variant: 'Cokelat Susu', price: 8000, hpp: 4800, invId: 'INV-01', invQty: 1 },
    { id: 'ultramilk', cat: 'Snack', category: 'Snack', name: 'Ultra Milk 200ml', variant: 'Cokelat / Stroberi', price: 8500, hpp: 5200, invId: 'INV-01', invQty: 1 },
    { id: 'goodtime', cat: 'Snack', category: 'Snack', name: 'Good Time', variant: 'Chocochips', price: 6000, hpp: 3200, invId: 'INV-01', invQty: 1 },
    { id: 'yupi', cat: 'Snack', category: 'Snack', name: 'Yupi Gummy', variant: 'Strawberry Kiss', price: 4500, hpp: 2200, invId: 'INV-01', invQty: 1 },
  ],
  mixExtraItems: [
    { id: 'art-rose', cat: 'Bunga & Boneka', category: 'Bunga & Boneka', name: 'Mawar Pita Satin', variant: 'Per tangkai (anti layu)', price: 10500, hpp: 4200, invId: 'INV-02', invQty: 1 },
    { id: 'art-tulip', cat: 'Bunga & Boneka', category: 'Bunga & Boneka', name: 'Tulip Pita Satin', variant: 'Per tangkai pastel', price: 11500, hpp: 4500, invId: 'INV-02', invQty: 1 },
    { id: 'art-sunflower', cat: 'Bunga & Boneka', category: 'Bunga & Boneka', name: 'Sunflower Artificial', variant: 'Per tangkai cerah', price: 13000, hpp: 5000, invId: 'INV-02', invQty: 1 },
    { id: 'mini-bear', cat: 'Bunga & Boneka', category: 'Bunga & Boneka', name: 'Boneka Bear Mini 12cm', variant: 'Cokelat / Cream', price: 22000, hpp: 13000, invId: 'INV-06', invQty: 1 },
    { id: 'polaroid-pcs', cat: 'Foto & Uang', category: 'Foto & Uang', name: 'Cetak Foto Polaroid', variant: 'Laminasi glossy + tusuk', price: 7500, hpp: 2500, invId: 'INV-03', invQty: 1 },
    { id: 'photostrip-pcs', cat: 'Foto & Uang', category: 'Foto & Uang', name: 'Photostrip 3 Pose', variant: 'Laminasi + frame estetik', price: 10000, hpp: 3500, invId: 'INV-03', invQty: 1 },
    { id: 'money-sleeve-pcs', cat: 'Foto & Uang', category: 'Foto & Uang', name: 'Slot Uang Plastik', variant: 'Jasa rangkai per lembar', price: 4000, hpp: 1000, invId: 'INV-07', invQty: 1 },
    { id: 'parfum-mini', cat: 'Kado & Aksesoris', category: 'Kado & Aksesoris', name: 'Parfum Mini 30ml', variant: 'Aroma soft vanilla / floral', price: 28000, hpp: 17000, invId: 'INV-08', invQty: 1 },
    { id: 'scrunchie-set', cat: 'Kado & Aksesoris', category: 'Kado & Aksesoris', name: 'Scrunchie & Jepit Rambut', variant: 'Set satin pastel', price: 15000, hpp: 8000, invId: 'INV-08', invQty: 1 },
    { id: 'mirror-pocket', cat: 'Kado & Aksesoris', category: 'Kado & Aksesoris', name: 'Cermin Saku Estetik', variant: 'Minimalis cream / blush', price: 18000, hpp: 10000, invId: 'INV-08', invQty: 1 },
    { id: 'scented-candle', cat: 'Kado & Aksesoris', category: 'Kado & Aksesoris', name: 'Lilin Aromaterapi Mini', variant: 'Lavender / Vanilla', price: 24000, hpp: 14000, invId: 'INV-08', invQty: 1 },
    { id: 'keychain-charm', cat: 'Kado & Aksesoris', category: 'Kado & Aksesoris', name: 'Gantungan Kunci Lucu', variant: 'Akrilik / plush charm', price: 14000, hpp: 7500, invId: 'INV-08', invQty: 1 },
  ],
  satinColors: [
    { id: 'Burgundy Velvet', hex: '#882B42', lightHex: '#B64963', darkHex: '#591627' },
    { id: 'Dusty Blush', hex: '#D48A9A', lightHex: '#EAB4C0', darkHex: '#A75E6E' },
    { id: 'Champagne Cream', hex: '#DFCFAF', lightHex: '#F3EAD8', darkHex: '#B8A27A' },
    { id: 'Lilac Silk', hex: '#A993C4', lightHex: '#C9B8DE', darkHex: '#7A6396' },
    { id: 'Midnight Navy', hex: '#293855', lightHex: '#47597E', darkHex: '#182236' },
    { id: 'Sunflower Gold', hex: '#D49B27', lightHex: '#ECC159', darkHex: '#9A6C11' },
  ],
  wrapStyles: [
    { id: 'korean', label: 'Korean Multi-Layer', price: 30000, hpp: 14000, desc: 'Lipatan bertumpuk lebar bergaya butik' },
    { id: 'dome', label: 'Round Dome Wrap', price: 26000, hpp: 12000, desc: 'Bentuk kubah simetris kokoh untuk snack & uang' },
    { id: 'cone', label: 'Classic Minimalist', price: 20000, hpp: 9500, desc: 'Siluet kerucut ramping bersih' },
  ],
  wrapColors: [
    { id: 'Cream Linen', hex: '#F2EBD9', foldHex: '#E5DBC3', border: '#C7B89B' },
    { id: 'Charcoal Matte', hex: '#2C2B29', foldHex: '#1C1B1A', border: '#141413' },
    { id: 'Dusty Rose', hex: '#E8C5CC', foldHex: '#D8A7B1', border: '#B97E8B' },
    { id: 'Botanical Sage', hex: '#B7C7B8', foldHex: '#96AC98', border: '#6F8871' },
    { id: 'Espresso Kraft', hex: '#7A5C49', foldHex: '#5D4334', border: '#463125' },
    { id: 'Lilac Mist', hex: '#DDD4E8', foldHex: '#C3B5D4', border: '#9A87B2' },
  ],
  ribbonColors: [
    { id: 'Satin Burgundy', hex: '#882B42' },
    { id: 'Champagne Gold', hex: '#B89352' },
    { id: 'Obsidian Black', hex: '#1C1F1D' },
    { id: 'Ivory Silk', hex: '#EDE6D8' },
  ],
  addons: [
    { id: 'photoPrint', label: 'Tambah 5 Foto Polaroid', price: 20000, hpp: 12500, invId: 'INV-03', invQty: 5 },
    { id: 'artificialAccent', label: 'Tambah 3 Rangkaian Bunga', price: 25000, hpp: 12600, invId: 'INV-02', invQty: 3 },
    { id: 'doll', label: 'Boneka Wisuda / Bear 18cm', price: 35000, hpp: 22000, invId: 'INV-06', invQty: 1 },
    { id: 'led', label: 'Lampu LED Warm', price: 15000, hpp: 5500, invId: 'INV-09', invQty: 1 },
    { id: 'goldTrim', label: 'Cellophane List Gold', price: 10000, hpp: 3200, invId: 'INV-04', invQty: 1 },
  ],
  moneySlots: {
    counts: [0, 5, 10, 15, 25],
    slotPrice: 4000,
    slotHpp: 1000,
    invId: 'INV-07',
    denominations: [
      { value: 2000, label: 'Rp 2.000', color: '#8E8B82' },
      { value: 5000, label: 'Rp 5.000', color: '#B88952' },
      { value: 10000, label: 'Rp 10.000', color: '#7D608C' },
      { value: 20000, label: 'Rp 20.000', color: '#3E7A58' },
      { value: 50000, label: 'Rp 50.000', color: '#2B5B84' },
      { value: 100000, label: 'Rp 100.000', color: '#A63A4B' },
    ],
    sources: [
      { id: 'studio', label: 'Uang dari Studio (Siap Jadi)', desc: 'Nominal uang sudah termasuk di total harga' },
      { id: 'self', label: 'Bawa / Kirim Uang Sendiri', desc: 'Bayar jasa rangkai & slot plastik saja' },
    ],
  },
  photoStyles: [
    { id: 'polaroid-classic', label: 'Polaroid Klasik Putih' },
    { id: 'polaroid-noir', label: 'Polaroid Frame Hitam' },
    { id: 'photostrip', label: 'Photostrip 3 Pose' },
  ],
  artificialTypes: [
    { id: 'mawar-satin', label: 'Mawar Pita Satin' },
    { id: 'tulip-satin', label: 'Tulip Pita Satin' },
    { id: 'sunflower-art', label: 'Sunflower Artificial' },
    { id: 'mix-art', label: 'Mix Mawar & Baby Breath' },
  ],
  cardThemes: [
    { id: 'ivory', label: 'Warm Ivory', bg: '#F8F5F0', text: '#1C1F1D', border: '#D8D0C5' },
    { id: 'blush', label: 'Soft Rose', bg: '#FAF1F3', text: '#5E1A2B', border: '#E4C5CD' },
    { id: 'noir', label: 'Noir Gold', bg: '#1C1F1D', text: '#E7D4A8', border: '#1C1F1D' },
    { id: 'mono', label: 'Clean White', bg: '#FFFFFF', text: '#1C1F1D', border: '#E5DFD5' },
  ],
};

const CUSTOM_FILL_CATALOG = [
  ...CONFIGURATOR_OPTIONS.popularSnacks,
  ...CONFIGURATOR_OPTIONS.mixExtraItems,
];

const SAMPLE_REFERENCES = [
  {
    id: 'ref-snack-choco',
    label: 'Ref IG: Snack Cokelat + Foto Polaroid',
    note: 'Tolong buatkan buket snack isi serba cokelat (Silverqueen, Pocky, Beng-Beng) + tambahan 5 foto polaroid, wrap Cream Linen pita Champagne Gold.',
    presetConfig: {
      bouquetType: 'snack',
      fillCount: 10,
      satinColor: 'Champagne Cream',
      wrapStyle: 'korean',
      wrapColor: 'Cream Linen',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: 'Snack serba cokelat: Silverqueen, Pocky, Beng-Beng, KitKat',
      addons: { photoPrint: true, artificialAccent: false, doll: false, led: false, goldTrim: true },
    },
    image: 'assets/snack-bouquet.jpg',
  },
  {
    id: 'ref-wisuda-mix',
    label: 'Ref WA: Wisuda Mix Foto + Boneka + Rangkaian Bunga',
    note: 'Mohon dibuatkan buket wisuda isi foto polaroid + boneka toga + aksen Rangkaian Bunga tema Sunflower Gold, wrap Botanical Sage.',
    presetConfig: {
      bouquetType: 'mix',
      fillCount: 10,
      satinColor: 'Sunflower Gold',
      wrapStyle: 'korean',
      wrapColor: 'Botanical Sage',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: '4 foto wisuda, 4 snack manis, 2 Rangkaian Bunga kuning + boneka toga',
      addons: { photoPrint: false, artificialAccent: true, doll: true, led: true, goldTrim: false },
    },
    image: 'assets/polaroid-bouquet.jpg',
  },
  {
    id: 'ref-money-maroon',
    label: 'Ref Pinterest: Money 15 Slot + Rangkaian Bunga Burgundy',
    note: 'Minta dibuatkan mirip referensi ini kak: 15 slot uang kosong + aksen 3 Rangkaian Bunga burgundy, wrap Charcoal Matte pita gold & LED.',
    presetConfig: {
      bouquetType: 'money',
      fillCount: 15,
      satinColor: 'Burgundy Velvet',
      wrapStyle: 'dome',
      wrapColor: 'Charcoal Matte',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: '15 slot uang rapi + 3 Rangkaian Bunga burgundy di bagian bawah',
      addons: { photoPrint: false, artificialAccent: true, doll: false, led: true, goldTrim: true },
    },
    image: 'assets/money-bouquet.jpg',
  },
];

const FLORISTS = [
  'Owner Azzatul Bouquet',
  'Rina (Perangkai)',
];

const ORDER_STATUSES = [
  'Menunggu Konfirmasi',
  'Pembayaran Terverifikasi',
  'Sedang Dirangkai',
  'Siap Diambil/Dikirim',
  'Selesai',
  'Dibatalkan',
];

const DELIVERY_ZONES = [
  { id: 'studio', label: 'Ambil di Tempat (Lokasi Toko)', fee: 0, eta: 'Siap sesuai urutan antrean FIFO', needAddress: false },
  { id: 'delivery', label: 'Pengiriman (Kurir Instan)', fee: 15000, eta: 'Diantar ke alamat tujuan', needAddress: true },
];

const VOUCHERS = {
  WISUDA15: {
    code: 'WISUDA15',
    type: 'percent',
    value: 15,
    maxDiscount: 35000,
    minSpend: 100000,
    label: 'Diskon 15% Buket Wisuda (maks Rp 35rb)',
  },
  AZZATUL20: {
    code: 'AZZATUL20',
    type: 'flat',
    value: 20000,
    maxDiscount: 20000,
    minSpend: 130000,
    label: 'Potongan Rp 20.000 Spesial Azzatul Bouquet',
  },
  KREASI20: {
    code: 'KREASI20',
    type: 'flat',
    value: 20000,
    maxDiscount: 20000,
    minSpend: 130000,
    label: 'Potongan Rp 20.000 Spesial Azzatul Bouquet',
    hidden: true,
  },
  MEKAR20: {
    code: 'MEKAR20',
    type: 'flat',
    value: 20000,
    maxDiscount: 20000,
    minSpend: 130000,
    label: 'Potongan Rp 20.000 Spesial Azzatul Bouquet',
    hidden: true,
  },
};

const SEED_INVENTORY = [
  { id: 'INV-01', name: 'Paket Snack Assorted (Cokelat/Wafer/Biskuit)', category: 'Isi Snack', qty: 65, unit: 'pcs', minQty: 20, unitCost: 4500, supplier: 'Distributor Snack Grosir' },
  { id: 'INV-02', name: 'Rangkaian Bunga (Pita Satin & Silk Artificial)', category: 'Rangkaian Bunga', qty: 48, unit: 'tangkai', minQty: 15, unitCost: 4200, supplier: 'Produksi Internal & Craft' },
  { id: 'INV-03', name: 'Cetak Foto Polaroid + Laminasi Glossy', category: 'Isi Foto', qty: 75, unit: 'lembar', minQty: 20, unitCost: 2500, supplier: 'Studio Cetak Internal' },
  { id: 'INV-04', name: 'Kertas Cellophane Matte & List Gold', category: 'Wrapping', qty: 95, unit: 'lembar', minQty: 30, unitCost: 3500, supplier: 'Grosir Kertas Studio' },
  { id: 'INV-05', name: 'Tusuk Sate, Kawat Tangkai & Sterofoam Base', category: 'Rangka & Penyangga', qty: 40, unit: 'ikat', minQty: 10, unitCost: 8000, supplier: 'Toko Craft & Dekorasi' },
  { id: 'INV-06', name: 'Boneka Teddy Wisuda / Bear 18cm', category: 'Add-on', qty: 14, unit: 'pcs', minQty: 5, unitCost: 22000, supplier: 'Sentra Boneka' },
  { id: 'INV-07', name: 'Rangka Slot Uang Plastik (Money Sleeve)', category: 'Money Bouquet', qty: 200, unit: 'slot', minQty: 50, unitCost: 1000, supplier: 'Grosir Kertas Studio' },
  { id: 'INV-08', name: 'Kertas Art Carton Kartu Ucapan A6', category: 'Cetak Kartu Mandiri', qty: 85, unit: 'lembar', minQty: 20, unitCost: 1000, supplier: 'Toko Kertas & Percetakan' },
  { id: 'INV-09', name: 'Lem Tembak (Glue Stick) & Lampu LED Warm', category: 'Perlengkapan', qty: 34, unit: 'set', minQty: 10, unitCost: 5500, supplier: 'Toko Craft & Dekorasi' },
];

const SEED_PRODUCTS = [
  {
    id: 'PRD-01',
    name: 'Choco Crunch — Buket Snack 10 Item',
    category: 'Buket Snack',
    price: 115000,
    hpp: 71500,
    stock: 14,
    sold: 78,
    satinBloomCount: 10,
    satinMinutesPerBloom: 3,
    dimensions: '48 x 34 cm',
    prepMinutes: 30,
    image: 'assets/snack-bouquet.jpg',
    description: '10 item snack cokelat & wafer favorit dirangkai bertingkat dengan wrapping Korean multi-layer dan kartu ucapan A6 gratis.',
    tags: ['Best Seller', '10 Snack'],
    preset: {
      bouquetType: 'snack',
      fillCount: 10,
      satinColor: 'Champagne Cream',
      wrapStyle: 'korean',
      wrapColor: 'Cream Linen',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: 'Silverqueen, Pocky, Beng-Beng, KitKat & Oreo',
      addons: { photoPrint: false, artificialAccent: false, doll: false, led: false, goldTrim: true },
    },
    recipe: [
      { invId: 'INV-01', qty: 10 },
      { invId: 'INV-04', qty: 5 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-02',
    name: 'Money Bouquet Minimalist (10 Slot Uang)',
    category: 'Buket Uang',
    price: 95000,
    hpp: 45600,
    stock: 18,
    sold: 84,
    satinBloomCount: 10,
    satinMinutesPerBloom: 3,
    dimensions: '50 x 35 cm',
    prepMinutes: 35,
    image: 'assets/money-bouquet.jpg',
    description: 'Jasa rangkai 10 slot uang plastik aman tanpa lem langsung ke uang, dipadukan aksen 3 Rangkaian Bunga & wrapping rapi.',
    tags: ['10 Slot Uang', 'Aman Tanpa Lem'],
    preset: {
      bouquetType: 'money',
      fillCount: 10,
      satinColor: 'Midnight Navy',
      wrapStyle: 'korean',
      wrapColor: 'Charcoal Matte',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: '10 slot uang plastik + aksen 3 Rangkaian Bunga',
      addons: { photoPrint: false, artificialAccent: true, doll: false, led: false, goldTrim: false },
    },
    recipe: [
      { invId: 'INV-07', qty: 10 },
      { invId: 'INV-02', qty: 3 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-03',
    name: 'Memory Polaroid — Buket 10 Foto + LED',
    category: 'Buket Foto',
    price: 120000,
    hpp: 53500,
    stock: 12,
    sold: 63,
    satinBloomCount: 10,
    satinMinutesPerBloom: 4,
    dimensions: '46 x 32 cm',
    prepMinutes: 35,
    image: 'assets/polaroid-bouquet.jpg',
    description: '10 foto polaroid cetak studio berlaminasi anti pudar, dihias lampu LED warm dan wrapping Dusty Rose estetik.',
    tags: ['Cetak Foto', 'LED Warm'],
    preset: {
      bouquetType: 'photo',
      fillCount: 10,
      satinColor: 'Dusty Blush',
      wrapStyle: 'korean',
      wrapColor: 'Dusty Rose',
      ribbonColor: 'Satin Burgundy',
      moneySlots: 0,
      customFillNote: '10 foto polaroid custom kirim via WA setelah checkout',
      addons: { photoPrint: false, artificialAccent: false, doll: false, led: true, goldTrim: false },
    },
    recipe: [
      { invId: 'INV-03', qty: 10 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-09', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-04',
    name: 'All-in-One Wisuda — Boneka, Snack & Foto',
    category: 'Mix Custom',
    price: 165000,
    hpp: 100100,
    stock: 15,
    sold: 92,
    satinBloomCount: 10,
    satinMinutesPerBloom: 5,
    dimensions: '52 x 36 cm',
    prepMinutes: 45,
    image: 'assets/mix-bouquet.jpg',
    description: 'Paket lengkap wisuda: boneka toga 18cm, mix snack & foto polaroid, 3 Rangkaian Bunga, lampu LED warm, dan kartu A6.',
    tags: ['Favorit Wisuda', 'Mix Lengkap'],
    preset: {
      bouquetType: 'mix',
      fillCount: 10,
      satinColor: 'Sunflower Gold',
      wrapStyle: 'korean',
      wrapColor: 'Botanical Sage',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: 'Mix snack favorit + 5 foto wisuda + boneka toga',
      addons: { photoPrint: false, artificialAccent: true, doll: true, led: true, goldTrim: false },
    },
    recipe: [
      { invId: 'INV-06', qty: 1 },
      { invId: 'INV-01', qty: 6 },
      { invId: 'INV-03', qty: 4 },
      { invId: 'INV-02', qty: 3 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-09', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-05',
    name: 'Burgundy Artificial Rose — 15 Tangkai',
    category: 'Rangkaian Bunga',
    price: 175000,
    hpp: 93000,
    stock: 11,
    sold: 49,
    satinBloomCount: 15,
    satinMinutesPerBloom: 6,
    dimensions: '50 x 35 cm',
    prepMinutes: 45,
    image: 'assets/artificial-bouquet.jpg',
    description: '15 tangkai bunga mawar buatan (pita satin & silk artificial) anti layu selamanya dengan wrapping Charcoal List Gold.',
    tags: ['Rangkaian Bunga', 'Awet Selamanya'],
    preset: {
      bouquetType: 'artificial',
      fillCount: 15,
      satinColor: 'Burgundy Velvet',
      wrapStyle: 'korean',
      wrapColor: 'Charcoal Matte',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: '15 tangkai Rangkaian Bunga Burgundy Velvet',
      addons: { photoPrint: false, artificialAccent: false, doll: false, led: false, goldTrim: true },
    },
    recipe: [
      { invId: 'INV-02', qty: 15 },
      { invId: 'INV-04', qty: 6 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-06',
    name: 'Snack & Money Combo (7 Snack + 10 Slot)',
    category: 'Mix Custom',
    price: 120000,
    hpp: 64500,
    stock: 10,
    sold: 58,
    satinBloomCount: 7,
    satinMinutesPerBloom: 4,
    dimensions: '52 x 36 cm',
    prepMinutes: 40,
    image: 'assets/mix-bouquet.jpg',
    description: 'Kombinasi serunya 7 item snack pilihan + 10 slot uang plastik rapi dalam satu buket kado ulang tahun atau wisuda.',
    tags: ['Snack + Uang', 'Best Value'],
    preset: {
      bouquetType: 'snack',
      fillCount: 7,
      satinColor: 'Lilac Silk',
      wrapStyle: 'dome',
      wrapColor: 'Lilac Mist',
      ribbonColor: 'Obsidian Black',
      moneySlots: 10,
      customFillNote: '7 snack manis/gurih + 10 slot uang di bagian atas',
      addons: { photoPrint: false, artificialAccent: false, doll: false, led: false, goldTrim: false },
    },
    recipe: [
      { invId: 'INV-01', qty: 7 },
      { invId: 'INV-07', qty: 10 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-07',
    name: 'Money Bouquet Deluxe (20 Slot + LED)',
    category: 'Buket Uang',
    price: 155000,
    hpp: 68100,
    stock: 9,
    sold: 41,
    satinBloomCount: 20,
    satinMinutesPerBloom: 3,
    dimensions: '62 x 48 cm',
    prepMinutes: 50,
    image: 'assets/money-bouquet.jpg',
    description: 'Rangka kipas 20 slot uang (jasa rangkai) dengan aksen 3 Rangkaian Bunga, cellophane list gold, dan lampu LED warm.',
    tags: ['Deluxe 20 Slot', 'LED Warm'],
    preset: {
      bouquetType: 'money',
      fillCount: 20,
      satinColor: 'Burgundy Velvet',
      wrapStyle: 'dome',
      wrapColor: 'Charcoal Matte',
      ribbonColor: 'Champagne Gold',
      moneySlots: 0,
      customFillNote: '20 slot uang kipas mewah + list gold + LED warm',
      addons: { photoPrint: false, artificialAccent: true, doll: false, led: true, goldTrim: true },
    },
    recipe: [
      { invId: 'INV-07', qty: 20 },
      { invId: 'INV-02', qty: 3 },
      { invId: 'INV-04', qty: 6 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-09', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
  {
    id: 'PRD-08',
    name: 'Petite Custom Gift — 5 Foto & Rangkaian Bunga',
    category: 'Buket Foto',
    price: 80000,
    hpp: 48100,
    stock: 16,
    sold: 37,
    satinBloomCount: 5,
    satinMinutesPerBloom: 4,
    dimensions: '40 x 28 cm',
    prepMinutes: 25,
    image: 'assets/polaroid-bouquet.jpg',
    description: 'Buket ringkas hemat budget berisi 5 foto polaroid + 3 tangkai Rangkaian Bunga dengan wrapping Espresso Kraft klasik.',
    tags: ['Hemat Budget', 'Petite'],
    preset: {
      bouquetType: 'photo',
      fillCount: 5,
      satinColor: 'Champagne Cream',
      wrapStyle: 'cone',
      wrapColor: 'Espresso Kraft',
      ribbonColor: 'Ivory Silk',
      moneySlots: 0,
      customFillNote: '5 foto polaroid + 3 Rangkaian Bunga cream',
      addons: { photoPrint: false, artificialAccent: true, doll: false, led: false, goldTrim: false },
    },
    recipe: [
      { invId: 'INV-03', qty: 5 },
      { invId: 'INV-02', qty: 3 },
      { invId: 'INV-04', qty: 4 },
      { invId: 'INV-05', qty: 1 },
      { invId: 'INV-08', qty: 1 },
    ],
  },
];

function getTodayDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + Number(offsetDays || 0));
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const SEED_ORDERS = [];

const SEED_STOCK_LOGS = [
  { id: 'LOG-01', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), invId: 'INV-01', itemName: 'Paket Snack Assorted (Cokelat/Wafer/Biskuit)', type: 'MASUK (RESTOCK)', delta: 30, ref: 'RESTOCK-SNACK-01', note: 'Belanja snack cokelat, wafer & biskuit varian favorit' },
  { id: 'LOG-02', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), invId: 'INV-02', itemName: 'Rangkaian Bunga (Pita Satin & Silk Artificial)', type: 'PRODUKSI SATIN (MASUK)', delta: 20, ref: 'BATCH-ARTIFICIAL-01', note: 'Batch pre-made Rangkaian Bunga & pita satin oleh Owner Azzatul Bouquet' },
  { id: 'LOG-03', timestamp: new Date(Date.now() - 86400000).toISOString(), invId: 'INV-04', itemName: 'Kertas Cellophane Matte & List Gold', type: 'MASUK (RESTOCK)', delta: 40, ref: 'CEK-MINGGUAN', note: 'Restock cellophane hasil pengecekan rutin mingguan' },
  { id: 'LOG-04', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), invId: 'INV-03', itemName: 'Cetak Foto Polaroid + Laminasi Glossy', type: 'KELUAR (PRODUKSI)', delta: -4, ref: 'BATCH-DISPLAY-01', note: 'Sampel display buket foto polaroid studio' },
];

const SEED_EXPENSES = [
  { id: 'EXP-01', date: getTodayDateString(-3), category: 'Restock Bahan Baku', description: 'Belanja Snack Assorted, Slot Uang & Kertas Cellophane', amount: 245000 },
  { id: 'EXP-02', date: getTodayDateString(-1), category: 'Operasional Studio', description: 'Kertas Foto Polaroid, Laminasi & Art Carton A6', amount: 75000 },
  { id: 'EXP-03', date: getTodayDateString(0), category: 'Restock Bahan Baku', description: 'Lem Tembak (Glue Stick), Tusuk & Sterofoam Base', amount: 55000 },
];

const SEED_OPNAME_LOGS = [
  {
    id: 'OPN-03',
    date: getTodayDateString(-1),
    period: 'Mingguan',
    auditor: 'Owner Azzatul Bouquet',
    itemName: 'Seluruh Bahan Buket Custom (9 Item)',
    systemQty: 656,
    physicalQty: 656,
    diff: 0,
    status: 'Sesuai — Aman',
    note: 'Cek rutin mingguan sebelum akhir pekan: stok snack, slot uang, kertas foto, dan Rangkaian Bunga lengkap.',
  },
  {
    id: 'OPN-02',
    date: getTodayDateString(-8),
    period: 'Mingguan',
    auditor: 'Rina (Perangkai)',
    itemName: 'Rangka Slot Uang Plastik (Money Sleeve)',
    systemQty: 200,
    physicalQty: 200,
    diff: 0,
    status: 'Sesuai — Aman',
    note: 'Stok slot uang plastik aman untuk pesanan mendadak.',
  },
  {
    id: 'OPN-01',
    date: getTodayDateString(-30),
    period: 'Bulanan',
    auditor: 'Owner Azzatul Bouquet',
    itemName: 'Seluruh Perlengkapan Studio & Art Carton A6',
    systemQty: 495,
    physicalQty: 495,
    diff: 0,
    status: 'Sesuai — Aman',
    note: 'Audit bulanan menyeluruh: tidak pernah kehabisan bahan.',
  },
];

const ADMIN_ACCOUNTS = [
  {
    id: 'ADM-OWNER',
    username: 'owner',
    password: 'owner123',
    name: 'Owner Azzatul',
    displayName: 'Owner Azzatul Bouquet',
    role: 'owner',
    roleLabel: 'Owner',
    allowedTabs: ['orders', 'satin', 'inventory', 'products', 'finance'],
  },
  {
    id: 'ADM-CRAFTER',
    username: 'crafter',
    password: 'crafter123',
    name: 'Rina',
    displayName: 'Rina (Perangkai)',
    role: 'crafter',
    roleLabel: 'Perangkai & Admin WA',
    allowedTabs: ['orders', 'satin', 'inventory'],
  },
];
