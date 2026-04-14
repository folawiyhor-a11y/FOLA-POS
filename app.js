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
    if(pageId !== 'posPage') document.getElementById('billPrintView').style.display = 'none';
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
    const u = document.getElementById("username").value;
    const p = document.getElementById("password").value;
    if (u === "Admin" && p === "1842") { currentUser = {role: "admin"}; goToDashboard(); }
    else if (u === "waiter1" && p === "1111") { currentUser = {role: "waiter"}; goToDashboard(); }
    else alert("Invalid Login Credentials");
}

/* INVENTORY & MENU */
function saveNewItem() {
    const name = document.getElementById("newItemName").value;
    const price = parseInt(document.getElementById("newItemPrice").value);
    const category = document.getElementById("newItemCategory").value;
    if (!name || !price) return alert("Please fill in all details");
    menu[category].push({ name, price, stock: 0 });
    saveAll();
    alert("Item added to " + category);
    goToDashboard();
}

function renderInventory() {
    const list = document.getElementById("inventoryList"); list.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        list.innerHTML += `<h3>${cat}</h3>`;
        menu[cat].forEach((item, index) => {
            list.innerHTML += `<div class="inventory-row"><span>${item.name}</span>
            <div>Stock: <input type="number" value="${item.stock}" onchange="updateStock('${cat}', ${index}, this.value)"></div></div>`;
        });
    });
}

function updateStock(cat, index, val) {
    menu[cat][index].stock = parseInt(val);
    saveAll();
}

/* POS LOGIC */
function renderTables() {
    let grid = document.getElementById("tableGrid"); grid.innerHTML = "";
    for (let i = 1; i <= 100; i++) {
        let div = document.createElement("div"); div.className = "tableBox"; div.innerText = i;
        div.onclick = () => { activeTable = "Table "+i; openPOS(); };
        grid.appendChild(div);
    }
}

function openPOS() {
    showPage("posPage");
    document.getElementById("activeTableTitle").innerText = activeTable;
    renderMenu(); renderOrder();
}

function renderMenu() {
    let grid = document.getElementById("menuGrid"); grid.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        menu[cat].forEach(item => {
            let div = document.createElement("div"); div.className = "menuItem";
            div.innerHTML = `<b>${item.name}</b><br>₦${item.price}<br><small>In Stock: ${item.stock}</small>`;
            div.onclick = () => addItem(cat, item);
            grid.appendChild(div);
        });
    });
}

function addItem(cat, item) {
    if (item.stock <= 0) return alert("This item is currently out of stock!");
    if (!orders[activeTable]) orders[activeTable] = [];
    let exist = orders[activeTable].find(i => i.name === item.name);
    if (exist) exist.qty++; else orders[activeTable].push({...item, cat, qty: 1});
    item.stock--;
    saveAll(); renderOrder(); renderMenu();
}

function changeQty(index, amount) {
    let item = orders[activeTable][index];
    let menuCategory = menu[item.cat];
    let menuItem = menuCategory.find(m => m.name === item.name);

    if (amount > 0) {
        if (menuItem.stock <= 0) return alert("Out of stock!");
        item.qty++; menuItem.stock--;
    } else {
        item.qty--; menuItem.stock++;
        if (item.qty <= 0) orders[activeTable].splice(index, 1);
    }
    saveAll(); renderOrder(); renderMenu();
}

function renderOrder() {
    let box = document.getElementById("orderBox"); box.innerHTML = "";
    let total = 0;
    (orders[activeTable] || []).forEach((item, index) => {
        total += item.price * item.qty;
        box.innerHTML += `
            <div class="orderItem">
                <div style="display:flex; justify-content:space-between;">
                    <b>${item.name}</b> <span>₦${item.price * item.qty}</span>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span>Quantity: ${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>`;
    });
    document.getElementById("total").innerText = total;
}

/* PRINTING & CHECKOUT */
function printBill() {
    if (!orders[activeTable] || orders[activeTable].length === 0) return alert("Order is empty!");
    
    const printView = document.getElementById('billPrintView');
    const itemsList = document.getElementById('billItemsList');
    
    document.getElementById('billTableTitle').innerText = activeTable;
    document.getElementById('billDateTime').innerText = new Date().toLocaleString();
    itemsList.innerHTML = `<div class="slip-item"><b>Item</b><b>Qty</b><b>Total</b></div>`;
    
    let total = 0;
    orders[activeTable].forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        itemsList.innerHTML += `<div class="slip-item"><span>${item.name}</span><span>${item.qty}</span><span>₦${itemTotal}</span></div>`;
    });
    
    document.getElementById('billTotal').innerText = "Total: ₦" + total;
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
    else return alert("Invalid selection!");
    
    checkout(payType);
}

function checkout(payType) {
    salesHistory.push({
        date: new Date().toISOString().split('T')[0],
        items: orders[activeTable],
        total: document.getElementById("total").innerText,
        paymentMethod: payType
    });
    delete orders[activeTable];
    saveAll();
    alert("Payment Successful via " + payType);
    goToDashboard();
}

function saveAll() {
    localStorage.setItem("fola_menu", JSON.stringify(menu));
    localStorage.setItem("fola_sales", JSON.stringify(salesHistory));
}

function renderSalesReport() {
    const selectedDate = document.getElementById("reportDate").value;
    const list = document.getElementById("salesItemsList"); list.innerHTML = "";
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
        list.innerHTML += `<div class="slip-item"><span>${name}</span><span>${s.qty}</span><span>₦${total}</span></div>`;
    });
    document.getElementById("slipTotal").innerText = "Total Sales: ₦" + dayTotal;
}