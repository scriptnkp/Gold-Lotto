// ==================== js/auth.js ====================

app.auth = {
  toggleAuth: function(isLogin) {
    document.getElementById('login-section').classList.toggle('hidden', !isLogin);
    document.getElementById('reg-section').classList.toggle('hidden', isLogin);
  },

  login: async function() {
    const user = document.getElementById('l-user').value.trim();
    const pass = document.getElementById('l-pass').value.trim();
    if(!user || !pass) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูล', 'warning');
    
    document.getElementById('loader').classList.remove('hidden');
    const res = await app.main.apiCall('login', { username: user, password: pass });
    document.getElementById('loader').classList.add('hidden');
    
    if(res.success) {
      if(res.role === 'Admin') {
        Swal.fire({ title: 'Welcome Admin', text: 'เข้าสู่ระบบสำเร็จ', icon: 'success', timer: 1000, showConfirmButton: false });
        app.admin.loadAdminPage();
      } else {
        app.global.currentUsername = res.username; 
        app.global.currentFullName = res.name;
        app.global.currentLocation = res.location || "ไม่ระบุ"; 
        app.user.loadUserPage(true); 
      }
    } else Swal.fire('ผิดพลาด', res.message, 'error');
  },

  register: async function() {
    const data = { 
      name: document.getElementById('r-name').value.trim(), 
      username: document.getElementById('r-user').value.trim(), 
      password: document.getElementById('r-pass').value.trim(),
      location: document.getElementById('r-location').value.trim() || "ไม่ระบุ"
    };
    if(!data.name || !data.username || !data.password) return Swal.fire('แจ้งเตือน', 'กรุณากรอกให้ครบ', 'warning');
    
    document.getElementById('loader').classList.remove('hidden');
    const res = await app.main.apiCall('register', data);
    document.getElementById('loader').classList.add('hidden');
    
    if(res.success) { 
      Swal.fire('สำเร็จ!', res.message, 'success'); 
      this.toggleAuth(true); 
    } else {
      Swal.fire('ผิดพลาด', res.message, 'error');
    }
  },

  // ⚡ ฟังก์ชันใหม่สำหรับให้ User กู้คืนรหัสผ่านด้วยตัวเอง ⚡
  forgotPassword: function() {
    Swal.fire({
      title: '🔐 กู้คืนรหัสผ่าน',
      html: `
        <div class="swal-edit-form text-start">
          <p class="text-muted small">กรุณากรอกข้อมูลเพื่อตรวจสอบความเป็นเจ้าของบัญชี</p>
          <label>Username ของคุณ</label>
          <input id="forgot-username" class="form-control mb-2" placeholder="กรอก Username">
          <label>พื้นที่/สาขา (ที่ระบุไว้ตอนสมัคร)</label>
          <input id="forgot-location" class="form-control mb-2" placeholder="เช่น นครพนม, ธาตุพนม">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ตรวจสอบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        return {
          username: document.getElementById('forgot-username').value.trim(),
          location: document.getElementById('forgot-location').value.trim()
        }
      }
    }).then(async (r) => {
      if (r.isConfirmed) {
        const input = r.value;
        if(!input.username || !input.location) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        
        document.getElementById('loader').classList.remove('hidden');
        // เรียก API ดึงข้อมูล User ล่าสุดมาตรวจสอบ
        const res = await app.main.apiCall('getAdminData');
        document.getElementById('loader').classList.add('hidden');
        
        if(res && res.allUsers) {
          // ค้นหาข้อความตรวจสอบแบบไม่สนใจพิมพ์เล็ก-ใหญ่ และเว้นวรรค
          const matchUser = res.allUsers.find(u => 
            String(u.username).trim().toLowerCase() === input.username.toLowerCase() && 
            String(u.location).trim().toLowerCase() === input.location.toLowerCase()
          );
          
          if(matchUser) {
            Swal.fire({
              title: 'ตรวจสอบสำเร็จ! 🎉',
              html: `Username: <b>${matchUser.username}</b><br>รหัสผ่านของคุณคือ: <h3 class="text-success mt-2 fw-bold bg-dark p-2 rounded border border-success">${matchUser.password}</h3>`,
              icon: 'success',
              confirmButtonText: 'ตกลง'
            });
          } else {
            Swal.fire('ไม่พบข้อมูล', 'Username หรือ พื้นที่/สาขา ไม่ถูกต้อง หรือคุณยังไม่ได้รับการอนุมัติจากแอดมิน', 'error');
          }
        } else {
          Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
        }
      }
    });
  }
};