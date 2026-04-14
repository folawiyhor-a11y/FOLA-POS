/* GLOBAL STATE */
let currentUser = {};
let activeTable = null;

let menu = JSON.parse(localStorage.getItem("fola_menu")) || {
    Food: [{ name: "Jollof Rice", price: 2500, stock: 50 }],
    Drinks: [{ name: "Coke", price: 700, stock: 100 }]
};

let salesHistory = JSON.parse(localStorage.getItem("fola_sales")) || [];
let orders = JSON.parse(localStorage.getItem("fola_orders")) || {};
let orderNotes = JSON.parse(localStorage.getItem("fola_notes")) || {};

/* NAVIGATION */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

function goToDashboard() { showPage("dashboardPage"); }
function goToTables() { showPage("tablePage"); renderTables(); }
function goToAddMenu() { showPage("addMenuPage"); }
function goToInventory() { showPage("inventoryPage"); renderInventory(); }
function goToSales() {
    document.getElementById("reportDate").valueAsDate = new Date();
    showPage("salesPage");
    renderSalesReport();
}
function signOut() { currentUser = {}; location.reload(); }

/* LOGIN LOGIC */
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
        alert("Invalid Login. Use Admin / 1842");
    }
}

/* MENU & INVENTORY MANAGEMENT */
function saveNewItem() {
    const name = document.getElementById("newItemName").value.trim();
    const price = parseInt(document.getElementById("newItemPrice").value);
    const category = document.getElementById("newItemCategory").value;
    if (!name || !price) return alert("Please fill in all details");
    menu[category].push({ name, price, stock: 0 });
    saveAll();
    alert("Item added!");
    goToDashboard();
}

function renderInventory() {
    const list = document.getElementById("inventoryList");
    list.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        list.innerHTML += `<h3>${cat}</h3>`;
        menu[cat].forEach((item, index) => {
            list.innerHTML += `
                <div class="inventory-row">
                    <span>${item.name}</span>
                    <div>Stock: <input type="number" value="${item.stock}" onchange="updateStock('${cat}', ${index}, this.value)"></div>
                </div>`;
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
    document.getElementById("orderNote").value = orderNotes[activeTable] || "";
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
    if (item.stock <= 0) return alert("Out of stock!");
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

    let service = subtotal * 0.10;
    let tax = subtotal * 0.025;
    let grand = subtotal + service + tax;

    box.innerHTML += `
        <div style="margin-top:10px; border-top:1px solid #444; padding-top:10px; font-size:0.9em;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>₦${subtotal.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Service (10%):</span><span>₦${service.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Tax (2.5%):</span><span>₦${tax.toLocaleString()}</span></div>
        </div>`;

    document.getElementById("total").innerText = grand.toLocaleString();
    
    // Save note to table state
    document.getElementById("orderNote").oninput = (e) => {
        orderNotes[activeTable] = e.target.value;
        saveAll();
    };
}

/* CHECKOUT & PRINTING */
function printBill() {
    if (!orders[activeTable] || orders[activeTable].length === 0) return alert("Order is empty!");
    
    document.getElementById('billTableTitle').innerText = activeTable;
    document.getElementById('billDateTime').innerText = new Date().toLocaleString();
    document.getElementById('billNoteView').innerText = "Notes: " + (orderNotes[activeTable] || "None");

    let list = document.getElementById('billItemsList');
    list.innerHTML = "";
    let subtotal = 0;

    orders[activeTable].forEach(item => {
        subtotal += item.price * item.qty;
        list.innerHTML += `<div class="slip-item"><span>${item.name}</span><span>x${item.qty}</span><span>₦${(item.price * item.qty).toLocaleString()}</span></div>`;
    });

    let total = subtotal * 1.125;
    document.getElementById('billTotal').innerText = "Grand Total: ₦" + total.toLocaleString();
    
    document.getElementById('billPrintView').style.display = 'block';
    window.print();
}

function openPaymentModal() {
    if (!orders[activeTable] || orders[activeTable].length === 0) return alert("Order is empty!");
    const method = prompt("Payment Method:\n1. Cash\n2. Transfer\n3. Card");
    let payType = method === "1" ? "Cash" : method === "2" ? "Transfer" : method === "3" ? "Card" : "";
    if (!payType) return alert("Invalid selection.");
    checkout(payType);
}

function checkout(payType) {
    let subtotal = 0;
    orders[activeTable].forEach(item => subtotal += item.price * item.qty);
    let total = subtotal * 1.125;

    salesHistory.push({
        date: new Date().toISOString().split('T')[0],
        total: total,
        method: payType,
        items: orders[activeTable]
    });

    delete orders[activeTable];
    delete orderNotes[activeTable];
    saveAll();
    alert("✅ Checkout Successful!");
    goToDashboard();
}

/* SALES REPORTING */
function renderSalesReport() {
    const selectedDate = document.getElementById("reportDate").value;
    const list = document.getElementById("salesItemsList");
    let total = 0;
    let methods = { Cash: 0, Transfer: 0, Card: 0 };

    salesHistory.filter(s => s.date === selectedDate).forEach(sale => {
        total += sale.total;
        methods[sale.method] += sale.total;
    });

    list.innerHTML = `
        <div class="slip-item"><span><b>Payment Type</b></span><span></span><span><b>Total</b></span></div>
        <div class="slip-item"><span>Cash Sales</span><span></span><span>₦${methods.Cash.toLocaleString()}</span></div>
        <div class="slip-item"><span>Transfer Sales</span><span></span><span>₦${methods.Transfer.toLocaleString()}</span></div>
        <div class="slip-item"><span>Card Sales</span><span></span><span>₦${methods.Card.toLocaleString()}</span></div>
    `;
    document.getElementById("slipTotal").innerText = "Total Daily Revenue: ₦" + total.toLocaleString();
}

function saveAll() {
    localStorage.setItem("fola_menu", JSON.stringify(menu));
    localStorage.setItem("fola_sales", JSON.stringify(salesHistory));
    localStorage.setItem("fola_orders", JSON.stringify(orders));
    localStorage.setItem("fola_notes", JSON.stringify(orderNotes));
}
