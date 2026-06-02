// ==================== js/admin.js ====================

app.admin = {
  loadAdminPage: function() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    this.refreshAdminData();
  },

  switchAdminView: function(view) {
    document.getElementById('admin-view-dashboard').classList.add('hidden');
    document.getElementById('admin-view-users').classList.add('hidden');
    document.getElementById('admin-view-history').classList.add('hidden');
    document.getElementById('admin-view-allocation').classList.add('hidden');
    
    document.getElementById('menu-dashboard').classList.remove('active');
    document.getElementById('menu-users').classList.remove('active');
    document.getElementById('menu-history').classList.remove('active');
    document.getElementById('menu-allocation').classList.remove('active');

    if(view === 'dashboard') {
      document.getElementById('admin-view-dashboard').classList.remove('hidden');
      document.getElementById('menu-dashboard').classList.add('active'); 
      this.refreshAdminData();
    }
    else if(view === 'users') {
      document.getElementById('admin-view-users').classList.remove('hidden');
      document.getElementById('menu-users').classList.add('active'); 
    }
    else if(view === 'history') {
      document.getElementById('admin-view-history').classList.remove('hidden');
      document.getElementById('menu-history').classList.add('active'); 
      app.history.loadHistoryData(true); 
    }
    else if(view === 'allocation') {
      document.getElementById('admin-view-allocation').classList.remove('hidden');
      document.getElementById('menu-allocation').classList.add('active'); 
      app.history.loadHistoryData(true).then(() => app.allocation.updateAllocationStats());
    }
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('adminMenu'));
    if(offcanvas) offcanvas.hide();
  },

  refreshAdminData: async function(updateUI = true) {
    const loader = document.getElementById('loader');
    if(updateUI) loader.classList.remove('hidden');
    const res = await app.main.apiCall('getAdminData');
    if(updateUI) loader.classList.add('hidden');
    if(!res) return;

    app.global.globalAllUsers = res.allUsers;

    if (updateUI) {
      document.getElementById('stat-rem-up').innerText = res.stats.remTop;
      document.getElementById('stat-rem-down').innerText = res.stats.remBot;
      document.getElementById('stat-booked').innerText = res.stats.booked;
      document.getElementById('stat-rev').innerText = res.stats.revenue.total.toLocaleString();
      document.getElementById('stat-rev-paid').innerText = res.stats.revenue.paid.toLocaleString();
      document.getElementById('stat-rev-unpaid').innerText = res.stats.revenue.unpaid.toLocaleString();

      document.getElementById('input-win-top').value = res.winners.top;
      document.getElementById('input-win-bot').value = res.winners.bot;
      document.getElementById('input-time-close').value = res.times.close || "";
      document.getElementById('input-time-draw').value = res.times.draw || "";
      
      const winnersSection = document.getElementById('admin-winners-section');
      const winnersList = document.getElementById('admin-winners-list');
      if (res.winnersList && res.winnersList.length > 0) {
        winnersSection.classList.remove('hidden');
        winnersList.innerHTML = res.winnersList.map(w => `<div class="alert alert-warning py-2 mb-2 border-warning d-flex justify-content-between align-items-center bg-dark text-white"><div><i class="bi bi-star-fill text-warning"></i> <b>${w.name}</b> <span class="badge bg-danger ms-2">${w.number}</span></div><div class="fw-bold text-warning fs-5">+${w.prize.toLocaleString()} ฿</div></div>`).join('');
      } else if (res.winners.top || res.winners.bot) {
         winnersSection.classList.remove('hidden'); 
         winnersList.innerHTML = `<div class="lbl-bright small fw-bold mt-2 text-center text-success">กองกลางเป็นผู้โชคดี เย้ๆ สนับสนุน 121</div>`;
      } else winnersSection.classList.add('hidden');
      
      const tbodyUsers = document.getElementById('all-users-table-body');
      const badge = document.getElementById('pending-badge');
      if(res.pendingUsers.length === 0) badge.classList.add('hidden'); else { badge.innerText = res.pendingUsers.length; badge.classList.remove('hidden'); }
      if(res.allUsers.length === 0) tbodyUsers.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">ไม่มีข้อมูล</td></tr>`;
      else {
        tbodyUsers.innerHTML = res.allUsers.map(u => {
          let statusBadge = u.status.toLowerCase() === 'approved' ? '<span class="badge bg-success">Approved</span>' : '<span class="badge bg-secondary">Pending</span>';
          let roleBadge = u.role.toLowerCase() === 'admin' ? '<span class="badge bg-warning text-dark">Admin</span>' : '<span class="badge bg-info text-dark">User</span>';
          let actionBtns = u.status.toLowerCase() === 'pending' ? `<button class="btn btn-sm btn-success me-1 mb-1" onclick="app.admin.adminAction('approveUser', {username: '${u.username}'})"><i class="bi bi-check-lg"></i></button>` : '';
          
          actionBtns += `<button class="btn btn-sm btn-edit me-1 mb-1" onclick="app.admin.openEditUser('${u.username}')"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-del mb-1" onclick="app.admin.deleteUserBtn('${u.username}')"><i class="bi bi-trash"></i></button>`;
          
          let uLocBadge = `<span class="badge bg-primary opacity-75">${u.location || 'ไม่ระบุ'}</span>`;
          return `<tr><td class="ps-4 fw-bold">${u.name}<br><small class="time-bright fw-normal" style="font-size:0.7rem;"><i class="bi bi-clock"></i> ${u.time}</small></td><td>${uLocBadge}</td><td class="text-muted">@${u.username}</td><td>${roleBadge} ${statusBadge}</td><td class="text-end pe-4">${actionBtns}</td></tr>`;
        }).join('');
      }
    }

    const groupedData = {};
    res.bookedList.forEach(b => {
      const key = b.bookedBy + '_' + b.payType + '_' + b.time; 
      if(!groupedData[key]) groupedData[key] = { name: b.bookedBy, payType: b.payType, time: b.time, topNums: [], botNums: [], totalPrice: 0 };
      if(b.number.includes('(Up)')) groupedData[key].topNums.push(b.number.replace(' (Up)', '').trim());
      else if(b.number.includes('(Down)')) groupedData[key].botNums.push(b.number.replace(' (Down)', '').trim());
      groupedData[key].totalPrice += 100;
    });
    
    app.global.globalBookedGroups = Object.values(groupedData); 
    
    if (updateUI) {
        const tbodyBooked = document.getElementById('booked-table-body');
        if(app.global.globalBookedGroups.length === 0) tbodyBooked.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">ยังไม่มีการจอง</td></tr>`;
        else {
          tbodyBooked.innerHTML = app.global.globalBookedGroups.map(g => {
            let numHtml = '';
            if(g.topNums.length > 0) numHtml += `<div class="mb-1"><span class="lbl-bright small fw-bold me-1">Up:</span> ${g.topNums.map(n => `<span class="badge bg-danger me-1">${n}</span>`).join('')}</div>`;
            if(g.botNums.length > 0) numHtml += `<div><span class="lbl-bright small fw-bold me-1">Down:</span> ${g.botNums.map(n => `<span class="badge bg-danger me-1">${n}</span>`).join('')}</div>`;
            
            let isPaid = (g.payType === 'ชำระ' || g.payType === 'เงินสด' || g.payType === 'ชำระแล้ว');
            let payBadgeClass = isPaid ? 'bg-success' : 'bg-danger';
            let togglePayBtn = `<button class="btn btn-sm btn-outline-warning ms-2 py-0 px-1" title="เปลี่ยนสถานะ" onclick='app.admin.togglePayStatus("${g.name}", "${g.payType}", "${g.time}")'><i class="bi bi-arrow-repeat"></i></button>`;

            return `<tr><td class="ps-4 fw-bold">${g.name}<br><small class="time-bright fw-normal" style="font-size:0.75rem;"><i class="bi bi-clock"></i> ${g.time}</small></td><td>${numHtml}</td><td><span class="badge ${payBadgeClass}">${g.payType}</span>${togglePayBtn}</td><td class="text-end pe-4 text-warning fw-bold fs-5">${g.totalPrice.toLocaleString()}</td></tr>`;
          }).join('');
        }
    }
  },

  adminAction: async function(action, payload, successMsg) {
    document.getElementById('loader').classList.remove('hidden');
    const res = await app.main.apiCall(action, payload);
    document.getElementById('loader').classList.add('hidden');
    if(res.success) { Swal.fire('สำเร็จ', successMsg || res.message, 'success'); this.refreshAdminData(); }
    else Swal.fire('ผิดพลาด', res.message, 'error');
  },

  adminSaveTimes: function() { this.adminAction('setTimes', { closeTime: document.getElementById('input-time-close').value, drawTime: document.getElementById('input-time-draw').value }); },
  adminSaveWinners: function() { this.adminAction('setWinningNumbers', { top: document.getElementById('input-win-top').value, bot: document.getElementById('input-win-bot').value }); },
  
  deleteUserBtn: function(username) { 
      Swal.fire({ title: 'ลบผู้ใช้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', confirmButtonColor: '#d33' }).then(r => { 
          if(r.isConfirmed) this.adminAction('deleteUser', {username: String(username)}); 
      }); 
  },
  
  adminResetBoard: function() {
    Swal.fire({ title: 'ยืนยันล้างกระดาน?', text: "ข้อมูลเดิมจะถูกย้ายไปเก็บที่ 'ประวัติการซื้อ' และกระดานจะเริ่มงวดใหม่", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ล้างข้อมูล'
    }).then(r => { if (r.isConfirmed) this.adminAction('resetBoard', {}); });
  },

  openEditUser: function(username) {
    const user = app.global.globalAllUsers.find(u => String(u.username) === String(username));
    if(!user) return;
    Swal.fire({
      title: 'แก้ไขข้อมูลผู้ใช้',
      html: `<div class="swal-edit-form text-start"><label>ชื่อ</label><input id="edit-name" class="form-control mb-2" value="${user.name}"><label>พื้นที่/สาขา</label><input id="edit-location" class="form-control mb-2" value="${user.location || ''}"><label>Username</label><input id="edit-user" class="form-control mb-2" value="${user.username}"><label>รหัสใหม่</label><input id="edit-pass" type="password" class="form-control mb-2"><select id="edit-role" class="form-select mb-2"><option value="User" ${user.role==='User'?'selected':''}>User</option><option value="Admin" ${user.role==='Admin'?'selected':''}>Admin</option></select><select id="edit-status" class="form-select"><option value="Pending" ${user.status==='Pending'?'selected':''}>Pending</option><option value="Approved" ${user.status==='Approved'?'selected':''}>Approved</option></select></div>`,
      showCancelButton: true, confirmButtonText: 'บันทึก',
      preConfirm: () => { 
        return { 
          name: document.getElementById('edit-name').value, 
          username: document.getElementById('edit-user').value, 
          password: document.getElementById('edit-pass').value || user.password, 
          location: document.getElementById('edit-location').value || 'ไม่ระบุ',
          role: document.getElementById('edit-role').value, 
          status: document.getElementById('edit-status').value 
        } 
      }
    }).then(r => { if(r.isConfirmed) this.adminAction('editUser', {oldUsername: String(username), newData: r.value}); });
  },

  togglePayStatus: function(name, currentPayType, time) {
    const group = app.global.globalBookedGroups.find(g => String(g.name) === String(name) && g.payType === currentPayType && g.time === time);
    if(!group) return;

    Swal.fire({
      title: 'เปลี่ยนสถานะ?',
      text: `ต้องการเปลี่ยนสถานะจาก "${currentPayType}" ใช่หรือไม่?`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'เปลี่ยน', cancelButtonText: 'ยกเลิก'
    }).then(async (r) => {
      if (r.isConfirmed) {
        document.getElementById('loader').classList.remove('hidden');
        const res = await app.main.apiCall('togglePayment', { topNums: group.topNums, botNums: group.botNums, currentStatus: currentPayType });
        document.getElementById('loader').classList.add('hidden');
        if (res.success) {
          Swal.fire({title: 'สำเร็จ', text: res.message, icon: 'success', timer: 1000, showConfirmButton: false});
          this.refreshAdminData();
        } else Swal.fire('ผิดพลาด', res.message, 'error');
      }
    });
  }
};