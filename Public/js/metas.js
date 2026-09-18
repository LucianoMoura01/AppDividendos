// ================================================================
// metas.js — Aba Metas & Bola de Neve
// ================================================================

function renderMetas(container) {
    container.innerHTML =
        '<div class="page-header">' +
            '<h2>&#127919; Metas & Bola de Neve</h2>' +
            '<p>Configure suas metas e cheque o efeito bola de neve</p>' +
        '</div>' +

        // Metas config
        '<div class="charts-grid mb-24">' +
            '<div class="form-card">' +
                '<h3>&#9881;&#65039; Configurar Metas</h3>' +
                '<div class="form-grid">' +
                    '<div class="form-group">' +
                        '<label>Meta de Patrim&ocirc;nio (R$)</label>' +
                        '<input type="number" id="metaPatrimonio" placeholder="100000">' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Meta de Dividendo Mensal (R$)</label>' +
                        '<input type="number" id="metaDividendo" placeholder="1000">' +
                    '</div>' +
                '</div>' +
                '<button class="btn btn-primary mt-16" id="btnSalvarMetas">&#128190; Salvar Metas</button>' +
            '</div>' +
            '<div class="chart-panel">' +
                '<h3>&#127919; Progresso das Metas</h3>' +
                '<div id="chartRadialMeta"></div>' +
            '</div>' +
        '</div>' +

        // Bola de neve status
        '<div class="form-card mb-24">' +
            '<h3>&#10052;&#65039; Efeito Bola de Neve (Autom&aacute;tico)</h3>' +
            '<p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px">C&aacute;lculo autom&aacute;tico baseado no &uacute;ltimo dividendo recebido de cada ativo.</p>' +
            '<div id="snowResult" class="mt-24"></div>' +
        '</div>' +

        // Dividendos recebidos
        '<div class="section-title">&#128181; Hist&oacute;rico de Dividendos Recebidos</div>' +
        '<div class="table-wrapper">' +
            '<table>' +
                '<thead><tr><th>Data</th><th>Ativo</th><th>Valor/Cota</th><th>Qtd Cotas</th><th>Total Recebido</th></tr></thead>' +
                '<tbody id="tblDividendos"><tr><td colspan="5"><div class="spinner" style="margin:24px auto"></div></td></tr></tbody>' +
            '</table>' +
        '</div>';

    // Set default date not needed anymore since inputs are gone

    // Load metas
    API.getMetas().then(function(metas) {
        document.getElementById('metaPatrimonio').value = metas.MetaPatrimonio || 100000;
        document.getElementById('metaDividendo').value = metas.MetaDividendoMensal || 1000;
        buildRadialMeta(metas);
    });

    // Load dividendos
    loadDividendos();

    // Events
    document.getElementById('btnSalvarMetas').addEventListener('click', salvarMetas);
    
    // Load Automatic Snowball Global Status
    loadSnowballGlobal();
}

function salvarMetas() {
    var pat = parseFloat(document.getElementById('metaPatrimonio').value) || 100000;
    var div = parseFloat(document.getElementById('metaDividendo').value) || 1000;

    API.postMetas({ MetaPatrimonio: pat, MetaDividendoMensal: div }).then(function() {
        showToast('Metas atualizadas com sucesso!', 'success');
    }).catch(function() {
        showToast('Erro ao salvar metas', 'error');
    });
}

function loadSnowballGlobal() {
    var resultDiv = document.getElementById('snowResult');
    resultDiv.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    
    API.getCarteira().then(function(carteira) {
        if (!carteira || carteira.length === 0) {
            resultDiv.innerHTML = '<p class="text-center" style="color:var(--text-muted)">Sua carteira está vazia.</p>';
            return;
        }
        var promises = carteira.map(function(c) {
            return API.getSnowball(c.Ticker).catch(function(){ return null; });
        });
        Promise.all(promises).then(function(results) {
            var html = '<div class="table-wrapper"><table><thead><tr><th>Ativo</th><th>Cotas</th><th>Últ. Dividendo</th><th>Rend. Total</th><th>Preço Cota</th><th>Status Bola de Neve</th></tr></thead><tbody>';
            results.forEach(function(r) {
                if(!r || !r.ticker) return;
                var cls = r.alcancouBolaDeNeve ? 'green' : 'amber';
                var txt = r.alcancouBolaDeNeve ? '&#10052;&#65039; Alcançado!' : ('Faltam ' + fmtBRL(Math.abs(r.diferenca)));
                html += '<tr>' +
                        '<td><strong>' + r.ticker + '</strong></td>' +
                        '<td>' + r.quantidade + '</td>' +
                        '<td>' + fmtBRL(r.dividendoPorCota) + '</td>' +
                        '<td>' + fmtBRL(r.rendimentoTotal) + '</td>' +
                        '<td>' + fmtBRL(r.precoCota) + '</td>' +
                        '<td class="' + cls + '"><strong>' + txt + '</strong></td>' +
                        '</tr>';
            });
            html += '</tbody></table></div>';
            resultDiv.innerHTML = html;
        }).catch(function() {
            resultDiv.innerHTML = '<p style="color:var(--accent-red)">Erro ao calcular o Efeito Bola de Neve global.</p>';
        });
    });
}

function loadDividendos() {
    API.getDividendos().then(function(divs) {
        var tbody = document.getElementById('tblDividendos');
        if (!Array.isArray(divs) || !divs.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:32px;color:var(--text-muted)">Nenhum dividendo registrado</td></tr>';
            return;
        }
        divs.sort(function(a, b) { return b.Data.localeCompare(a.Data); });
        var html = '';
        divs.forEach(function(d) {
            var dataFmt = d.Data ? d.Data.split('-').reverse().join('/') : '-';
            html +=
                '<tr>' +
                '<td>' + dataFmt + '</td>' +
                '<td class="ticker-cell">' + d.Ticker + '</td>' +
                '<td>' + fmtBRL(d.ValorPorCota) + '</td>' +
                '<td>' + d.Quantidade + '</td>' +
                '<td class="valor-lucro">' + fmtBRL(d.TotalRecebido) + '</td>' +
                '</tr>';
        });
        tbody.innerHTML = html;
    });
}

function buildRadialMeta(metas) {
    var el = document.querySelector('#chartRadialMeta');
    if (!el) return;

    API.getCarteira().then(function(carteira) {
        if (!Array.isArray(carteira)) carteira = [];
        var patrimonio = 0;
        carteira.forEach(function(a) { patrimonio += (a.ValorTotal || 0); });
        var metaPat = metas.MetaPatrimonio || 100000;
        var progresso = Math.min((patrimonio / metaPat) * 100, 100);

        new ApexCharts(el, {
            series: [parseFloat(progresso.toFixed(2))],
            chart: { type: 'radialBar', height: 280, fontFamily: 'Inter, sans-serif' },
            plotOptions: {
                radialBar: {
                    startAngle: -135, endAngle: 135,
                    hollow: { size: '65%' },
                    track: { background: 'rgba(255,255,255,0.05)', strokeWidth: '100%' },
                    dataLabels: {
                        name: { offsetY: -14, color: '#64748b', fontSize: '12px' },
                        value: { offsetY: 4, fontSize: '24px', fontWeight: 800, color: '#f1f5f9',
                            formatter: function(v) { return v.toFixed(1) + '%'; } }
                    }
                }
            },
            fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#f59e0b'], stops: [0, 100] } },
            stroke: { lineCap: 'round' },
            colors: ['#38bdf8'],
            labels: ['Patrimônio']
        }).render();
    });
}
