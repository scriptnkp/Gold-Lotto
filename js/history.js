// ==================== js/history.js ====================

app.history = {
  loadHistoryData: async function(preserveSelection = true) {
    const drawSelect = document.getElementById('history-draw-select');
    let currentSelection = preserveSelection && drawSelect ? drawSelect.value : null;

    document.getElementById('loader').classList.remove('hidden');
    const res = await app.main.apiCall('getHistoryData');
    document.getElementById('loader').classList.add('hidden');
    if(!res || !res.success) return;

    app.global.globalHistoryData = res.list; 

    const uniqueDraws = [...new Set(app.global.globalHistoryData.map(h => h.drawDate))];
    
    if(uniqueDraws.length === 0) {
        if(drawSelect) drawSelect.innerHTML = '<option value="">ไม่มีข้อมูล</option>';
    } else {
        if(drawSelect) {
            drawSelect.innerHTML = uniqueDraws.map(d => {
                let display = d;
                if(display.length > 20) { try { display = app.main.formatThaiDateTime(d); } catch(e) {} }
                return `<option value="${d}">${display}</option>`;
            }).join('');
            
            if(currentSelection && uniqueDraws.includes(currentSelection)) {
                drawSelect.value = currentSelection;
            } else {
                drawSelect.selectedIndex = 0; 
            }
        }
    }
    
    this.updateHistoryView();
  },

  updateHistoryView: function() {
    const drawSelect = document.getElementById('history-draw-select');
    if (!drawSelect) return;
    const selected = drawSelect.value;
    let filteredData = app.global.globalHistoryData;
    if(selected) {
        filteredData = app.global.globalHistoryData.filter(h => h.drawDate === selected);
    }

    // --- ส่วนที่เพิ่มใหม่: เรียกใช้ฟังก์ชันประมวลผล Top 3 ---
    this.renderTopSpenders(filteredData);
    // ------------------------------------------------

    let totalPaid = 0;
    let totalUnpaid = 0;

    const tbody = document.getElementById('history-table-body');
    if(filteredData.length === 0) {
      if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีประวัติการจองในงวดนี้</td></tr>`;
      document.getElementById('hist-total').innerText = '0';
      document.getElementById('hist-paid').innerText = '0';
      document.getElementById('hist-unpaid').innerText = '0';
      return;
    } 

    if(tbody) {
      tbody.innerHTML = filteredData.map(h => {
        let isPaid = (h.status === 'ชำระ' || h.status === 'เงินสด' || h.status === 'ชำระแล้ว');
        if (isPaid) totalPaid += h.amount; else totalUnpaid += h.amount;

        let payBadgeClass = isPaid ? 'bg-success' : 'bg-danger';
        let togglePayBtn = `<button class="btn btn-sm btn-outline-warning ms-2 py-0 px-1" title="เปลี่ยนสถานะ" onclick='app.history.toggleHistPay(${h.row}, "${h.status}")'><i class="bi bi-arrow-repeat"></i></button>`;
        
        let displayDrawDate = h.drawDate;
        if(displayDrawDate.length > 20) {
          try { displayDrawDate = app.main.formatThaiDateTime(h.drawDate); } catch(e) {}
        }

        let upNums = [];
        let downNums = [];
        if(h.numbers) {
          h.numbers.split(',').forEach(n => {
            let numStr = n.trim();
            if(numStr.includes('(Up)')) upNums.push(`<span class="badge bg-danger me-1">${numStr.replace('(Up)', '').trim()}</span>`);
            else if(numStr.includes('(Down)')) downNums.push(`<span class="badge bg-danger me-1">${numStr.replace('(Down)', '').trim()}</span>`);
            else if(numStr !== '') upNums.push(`<span class="badge bg-secondary me-1">${numStr}</span>`);
          });
        }
        
        let numHtml = '';
        if(upNums.length > 0) numHtml += `<div class="mb-1"><span class="lbl-bright small fw-bold me-1">Up:</span> ${upNums.join('')}</div>`;
        if(downNums.length > 0) numHtml += `<div><span class="lbl-bright small fw-bold me-1">Down:</span> ${downNums.join('')}</div>`;
        if(numHtml === '') numHtml = h.numbers; 

        let prizeHtml = (h.prize && h.prize > 0) ? `<div class="mt-1"><span class="badge bg-warning text-dark"><i class="bi bi-trophy-fill"></i> ถูกรางวัล ${h.prize.toLocaleString()} ฿</span></div>` : '';

        return `<tr>
          <td class="ps-4 text-muted small fw-bold">${displayDrawDate}<br><span style="font-size:0.65rem;" class="time-bright fw-normal"><i class="bi bi-clock"></i> ${h.timestamp}</span></td>
          <td class="fw-bold">${h.name}${prizeHtml}</td>
          <td class="small time-bright" style="white-space: normal; min-width: 150px;">${numHtml}</td>
          <td class="text-end text-warning fw-bold">${h.amount.toLocaleString()}</td>
          <td class="pe-4 ps-4"><span class="badge ${payBadgeClass}">${h.status}</span>${togglePayBtn}</td>
        </tr>`;
      }).join('');
    }

    let totalAll = totalPaid + totalUnpaid;
    document.getElementById('hist-total').innerText = totalAll.toLocaleString();
    document.getElementById('hist-paid').innerText = totalPaid.toLocaleString();
    document.getElementById('hist-unpaid').innerText = totalUnpaid.toLocaleString();
  },

  exportHistoryToExcel: function() {
    const drawSelect = document.getElementById('history-draw-select');
    if (!drawSelect) return;
    const selected = drawSelect.value;
    let filteredData = app.global.globalHistoryData;
    if(selected) {
        filteredData = app.global.globalHistoryData.filter(h => h.drawDate === selected);
    }

    if (!filteredData || filteredData.length === 0) {
      Swal.fire('ไม่มีข้อมูล', 'ไม่มีข้อมูลประวัติสำหรับการส่งออก Excel ในงวดนี้', 'warning');
      return;
    }
    
    const exportData = filteredData.map(h => {
      let displayDate = h.drawDate;
      if(displayDate.length > 20) {
          try { displayDate = app.main.formatThaiDateTime(h.drawDate); } catch(e) {}
      }
      return {
        "งวดวันที่": displayDate,
        "วันที่ทำรายการ / ล้างกระดาน": h.timestamp,
        "ชื่อผู้จอง": h.name,
        "รายการเบอร์": h.numbers,
        "ยอดเงิน (บาท)": h.amount,
        "สถานะชำระ": h.status,
        "เงินรางวัล (บาท)": h.prize || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, "GoldenLuck_History.xlsx");
  },

  toggleHistPay: function(row, currentStatus) {
    Swal.fire({
      title: 'เปลี่ยนสถานะในประวัติ?',
      text: `ยืนยันเปลี่ยนสถานะจาก "${currentStatus}" ?`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'เปลี่ยน', cancelButtonText: 'ยกเลิก'
    }).then(async (r) => {
      if (r.isConfirmed) {
        document.getElementById('loader').classList.remove('hidden');
        const res = await app.main.apiCall('toggleHistoryPayment', { row: row, currentStatus: currentStatus });
        document.getElementById('loader').classList.add('hidden');
        if (res.success) {
          Swal.fire({title: 'สำเร็จ', text: res.message, icon: 'success', timer: 1000, showConfirmButton: false});
          this.loadHistoryData(true); 
        } else Swal.fire('ผิดพลาด', res.message, 'error');
      }
    });
  },

  // --- ส่วนที่เพิ่มใหม่: ฟังก์ชันคำนวณและแสดงผล Top 3 สายเปย์ ---
  renderTopSpenders: function(data) {
    const container = document.getElementById('top-3-cards');
    if (!container) return;

    // 1. จัดกลุ่ม (Group By) และรวมยอดเงิน (Sum Amount) ตามชื่อ
    const spenders = {};
    data.forEach(h => {
      if(!spenders[h.name]) spenders[h.name] = 0;
      spenders[h.name] += Number(h.amount) || 0;
    });

    // 2. แปลงเป็น Array แล้วจัดเรียงจากมากไปน้อย (Sort Descending)
    const sortedSpenders = Object.keys(spenders)
      .map(name => ({ name: name, total: spenders[name] }))
      .sort((a, b) => b.total - a.total);

    // 3. ตัดมาเฉพาะ Top 3
    const top3 = sortedSpenders.slice(0, 3);

    // 4. สร้าง UI
    if(top3.length === 0) {
      container.innerHTML = `<div class="col-12 text-muted small">ยังไม่มีข้อมูลการจองในงวดนี้</div>`;
      return;
    }

    const rankClasses = ['rank-1', 'rank-2', 'rank-3'];
    const rankIcons = ['<i class="bi bi-trophy-fill"></i>', '<i class="bi bi-award-fill"></i>', '<i class="bi bi-star-fill"></i>'];

    container.innerHTML = top3.map((user, index) => `
      <div class="col-12 col-md-4">
        <div class="card p-3 ranking-card ${rankClasses[index]}">
          <div class="rank-badge-bg">${index + 1}</div>
          <small class="fw-bold mb-1">${rankIcons[index]} อันดับที่ ${index + 1}</small>
          <h5 class="fw-bold text-truncate mb-2" style="max-width: 90%;" title="${user.name}">${user.name}</h5>
          <div class="mt-auto border-top pt-2" style="border-color: rgba(0,0,0,0.1) !important;">
            <small class="opacity-75">ยอดรวม</small>
            <h4 class="mb-0 fw-bold">${user.total.toLocaleString()} ฿</h4>
          </div>
        </div>
      </div>
    `).join('');
  }
};