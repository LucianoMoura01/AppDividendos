// ================================================================
// dashboard.js — Aba Dashboard (Visão Geral)
// ================================================================

function renderDashboard(container) {
    container.innerHTML =
        '<div class="page-header">' +
            '<h2>&#128202; Dashboard</h2>' +
            '<p>Vis&atilde;o geral do seu patrim&ocirc;nio e carteira</p>' +
        '</div>' +
        '<div id="snowballBanners"></div>' +
        '<div class="kpi-grid" id="dashKpis">' +
            '<div class="kpi-card"><div class="spinner"></div></div>' +
            '<div class="kpi-card"><div class="spinner"></div></div>' +
            '<div class="kpi-card"><div class="spinner"></div></div>' +
            '<div class="kpi-card"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="charts-grid">' +
            '<div class="chart-panel"><h3>&#128200; Evolu&ccedil;&atilde;o do Patrim&ocirc;nio</h3><div id="chartEvolucao"></div></div>' +
            '<div class="chart-panel"><h3>&#127856; Composi&ccedil;&atilde;o da Carteira</h3><div id="chartDonut"></div></div>' +
            '<div class="chart-panel"><h3>&#128176; Rentabilidade por Ativo</h3><div id="chartRent"></div></div>' +
            '<div class="chart-panel"><h3>&#128181; Dividendos Recebidos</h3><div id="chartDivs"></div></div>' +
        '</div>' +
        '<div class="section-title">&#128203; Tabela de Performance</div>' +
        '<div class="table-wrapper"><table>' +
            '<thead><tr><th>Ativo</th><th>Qtd</th><th>PM</th><th>Atual</th><th>Total</th><th>Rent.</th><th>Status</th></tr></thead>' +
            '<tbody id="dashTable"></tbody>' +
        '</table></div>';

    // Load all data in parallel
    Promise.all([
        API.getCarteira(),
        API.getMetas(),
        API.getSnapshots(),
        API.getDividendos()
    ]).then(function(results) {
        var carteira = Array.isArray(results[0]) ? results[0] : [];
        var metas = results[1] || {};
        var snapshots = Array.isArray(results[2]) ? results[2] : [];
        var dividendos = Array.isArray(results[3]) ? results[3] : [];

        buildKpis(carteira, metas);
        buildTable(carteira);
        buildDonut(carteira);
        buildRentChart(carteira);
        buildEvolucao(snapshots);
        buildDivsChart(dividendos);
    }).catch(function(err) {
        console.error('Dashboard error:', err);
        showToast('Erro ao carregar dashboard. Sincronize as cotações primeiro.', 'warning');
        buildKpis([], {});
    });
}

function buildKpis(carteira, metas) {
    var patrimonio = 0;
    var investido = 0;
    carteira.forEach(function(a) {
        patrimonio += (a.ValorTotal || 0);
        investido += (a.Quantidade * a.PrecoMedio);
    });
    var rentGlobal = investido > 0 ? ((patrimonio / investido) - 1) * 100 : 0;
    var metaPat = metas.MetaPatrimonio || 100000;
    var progresso = Math.min((patrimonio / metaPat) * 100, 100);

    var kpiGrid = document.getElementById('dashKpis');
    kpiGrid.innerHTML =
        '<div class="kpi-card">' +
            '<span class="kpi-icon">&#128176;</span>' +
            '<div class="kpi-label">Patrim&ocirc;nio Total</div>' +
            '<div class="kpi-value green">' + fmtBRL(patrimonio) + '</div>' +
        '</div>' +
        '<div class="kpi-card">' +
            '<span class="kpi-icon">&#127974;</span>' +
            '<div class="kpi-label">Total Investido</div>' +
            '<div class="kpi-value blue">' + fmtBRL(investido) + '</div>' +
        '</div>' +
        '<div class="kpi-card">' +
            '<span class="kpi-icon">&#128200;</span>' +
            '<div class="kpi-label">Rentabilidade Global</div>' +
            '<div class="kpi-value ' + (rentGlobal >= 0 ? 'green' : 'red') + '">' + (rentGlobal >= 0 ? '+' : '') + rentGlobal.toFixed(2) + '%</div>' +
        '</div>' +
        '<div class="kpi-card">' +
            '<span class="kpi-icon">&#127919;</span>' +
            '<div class="kpi-label">Progresso da Meta</div>' +
            '<div class="kpi-value amber">' + progresso.toFixed(1) + '%</div>' +
            '<div class="progress-wrapper"><div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + progresso.toFixed(1) + '%"></div></div></div>' +
        '</div>';
}

function buildTable(carteira) {
    var tbody = document.getElementById('dashTable');
    if (!carteira.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">Carteira vazia. Adicione ativos na aba Lan&ccedil;amentos.</td></tr>';
        return;
    }
    var html = '';
    carteira.forEach(function(a) {
        var rent = (a.PrecoAtual || 0) - a.PrecoMedio;
        var rentPct = a.PrecoMedio > 0 ? ((a.PrecoAtual / a.PrecoMedio) - 1) * 100 : 0;
        var isLucro = rent >= 0;
        var cls = isLucro ? 'valor-lucro' : 'valor-preju';
        var badgeCls = isLucro ? 'lucro' : 'preju';
        var badgeTxt = isLucro ? '\u25B2 Lucro' : '\u25BC Preju\u00EDzo';
        var sinal = isLucro ? '+' : '';
        html +=
            '<tr onclick="openAssetDetail(\'' + a.Ticker + '\')">' +
            '<td class="ticker-cell">' + a.Ticker + '</td>' +
            '<td>' + a.Quantidade + '</td>' +
            '<td>' + fmtBRL(a.PrecoMedio) + '</td>' +
            '<td>' + fmtBRL(a.PrecoAtual || 0) + '</td>' +
            '<td class="' + cls + '">' + fmtBRL(a.ValorTotal || 0) + '</td>' +
            '<td class="' + cls + '">' + sinal + rentPct.toFixed(2) + '%</td>' +
            '<td><span class="badge ' + badgeCls + '">' + badgeTxt + '</span></td>' +
            '</tr>';
    });
    tbody.innerHTML = html;
}

function buildDonut(carteira) {
    if (!carteira.length) return;
    var labels = [];
    var values = [];
    carteira.forEach(function(a) {
        labels.push(a.Ticker);
        values.push(a.ValorTotal || 0);
    });
    var palette = ['#38bdf8', '#a78bfa', '#10b981', '#f59e0b', '#fb7185', '#22d3ee', '#e879f9', '#4ade80'];
    new ApexCharts(document.querySelector('#chartDonut'), {
        series: values, labels: labels,
        chart: { type: 'donut', height: 320, foreColor: '#94a3b8', fontFamily: 'Inter, sans-serif' },
        colors: palette,
        plotOptions: { pie: { donut: { size: '70%', labels: { show: true,
            name: { fontSize: '13px', color: '#94a3b8' },
            value: { fontSize: '18px', fontWeight: 700, color: '#f1f5f9', formatter: function(v) { return fmtBRL(parseFloat(v)); } },
            total: { show: true, label: 'Total', fontSize: '12px', color: '#64748b',
                formatter: function(w) { var t = w.globals.seriesTotals.reduce(function(a,b){return a+b;},0); return fmtBRL(t); } }
        }}}},
        stroke: { show: false },
        legend: { position: 'bottom', fontSize: '12px', fontWeight: 500, itemMargin: { horizontal: 10, vertical: 4 } },
        tooltip: { y: { formatter: function(v) { return fmtBRL(v); } } }
    }).render();
}

function buildRentChart(carteira) {
    if (!carteira.length) return;
    var tickers = [];
    var rents = [];
    var cores = [];
    carteira.forEach(function(a) {
        tickers.push(a.Ticker);
        var r = a.PrecoMedio > 0 ? ((a.PrecoAtual / a.PrecoMedio) - 1) * 100 : 0;
        rents.push(parseFloat(r.toFixed(2)));
        cores.push(r >= 0 ? '#10b981' : '#ef4444');
    });
    new ApexCharts(document.querySelector('#chartRent'), {
        series: [{ name: 'Rentabilidade %', data: rents }],
        chart: { type: 'bar', height: 320, foreColor: '#94a3b8', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%', distributed: true } },
        colors: cores,
        dataLabels: { enabled: true, formatter: function(v) { return v.toFixed(2) + '%'; }, style: { fontSize: '12px', fontWeight: 600, colors: ['#f1f5f9'] }, offsetX: 16 },
        xaxis: { categories: tickers, labels: { formatter: function(v) { return v.toFixed(1) + '%'; }, style: { colors: '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '12px', fontWeight: 600 } } },
        grid: { borderColor: 'rgba(255,255,255,0.03)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        legend: { show: false },
        tooltip: { theme: 'dark', y: { formatter: function(v) { return v.toFixed(2) + '%'; } } }
    }).render();
}

function buildEvolucao(snapshots) {
    var el = document.querySelector('#chartEvolucao');
    if (!snapshots.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128200;</div><p>Sincronize cota&ccedil;&otilde;es para gerar dados de evolu&ccedil;&atilde;o</p></div>';
        return;
    }
    var datas = [];
    var valores = [];
    snapshots.forEach(function(s) { datas.push(s.Data); valores.push(s.Patrimonio); });
    new ApexCharts(el, {
        series: [{ name: 'Patrimônio', data: valores }],
        chart: { type: 'area', height: 320, foreColor: '#94a3b8', fontFamily: 'Inter, sans-serif', toolbar: { show: false },
            sparkline: { enabled: false } },
        colors: ['#38bdf8'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: datas, labels: { style: { colors: '#64748b', fontSize: '11px' } }, axisBorder: { show: false } },
        yaxis: { labels: { formatter: function(v) { return fmtBRL(v); }, style: { colors: '#64748b', fontSize: '11px' } } },
        grid: { borderColor: 'rgba(255,255,255,0.03)' },
        tooltip: { theme: 'dark', y: { formatter: function(v) { return fmtBRL(v); } } }
    }).render();
}

function buildDivsChart(dividendos) {
    var el = document.querySelector('#chartDivs');
    if (!dividendos.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128181;</div><p>Nenhum dividendo registrado ainda</p></div>';
        return;
    }
    // Agrupar por mês
    var porMes = {};
    dividendos.forEach(function(d) {
        var mes = d.Data ? d.Data.substring(0, 7) : 'N/A';
        porMes[mes] = (porMes[mes] || 0) + d.TotalRecebido;
    });
    var meses = Object.keys(porMes).sort();
    var valores = meses.map(function(m) { return parseFloat(porMes[m].toFixed(2)); });

    new ApexCharts(el, {
        series: [{ name: 'Dividendos', data: valores }],
        chart: { type: 'bar', height: 320, foreColor: '#94a3b8', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        colors: ['#10b981'],
        plotOptions: { bar: { borderRadius: 5, columnWidth: '60%' } },
        xaxis: { categories: meses, labels: { style: { colors: '#64748b', fontSize: '11px' } } },
        yaxis: { labels: { formatter: function(v) { return fmtBRL(v); }, style: { colors: '#64748b', fontSize: '11px' } } },
        grid: { borderColor: 'rgba(255,255,255,0.03)' },
        tooltip: { theme: 'dark', y: { formatter: function(v) { return fmtBRL(v); } } }
    }).render();
}
