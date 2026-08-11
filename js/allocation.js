// ==================== js/allocation.js ====================

app.allocation = {
  // ฟังก์ชันลูกเล่นสำหรับปุ่ม ค้างจ่าย / จ่ายแล้ว
  toggleLocationStatus: function(btnElement) {
    if (btnElement.classList.contains('btn-danger')) {
        btnElement.classList.remove('btn-danger');
        btnElement.classList.add('btn-success');
        btnElement.innerHTML = '<i class="bi bi-check-circle-fill"></i> จ่ายแล้ว';
    } else {
        btnElement.classList.remove('btn-success');
        btnElement.classList.add('btn-danger');
        btnElement.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> ค้างจ่าย';
    }
  },

  updateAllocationStats: function() {
    const startSelect = document.getElementById('alloc-start-draw');
    const endSelect = document.getElementById('alloc-end-draw');
    
    // ดึงรายชื่องวดที่ไม่ซ้ำ และกรองค่าว่างออก
    const uniqueDraws = [...new Set(app.global.globalHistoryData.map(h => h.drawDate))].filter(d => d && d !== "-");
    
    if(startSelect && startSelect.options.length === 0 && uniqueDraws.length > 0) {
        let options = '';
        uniqueDraws.forEach(d => {
            let display = d;
            if(display.length > 10) { try { display = app.main.formatThaiDateTime(d); } catch(e) {} }
            options += `<option value="${d}">${display}</option>`;
        });
        
        startSelect.innerHTML = options;
        endSelect.innerHTML = options;
        
        // ค่าเริ่มต้น: ให้ช่องซ้าย(start) เป็นงวดเก่าสุด และ ช่องขวา(end) เป็นงวดใหม่สุด
        startSelect.selectedIndex = uniqueDraws.length - 1;
        endSelect.selectedIndex = 0;
    }

    let totalSales = 0;
    let totalPayouts = 0;
    let filteredHistory = [];

    const startVal = startSelect ? startSelect.value : '';
    const endVal = endSelect ? endSelect.value : '';

    // 1. คัดกรองข้อมูลตามช่วงงวด โดยอิงจากลำดับ (Index)
    if (uniqueDraws.length > 0 && startVal && endVal) {
        let idxStart = uniqueDraws.indexOf(startVal);
        let idxEnd = uniqueDraws.indexOf(endVal);
        
        if (idxStart !== -1 && idxEnd !== -1) {
            let minIdx = Math.min(idxStart, idxEnd);
            let maxIdx = Math.max(idxStart, idxEnd);
            
            filteredHistory = app.global.globalHistoryData.filter(h => {
                let idx = uniqueDraws.indexOf(h.drawDate);
                return idx >= minIdx && idx <= maxIdx;
            });
            
            totalSales += filteredHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
            totalPayouts += filteredHistory.reduce((sum, h) => sum + (Number(h.prize) || 0), 0);
        }
    }

    // 2. รวมยอดจากกระดานปัจจุบันด้วย (ถ้าติ๊กเลือก)
    if (document.getElementById('alloc-include-current') && document.getElementById('alloc-include-current').checked) {
        totalSales += app.global.globalBookedGroups.reduce((sum, g) => sum + g.totalPrice, 0);
        let winTop = document.getElementById('input-win-top').value;
        let winBot = document.getElementById('input-win-bot').value;
        if(winTop.length === 1) winTop = '0' + winTop;
        if(winBot.length === 1) winBot = '0' + winBot;
        
        let winnersCount = 0;
        app.global.globalBookedGroups.forEach(g => {
            if (winTop && g.topNums.includes(winTop)) winnersCount++;
            if (winBot && g.botNums.includes(winBot)) winnersCount++;
        });
        totalPayouts += (winnersCount * 6000);
    }

    document.getElementById('allocation-total-sales').value = totalSales;
    document.getElementById('allocation-payouts').value = totalPayouts;
    
    // เก็บประวัติที่คัดกรองแล้วไว้คำนวณตอนกดปุ่ม
    this.currentFilteredHistory = filteredHistory;
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
    const netProfit = parseFloat(document.getElementById('allocation-net-profit').value) || 0;
    const sales = parseFloat(document.getElementById('allocation-total-sales').value) || 0;
    const payouts = parseFloat(document.getElementById('allocation-payouts').value) || 0;
    const reservePct = parseFloat(document.getElementById('allocation-reserve-pct').value) || 0;
    
    let grossProfit = sales - payouts;
    let reserveAmount = 0;
    if(grossProfit > 0) reserveAmount = grossProfit * (reservePct / 100);

    if (netProfit <= 0 && sales <= 0) return Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลการจองในงวดที่เลือก', 'warning');

    let locationSales = {};
    let totalAllocatedSales = 0;

    // นับยอดเงินจากกระดานปัจจุบัน
    if (document.getElementById('alloc-include-current') && document.getElementById('alloc-include-current').checked) {
        app.global.globalBookedGroups.forEach(g => {
            let user = app.global.globalAllUsers.find(u => String(u.name) === String(g.name));
            let loc = (user && user.location && user.location !== "") ? user.location : 'ไม่ระบุ';
            let amount = Number(g.totalPrice) || 0;
            
            totalAllocatedSales += amount;
            if(!locationSales[loc]) locationSales[loc] = 0;
            locationSales[loc] += amount;
        });
    }

    // นับยอดเงินจากประวัติที่คัดกรองงวดมาแล้ว
    const filteredHistory = this.currentFilteredHistory || [];
    filteredHistory.forEach(h => {
        let user = app.global.globalAllUsers.find(u => String(u.name) === String(h.name));
        let loc = (user && user.location && user.location !== "") ? user.location : 'ไม่ระบุ';
        let amount = Number(h.amount) || 0;
        
        totalAllocatedSales += amount;
        if(!locationSales[loc]) locationSales[loc] = 0;
        locationSales[loc] += amount;
    });

    if(totalAllocatedSales === 0) return Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลยอดเงินในงวดที่เลือก', 'info');

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

    // วาด Card แต่ละพื้นที่พร้อมแสดง ยอดขาย (บาท) และสัดส่วน % ที่ถูกต้อง
    for(let loc in locationSales) {
        let locSalesAmount = locationSales[loc];
        let percent = (locSalesAmount / totalAllocatedSales) * 100;
        let share = (locSalesAmount / totalAllocatedSales) * netProfit;

        html += `
        <div class="col-12 col-md-6">
            <div class="card p-3 shadow-sm border-start border-info border-4" style="background-color: var(--card-bg);">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="text-info fw-bold mb-0"><i class="bi bi-geo-alt-fill"></i> ${loc}</h5>
                    <!-- ปุ่มกดเปลี่ยนสถานะรับเงิน -->
                    <button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="app.allocation.toggleLocationStatus(this)" title="คลิกเพื่อเปลี่ยนสถานะ">
                        <i class="bi bi-exclamation-circle-fill"></i> ค้างจ่าย
                    </button>
                </div>
                
                <div class="d-flex justify-content-between text-muted small mb-1 lbl-bright">
                    <span>ยอดขายรวม: <b>${locSalesAmount.toLocaleString()}</b> บาท</span>
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