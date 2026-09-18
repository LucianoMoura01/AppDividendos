// ================================================================
// detalhes.js — Modal de Detalhes do Ativo
// ================================================================

function openAssetDetail(ticker) {
    var html =
        '<div class="modal-header">' +
            '<h3>&#128270; Detalhes de ' + ticker + '</h3>' +
            '<button class="modal-close" onclick="closeModal()">&times;</button>' +
        '</div>' +
        '<div class="loading-overlay" id="detalheLoading"><div class="spinner"></div><span>Buscando dados de ' + ticker + '...</span></div>' +
        '<div id="detalheContent" class="hidden"></div>';

    openModal(html);

    API.getCotacaoDetalhe(ticker).then(function(data) {
        document.getElementById('detalheLoading').classList.add('hidden');
        var content = document.getElementById('detalheContent');
        content.classList.remove('hidden');

        var posicao = data.posicao || {};
        var precoAtual = data.precoAtual || 0;
        var precoAnterior = data.precoAnterior || 0;
        var varDia = precoAnterior > 0 ? ((precoAtual / precoAnterior) - 1) * 100 : 0;
        var isUp = varDia >= 0;

        // KPIs
        content.innerHTML =
            '<div class="kpi-grid" style="margin-bottom:24px">' +
                '<div class="kpi-card">' +
                    '<span class="kpi-icon">&#128181;</span>' +
                    '<div class="kpi-label">Cota&ccedil;&atilde;o Atual</div>' +
                    '<div class="kpi-value blue">' + fmtBRL(precoAtual) + '</div>' +
                '</div>' +
                '<div class="kpi-card">' +
                    '<span class="kpi-icon">' + (isUp ? '&#128994;' : '&#128308;') + '</span>' +
                    '<div class="kpi-label">Varia&ccedil;&atilde;o do Dia</div>' +
                    '<div class="kpi-value ' + (isUp ? 'green' : 'red') + '">' + (isUp ? '+' : '') + varDia.toFixed(2) + '%</div>' +
                '</div>' +
                '<div class="kpi-card">' +
                    '<span class="kpi-icon">&#127919;</span>' +
                    '<div class="kpi-label">Suas Cotas</div>' +
                    '<div class="kpi-value purple">' + (posicao.Quantidade || 0) + '</div>' +
                '</div>' +
                '<div class="kpi-card">' +
                    '<span class="kpi-icon">&#128176;</span>' +
                    '<div class="kpi-label">Pre&ccedil;o M&eacute;dio</div>' +
                    '<div class="kpi-value amber">' + fmtBRL(posicao.PrecoMedio || 0) + '</div>' +
                '</div>' +
            '</div>';

        // Price chart
        content.innerHTML +=
            '<div class="chart-panel" style="margin-bottom:20px">' +
                '<h3>&#128200; Hist&oacute;rico de Pre&ccedil;os (6 meses)</h3>' +
                '<div id="chartDetalhePreco"></div>' +
            '</div>';

        // Transactions for this asset
        var transacoes = Array.isArray(data.transacoes) ? data.transacoes : [];
        content.innerHTML +=
            '<div style="margin-bottom:20px">' +
                '<div class="section-title">&#128221; Suas Transa&ccedil;&otilde;es em ' + ticker + '</div>' +
                '<div class="table-wrapper"><table>' +
                    '<thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>Pre&ccedil;o</th><th>Total</th></tr></thead>' +
                    '<tbody id="tblDetalheTransacoes"></tbody>' +
                '</table></div>' +
            '</div>';

        // Dividends for this asset
        var dividendos = Array.isArray(data.dividendos) ? data.dividendos : [];
        content.innerHTML +=
            '<div>' +
                '<div class="section-title">&#128181; Dividendos Recebidos de ' + ticker + '</div>' +
                '<div class="table-wrapper"><table>' +
                    '<thead><tr><th>Data</th><th>Valor/Cota</th><th>Qtd</th><th>Total</th></tr></thead>' +
                    '<tbody id="tblDetalheDivs"></tbody>' +
                '</table></div>' +
            '</div>';

        // Render price chart
        var historico = Array.isArray(data.historicoPrecos) ? data.historicoPrecos : [];
        if (historico.length > 0) {
            var datas = historico.map(function(h) { return h.Data; });
            var precos = historico.map(function(h) { return h.Preco; });

            new ApexCharts(document.querySelector('#chartDetalhePreco'), {
                series: [{ name: ticker, data: precos }],
                chart: { type: 'area', height: 300, foreColor: '#94a3b8', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                colors: ['#38bdf8'],
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
                stroke: { curve: 'smooth', width: 2.5 },
                xaxis: { categories: datas, labels: { show: true, rotate: -45, style: { colors: '#64748b', fontSize: '10px' } }, tickAmount: 10 },
                yaxis: { labels: { formatter: function(v) { return 'R$ ' + v.toFixed(2); }, style: { colors: '#64748b', fontSize: '11px' } } },
                grid: { borderColor: 'rgba(255,255,255,0.03)' },
                tooltip: { theme: 'dark', y: { formatter: function(v) { return fmtBRL(v); } } },
                annotations: posicao.PrecoMedio ? {
                    yaxis: [{ y: posicao.PrecoMedio, borderColor: '#f59e0b', strokeDashArray: 4,
                        label: { text: 'PM: R$ ' + posicao.PrecoMedio.toFixed(2), style: { color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', fontSize: '11px', padding: { left: 6, right: 6, top: 2, bottom: 2 } } }
                    }]
                } : {}
            }).render();
        }

        // Render transactions table
        var tbodyTx = document.getElementById('tblDetalheTransacoes');
        if (transacoes.length === 0) {
            tbodyTx.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:20px;color:var(--text-muted)">Nenhuma transa&ccedil;&atilde;o registrada</td></tr>';
        } else {
            transacoes.sort(function(a, b) { return b.Data.localeCompare(a.Data); });
            var txHtml = '';
            transacoes.forEach(function(t) {
                var cls = t.Tipo === 'Compra' ? 'compra' : 'venda';
                txHtml += '<tr><td>' + (t.Data || '-').split('-').reverse().join('/') + '</td><td><span class="badge ' + cls + '">' + t.Tipo + '</span></td><td>' + t.Quantidade + '</td><td>' + fmtBRL(t.Preco) + '</td><td>' + fmtBRL(t.Quantidade * t.Preco) + '</td></tr>';
            });
            tbodyTx.innerHTML = txHtml;
        }

        // Render dividends table
        var tbodyDiv = document.getElementById('tblDetalheDivs');
        if (dividendos.length === 0) {
            tbodyDiv.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px;color:var(--text-muted)">Nenhum dividendo registrado</td></tr>';
        } else {
            var divHtml = '';
            dividendos.forEach(function(d) {
                divHtml += '<tr><td>' + (d.Data || '-').split('-').reverse().join('/') + '</td><td>' + fmtBRL(d.ValorPorCota) + '</td><td>' + d.Quantidade + '</td><td class="valor-lucro">' + fmtBRL(d.TotalRecebido) + '</td></tr>';
            });
            tbodyDiv.innerHTML = divHtml;
        }

    }).catch(function(err) {
        document.getElementById('detalheLoading').innerHTML = '<div style="color:var(--accent-red);padding:24px;text-align:center">Erro ao buscar dados do ativo. Tente sincronizar as cota&ccedil;&otilde;es primeiro.</div>';
        document.getElementById('detalheLoading').classList.remove('hidden');
    });
}
