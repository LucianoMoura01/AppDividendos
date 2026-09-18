// ================================================================
// carteira.js — Aba Carteira ao Vivo
// ================================================================

var carteiraRefreshTimer = null;

function renderCarteira(container) {
    // Clear any previous timer
    if (carteiraRefreshTimer) { clearInterval(carteiraRefreshTimer); carteiraRefreshTimer = null; }

    container.innerHTML =
        '<div class="page-header">' +
            '<h2>&#128200; Carteira ao Vivo</h2>' +
            '<p>Acompanhe seus ativos em tempo real — <span id="carteiraTimer" style="color:var(--accent-emerald)">clique em Sincronizar</span></p>' +
        '</div>' +
        '<div class="btn-group mb-24">' +
            '<button class="btn btn-success" id="btnRefresh">&#128260; Atualizar Cota&ccedil;&otilde;es</button>' +
        '</div>' +
        '<div class="table-wrapper">' +
            '<table>' +
                '<thead><tr><th>Ativo</th><th>Qtd</th><th>Pre&ccedil;o M&eacute;dio</th><th>Cota&ccedil;&atilde;o Atual</th><th>Valor Posicionado</th><th>Rentabilidade</th><th>Status</th></tr></thead>' +
                '<tbody id="tblCarteira"><tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div><span>Carregando carteira...</span></div></td></tr></tbody>' +
            '</table>' +
        '</div>' +
        '<div class="mt-24" style="text-align:center;color:var(--text-muted);font-size:0.82rem">' +
            '<p>&#128161; Clique em qualquer ativo para ver detalhes completos</p>' +
        '</div>';

    // Load cached data first
    loadCarteiraData();

    // Refresh button
    document.getElementById('btnRefresh').addEventListener('click', function() {
        var btn = this;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Buscando cotações...';

        API.syncCotacoes().then(function(data) {
            showToast('Cotações atualizadas! Patrimônio: ' + fmtBRL(data.patrimonioTotal), 'success');
            document.getElementById('carteiraTimer').textContent = 'Atualizado ' + data.atualizadoEm;
            renderCarteiraTable(data.carteira || []);
        }).catch(function() {
            showToast('Erro ao buscar cotações', 'error');
        }).finally(function() {
            btn.disabled = false;
            btn.innerHTML = '&#128260; Atualizar Cotações';
        });
    });
}

function loadCarteiraData() {
    API.getCarteira().then(function(carteira) {
        if (!Array.isArray(carteira)) carteira = [];
        renderCarteiraTable(carteira);
    }).catch(function() {
        document.getElementById('tblCarteira').innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">Erro ao carregar. Tente sincronizar.</td></tr>';
    });
}

function renderCarteiraTable(carteira) {
    var tbody = document.getElementById('tblCarteira');
    if (!carteira.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">Carteira vazia. Adicione ativos na aba Lan&ccedil;amentos.</td></tr>';
        return;
    }
    var html = '';
    carteira.forEach(function(a) {
        var precoAtual = a.PrecoAtual || 0;
        var valorTotal = a.ValorTotal || 0;
        var rent = precoAtual - a.PrecoMedio;
        var rentPct = a.PrecoMedio > 0 ? (((precoAtual / a.PrecoMedio) - 1) * 100) : 0;
        var isLucro = rent >= 0;
        var cls = isLucro ? 'valor-lucro' : 'valor-preju';
        var badgeCls = isLucro ? 'lucro' : 'preju';
        var badgeTxt = isLucro ? '\u25B2 Lucro' : '\u25BC Prejuízo';
        var sinal = isLucro ? '+' : '';

        html +=
            '<tr onclick="openAssetDetail(\'' + a.Ticker + '\')" style="cursor:pointer">' +
            '<td class="ticker-cell">' + a.Ticker + '</td>' +
            '<td>' + a.Quantidade + '</td>' +
            '<td>' + fmtBRL(a.PrecoMedio) + '</td>' +
            '<td>' + fmtBRL(precoAtual) + '</td>' +
            '<td class="' + cls + '">' + fmtBRL(valorTotal) + '</td>' +
            '<td class="' + cls + '">' + sinal + 'R$ ' + Math.abs(rent).toFixed(2).replace('.', ',') + ' (' + sinal + rentPct.toFixed(2) + '%)</td>' +
            '<td><span class="badge ' + badgeCls + '">' + badgeTxt + '</span></td>' +
            '</tr>';
    });
    tbody.innerHTML = html;
}
