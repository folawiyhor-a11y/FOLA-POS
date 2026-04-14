let currentUser = {};
let activeTable = null;

let menu = JSON.parse(localStorage.getItem("fola_menu")) || {
    Food: [{ name: "Jollof Rice", price: 2500, stock: 50 }],
    Drinks: [{ name: "Coke", price: 700, stock: 100 }]
};

let salesHistory = JSON.parse(localStorage.getItem("fola_sales")) || [];
let orders = JSON.parse(localStorage.getItem("fola_orders")) || {};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if (pageId !== 'posPage') document.getElementById('billPrintView').style.display = 'none';
}

/* NAVIGATION */
function goToDashboard() { showPage("dashboardPage"); }
function goToTables() { showPage("tablePage"); renderTables(); }
function goToAddMenu() { showPage("addMenuPage"); }
function goToInventory() { showPage("inventoryPage"); renderInventory(); }
function goToSales() {
    document.getElementById("reportDate").valueAsDate = new Date();
    showPage("salesPage");
    renderSalesReport();
}
function signOut() { currentUser = {}; showPage("loginPage"); }

/* LOGIN */
function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    if (u === "Admin" && p === "1842") {
        currentUser = { role: "admin" };
        goToDashboard();
    } else if (u === "waiter1" && p === "1111") {
        currentUser = { role: "waiter" };
        goToDashboard();
    } else {
        alert("Invalid Login Credentials. Please check your username and password.");
    }
}

/* INVENTORY & MENU */
function saveNewItem() {
    const name = document.getElementById("newItemName").value.trim();
    const price = parseInt(document.getElementById("newItemPrice").value);
    const category = document.getElementById("newItemCategory").value;
    if (!name || !price) return alert("Please fill in all details");
    menu[category].push({ name, price, stock: 0 });
    saveAll();
    alert("Item added to " + category);
    goToDashboard();
}

function renderInventory() {
    const list = document.getElementById("inventoryList");
    list.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        list.innerHTML += `<h3>${cat}</h3>`;
        menu[cat].forEach((item, index) => {
            list.innerHTML += ` <div class="inventory-row"> <span>${item.name}</span> <div>Stock: <input type="number" value="${item.stock}" onchange="updateStock('${cat}', ${index}, this.value)"></div> </div>`;
        });
    });
}

function updateStock(cat, index, val) {
    menu[cat][index].stock = parseInt(val);
    saveAll();
}

/* POS LOGIC */
function renderTables() {
    let grid = document.getElementById("tableGrid");
    grid.innerHTML = "";
    for (let i = 1; i <= 100; i++) {
        let div = document.createElement("div");
        div.className = "tableBox";
        div.innerText = "Table " + i;
        div.onclick = () => { activeTable = "Table " + i; openPOS(); };
        grid.appendChild(div);
    }
}

function openPOS() {
    showPage("posPage");
    document.getElementById("activeTableTitle").innerText = activeTable;
    renderMenu();
    renderOrder();
}

function renderMenu() {
    let grid = document.getElementById("menuGrid");
    grid.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        menu[cat].forEach(item => {
            let div = document.createElement("div");
            div.className = "menuItem";
            div.innerHTML = `<b>${item.name}</b><br>₦${item.price.toLocaleString()}<br><small>In Stock: ${item.stock}</small>`;
            div.onclick = () => addItem(cat, item);
            grid.appendChild(div);
        });
    });
}

function addItem(cat, item) {
    if (item.stock <= 0) return alert("This item is currently out of stock!");
    if (!orders[activeTable]) orders[activeTable] = [];
    let exist = orders[activeTable].find(i => i.name === item.name);
    if (exist) exist.qty++;
    else orders[activeTable].push({ ...item, cat, qty: 1 });
    item.stock--;
    saveAll();
    renderOrder();
    renderMenu();
}

function changeQty(index, amount) {
    let item = orders[activeTable][index];
    let menuCategory = menu[item.cat];
    let menuItem = menuCategory.find(m => m.name === item.name);

    if (amount > 0) {
        if (menuItem.stock <= 0) return alert("Out of stock!");
        item.qty++;
        menuItem.stock--;
    } else {
        item.qty--;
        menuItem.stock++;
        if (item.qty <= 0) orders[activeTable].splice(index, 1);
    }
    saveAll();
    renderOrder();
    renderMenu();
}

function renderOrder() {
    let box = document.getElementById("orderBox");
    if (!box) return;
    box.innerHTML = "";
    let subtotal = 0;

    (orders[activeTable] || []).forEach((item, index) => {
        subtotal += item.price * item.qty;
        box.innerHTML += `
            <div class="orderItem">
                <div style="display:flex; justify-content:space-between;">
                    <b>${item.name}</b>
                    <span>₦${(item.price * item.qty).toLocaleString()}</span>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span>Qty: ${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>`;
    });

    let serviceCharge = subtotal * 0.10;
    let tax = subtotal * 0.025;
    let grandTotal = subtotal + serviceCharge + tax;

    box.innerHTML += `
        <div style="margin-top:12px; border-top:1px solid #374151; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#9ca3af;">
                <span>Subtotal:</span>
                <span>₦${subtotal.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#9ca3af;">
                <span>Service Charge (10%):</span>
                <span>₦${serviceCharge.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:#9ca3af;">
                <span>Tax (2.5%):</span>
                <span>₦${tax.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1em; color:#10b981;">
                <span>Grand Total:</span>
                <span>₦${grandTotal.toLocaleString()}</span>
            </div>
        </div>`;

    let totalElement = document.getElementById("total");
    if (totalElement) totalElement.innerText = grandTotal.toLocaleString();
}

function printBill() {
    if (!orders[activeTable] || orders[activeTable].length === 0) return alert("Order is empty!");
    const printView = document.getElementById('billPrintView');
    const itemsList = document.getElementById('billItemsList');

    document.getElementById('billTableTitle').innerText = activeTable;
    document.getElementById('billDateTime').innerText = new Date().toLocaleString();
    itemsList.innerHTML = `<div class="slip-item"><b>Item</b><b>Qty</b><b>Total</b></div>`;

    let subtotal = 0;
    orders[activeTable].forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        itemsList.innerHTML += `
            <div class="slip-item">
                <span>${item.name}</span>
                <span>${item.qty}</span>
                <span>₦${itemTotal.toLocaleString()}</span>
            </div>`;
    });

    let serviceCharge = subtotal * 0.10;
    let tax = subtotal * 0.025;
    let grandTotal = subtotal + serviceCharge + tax;

    itemsList.innerHTML += `
        <div style="margin-top:8px; border-top:1px dashed #ccc; padding-top:8px;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>₦${subtotal.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Service Charge (10%):</span><span>₦${serviceCharge.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Tax (2.5%):</span><span>₦${tax.toLocaleString()}</span></div>
        </div>`;

    document.getElementById('billTotal').innerText = "Grand Total: ₦" + grandTotal.toLocaleString();
    printView.style.display = 'block';
    window.print();
}

function openPaymentModal() {
    if (!orders[activeTable] || orders[activeTable].length === 0) return alert("Order is empty!");
    const method = prompt("Select Payment Method:\n1. Cash\n2. Transfer\n3. Card");
    let payType = "";
    if (method === "1") payType = "Cash";
    else if (method === "2") payType = "Transfer";
    else if (method === "3") payType = "Card";
    else return alert("Invalid selection! Please enter 1, 2, or 3.");
    checkout(payType);
}

function checkout(payType) {
    let subtotal = 0;
    orders[activeTable].forEach(item => subtotal += item.price * item.qty);
    let serviceCharge = subtotal * 0.10;
    let tax = subtotal * 0.025;
    let grandTotal = subtotal + serviceCharge + tax;

    salesHistory.push({
        date: new Date().toISOString().split('T')[0],
        items: orders[activeTable],
        subtotal: subtotal,
        serviceCharge: serviceCharge,
        tax: tax,
        total: grandTotal,
        paymentMethod: payType
    });
    delete orders[activeTable];
    saveAll();
    alert("✅ Payment Successful via " + payType + "\nGrand Total: ₦" + grandTotal.toLocaleString());
    goToDashboard();
}

function saveAll() {
    localStorage.setItem("fola_menu", JSON.stringify(menu));
    localStorage.setItem("fola_sales", JSON.stringify(salesHistory));
    localStorage.setItem("fola_orders", JSON.stringify(orders));
}

function renderSalesReport() {
    const selectedDate = document.getElementById("reportDate").value;
    const list = document.getElementById("salesItemsList");
    list.innerHTML = "";
    let dayTotal = 0;
    let summary = {};

    salesHistory.filter(s => s.date === selectedDate).forEach(sale => {
        sale.items.forEach(item => {
            if (!summary[item.name]) summary[item.name] = { qty: 0, price: item.price };
            summary[item.name].qty += item.qty;
        });
    });

    Object.keys(summary).forEach(name => {
        let s = summary[name];
        let total = s.qty * s.price;
        dayTotal += total;
        list.innerHTML += `
            <div class="slip-item">
                <span>${name}</span>
                <span>${s.qty}</span>
                <span>₦${total.toLocaleString()}</span>
            </div>`;
    });

    let serviceCharge = dayTotal * 0.10;
    let tax = dayTotal * 0.025;
    let grandTotal = dayTotal + serviceCharge + tax;

    document.getElementById("slipTotal").innerHTML = `
        <div style="font-size:0.9em; color:#555;">Subtotal: ₦${dayTotal.toLocaleString()}</div>
        <div style="font-size:0.9em; color:#555;">Service Charge (10%): ₦${serviceCharge.toLocaleString()}</div>
        <div style="font-size:0.9em; color:#555;">Tax (2.5%): ₦${tax.toLocaleString()}</div>
        <div style="font-weight:bold; font-size:1.1em;">Total Sales: ₦${grandTotal.toLocaleString()}</div>`;
}
