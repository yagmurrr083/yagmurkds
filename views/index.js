const companyData = {
    companyA: { return: 125.5, budget: 45.2, sustainability: [85, 78, 92, 88, 75, 90, 82], recycling: [75, 82, 68, 91, 77, 85, 79, 88, 73, 80] },
    companyB: { return: 98.3, budget: 38.7, sustainability: [72, 88, 79, 85, 91, 77, 83], recycling: [68, 75, 82, 71, 89, 76, 84, 79, 72, 85] },
    companyC: { return: 156.8, budget: 52.4, sustainability: [90, 85, 88, 95, 82, 87, 91], recycling: [88, 92, 85, 79, 94, 81, 87, 90, 83, 86] },
    companyD: { return: 87.2, budget: 31.5, sustainability: [78, 82, 75, 89, 84, 80, 86], recycling: [72, 78, 85, 81, 74, 88, 79, 83, 77, 80] },
    companyE: { return: 112.6, budget: 41.8, sustainability: [83, 87, 90, 81, 85, 92, 88], recycling: [81, 85, 78, 91, 83, 87, 82, 79, 88, 84] },
    companyF: { return: 143.9, budget: 48.3, sustainability: [88, 91, 85, 87, 93, 89, 84], recycling: [86, 89, 91, 84, 88, 93, 85, 90, 87, 82] },
    companyG: { return: 102.4, budget: 36.9, sustainability: [80, 84, 88, 76, 89, 82, 85], recycling: [77, 83, 79, 86, 81, 84, 88, 75, 82, 80] }
};
// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    initDropdown();
    initSliders();
    initModals();
});
// Dropdown functionality
function initDropdown() {
    const dropdown = document.getElementById('company-dropdown');
    dropdown.addEventListener('change', function () {
        const selectedCompany = this.value;
        if (selectedCompany) {
            updateKpis(selectedCompany);
            drawCharts(selectedCompany);
        } else {
            resetKpis();
            clearCharts();
        }
    });
}
// Update KPI values
function updateKpis(company) {
    const data = companyData[company];
    document.getElementById('estimated-return').textContent = `₺${data.return}M`;
    document.getElementById('women-budget').textContent = `₺${data.budget}M`;
    document.querySelector('.kpi-subtitle').textContent = company.replace('company', 'Company ');
}
// Reset KPI values
function resetKpis() {
    document.getElementById('estimated-return').textContent = '₺0';
    document.getElementById('women-budget').textContent = '₺0';
    document.querySelector('.kpi-subtitle').textContent = 'Select a company';
}
// Draw charts
function drawCharts(company) {
    const data = companyData[company];
    drawSustainabilityChart(data.sustainability);
    drawRecyclingChart(data.recycling);
}
// Clear charts
function clearCharts() {
    clearCanvas('sustainability-chart');
    clearCanvas('recycling-chart');
}
function clearCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
// Draw sustainability chart (bar chart)
function drawSustainabilityChart(data) {
    const canvas = document.getElementById('sustainability-chart');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const padding = 40;
    const barWidth = (canvas.width - padding * 2) / data.length;
    const maxValue = 100;
    const chartHeight = canvas.height - padding * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bars
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barWidth + barWidth * 0.15;
        const y = canvas.height - padding - barHeight;
        const width = barWidth * 0.7;

        // Gradient fill
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#4a9eff');
        gradient.addColorStop(1, '#3182ce');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, barHeight);

        // Value text
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + width / 2, y - 5);
    });

    // Draw axis
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
}
// Draw recycling chart (line chart)
function drawRecyclingChart(data) {
    const canvas = document.getElementById('recycling-chart');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const padding = 40;
    const maxValue = 100;
    const chartHeight = canvas.height - padding * 2;
    const chartWidth = canvas.width - padding * 2;
    const stepX = chartWidth / (data.length - 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw line
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((value, index) => {
        const x = padding + index * stepX;
        const y = canvas.height - padding - (value / maxValue) * chartHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    data.forEach((value, index) => {
        const x = padding + index * stepX;
        const y = canvas.height - padding - (value / maxValue) * chartHeight;

        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Value text
        ctx.fillStyle = '#2c3e50';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, x, y - 12);
    });

    // Draw axis
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
}
// Initialize sliders
function initSliders() {
    const femaleSlider = document.getElementById('female-rate');
    const disabledSlider = document.getElementById('disabled-rate');
    const yearSlider = document.getElementById('founded-year');

    femaleSlider.addEventListener('input', function () {
        document.getElementById('female-value').textContent = this.value;
        document.getElementById('ref-female').textContent = this.value;
    });

    disabledSlider.addEventListener('input', function () {
        document.getElementById('disabled-value').textContent = this.value;
        document.getElementById('ref-disabled').textContent = this.value;
    });

    yearSlider.addEventListener('input', function () {
        document.getElementById('year-value').textContent = this.value;
        document.getElementById('ref-year').textContent = this.value;
    });
}
// Initialize modals and buttons
function initModals() {
    const targetBtn = document.getElementById('target-btn');
    const referenceBtn = document.getElementById('reference-btn');
    const modal = document.getElementById('target-modal');
    const modalClose = document.getElementById('modal-close');
    const referenceInfo = document.getElementById('reference-info');

    // Target button - show modal
    targetBtn.addEventListener('click', function () {
        modal.classList.add('show');
    });

    // Close modal
    modalClose.addEventListener('click', function () {
        modal.classList.remove('show');
    });

    // Close modal on outside click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Reference button - toggle info box
    referenceBtn.addEventListener('click', function () {
        referenceInfo.classList.toggle('show');
    });
}