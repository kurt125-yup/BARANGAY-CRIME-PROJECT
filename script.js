const barangays = [
  { name: 'Barangay Center', incidents: 24, severity: 'moderate', trend: '+8%', notes: 'Night patrols increased near the market district.' },
  { name: 'Purok 2', incidents: 31, severity: 'high', trend: '+14%', notes: 'Repeated vehicle break-ins reported in the last 7 days.' },
  { name: 'Purok 4', incidents: 16, severity: 'low', trend: '+3%', notes: 'Steady decrease after community watch deployment.' },
  { name: 'River Side', incidents: 39, severity: 'high', trend: '+19%', notes: 'Theft and trespassing incidents remain concentrated after dark.' },
  { name: 'Maya Homes', incidents: 18, severity: 'low', trend: '-2%', notes: 'Responders report improved visibility and patrol coverage.' },
  { name: 'San Roque', incidents: 27, severity: 'moderate', trend: '+6%', notes: 'Noise complaints and petty theft are the main concerns.' },
  { name: 'Lourdes', incidents: 34, severity: 'high', trend: '+12%', notes: 'High-risk cluster near the transport terminal.' },
  { name: 'Arawan', incidents: 12, severity: 'low', trend: '-4%', notes: 'Stable conditions following the school safety initiative.' },
  { name: 'Bayanihan', incidents: 29, severity: 'moderate', trend: '+10%', notes: 'Drug-related complaints remain under active monitoring.' },
  { name: 'Mabini', incidents: 22, severity: 'moderate', trend: '+5%', notes: 'Residents requested extended lighting on main roads.' },
  { name: 'Vista Verde', incidents: 41, severity: 'high', trend: '+21%', notes: 'Incident cluster aligns with the bus terminal and park.' },
  { name: 'Poblacion', incidents: 35, severity: 'high', trend: '+16%', notes: 'Crowded weekend activity increases burglary risks.' }
];

const statsGrid = document.getElementById('statsGrid');
const heatmap = document.getElementById('heatmap');
const riskFilter = document.getElementById('riskFilter');
const detailTitle = document.getElementById('detailTitle');
const detailContent = document.getElementById('detailContent');

const severityOrder = ['low', 'moderate', 'high', 'severe'];

function getIntensity(incidents) {
  if (incidents >= 38) return 'severe';
  if (incidents >= 28) return 'high';
  if (incidents >= 18) return 'moderate';
  return 'low';
}

function renderStats() {
  const totalIncidents = barangays.reduce((sum, item) => sum + item.incidents, 0);
  const highRisk = barangays.filter((item) => item.severity === 'high' || item.severity === 'severe').length;
  const avgTrend = ((barangays.reduce((sum, item) => sum + Number(item.trend.replace(/[+%]/g, '')), 0) / barangays.length) || 0).toFixed(1);

  const cards = [
    { label: 'Total reports', value: totalIncidents },
    { label: 'High-risk zones', value: highRisk },
    { label: 'Average trend', value: `${avgTrend}%` },
    { label: 'Active patrols', value: '12 units' }
  ];

  statsGrid.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <p class="label">${card.label}</p>
      <p class="value">${card.value}</p>
    </article>
  `).join('');
}

function renderHeatmap() {
  const selected = riskFilter.value;
  const visible = barangays.filter((item) => selected === 'all' ? true : item.severity === selected);

  heatmap.innerHTML = visible.map((item) => {
    const intensity = getIntensity(item.incidents);
    return `
      <button class="heat-cell ${intensity}" data-label="${item.name}" data-name="${item.name}"></button>
    `;
  }).join('');

  heatmap.querySelectorAll('.heat-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const selectedBarangay = barangays.find((item) => item.name === cell.dataset.name);
      if (selectedBarangay) {
        updateDetail(selectedBarangay);
      }
    });
  });

  if (visible.length) {
    updateDetail(visible[0]);
  }
}

function updateDetail(item) {
  detailTitle.textContent = item.name;
  detailContent.innerHTML = `
    <div class="detail-card">
      <h3>Incident snapshot</h3>
      <p>${item.incidents} reported incidents in the last 30 days.</p>
      <span class="badge ${item.severity}">${item.severity.toUpperCase()} RISK</span>
    </div>
    <div class="detail-card">
      <h3>Trend</h3>
      <p>Change compared with the prior period: ${item.trend}</p>
    </div>
    <div class="detail-card">
      <h3>Response notes</h3>
      <p>${item.notes}</p>
    </div>
  `;
}

riskFilter.addEventListener('change', renderHeatmap);

renderStats();
renderHeatmap();
