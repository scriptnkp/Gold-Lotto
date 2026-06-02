// ==================== js/main.js ====================
// (ใช้ GAS_API_URL จากที่ประกาศไว้ในหน้า index.html)

app.main = {
  toggleTheme: function() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('preferredTheme', newTheme); 
    this.updateThemeUI(newTheme);
  },

  updateThemeUI: function(theme) {
    const isDark = theme === 'dark';
    
    const authBtn = document.getElementById('auth-theme-btn');
    if(authBtn) authBtn.innerHTML = isDark ? '<i class="bi bi-sun-fill text-warning"></i> <small>Light Mode</small>' : '<i class="bi bi-moon-stars-fill"></i> <small>Dark Mode</small>';
    
    const adminBtn = document.getElementById('admin-theme-btn');
    if(adminBtn) adminBtn.innerHTML = isDark ? '<i class="bi bi-sun-fill text-warning fs-5"></i>' : '<i class="bi bi-moon-stars-fill fs-5"></i>';

    const userBtn = document.getElementById('user-theme-btn');
    if(userBtn) userBtn.innerHTML = isDark ? '<i class="bi bi-sun-fill text-warning fs-5"></i>' : '<i class="bi bi-moon-stars-fill fs-5"></i>';

    if(document.getElementById('login-title')) {
       document.getElementById('login-title').className = isDark ? 'text-center mb-4 text-warning' : 'text-center mb-4 text-primary';
       document.getElementById('btn-login').className = isDark ? 'btn w-100 fw-bold btn-warning text-dark' : 'btn btn-primary w-100 fw-bold';
       document.getElementById('link-register').className = isDark ? 'text-warning text-decoration-none fw-bold' : 'text-primary text-decoration-none fw-bold';
       document.getElementById('reg-title').className = isDark ? 'text-center mb-4 text-warning' : 'text-center mb-4 text-success';
       document.getElementById('link-back-login').className = isDark ? 'text-warning text-decoration-none fw-bold' : 'text-success text-decoration-none fw-bold';
    }

    const tables = ['admin-table-1', 'admin-table-2', 'admin-table-3'];
    tables.forEach(id => {
      const tb = document.getElementById(id);
      if(tb) {
        if(isDark) { tb.classList.add('table-dark', 'table-dark-custom'); tb.classList.remove('table-light'); }
        else { tb.classList.remove('table-dark', 'table-dark-custom'); tb.classList.add('table-light'); }
      }
    });

    const theads = ['admin-thead-1', 'admin-thead-2', 'admin-thead-3'];
    theads.forEach(id => {
      const th = document.getElementById(id);
      if(th) {
        if(isDark) { th.classList.remove('table-light'); }
        else { th.classList.add('table-light'); }
      }
    });

    if(document.getElementById('btn-set-time')) {
        document.getElementById('btn-set-time').className = isDark ? 'btn btn-warning w-100 fw-bold' : 'btn btn-outline-secondary w-100 fw-bold';
        document.getElementById('btn-save-win').className = isDark ? 'btn btn-success w-100 fw-bold' : 'btn btn-primary w-100 fw-bold';
    }

    if(document.getElementById('user-brand')) {
       document.getElementById('user-brand').className = isDark ? 'navbar-brand mb-0 h4 fw-bold text-warning' : 'navbar-brand mb-0 h4 fw-bold text-white';
       document.getElementById('alert-icon').className = isDark ? 'bi bi-person-circle text-warning' : 'bi bi-info-circle-fill text-primary';
       document.getElementById('user-welcome-name').className = isDark ? 'text-warning fs-5' : 'text-primary fs-5';
       document.getElementById('btn-confirm').className = isDark ? 'btn fw-bold px-3 py-2 shadow-lg btn-warning text-dark border-0' : 'btn btn-success fw-bold px-3 py-2 shadow';
       document.getElementById('bar-text-main').className = isDark ? 'fw-bold fs-5 text-warning' : 'fw-bold fs-5 text-white';
       document.getElementById('selected-count').className = isDark ? 'text-white' : 'text-warning';
    }
    
    if(document.getElementById('loader-spinner')) {
        document.getElementById('loader-spinner').className = isDark ? 'spinner-border text-warning' : 'spinner-border text-primary';
        document.getElementById('loader-text').className = isDark ? 'mt-3 fw-bold text-warning' : 'mt-3 fw-bold text-primary';
    }
  },

  apiCall: async function(action, payload = {}) {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, payload: payload })
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  },

  logout: function() {
    location.reload();
  },

  formatThaiDateTime: function(isoString) {
    if(!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', {year:'2-digit', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('preferredTheme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  app.main.updateThemeUI(savedTheme);
});