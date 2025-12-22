document.addEventListener('DOMContentLoaded', function () {
    const isAnalizPage = document.getElementById('chartLeaders');
    if (!isAnalizPage) return; // Only run on Analiz page

    // State
    let selectedRefId = null;
    let charts = {};

    // Elements
    const elFirmList = document.getElementById('firmList');
    const modalElement = document.getElementById('referenceFirmModal');
    const modal = new bootstrap.Modal(modalElement);

    const sliderW1 = document.getElementById('w1');
    const sliderW2 = document.getElementById('w2');
    const sliderW3 = document.getElementById('w3');

    const valW1 = document.getElementById('val-w1');
    const valW2 = document.getElementById('val-w2');
    const valW3 = document.getElementById('val-w3');

    const inputThreshold = document.getElementById('thresholdInput');
    const btnUpdateThreshold = document.getElementById('btnUpdateThreshold');

    // --- INIT CHARTS ---
    function initCharts() {
        const ctxLeaders = document.getElementById('chartLeaders').getContext('2d');
        charts.leaders = new Chart(ctxLeaders, {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const ctxCarbon = document.getElementById('chartCarbon').getContext('2d');
        charts.carbon = new Chart(ctxCarbon, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 60000, // FIXED SCALE: Prevents jumping when threshold changes
                        ticks: { stepSize: 10000 }
                    }
                }
            }
        });

        const ctxEnt = document.getElementById('chartEntrepreneurs').getContext('2d');
        charts.entrepreneurs = new Chart(ctxEnt, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    }

    // --- FETCH & UPDATE DATA ---
    async function updateDashboard() {
        try {
            const w1 = sliderW1.value;
            const w2 = sliderW2.value;
            const w3 = sliderW3.value;

            // Build Query
            let url = `/api/analiz/data?w1=${w1}&w2=${w2}&w3=${w3}`;
            if (selectedRefId) url += `&refId=${selectedRefId}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('API Error: ' + res.status);

            const data = await res.json();

            // SAFE GUARD
            if (!data || !data.info) {
                console.warn("API returned incomplete data", data);
                return;
            }

            // 1. Update Info Cards
            document.getElementById('val-tahmini-getiri').textContent = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.info.tahminiGetiri || 0);
            document.getElementById('val-kadin-butcesi').textContent = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.info.kadinButcesi || 0);
            document.getElementById('selected-firm-name').textContent = data.info.refFirmaAd || 'Hata';

            // Update Dynamic Margin Label
            if (data.info.marginRate) {
                document.getElementById('label-margin-rate').textContent = `YAPAY ZEKA TAHMİNİ (Marj: %${data.info.marginRate})`;
            }

            // 2. Update Charts
            if (data.charts) {
                // Leaders
                charts.leaders.data = {
                    labels: data.charts.leaders?.labels || [],
                    datasets: [{
                        data: data.charts.leaders?.data || [],
                        backgroundColor: ['#003366', '#004080', '#0059b3', '#0073e6', '#3399ff', '#66b3ff', '#99ccff']
                    }]
                };
                charts.leaders.update();

                // Carbon
                const threshold = data.charts.carbon?.threshold || 5000;
                const carbonData = data.charts.carbon?.data || [];
                const carbonLabels = data.charts.carbon?.labels || [];

                charts.carbon.data = {
                    labels: carbonLabels,
                    datasets: [
                        {
                            label: 'Karbon Ayak İzi',
                            data: carbonData,
                            borderColor: '#003366',
                            backgroundColor: 'rgba(0, 51, 102, 0.1)',
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: 'Eşik Değer',
                            data: Array(carbonLabels.length).fill(threshold),
                            borderColor: '#dc3545',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                };
                charts.carbon.update();

                // Entrepreneurs
                charts.entrepreneurs.data = {
                    labels: data.charts.entrepreneurs?.labels || [],
                    datasets: [{
                        label: 'Uyumluluk Puanı',
                        data: data.charts.entrepreneurs?.data || [],
                        backgroundColor: '#00A3E0'
                    }]
                };
                charts.entrepreneurs.update();
            }

        } catch (error) {
            console.error('Update Error:', error);
        }
    }

    // --- EVENT LISTENERS ---

    // Sliders
    [sliderW1, sliderW2, sliderW3].forEach(el => {
        el.addEventListener('input', () => {
            valW1.textContent = sliderW1.value;
            valW2.textContent = sliderW2.value;
            valW3.textContent = sliderW3.value;
            updateDashboard(); // Real-time update
        });
    });

    // Modal Load
    modalElement.addEventListener('show.bs.modal', async () => {
        elFirmList.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';
        try {
            const res = await fetch('/api/firmalar/list');
            if (!res.ok) throw new Error("List load failed");
            const firms = await res.json();

            let html = '';
            firms.forEach(f => {
                const active = f.id == selectedRefId ? 'active' : '';
                html += `<button type="button" class="list-group-item list-group-item-action ${active}" onclick="selectFirm(${f.id})">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">${f.ad}</span>
                        <small class="text-muted">Ciro: ${new Intl.NumberFormat('tr-TR').format(f.ciro || 0)}</small>
                    </div>
                </button>`;
            });
            elFirmList.innerHTML = html;
        } catch (e) {
            elFirmList.innerHTML = '<p class="text-danger p-3">Veri tabanı bağlantı hatası. Lütfen sayfayı yenileyin.</p>';
            console.error(e);
        }
    });

    window.selectFirm = function (id) {
        selectedRefId = id;
        modal.hide();
        updateDashboard();
    };

    // Update Threshold
    btnUpdateThreshold.addEventListener('click', async () => {
        const val = inputThreshold.value;
        try {
            await fetch('/api/analiz/update-threshold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threshold: val })
            });
            updateDashboard();
        } catch (e) {
            alert('Güncelleme hatası');
        }
    });

    initCharts();
    updateDashboard();
});
