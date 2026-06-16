// ==================== js/topspenders.js ====================

app.topspenders = {
  renderOverallTop: function() {
    // ใช้ข้อมูล History ทั้งหมดที่มีในระบบ (ไม่กรองงวด)
    const data = app.global.globalHistoryData || [];

    // 1. จัดกลุ่มและรวมยอดเงินตามชื่อผู้ใช้งาน
    const spenders = {};
    data.forEach(h => {
      if(!spenders[h.name]) spenders[h.name] = 0;
      spenders[h.name] += Number(h.amount) || 0;
    });

    // 2. แปลงเป็น Array แล้วจัดเรียงยอดจากมากไปน้อย (Sort Descending)
    const sortedSpenders = Object.keys(spenders)
      .map(name => ({ name: name, total: spenders[name] }))
      .sort((a, b) => b.total - a.total);

    // 3. แยก 3 อันดับแรกออกมาสำหรับแสดงเป็น Card
    const top3 = sortedSpenders.slice(0, 3);

    // --- ส่วนที่ 1: วาด Card Top 3 ---
    const container = document.getElementById('overall-top-3-cards');
    if (!container) return;

    if(top3.length === 0) {
      container.innerHTML = `<div class="col-12 text-muted">ยังไม่มีข้อมูลยอดการจองในระบบ</div>`;
    } else {
      const rankClasses = ['rank-1', 'rank-2', 'rank-3'];
      const rankIcons = ['<i class="bi bi-trophy-fill"></i>', '<i class="bi bi-award-fill"></i>', '<i class="bi bi-star-fill"></i>'];

      container.innerHTML = top3.map((user, index) => `
        <div class="col-12 col-md-4">
          <div class="card p-3 ranking-card ${rankClasses[index]}">
            <div class="rank-badge-bg">${index + 1}</div>
            <small class="fw-bold mb-1">${rankIcons[index]} อันดับที่ ${index + 1}</small>
            <h5 class="fw-bold text-truncate mb-2" style="max-width: 90%;" title="${user.name}">${user.name}</h5>
            <div class="mt-auto border-top pt-2" style="border-color: rgba(0,0,0,0.1) !important;">
              <small class="opacity-75">ยอดรวมทั้งหมด (ทุกงวด)</small>
              <h4 class="mb-0 fw-bold">${user.total.toLocaleString()} ฿</h4>
            </div>
          </div>
        </div>
      `).join('');
    }

    // --- ส่วนที่ 2: วาดตารางแสดงยอดของทุกคน ---
    const tbody = document.getElementById('overall-spenders-table');
    if (!tbody) return;

    if(sortedSpenders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">ไม่มีข้อมูลผู้ใช้งาน</td></tr>`;
    } else {
      tbody.innerHTML = sortedSpenders.map((user, index) => {
        let badge = index < 3 ? `<span class="badge bg-warning text-dark ms-2"><i class="bi bi-star-fill"></i> Top ${index+1}</span>` : '';
        let rankNumber = `<span class="text-muted fw-bold">#${index + 1}</span>`;
        if(index === 0) rankNumber = `<span class="text-warning fw-bold fs-5">#1</span>`;
        else if(index === 1) rankNumber = `<span class="text-secondary fw-bold fs-5">#2</span>`;
        else if(index === 2) rankNumber = `<span style="color: #cd7f32;" class="fw-bold fs-5">#3</span>`;

        return `
          <tr>
            <td class="ps-4">${rankNumber}</td>
            <td class="fw-bold">${user.name} ${badge}</td>
            <td class="text-end pe-4 text-success fw-bold fs-6">${user.total.toLocaleString()} ฿</td>
          </tr>
        `;
      }).join('');
    }
  }
};