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

        // Bola de neve checker
        '<div class="form-card mb-24">' +
            '<h3>&#10052;&#65039; Simulador Bola de Neve</h3>' +
            '<p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px">Informe o dividendo recebido por cota para verificar se o efeito bola de neve foi alcan&ccedil;ado.</p>' +
            '<div class="form-grid">' +
                '<div class="form-group">' +
                    '<label>Ticker do Ativo</label>' +
                    '<input type="text" id="snowTicker" placeholder="Ex: MXRF11">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Dividendo por Cota (R$)</label>' +
                    '<input type="text" id="snowDiv" placeholder="Ex: 0.11">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Data do Dividendo</label>' +
                    '<input type="date" id="snowData">' +
                '</div>' +
            '</div>' +
            '<div class="btn-group">' +
                '<button class="btn btn-success" id="btnCheckSnow">&#10052;&#65039; Checar Bola de Neve</button>' +
                '<button class="btn btn-outline" id="btnRegistrarDiv">&#128190; Registrar Dividendo</button>' +
            '</div>' +
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

    // Set default date
    var hoje = new Date().toISOString().split('T')[0];
    document.getElementById('snowData').value = hoje;

    // Auto-uppercase
    document.getElementById('snowTicker').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

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
    document.getElementById('btnCheckSnow').addEventListener('click', checarSnowball);
    document.getElementById('btnRegistrarDiv').addEventListener('click', registrarDividendo);
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

function checarSnowball() {
    var ticker = document.getElementById('snowTicker').value.trim().toUpperCase();
    if (!ticker) { showToast('Informe o ticker do ativo', 'error'); return; }

    var divVal = document.getElementById('snowDiv').value.replace(',', '.');
    if (!divVal || isNaN(parseFloat(divVal))) { showToast('Informe o dividendo por cota', 'error'); return; }

    // First register the dividend, then check snowball
    var resultDiv = document.getElementById('snowResult');
    resultDiv.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    API.getSnowball(ticker).then(function(res) {
        // Override with user-provided dividend value
        var divPorCota = parseFloat(divVal);
        var rendTotal = res.quantidade * divPorCota;
        var alcancou = rendTotal >= res.precoCota;
        var diferenca = rendTotal - res.precoCota;

        if (alcancou) {
            resultDiv.innerHTML =
                '<div class="snowball-banner">' +
                    '<div class="snowball-icon">&#10052;&#65039;&#127881;</div>' +
                    '<div class="snowball-text">' +
                        '<h4>BOLA DE NEVE ALCAN&Ccedil;ADA!</h4>' +
                        '<p>Parab&eacute;ns, Luciano! Seus dividendos de <strong>' + ticker + '</strong> (R$ ' + rendTotal.toFixed(2).replace('.', ',') + ') j&aacute; compram uma nova cota (R$ ' + res.precoCota.toFixed(2).replace('.', ',') + ') e ainda sobram R$ ' + Math.abs(diferenca).toFixed(2).replace('.', ',') + '!</p>' +
                    '</div>' +
                '</div>';
            showToast('❄️ BOLA DE NEVE alcançada com ' + ticker + '! Parabéns!', 'snowball');
        } else {
            resultDiv.innerHTML =
                '<div class="snowball-banner" style="border-color: rgba(245, 158, 11, 0.3); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(249, 115, 22, 0.08))">' +
                    '<div class="snowball-icon">&#9203;</div>' +
                    '<div class="snowball-text">' +
                        '<h4>Continue aportando!</h4>' +
                        '<p>Faltam <strong>R$ ' + Math.abs(diferenca).toFixed(2).replace('.', ',') + '</strong> em dividendos para o Efeito Bola de Neve em <strong>' + ticker + '</strong>. Rendimento atual: R$ ' + rendTotal.toFixed(2).replace('.', ',') + ' | Cota: R$ ' + res.precoCota.toFixed(2).replace('.', ',') + '</p>' +
                    '</div>' +
                '</div>';
        }
    }).catch(function(err) {
        var msg = (err && err.data && err.data.erro) ? err.data.erro : 'Erro ao checar bola de neve';
        resultDiv.innerHTML = '<div style="color:var(--accent-red);padding:16px">' + msg + '</div>';
    });
}

function registrarDividendo() {
    var ticker = document.getElementById('snowTicker').value.trim().toUpperCase();
    var divVal = document.getElementById('snowDiv').value.replace(',', '.');
    var data = document.getElementById('snowData').value;

    if (!ticker) { showToast('Informe o ticker', 'error'); return; }
    if (!divVal || isNaN(parseFloat(divVal))) { showToast('Informe o dividendo por cota', 'error'); return; }

    API.postDividendo({
        Ticker: ticker,
        ValorPorCota: parseFloat(divVal),
        Data: data || new Date().toISOString().split('T')[0]
    }).then(function(res) {
        showToast('Dividendo de ' + ticker + ' registrado! Total: ' + fmtBRL(res.dividendo.TotalRecebido), 'success');
        loadDividendos();
    }).catch(function() {
        showToast('Erro ao registrar dividendo', 'error');
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
