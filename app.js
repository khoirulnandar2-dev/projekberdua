// State Management
let products = JSON.parse(localStorage.getItem('cafe_products')) || [
    { id: 1, name: 'Premium Espresso', price: 25000, category: 'coffee', stock: 50, img: 'images/espresso.png' },
    { id: 2, name: 'Matcha Latte Luxury', price: 35000, category: 'coffee', stock: 30, img: 'images/matcha.png' },
    { id: 3, name: 'Golden Croissant', price: 28000, category: 'pastry', stock: 20, img: 'images/croissant.png' },
    { id: 4, name: 'Caramel Macchiato', price: 38000, category: 'coffee', stock: 40, img: 'images/caramel_macchiato.png' },
    { id: 5, name: 'Vanilla Bean Muffin', price: 22000, category: 'pastry', stock: 15, img: 'images/vanilla_muffin.png' },
    { id: 6, name: 'Cold Brew Elite', price: 32000, category: 'coffee', stock: 25, img: 'images/cold_brew.png' }
];

let cart = [];
let salesHistory = JSON.parse(localStorage.getItem('cafe_sales')) || [];
let settings = JSON.parse(localStorage.getItem('cafe_settings')) || {
    storeName: "L'Elite Café",
    currency: "IDR"
};

// Helper: Format Currency
function formatPrice(amount) {
    if (settings.currency === 'USD') {
        return '$ ' + (amount / 15000).toFixed(2);
    }
    return 'Rp ' + amount.toLocaleString('id-ID');
}

// Constants
const TAX_RATE = 0.1;

// DOM Elements
const pagesContainer = document.getElementById('content-pages');
const cartList = document.getElementById('cart-items-list');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total-price');
const pageTitle = document.getElementById('page-title');
const cartPanel = document.getElementById('cart-panel');
const modalOverlay = document.getElementById('modal-overlay');

// User Accounts & Roles
const USERS = [
    {
        username: 'admin',
        password: 'admin123',
        role: 'Admin',
        displayName: 'Admin Cafe',
        avatar: 'AD',
        avatarColor: '#A98467'
    }
];

// Role-based access control
const ROLE_PERMISSIONS = {
    Admin: ['dashboard', 'pos', 'inventory', 'reports', 'settings'],
};

// App Initialization
function init() {
    migrateProductImages();
    applySettings();
    processLogin();
    setupNavigation();
    setupMenuModalListeners();
    setupNotificationListeners();
    updateNotifications();
    updateClock();
    setInterval(updateClock, 1000);
}

// Migrate old product images to new unique ones
function migrateProductImages() {
    if (localStorage.getItem('cafe_images_migrated')) return;
    const imageMap = {
        4: 'images/caramel_macchiato.png',
        5: 'images/vanilla_muffin.png',
        6: 'images/cold_brew.png'
    };
    products.forEach(p => {
        if (imageMap[p.id] && p.img !== imageMap[p.id]) {
            p.img = imageMap[p.id];
        }
    });
    localStorage.setItem('cafe_products', JSON.stringify(products));
    localStorage.setItem('cafe_images_migrated', 'true');
}

function applySettings() {
    // Update café name in sidebar
    const logoText = document.querySelector('.logo span');
    if (logoText) logoText.textContent = settings.storeName;

    // Update café name in login screen
    const loginTitle = document.querySelector('.login-header h2');
    if (loginTitle) loginTitle.textContent = settings.storeName;
}

function getCurrentUser() {
    const role = sessionStorage.getItem('userRole');
    const username = sessionStorage.getItem('userUsername');
    return USERS.find(u => u.username === username && u.role === role) || null;
}

function updateSidebarProfile(user) {
    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl = document.getElementById('sidebar-username');
    const roleEl = document.getElementById('sidebar-role-text');
    if (!avatarEl || !nameEl || !roleEl) return;

    avatarEl.textContent = user.avatar;
    avatarEl.style.background = user.avatarColor;
    nameEl.textContent = user.displayName;

    // Render role badge
    const badgeClass = 'role-badge-admin'; // Only Admin role exists now
    roleEl.innerHTML = `<span class="role-chip ${badgeClass}">${user.role}</span>`;
}

function applyRolePermissions(role) {
    const allowed = ROLE_PERMISSIONS[role] || [];
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
        const page = btn.dataset.page;
        if (allowed.includes(page)) {
            btn.style.display = 'flex';
        } else {
            btn.style.display = 'none';
        }
    });
}

function processLogin() {
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.querySelector('.app-container');
    const errorMsg = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');

    // Check if already logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        const user = getCurrentUser();
        if (user) {
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            applyRolePermissions(user.role);
            updateSidebarProfile(user);
            renderPage('dashboard');
            setupLogoutButton();
        } else {
            // Invalid session, clear it
            sessionStorage.clear();
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputUser = document.getElementById('username').value.trim().toLowerCase();
        const inputPass = document.getElementById('password').value;

        const matched = USERS.find(
            u => u.username === inputUser && u.password === inputPass
        );

        if (matched) {
            // Hide error
            errorMsg.style.display = 'none';

            // Animate button
            submitBtn.textContent = 'Memuat...';
            submitBtn.disabled = true;

            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userRole', matched.role);
            sessionStorage.setItem('userUsername', matched.username);

            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';
                applyRolePermissions(matched.role);
                updateSidebarProfile(matched);
                renderPage('dashboard');
                setupLogoutButton();
                if (window.lucide) lucide.createIcons();
                submitBtn.textContent = 'Masuk ke Dashboard';
                submitBtn.disabled = false;
            }, 500);
        } else {
            // Show error message
            errorMsg.textContent = 'Username atau Password salah!';
            errorMsg.style.display = 'block';
            // Shake animation
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 600);
        }
    });
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    // Clone to remove old listeners
    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
    newBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            sessionStorage.clear();
            const appContainer = document.querySelector('.app-container');
            const loginScreen = document.getElementById('login-screen');
            appContainer.style.display = 'none';
            loginScreen.style.display = 'flex';
            loginScreen.style.opacity = '1';
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('login-error').style.display = 'none';
            if (window.lucide) lucide.createIcons();
        }
    });
}

// Navigation Handling
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const page = btn.dataset.page;
            renderPage(page);
        });
    });

    // Search Logic
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const activePage = document.querySelector('.nav-item.active').dataset.page;

            if (activePage === 'pos') {
                const filtered = products.filter(p => p.name.toLowerCase().includes(query));
                renderProductGrid(filtered);
            } else if (activePage === 'inventory') {
                const filtered = products.filter(p => p.name.toLowerCase().includes(query));
                renderInventoryTable(filtered);
            }
        });
    }
}

function renderPage(page) {
    pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);

    // Hide cart by default, show it only for POS
    if (page === 'pos') {
        cartPanel.style.display = 'flex';
    } else {
        cartPanel.style.display = 'none';
    }

    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'pos': renderPOS(); break;
        case 'inventory': renderInventory(); break;
        case 'reports': renderReports(); break;
        case 'settings': renderSettings(); break;
    }

    if (window.lucide) lucide.createIcons();
}

// --- Dashboard Logic ---
function renderDashboard() {
    const totalRevenue = salesHistory.reduce((sum, s) => sum + s.total, 0);
    const totalTransactions = salesHistory.length;

    // Total items sold should sum all 'qty' from all items in all sales
    const itemsSold = salesHistory.reduce((sum, sale) => {
        return sum + sale.items.reduce((innerSum, item) => innerSum + item.qty, 0);
    }, 0);

    const lowStockCount = products.filter(p => p.stock > 0 && p.stock < 10).length;
    const outOfStockCount = products.filter(p => p.stock <= 0).length;

    pagesContainer.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:#E9FCE9; color:#2E7D32"><i data-lucide="dollar-sign"></i></div>
                <div class="stat-info">
                    <h3>Pendapatan Bersih</h3>
                    <p class="value" style="color:#2E7D32">${formatPrice(totalRevenue)}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#EBF5FF; color:#006ADC"><i data-lucide="shopping-bag"></i></div>
                <div class="stat-info">
                    <h3>Total Transaksi</h3>
                    <p class="value">${totalTransactions}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#FFF4E5; color:#D97706"><i data-lucide="coffee"></i></div>
                <div class="stat-info">
                    <h3>Total Menu Terjual</h3>
                    <p class="value">${itemsSold} pcs</p>
                </div>
            </div>
            <div class="stat-card" style="cursor:pointer" onclick="renderPage('inventory')">
                <div class="stat-icon" style="background:#FDECEA; color:#D32F2F"><i data-lucide="alert-triangle"></i></div>
                <div class="stat-info">
                    <h3>Peringatan Stok</h3>
                    <p class="value" style="color:#D32F2F">${lowStockCount} Menipis</p>
                    <small style="color:#888">${outOfStockCount} Habis</small>
                </div>
            </div>
        </div>

        <div class="dashboard-main">
            <div class="chart-container">
                <div class="chart-header">
                    <h2>Tren Penjualan 7 Hari Terakhir</h2>
                </div>
                <canvas id="salesChart"></canvas>
            </div>
            <div class="recent-activity">
                <div class="recent-header">
                    <h2>Transaksi Terbaru</h2>
                </div>
                <ul class="activity-list" style="padding:0">
                    ${salesHistory.slice(-6).reverse().map(sale => `
                        <li style="list-style:none; padding: 15px 0; border-bottom: 1px solid #F5F5F5; display:flex; justify-content:space-between; align-items:center">
                            <div>
                                <div style="font-weight:600; color:var(--secondary)">Order #${sale.id}</div>
                                <div style="font-size:0.75rem; color:#888">${sale.time} • ${sale.method || 'cash'}</div>
                            </div>
                            <div style="font-weight:700; color:var(--primary-dark)">${formatPrice(sale.total)}</div>
                        </li>
                    `).join('') || '<div style="text-align:center; padding:40px; color:#999"><i data-lucide="inbox" style="width:40px;height:40px;margin-bottom:10px"></i><p>Belum ada transaksi</p></div>'}
                </ul>
            </div>
        </div>
    `;

    initChart();
}

// --- POS Logic ---
function renderPOS() {
    pagesContainer.innerHTML = `
        <div class="pos-container">
            <div class="category-tabs">
                <button class="tab active" onclick="filterCategory('all')">Semua Menu</button>
                <button class="tab" onclick="filterCategory('coffee')">Coffee</button>
                <button class="tab" onclick="filterCategory('pastry')">Pastry</button>
                <button class="tab" onclick="filterCategory('non-coffee')">Non-Coffee</button>
            </div>
            <div class="product-grid" id="product-grid"></div>
        </div>
    `;
    renderProductGrid(products);
}

function renderProductGrid(items) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = items.map(product => `
        <div class="product-card" onclick="addToCart(${product.id})">
            <div class="product-img">
                <img src="${product.img}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3 class="p-name">${product.name} ${product.stock <= 0 ? '<span style="color:red;font-size:0.7rem">(Habis)</span>' : ''}</h3>
                <div class="p-meta">
                    <span class="p-price">${formatPrice(product.price)}</span>
                    <span class="p-stock">Stok: ${product.stock}</span>
                </div>
            </div>
        </div>
    `).join('');
}

window.filterCategory = (cat) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (cat === 'all') {
        renderProductGrid(products);
    } else {
        const filtered = products.filter(p => p.category === cat);
        renderProductGrid(filtered);
    }
};

window.addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product.stock <= 0) {
        alert("Maaf, stok habis!");
        return;
    }

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
};

function updateCartUI() {
    cartList.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.img}" class="cart-item-img">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
            </div>
            <div class="cart-qty">
                <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    subtotalEl.textContent = formatPrice(subtotal);
    taxEl.textContent = formatPrice(tax);
    totalEl.textContent = formatPrice(total);
}

window.changeQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== id);
    } else {
        // Optional: Check stock
        const p = products.find(prod => prod.id === id);
        if (item.qty > p.stock) {
            alert("Melebihi stok yang tersedia");
            item.qty = p.stock;
        }
    }
    updateCartUI();
};

// --- Inventory Logic ---
function renderInventory() {
    pagesContainer.innerHTML = `
        <div class="inventory-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2>Kelola Menu & Stok</h2>
                <button onclick="openAddMenuModal()" class="checkout-btn" style="width:auto; padding:10px 20px;">+ Tambah Menu</button>
            </div>
            <table id="inventory-table">
                <thead>
                    <tr>
                        <th>Gambar</th>
                        <th>Nama Menu</th>
                        <th>Kategori</th>
                        <th>Harga</th>
                        <th>Stok</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="inventory-body"></tbody>
            </table>
        </div>
    `;
    renderInventoryTable(products);
}

function renderInventoryTable(items) {
    const body = document.getElementById('inventory-body');
    if (!body) return;
    body.innerHTML = items.map(p => {
        let statusClass = 'stock-ok';
        let statusText = 'Tersedia';
        if (p.stock <= 0) { statusClass = 'stock-out'; statusText = 'Habis'; }
        else if (p.stock < 10) { statusClass = 'stock-low'; statusText = 'Menipis'; }

        return `
        <tr>
            <td><img src="${p.img}" style="width:40px;height:40px;border-radius:8px"></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${formatPrice(p.price)}</td>
            <td>
                <input type="number" value="${p.stock}" 
                    onchange="updateStock(${p.id}, this.value)"
                    style="width:60px; padding:5px; border:1px solid #ddd; border-radius:4px">
            </td>
            <td><span class="stock-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button onclick="openEditMenuModal(${p.id})" style="background:none;border:none;cursor:pointer;color:var(--primary-dark)">
                    <i data-lucide="edit-2" style="width:18px"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

window.updateStock = (id, newStock) => {
    const p = products.find(prod => prod.id === id);
    p.stock = parseInt(newStock);
    saveData();
    // Re-render to update badges
    renderInventory();
};

// --- Reports Logic ---
function renderReports() {
    const totalRevenue = salesHistory.reduce((sum, s) => sum + s.total, 0);
    const totalTax = salesHistory.reduce((sum, s) => sum + s.tax, 0);

    pagesContainer.innerHTML = `
        <div class="reports-container">
            <div class="report-summary-cards" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:30px;">
                <div class="stat-card">
                    <div class="stat-info"><h3>Total Penjualan Bruto</h3><p class="value">${formatPrice(totalRevenue)}</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><h3>Total Pajak (10%)</h3><p class="value">${formatPrice(totalTax)}</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><h3>Net Revenue</h3><p class="value">${formatPrice(totalRevenue - totalTax)}</p></div>
                </div>
            </div>

            <div class="inventory-container">
                <h2>Riwayat Transaksi Terperinci</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID Invoice</th>
                            <th>Waktu</th>
                            <th>Metode</th>
                            <th>Menu</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${salesHistory.slice().reverse().map(sale => `
                            <tr>
                                <td style="font-weight:600">${sale.id}</td>
                                <td>${sale.date} ${sale.time}</td>
                                <td style="text-transform:uppercase">${sale.method || 'cash'}</td>
                                <td>${sale.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</td>
                                <td style="font-weight:600">${formatPrice(sale.total)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" style="text-align:center">Belum ada data transaksi</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- Settings Logic ---
function renderSettings() {
    const user = getCurrentUser();

    // Access guard: only Admin can access settings
    if (!user || user.role !== 'Admin') {
        pagesContainer.innerHTML = `
            <div class="access-denied-container">
                <div class="access-denied-card">
                    <div class="access-denied-icon">
                        <i data-lucide="shield-off"></i>
                    </div>
                    <h2>Akses Ditolak</h2>
                    <p>Halaman <strong>Pengaturan</strong> hanya dapat diakses oleh <strong>Admin</strong>.</p>
                    <p class="access-denied-sub">Akun Anda memiliki role <span class="role-chip role-badge-admin">${user ? user.role : 'Unknown'}</span> dan tidak memiliki izin untuk mengubah pengaturan sistem.</p>
                    <button onclick="renderPage('dashboard')" class="checkout-btn" style="width:auto; padding:12px 30px; margin-top:10px;">
                        <i data-lucide="arrow-left"></i> Kembali ke Dashboard
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    pagesContainer.innerHTML = `
        <div class="settings-container" style="max-width: 600px;">
            <div class="inventory-container">
                <h2>Pengaturan Toko</h2>
                <div style="display:flex; flex-direction:column; gap:20px; margin-top:20px;">
                    <div class="setting-item">
                        <label style="display:block; margin-bottom:8px; font-weight:600">Nama Café</label>
                        <input type="text" id="store-name-input" value="${settings.storeName}" class="modal-input">
                    </div>
                    <div class="setting-item">
                        <label style="display:block; margin-bottom:8px; font-weight:600">Mata Uang</label>
                        <select id="currency-select" class="modal-input">
                            <option value="IDR" ${settings.currency === 'IDR' ? 'selected' : ''}>Rupiah (IDR)</option>
                            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>Dollar (USD)</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button onclick="saveSettings()" class="checkout-btn" style="width:auto; padding:12px 25px;">Simpan Pengaturan</button>
                        <button onclick="clearData()" style="background:#D32F2F; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; width:auto;">
                            Hapus Semua Data Transaksi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.saveSettings = () => {
    const storeNameInput = document.getElementById('store-name-input');
    const currencySelect = document.getElementById('currency-select');

    if (storeNameInput && currencySelect) {
        settings.storeName = storeNameInput.value.trim() || "L'Elite Café";
        settings.currency = currencySelect.value;
        localStorage.setItem('cafe_settings', JSON.stringify(settings));
        applySettings();
        alert("Pengaturan berhasil disimpan!");
        renderSettings();
    }
};

window.clearData = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data transaksi? Ini tidak bisa dikembalikan.")) {
        localStorage.removeItem('cafe_sales');
        salesHistory = [];
        alert("Data telah dihapus.");
        renderPage('dashboard');
    }
}

// --- Checkout & Payment Logic ---
document.getElementById('checkout-trigger').addEventListener('click', () => {
    if (cart.length === 0) return alert("Keranjang masih kosong");
    modalOverlay.style.display = 'flex';
    resetPaymentModal();
});

function resetPaymentModal() {
    // Reset to QRIS by default
    document.querySelectorAll('.p-option').forEach(opt => opt.classList.remove('active'));
    document.querySelector('[data-method="qris"]').classList.add('active');
    document.querySelectorAll('.payment-view').forEach(view => view.classList.remove('active'));
    document.getElementById('qris-view').classList.add('active');

    // Update cash label and placeholder based on currency
    const cashLabel = document.querySelector('.cash-input-group label');
    const cashIn = document.getElementById('cash-amount');
    if (cashLabel && cashIn) {
        if (settings.currency === 'USD') {
            cashLabel.textContent = 'Uang Diterima ($)';
            cashIn.placeholder = 'Contoh: 5.00';
        } else {
            cashLabel.textContent = 'Uang Diterima (Rp)';
            cashIn.placeholder = 'Contoh: 50000';
        }
    }

    // Clear cash input
    const cashInput = document.getElementById('cash-amount');
    const cashChange = document.getElementById('cash-change');
    if (cashInput) cashInput.value = '';
    if (cashChange) cashChange.textContent = settings.currency === 'USD' ? '$ 0.00' : 'Rp 0';
}

// Payment method switching
document.querySelectorAll('.p-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.p-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const method = btn.dataset.method;
        document.querySelectorAll('.payment-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${method}-view`).classList.add('active');
    });
});

// Cash calculation
const cashInput = document.getElementById('cash-amount');
const cashChange = document.getElementById('cash-change');

if (cashInput) {
    cashInput.addEventListener('input', () => {
        const amount = parseFloat(cashInput.value) || 0;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const tax = Math.round(subtotal * TAX_RATE);
        const total = subtotal + tax;

        if (settings.currency === 'USD') {
            const totalUSD = total / 15000;
            const change = amount - totalUSD;
            if (change >= 0) {
                cashChange.textContent = `$ ${change.toFixed(2)}`;
                cashChange.style.color = '#2E7D32';
            } else {
                cashChange.textContent = `Kurang $ ${Math.abs(change).toFixed(2)}`;
                cashChange.style.color = '#D32F2F';
            }
        } else {
            const change = amount - total;
            if (change >= 0) {
                cashChange.textContent = `Rp ${Math.round(change).toLocaleString()}`;
                cashChange.style.color = '#2E7D32';
            } else {
                cashChange.textContent = `Kurang Rp ${Math.round(Math.abs(change)).toLocaleString()}`;
                cashChange.style.color = '#D32F2F';
            }
        }
    });
}

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });
});

// --- Menu CRUD Logic ---
window.openAddMenuModal = () => {
    document.getElementById('menu-id').value = '';
    document.getElementById('menu-name').value = '';
    document.getElementById('menu-category').value = 'coffee';
    document.getElementById('menu-price').value = '';
    document.getElementById('menu-stock').value = '';
    document.getElementById('menu-img').value = 'images/espresso.png';
    document.getElementById('menu-img-custom').value = '';
    document.getElementById('menu-img-custom').style.display = 'none';

    document.getElementById('menu-modal-title').textContent = 'Tambah Menu Baru';
    document.getElementById('delete-menu-btn').style.display = 'none';

    modalOverlay.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById('menu-modal').style.display = 'block';
    if (window.lucide) lucide.createIcons();
};

window.openEditMenuModal = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('menu-id').value = product.id;
    document.getElementById('menu-name').value = product.name;
    document.getElementById('menu-category').value = product.category;
    document.getElementById('menu-price').value = product.price;
    document.getElementById('menu-stock').value = product.stock;

    const imgSelect = document.getElementById('menu-img');
    const customImgInput = document.getElementById('menu-img-custom');

    const builtInImages = ['images/espresso.png', 'images/matcha.png', 'images/croissant.png', 'images/caramel_macchiato.png', 'images/vanilla_muffin.png', 'images/cold_brew.png'];
    if (builtInImages.includes(product.img)) {
        imgSelect.value = product.img;
        customImgInput.style.display = 'none';
        customImgInput.value = '';
    } else {
        imgSelect.value = 'custom';
        customImgInput.style.display = 'block';
        customImgInput.value = product.img;
    }

    document.getElementById('menu-modal-title').textContent = 'Edit Menu';
    document.getElementById('delete-menu-btn').style.display = 'block';

    modalOverlay.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById('menu-modal').style.display = 'block';
    if (window.lucide) lucide.createIcons();
};

function setupMenuModalListeners() {
    const imgSelect = document.getElementById('menu-img');
    const customImgInput = document.getElementById('menu-img-custom');
    if (imgSelect && customImgInput) {
        imgSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customImgInput.style.display = 'block';
                customImgInput.required = true;
            } else {
                customImgInput.style.display = 'none';
                customImgInput.required = false;
                customImgInput.value = '';
            }
        });
    }

    const menuForm = document.getElementById('menu-form');
    if (menuForm) {
        menuForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const idVal = document.getElementById('menu-id').value;
            const name = document.getElementById('menu-name').value.trim();
            const category = document.getElementById('menu-category').value;
            const price = parseInt(document.getElementById('menu-price').value) || 0;
            const stock = parseInt(document.getElementById('menu-stock').value) || 0;

            let img = imgSelect.value;
            if (img === 'custom') {
                img = customImgInput.value.trim() || 'images/espresso.png';
            }

            if (idVal) {
                // Edit existing product
                const productId = parseInt(idVal);
                const product = products.find(p => p.id === productId);
                if (product) {
                    product.name = name;
                    product.category = category;
                    product.price = price;
                    product.stock = stock;
                    product.img = img;
                }
            } else {
                // Add new product
                const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
                products.push({ id: newId, name, category, price, stock, img });
            }

            saveData();
            modalOverlay.style.display = 'none';

            // Refresh current view
            const activePage = document.querySelector('.nav-item.active').dataset.page;
            renderPage(activePage);
            alert("Data menu berhasil disimpan!");
        });
    }

    const deleteBtn = document.getElementById('delete-menu-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const idVal = document.getElementById('menu-id').value;
            if (idVal && confirm("Apakah Anda yakin ingin menghapus menu ini?")) {
                const productId = parseInt(idVal);
                products = products.filter(p => p.id !== productId);
                saveData();
                modalOverlay.style.display = 'none';

                // Refresh current view
                const activePage = document.querySelector('.nav-item.active').dataset.page;
                renderPage(activePage);
                alert("Menu berhasil dihapus!");
            }
        });
    }
}

document.getElementById('confirm-payment').addEventListener('click', () => {
    const activeMethod = document.querySelector('.p-option.active').dataset.method;

    if (activeMethod === 'cash') {
        const amount = parseFloat(cashInput.value) || 0;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const total = subtotal * (1 + TAX_RATE);
        const totalConverted = settings.currency === 'USD' ? (total / 15000) : total;
        if (amount < totalConverted) {
            alert("Uang yang diterima kurang!");
            return;
        }
    }

    completeTransaction(activeMethod);
});

function completeTransaction(method) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    const newSale = {
        id: 'INV-' + Date.now().toString().slice(-6),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        method: method,
        items: [...cart],
        subtotal,
        tax,
        total
    };

    // Update stocks
    cart.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        prod.stock -= item.qty;
    });

    salesHistory.push(newSale);
    saveData();

    // Reset Cart
    cart = [];
    updateCartUI();

    showReceiptModal(newSale);
}

// --- Helpers ---
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timerEl = document.getElementById('current-time');
    if (timerEl) timerEl.textContent = `${timeStr} | ${dateStr}`;
}

function saveData() {
    localStorage.setItem('cafe_products', JSON.stringify(products));
    localStorage.setItem('cafe_sales', JSON.stringify(salesHistory));
    updateNotifications();
}

function initChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Generate last 7 days data dynamically
    const labels = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        // Get day label (in Indonesian)
        let dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
        dayName = dayName.replace('.', ''); // Clean dots (like "Sen.")
        labels.push(dayName);

        // Match transactions on this day
        const targetDateStr = d.toLocaleDateString();
        const dailySales = salesHistory.filter(sale => {
            if (sale.timestamp) {
                const saleDate = new Date(sale.timestamp);
                return saleDate.toDateString() === d.toDateString();
            }
            return sale.date === targetDateStr;
        });

        const dailyTotal = dailySales.reduce((sum, s) => sum + s.total, 0);
        if (settings.currency === 'USD') {
            data.push(parseFloat((dailyTotal / 15000).toFixed(2)));
        } else {
            // Display in thousands of Rupiah
            data.push(Math.round(dailyTotal / 1000));
        }
    }

    const chartLabel = settings.currency === 'USD' ? 'Penjualan ($)' : 'Penjualan (Ribuan Rp)';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: chartLabel,
                data: data,
                borderColor: '#D4A373',
                backgroundColor: 'rgba(212, 163, 115, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Run app
init();

// --- Notification Logic ---
function setupNotificationListeners() {
    const trigger = document.getElementById('notification-trigger');
    const dropdown = document.getElementById('notification-dropdown');

    if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }
}

function updateNotifications() {
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');
    if (!badge || !list) return;

    const warningItems = products.filter(p => p.stock < 10);
    const count = warningItems.length;

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';

        list.innerHTML = warningItems.map(p => {
            const isOut = p.stock <= 0;
            const iconClass = isOut ? 'out' : 'low';
            const iconName = isOut ? 'x-circle' : 'alert-triangle';
            const title = isOut ? 'Stok Habis!' : 'Stok Menipis!';
            const desc = isOut ? `${p.name} habis.` : `${p.name} sisa ${p.stock} pcs.`;
            return `
                <div class="notification-item" onclick="viewProductInInventory(${p.id})">
                    <div class="notification-item-icon ${iconClass}">
                        <i data-lucide="${iconName}" style="width:18px;height:18px;"></i>
                    </div>
                    <div class="notification-item-info">
                        <div class="notification-item-title">${title}</div>
                        <div class="notification-item-desc">${desc}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                <i data-lucide="check-circle" style="width:24px; height:24px; margin:0 auto 8px; color:#2E7D32; display:block;"></i>
                Semua stok aman
            </div>
        `;
    }
    if (window.lucide) lucide.createIcons();
}

window.viewProductInInventory = (id) => {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.remove('active');

    // Toggle nav active state
    document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.page === 'inventory') {
            b.classList.add('active');
        }
    });

    renderPage('inventory');

    // Open edit modal directly
    setTimeout(() => {
        openEditMenuModal(id);
    }, 100);
};

function showReceiptModal(sale) {
    document.getElementById('receipt-store-name').textContent = settings.storeName;
    document.getElementById('receipt-invoice-id').textContent = sale.id;
    document.getElementById('receipt-date-time').textContent = `${sale.date} ${sale.time}`;

    const itemsList = document.getElementById('receipt-items');
    itemsList.innerHTML = sale.items.map(item => {
        const itemTotal = item.price * item.qty;
        return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="max-width: 70%;">
                    <div>${item.name}</div>
                    <small style="color:#666;">${item.qty} x ${formatPrice(item.price)}</small>
                </div>
                <div>${formatPrice(itemTotal)}</div>
            </div>
        `;
    }).join('');

    document.getElementById('receipt-subtotal').textContent = formatPrice(sale.subtotal);
    document.getElementById('receipt-tax').textContent = formatPrice(sale.tax);
    document.getElementById('receipt-total').textContent = formatPrice(sale.total);

    document.getElementById('receipt-method').textContent = sale.method;

    const cashRow = document.getElementById('receipt-cash-row');
    const changeRow = document.getElementById('receipt-change-row');

    if (sale.method === 'cash') {
        cashRow.style.display = 'flex';
        changeRow.style.display = 'flex';

        const cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;

        if (settings.currency === 'USD') {
            document.getElementById('receipt-cash-amount').textContent = `$ ${cashAmount.toFixed(2)}`;
            const totalUSD = sale.total / 15000;
            const changeUSD = cashAmount - totalUSD;
            document.getElementById('receipt-change-amount').textContent = `$ ${Math.max(0, changeUSD).toFixed(2)}`;
        } else {
            document.getElementById('receipt-cash-amount').textContent = `Rp ${cashAmount.toLocaleString()}`;
            const changeIDR = cashAmount - sale.total;
            document.getElementById('receipt-change-amount').textContent = `Rp ${Math.max(0, changeIDR).toLocaleString()}`;
        }
    } else {
        cashRow.style.display = 'none';
        changeRow.style.display = 'none';
    }

    // Bind close-invoice-btn click listener
    const closeInvBtn = document.getElementById('close-invoice-btn');
    if (closeInvBtn) {
        const newCloseInvBtn = closeInvBtn.cloneNode(true);
        closeInvBtn.parentNode.replaceChild(newCloseInvBtn, closeInvBtn);
        newCloseInvBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
            renderPage('dashboard');
        });
    }

    // Show overlay and invoice modal
    modalOverlay.style.display = 'flex';
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById('invoice-modal').style.display = 'block';
    if (window.lucide) lucide.createIcons();
}
