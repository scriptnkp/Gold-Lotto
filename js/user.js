// ==================== js/user.js ====================

app.user = {
  openUserProfile: function() {
    Swal.fire({
      title: 'แก้ไขโปรไฟล์ส่วนตัว',
      html: `
        <div class="swal-edit-form text-start">
          <label>ชื่อ - นามสกุลจริง</label>
          <input id="prof-name" class="form-control mb-2" value="${app.global.currentFullName}">
          <label>พื้นที่/สาขา</label>
          <input id="prof-location" class="form-control mb-2" value="${app.global.currentLocation}">
          <label>รหัสผ่านใหม่ <small class="text-danger">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</small></label>
          <input id="prof-pass" type="password" class="form-control mb-2" placeholder="********">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'บันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        return {
          name: document.getElementById('prof-name').value.trim(),
          location: document.getElementById('prof-location').value.trim(),
          password: document.getElementById('prof-pass').value.trim()
        }
      }
    }).then(async (r) => {
      if (r.isConfirmed) {
        const newData = r.value;
        if (!newData.name) return Swal.fire('ผิดพลาด', 'กรุณากรอกชื่อ-นามสกุล', 'error');
        
        document.getElementById('loader').classList.remove('hidden');
        const res = await app.main.apiCall('updateUserProfile', { username: String(app.global.currentUsername), newData: newData });
        document.getElementById('loader').classList.add('hidden');
        
        if (res.success) {
          app.global.currentFullName = newData.name;
          app.global.currentLocation = newData.location;
          document.getElementById('user-welcome-name').innerText = app.global.currentFullName;
          document.getElementById('user-display-name').innerText = 'คุณ ' + app.global.currentFullName;
          Swal.fire({title: 'สำเร็จ', text: res.message, icon: 'success', timer: 1500, showConfirmButton: false});
        } else {
          Swal.fire('ผิดพลาด', res.message, 'error');
        }
      }
    });
  },

  loadUserPage: async function(isFirstLogin = false) {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('user-page').classList.remove('hidden');
    document.getElementById('user-welcome-name').innerText = app.global.currentFullName;
    document.getElementById('user-display-name').innerText = 'คุณ ' + app.global.currentFullName;
    
    app.global.selectedItems = []; 
    app.global.isSystemClosed = false; 
    this.updateBookingBar();
    document.getElementById('loader').classList.remove('hidden');
    
    const data = await app.main.apiCall('getNumbersData');
    document.getElementById('loader').classList.add('hidden');
    if(!data.list) return;

    const timeDisplay = document.getElementById('user-time-display');
    if(data.times.close) {
       const closeDate = new Date(data.times.close);
       if(new Date() >= closeDate) {
          app.global.isSystemClosed = true;
          timeDisplay.classList.remove('hidden'); 
          timeDisplay.innerHTML = `<i class="bi bi-lock-fill"></i> ปิดรับจองแล้ว`;
          document.getElementById('booking-bar').classList.add('hidden');
       } else {
          timeDisplay.classList.remove('hidden'); 
          timeDisplay.innerHTML = `<i class="bi bi-clock-history"></i> ปิดรับจอง: ${app.main.formatThaiDateTime(data.times.close)}`;
       }
    } else timeDisplay.classList.add('hidden');

    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    let myWinnings = []; let totalPrize = 0; 
    let remUp = 100; let remDown = 100;
    
    data.list.forEach(item => {
      const isTopBooked = item.top.status === 'Booked'; const isBotBooked = item.bottom.status === 'Booked';
      const topClass = isTopBooked ? 'booked' : 'available'; const botClass = isBotBooked ? 'booked' : 'available';
      const topText = isTopBooked ? item.top.user : 'ว่าง'; const botText = isBotBooked ? item.bottom.user : 'ว่าง';
      
      if(isTopBooked) remUp--;
      if(isBotBooked) remDown--;

      let topBadge = ''; let botBadge = '';
      if(data.winners.top && item.number === data.winners.top) {
        topBadge = '<div class="winner-badge">🏆 JACKPOT</div>';
        if(isTopBooked && String(item.top.user) === String(app.global.currentFullName)) { myWinnings.push(`Up ${item.number}`); totalPrize += 6000; }
      }
      if(data.winners.bot && item.number === data.winners.bot) {
        botBadge = '<div class="winner-badge">🏆 JACKPOT</div>';
        if(isBotBooked && String(item.bottom.user) === String(app.global.currentFullName)) { myWinnings.push(`Down ${item.number}`); totalPrize += 6000; }
      }
      
      grid.innerHTML += `
        <div class="col-4 col-sm-3 col-md-2">
          <div class="num-card">
            <div class="num-header">${item.number}</div>
            <div class="d-flex position-relative">
              <div id="btn-${item.number}-Top" class="num-btn top-btn position-relative ${topClass}" onclick="app.user.toggleSelection('${item.number}', 'Top', ${isTopBooked})">
                ${topBadge}<b>Up</b><br><span class="booked-name" title="${topText}">${topText}</span>
              </div>
              <div id="btn-${item.number}-Bottom" class="num-btn position-relative ${botClass}" onclick="app.user.toggleSelection('${item.number}', 'Bottom', ${isBotBooked})">
                ${botBadge}<b>Down</b><br><span class="booked-name" title="${botText}">${botText}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    document.getElementById('user-rem-up').innerText = remUp;
    document.getElementById('user-rem-down').innerText = remDown;

    if(isFirstLogin && myWinnings.length > 0 && !app.global.hasShownWinAlert) {
      app.global.hasShownWinAlert = true;
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['#ffd700', '#ffffff', '#ff8c00'] });
      Swal.fire({
        title: '🎉 แจ็คพอตแตก! 🎉',
        html: `คุณ ${app.global.currentFullName} ถูกรางวัลหมายเลข <b class="text-danger fs-4">${myWinnings.join(', ')}</b><br><h2 class="text-success fw-bold mt-3 mb-1">+${totalPrize.toLocaleString()} ฿</h2><br><small class="text-muted">รีบแคปหน้าจอนี้ส่งให้แอดมินเพื่อรับเงินรางวัล!</small>`,
        icon: 'success', confirmButtonText: 'สุดยอด!', confirmButtonColor: '#ffd700', color: '#000', background: '#fff'
      });
    } else if (isFirstLogin) Swal.fire({ title: 'เข้าสู่ระบบสำเร็จ', text: 'ยินดีต้อนรับคุณ ' + app.global.currentFullName, icon: 'success', timer: 1000, showConfirmButton: false });
  },

  toggleSelection: function(num, type, isBooked) {
    if(isBooked) return;
    if(app.global.isSystemClosed) return Swal.fire('ปิดรับจอง', 'หมดเวลาแล้วครับ', 'warning');
    const key = num + '_' + type; 
    const index = app.global.selectedItems.indexOf(key); 
    const btn = document.getElementById(`btn-${num}-${type}`);
    if(index > -1) { 
        app.global.selectedItems.splice(index, 1); 
        btn.classList.remove('selected'); 
        btn.querySelector('.booked-name').innerText = 'ว่าง'; 
    } 
    else { 
        app.global.selectedItems.push(key); 
        btn.classList.add('selected'); 
        btn.querySelector('.booked-name').innerText = 'เลือกแล้ว'; 
    }
    this.updateBookingBar();
  },

  updateBookingBar: function() {
    if(app.global.isSystemClosed) return;
    const bar = document.getElementById('booking-bar');
    if(app.global.selectedItems.length > 0) { 
        bar.classList.remove('hidden'); 
        document.getElementById('selected-count').innerText = app.global.selectedItems.length; 
    } 
    else bar.classList.add('hidden');
  },

  confirmBooking: function() {
    if(app.global.isSystemClosed) return;
    const payType = document.querySelector('input[name="payType"]:checked').value;
    const totalPrice = app.global.selectedItems.length * 100;
    let topNums = []; let botNums = [];
    app.global.selectedItems.sort().forEach(i => { let p = i.split('_'); if (p[1] === 'Top') topNums.push(p[0]); else botNums.push(p[0]); });

    let dHtml = '';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const boxClass = isDark ? 'bg-dark text-white border-secondary' : 'bg-light text-dark border';

    if (topNums.length > 0) dHtml += `<div class="mb-2"><span class="badge bg-danger me-2">Up</span> <b class="text-danger fs-5">${topNums.join(', ')}</b></div>`;
    if (botNums.length > 0) dHtml += `<div><span class="badge bg-info text-dark me-2">Down</span> <b class="text-info fs-5" style="color: #0dcaf0 !important;">${botNums.join(', ')}</b></div>`;

    Swal.fire({
      title: 'ยืนยันคว้าโชค',
      html: `<div class="text-start ${boxClass} p-3 rounded mb-3 border">${dHtml}</div>รูปแบบ: <b class="text-warning">ลงบัญชีเงินเซ็น</b><br><h3 class="mt-3 text-success">ยอดรวม: ${totalPrice.toLocaleString()} ฿</h3>`,
      icon: 'info', showCancelButton: true, confirmButtonText: 'ยืนยันจอง!', confirmButtonColor: '#198754', cancelButtonText: 'ยกเลิก'
    }).then(async (r) => {
      if (r.isConfirmed) {
        document.getElementById('loader').classList.remove('hidden');
        const res = await app.main.apiCall('bookNumbers', { selections: app.global.selectedItems, bookerName: app.global.currentFullName, payType: payType });
        document.getElementById('loader').classList.add('hidden');
        if(res.success) {
          let msg = `จองสำเร็จ <b>${res.successList.length}</b> รายการ!`;
          if(res.failList && res.failList.length > 0) msg += `<br><span class="text-danger">เบอร์ ${res.failList.join(', ')} ไม่ทันเพื่อนครับ</span>`;
          Swal.fire('เรียบร้อย!', msg, 'success').then(() => this.loadUserPage());
        } else Swal.fire('ผิดพลาด', res.message, 'error');
      }
    });
  }
};