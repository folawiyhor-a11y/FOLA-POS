// --- CALCULATING TOTALS WITH TAX & SERVICE CHARGE ---
function renderOrder() {
    let box = document.getElementById("orderBox");
    if (!box) return;

    box.innerHTML = "";
    let subtotal = 0;

    // Loop through items to get the subtotal
    (orders[activeTable] || []).forEach((item, index) => {
        subtotal += item.price * item.qty;
        
        // This keeps your existing list display
        box.innerHTML += `
            <div class="order-item">
                <span>${item.name} x ${item.qty}</span>
                <span>₦${(item.price * item.qty).toLocaleString()}</span>
            </div>`;
    });

    // 1. Calculate Charges
    let serviceCharge = subtotal * 0.10; // 10% Service Charge
    let tax = subtotal * 0.025;         // 2.5% Consumption Tax
    let grandTotal = subtotal + serviceCharge + tax;

    // 2. Display the breakdown below the items
    box.innerHTML += `
        <div class="totals-section" style="margin-top: 10px; border-top: 1px solid #ddd; pt-2">
            <div style="display:flex; justify-content:space-between;">
                <span>Subtotal:</span> <span>₦${subtotal.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color: #555;">
                <span>Service Charge (10%):</span> <span>₦${serviceCharge.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color: #555;">
                <span>Tax (2.5%):</span> <span>₦${tax.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 1.2em; margin-top: 5px;">
                <span>Grand Total:</span> <span>₦${grandTotal.toLocaleString()}</span>
            </div>
        </div>
    `;

    // 3. Update the hidden total value for your "Checkout" button
    const totalDisplay = document.getElementById("total");
    if (totalDisplay) {
        totalDisplay.innerText = grandTotal;
    }
}
