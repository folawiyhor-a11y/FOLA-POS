/* STATE MANAGEMENT */
let menu = JSON.parse(localStorage.getItem("fola_menu")) || { Food: [], Drinks: [] };
let sales = JSON.parse(localStorage.getItem("fola_sales")) || [];
let expenses = JSON.parse(localStorage.getItem("fola_expenses")) || [];
let auditTrail = JSON.parse(localStorage.getItem("fola_audit")) || [];
let orders = JSON.parse(localStorage.getItem("fola_orders")) || {};
let activeTable = null;

/* CORE NAVIGATION */
function showPage(id) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    if (u === "Admin" && p === "1842") {
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("mainApp").style.display = "flex";
        logAudit("Admin Login Successful");
        goToTables();
    } else { alert("Invalid Credentials"); }
}

function logAudit(msg) {
    auditTrail.push({ time: new Date().toLocaleString(), msg, user: "Admin" });
    saveData();
}

function saveData() {
    localStorage.setItem("fola_menu", JSON.stringify(menu));
    localStorage.setItem("fola_sales", JSON.stringify(sales));
    localStorage.setItem("fola_expenses", JSON.stringify(expenses));
    localStorage.setItem("fola_audit", JSON.stringify(auditTrail));
    localStorage.setItem("fola_orders", JSON.stringify(orders));
}

/* SIDEBAR HANDLERS */
function goToTables() { showPage("tablePage"); renderTables(); }
function goToSales() { 
    document.getElementById("reportDate").valueAsDate = new Date();
    showPage("salesPage"); 
    renderFullReport(); 
}
function goToExpenses() { showPage("expensePage"); renderExpenses(); }
function goToAddMenu() { showPage("addMenuPage"); }
function goToInventory() { showPage("inventoryPage"); renderInventory(); }
function signOut() { logAudit("User Logged Out"); location.reload(); }

/* ACCOUNTING & RECONCILIATION */
function logExpense() {
    const desc = document.getElementById("expDesc").value;
    const amt = parseInt(document.getElementById("expAmount").value);
    const cat = document.getElementById("expCat").value;
    if(!desc || !amt) return;
    expenses.push({ date: new Date().toISOString().split('T')[0], desc, amt, cat });
    logAudit(`EXPENSE ADDED: ${desc} - ₦${amt}`);
    renderExpenses();
    document.getElementById("expDesc").value = "";
    document.getElementById("expAmount").value = "";
}

function renderFullReport() {
    const date = document.getElementById("reportDate").value;
    const auditDiv = document.getElementById("auditLog");
    const reconDiv = document.getElementById("reconView");
    
    // Audit Trail Display
    auditDiv.innerHTML = "<h4>LOG HISTORY</h4>";
    auditTrail.slice(-20).reverse().forEach(a => {
        auditDiv.innerHTML += `<div><small>[${a.time}]</small> ${a.msg}</div>`;
    });

    // Financial Reconciliation
    let rev = 0; let exp = 0;
    let breakdown = { Cash: 0, Transfer: 0, Card: 0, Split: 0 };
    sales.filter(s => s.date === date).forEach(s => { 
        rev += s.total; 
        if(breakdown[s.method] !== undefined) breakdown[s.method] += s.total;
    });
    expenses.filter(e => e.date === date).forEach(e => exp += e.amt);

    reconDiv.innerHTML = `
        <h3 class="center">Daily Balance</h3>
        <p>Total Revenue: ₦${rev.toLocaleString()}</p>
        <p style="color:#ef4444">Total Expenses: -₦${exp.toLocaleString()}</p>
        <hr>
        <p><b>NET PROFIT: ₦${(rev - exp).toLocaleString()}</b></p>
    `;
}

/* POS LOGIC */
function renderTables() {
    let grid = document.getElementById("tableGrid"); grid.innerHTML = "";
    for (let i = 1; i <= 24; i++) {
        let div = document.createElement("div"); div.className = "tableBox";
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
    let grid = document.getElementById("menuGrid"); grid.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        menu[cat].forEach(item => {
            let div = document.createElement("div"); div.className = "menuItem";
            div.innerHTML = `<b>${item.name}</b><br>₦${item.price.toLocaleString()}<br><small>Stock: ${item.stock}</small>`;
            div.onclick = () => addItem(cat, item);
            grid.appendChild(div);
        });
    });
}

function addItem(cat, item) {
    if (item.stock <= 0) return alert("Out of Stock!");
    if (!orders[activeTable]) orders[activeTable] = [];
    let exist = orders[activeTable].find(i => i.name === item.name);
    if (exist) exist.qty++; else orders[activeTable].push({ ...item, cat, qty: 1 });
    item.stock--;
    saveData(); renderOrder(); renderMenu();
}

function renderOrder() {
    let box = document.getElementById("orderBox"); box.innerHTML = "";
    let subtotal = 0;
    (orders[activeTable] || []).forEach(item => {
        subtotal += item.price * item.qty;
        box.innerHTML += `<div class="orderItem"><b>${item.name} (x${item.qty})</b> ₦${(item.price * item.qty).toLocaleString()}</div>`;
    });
    document.getElementById("total").innerText = (subtotal * 1.125).toLocaleString();
}

function openPaymentModal() {
    const total = parseFloat(document.getElementById("total").innerText.replace(/,/g, ''));
    const method = prompt("Select Method:\n1. Cash\n2. Transfer\n3. Card");
    let pType = method === "1" ? "Cash" : method === "2" ? "Transfer" : "Card";
    finalizeSale(total, pType);
}

function openSplitModal() {
    const total = parseFloat(document.getElementById("total").innerText.replace(/,/g, ''));
    const cash = parseInt(prompt("Amount in Cash?"));
    if (isNaN(cash) || cash >= total) return alert("Invalid amount.");
    finalizeSale(total, "Split");
    alert(`Split processed: Cash ₦${cash} + ₦${total - cash} on other method.`);
}

function finalizeSale(total, method) {
    sales.push({ date: new Date().toISOString().split('T')[0], total, method, table: activeTable });
    logAudit(`SALE COMPLETED: ₦${total} via ${method}`);
    delete orders[activeTable]; saveData(); goToTables();
}

function saveNewItem() {
    const name = document.getElementById("newItemName").value;
    const price = parseInt(document.getElementById("newItemPrice").value);
    const cat = document.getElementById("newItemCategory").value;
    if(!name || !price) return;
    menu[cat].push({ name, price, stock: 0 });
    logAudit(`MENU UPDATED: Added ${name}`);
    saveData(); goToAddMenu();
}

function renderInventory() {
    const list = document.getElementById("inventoryList"); list.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        list.innerHTML += `<h3>${cat}</h3>`;
        menu[cat].forEach((item, i) => {
            list.innerHTML += `<div class="inventory-row"><span>${item.name}</span><input type="number" value="${item.stock}" onchange="menu['${cat}'][${i}].stock=this.value;saveData();"></div>`;
        });
    });
}
