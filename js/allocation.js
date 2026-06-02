// ==================== js/allocation.js ====================

app.allocation = {
  updateAllocationStats: function() {
    const drawSelect = document.getElementById('allocation-draw-select');
    
    if(drawSelect.options.length <= 1 && app.global.globalHistoryData.length > 0) {
        const uniqueDraws = [...new Set(app.global.globalHistoryData.map(h => h.drawDate))];
        let options = '<option value="current">งวดปัจจุบัน (กระดานปัจจุบัน)</option>';
        uniqueDraws.forEach(d => {
            let display = d;
            if(display.length > 20) { try { display = app.main.formatThaiDateTime(d); } catch(e) {} }
            options += `<option value="${d}">${display}</option>`;
        });
        drawSelect.innerHTML = options;
    }

    const selected = drawSelect.value || 'current';
    let totalSales = 0;
    let totalPayouts = 0;

    if (selected === 'current') {
        totalSales = app.global.globalBookedGroups.reduce((sum, g) => sum + g.totalPrice, 0);
        let winTop = document.getElementById('input-win-top').value;
        let winBot = document.getElementById('input-win-bot').value;
        if(winTop.length === 1) winTop = '0' + winTop;
        if(winBot.length === 1) winBot = '0' + winBot;
        
        let winnersCount = 0;
        app.global.globalBookedGroups.forEach(g => {
            if (winTop && g.topNums.includes(winTop)) winnersCount++;
            if (winBot && g.botNums.includes(winBot)) winnersCount++;
        });
        totalPayouts = winnersCount * 6000;
    } else {
        const histForDraw = app.global.globalHistoryData.filter(h => h.drawDate === selected);
        totalSales = histForDraw.reduce((sum, h) => sum + h.amount, 0);
        totalPayouts = histForDraw.reduce((sum, h) => sum + (h.prize || 0), 0);
    }

    document.getElementById('allocation-total-sales').value = totalSales;
    document.getElementById('allocation-payouts').value = totalPayouts;
    this.updateAllocationNetProfit();
  },

  updateAllocationNetProfit: function() {
    const sales = parseFloat(document.getElementById('allocation-total-sales').value) || 0;
    const payouts = parseFloat(document.getElementById('allocation-payouts').value) || 0;
    const reservePct = parseFloat(document.getElementById('allocation-reserve-pct').value) || 0;
    
    let grossProfit = sales - payouts;
    if (grossProfit < 0) grossProfit = 0; 
    
    const reserveAmount = grossProfit * (reservePct / 100);
    const netProfit = grossProfit - reserveAmount;
    
    document.getElementById('allocation-net-profit').value = netProfit;
    
    const reserveDisplay = document.getElementById('reserve-amount-display');
    if (reserveDisplay) {
        reserveDisplay.innerText = `หักสำรองกองกลาง: ${reserveAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท`;
    }
  },

  calculateAllocation: function() {
    const selected = document.getElementById('allocation-draw-select').value || 'current';
    const netProfit = parseFloat(document.getElementById('allocation-net-profit').value) || 0;
    
    const sales = parseFloat(document.getElementById('allocation-total-sales').value) || 0;
    const payouts = parseFloat(document.getElementById('allocation-payouts').value) || 0;
    const reservePct = parseFloat(document.getElementById('allocation-reserve-pct').value) || 0;
    
    let grossProfit = sales - payouts;
    let reserveAmount = 0;
    if(grossProfit > 0) reserveAmount = grossProfit * (reservePct / 100);

    if (netProfit < 0) return Swal.fire('แจ้งเตือน', 'กำไรสุทธิติดลบ ไม่สามารถคำนวณส่วนแบ่งได้', 'warning');

    let locationCounts = {};
    let totalTickets = 0;

    if (selected === 'current') {
        app.global.globalBookedGroups.forEach(g => {
            let user = app.global.globalAllUsers.find(u => String(u.name) === String(g.name));
            let loc = (user && user.location && user.location !== "") ? user.location : 'ไม่ระบุ';
            let ticketsCount = g.topNums.length + g.botNums.length;
            totalTickets += ticketsCount;
            if(!locationCounts[loc]) locationCounts[loc] = 0;
            locationCounts[loc] += ticketsCount;
        });
    } else {
        const histForDraw = app.global.globalHistoryData.filter(h => h.drawDate === selected);
        histForDraw.forEach(h => {
            let user = app.global.globalAllUsers.find(u => String(u.name) === String(h.name));
            let loc = (user && user.location && user.location !== "") ? user.location : 'ไม่ระบุ';
            let ticketsCount = 0;
            if(h.numbers) { ticketsCount = h.numbers.split(',').filter(n => n.trim() !== '').length; }
            totalTickets += ticketsCount;
            if(!locationCounts[loc]) locationCounts[loc] = 0;
            locationCounts[loc] += ticketsCount;
        });
    }

    if(totalTickets === 0) return Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลการจองในงวดที่เลือก', 'info');

    let html = `
    <div class="alert alert-secondary border-secondary mb-4 shadow-sm" style="background-color: var(--card-bg);">
        <h5 class="fw-bold mb-3" style="color: var(--text-color);"><i class="bi bi-receipt"></i> สรุปยอดเงินก่อนแบ่ง</h5>
        <div class="d-flex justify-content-between mb-1"><span class="lbl-bright">กำไรหลังหักแจ็คพอต:</span> <strong style="color: var(--text-color);">${grossProfit.toLocaleString()} บาท</strong></div>
        <div class="d-flex justify-content-between mb-1"><span class="text-warning">หักเข้ากองกลางสำรอง (${reservePct}%):</span> <strong class="text-warning">${reserveAmount.toLocaleString()} บาท</strong></div>
        <div class="d-flex justify-content-between mt-2 pt-2 border-top" style="border-color: var(--card-border) !important;">
            <span class="text-primary fw-bold">ยอดที่จะนำมาแบ่งตามสัดส่วน:</span> 
            <strong class="text-primary fs-5">${netProfit.toLocaleString()} บาท</strong>
        </div>
    </div>
    <div class="row g-3">`;

    for(let loc in locationCounts) {
        let count = locationCounts[loc];
        let percent = (count / totalTickets) * 100;
        let share = (count / totalTickets) * netProfit;

        html += `
        <div class="col-12 col-md-6">
            <div class="card p-3 shadow-sm border-start border-info border-4" style="background-color: var(--card-bg);">
                <h5 class="text-info fw-bold mb-2"><i class="bi bi-geo-alt-fill"></i> ${loc}</h5>
                <div class="d-flex justify-content-between text-muted small mb-1 lbl-bright">
                    <span>ยอดขายรวม: <b>${count}</b> รายการ</span>
                    <span>สัดส่วน: <b>${percent.toFixed(2)}%</b></span>
                </div>
                <h3 class="text-success mb-0 fw-bold mt-2 border-top pt-2" style="border-color: var(--card-border) !important;">
                    ส่วนแบ่ง: ${share.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿
                </h3>
            </div>
        </div>`;
    }
    html += `</div>`;
    document.getElementById('allocation-results').innerHTML = html;
  }
};