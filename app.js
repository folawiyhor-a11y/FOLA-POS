/* DATABASE SETTINGS */
let users = JSON.parse(localStorage.getItem("fola_users")) || [{user: "Admin", pass: "1842", role: "admin"}];
let menu = JSON.parse(localStorage.getItem("fola_menu")) || { Food: [{name:"Jollof", price:2500, stock:20}], Drinks: [] };
let sales = JSON.parse(localStorage.getItem("fola_sales")) || [];
let expenses = JSON.parse(localStorage.getItem("fola_expenses")) || [];
let auditTrail = JSON.parse(localStorage.getItem("fola_audit")) || [];
let orders = JSON.parse(localStorage.getItem("fola_orders")) || {};

let loggedInUser = null;
let activeTable = null;

/* 1. SECURE LOGIN & PERMISSIONS */
function handleLogin() {
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();
    const found = users.find(x => x.user === u && x.pass === p);

    if (found) {
        loggedInUser = found;
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("mainApp").style.display = "flex";
        
        // Phase Restrictions
        document.getElementById("managerLinks").style.display = (found.role !== "waiter") ? "block" : "none";
        document.getElementById("adminLinks").style.display = (found.role === "admin") ? "block" : "none";
        
        logAudit(`Login: ${u}`);
        goToTables();
    } else { alert("Login Failed"); }
}

/* 2. PHASE NAVIGATION (WITH BACK BUTTONS) */
function showPage(id) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function goToTables() { showPage("tablePage"); renderTables(); }
function goToSales() { showPage("salesPage"); renderFullReport(); }
function goToUserMgmt() { showPage("userMgmtPage"); renderUsers(); }
function signOut() { location.reload(); }

/* 3. SALES & PUNCHING */
function renderTables() {
    const grid = document.getElementById("tableGrid"); grid.innerHTML = "";
    for (let i = 1; i <= 30; i++) {
        const t = "Table " + i;
        const div = document.createElement("div"); div.className = "tableBox";
        if (orders[t] && orders[t].length > 0) div.style.background = "#f59e0b";
        div.innerText = t;
        div.onclick = () => { activeTable = t; openPOS(); };
        grid.appendChild(div);
    }
}

function openPOS() {
    showPage("posPage");
    document.getElementById("activeTableTitle").innerText = "Punching: " + activeTable;
    renderMenu(); renderOrder();
}

function renderMenu() {
    const grid = document.getElementById("menuGrid"); grid.innerHTML = "";
    Object.keys(menu).forEach(cat => {
        menu[cat].forEach(item => {
            const div = document.createElement("div"); div.className = "menuItem";
            div.innerHTML = `<b>${item.name}</b><br>₦${item.price.toLocaleString()}`;
            div.onclick = () => {
                if(!orders[activeTable]) orders[activeTable] = [];
                let ex = orders[activeTable].find(o => o.name === item.name);
                if(ex) ex.qty++; else orders[activeTable].push({...item, qty:1});
                saveData(); renderOrder();
            };
            grid.appendChild(div);
        });
    });
}

function renderOrder() {
    const box = document.getElementById("orderBox"); box.innerHTML = "";
    let sub = 0;
    (orders[activeTable] || []).forEach(item => {
        sub += item.price * item.qty;
        box.innerHTML += `<div class="orderItem">${item.name} x${item.qty} <span>₦${(item.price*item.qty).toLocaleString()}</span></div>`;
    });
    document.getElementById("total").innerText = (sub * 1.125).toLocaleString();
}

/* 4. ADMIN: USER CREATION */
function createUser() {
    const u = document.getElementById("newUsername").value;
    const p = document.getElementById("newPassword").value;
    const r = document.getElementById("newUserRole").value;
    if(!u || !p) return alert("Fill all fields");
    users.push({user: u, pass: p, role: r});
    saveData(); renderUsers();
    alert("New account saved successfully.");
}

function renderUsers() {
    const list = document.getElementById("userList");
    list.innerHTML = "<h4>Staff Accounts</h4>";
    users.forEach(u => list.innerHTML += `<div>${u.user} (${u.role})</div>`);
}

/* 5. RECEIPT PRINTING (THE GRID STYLE) */
function openPaymentModal() {
    const total = parseFloat(document.getElementById("total").innerText.replace(/,/g, ''));
    const methodChoice = prompt("1. Cash\n2. Transfer\n3. Card");
    if(!methodChoice) return;

    // Build Receipt HTML
    const order = orders[activeTable] || [];
    let subtotal = 0;
    let itemsHtml = "";
    order.forEach(item => {
        let val = item.price * item.qty;
        subtotal += val;
        itemsHtml += `<div style="display:flex; justify-content:space-between;"><span>${item.name.toUpperCase()} x${item.qty}</span><span>${val.toLocaleString()}</span></div>`;
    });

    document.getElementById("pTable").innerText = activeTable;
    document.getElementById("pItems").innerHTML = itemsHtml;
    document.getElementById("pSub").innerText = subtotal.toLocaleString();
    document.getElementById("pService").innerText = (subtotal * 0.125).toLocaleString();
    document.getElementById("pTotal").innerText = total.toLocaleString();
    document.getElementById("pStaff").innerText = loggedInUser.user.toUpperCase();
    document.getElementById("pTime").innerText = new Date().toLocaleString();

    window.print();
    finalizeSale(total, methodChoice);
}

function finalizeSale(total, method) {
    let mText = method == "1" ? "Cash" : method == "2" ? "Transfer" : "Card";
    sales.push({date: new Date().toISOString().split('T')[0], total, method: mText, table: activeTable, staff: loggedInUser.user});
    logAudit(`Sale Finalized: Table ${activeTable} via ${mText}`);
    delete orders[activeTable]; saveData(); goToTables();
}

/* 6. STORAGE */
function logAudit(msg) { auditTrail.push({time: new Date().toLocaleTimeString(), msg}); saveData(); }
function saveData() {
    localStorage.setItem("fola_users", JSON.stringify(users));
    localStorage.setItem("fola_menu", JSON.stringify(menu));
    localStorage.setItem("fola_sales", JSON.stringify(sales));
    localStorage.setItem("fola_expenses", JSON.stringify(expenses));
    localStorage.setItem("fola_audit", JSON.stringify(auditTrail));
    localStorage.setItem("fola_orders", JSON.stringify(orders));
}

