// ================================================================
// lancamentos.js — Aba Lançamentos (Compra/Venda + Histórico)
// ================================================================

function renderLancamentos(container) {
    container.innerHTML =
        '<div class="page-header">' +
            '<h2>&#10133; Lan&ccedil;amentos</h2>' +
            '<p>Registre compras e vendas de ativos</p>' +
        '</div>' +

        // Formulário
        '<div class="form-card mb-24">' +
            '<h3>&#128221; Nova Transa&ccedil;&atilde;o</h3>' +
            '<div class="form-grid">' +
                '<div class="form-group">' +
                    '<label>Tipo</label>' +
                    '<select id="txTipo">' +
                        '<option value="Compra">&#128994; Compra</option>' +
                        '<option value="Venda">&#128308; Venda</option>' +
                    '</select>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Ticker</label>' +
                    '<input type="text" id="txTicker" placeholder="Ex: MXRF11" maxlength="10">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Quantidade</label>' +
                    '<input type="number" id="txQtd" placeholder="Ex: 10" min="1">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Pre&ccedil;o Unit&aacute;rio (R$)</label>' +
                    '<input type="text" id="txPreco" placeholder="Ex: 10.50">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Data</label>' +
                    '<input type="date" id="txData">' +
                '</div>' +
            '</div>' +
            '<div class="btn-group">' +
                '<button class="btn btn-primary" id="btnRegistrar">&#128190; Registrar Transa&ccedil;&atilde;o</button>' +
                '<button class="btn btn-outline" id="btnLimpar">Limpar</button>' +
            '</div>' +
        '</div>' +

        // Histórico
        '<div class="section-title">&#128203; Hist&oacute;rico de Transa&ccedil;&otilde;es</div>' +
        '<div class="table-wrapper">' +
            '<table>' +
                '<thead><tr><th>Data</th><th>Tipo</th><th>Ativo</th><th>Qtd</th><th>Pre&ccedil;o</th><th>Total</th><th>ID</th></tr></thead>' +
                '<tbody id="tblHistorico"><tr><td colspan="7" class="text-center"><div class="spinner"></div></td></tr></tbody>' +
            '</table>' +
        '</div>';

    // Set default date to today
    var hoje = new Date().toISOString().split('T')[0];
    document.getElementById('txData').value = hoje;

    // Load history
    loadHistorico();

    // Event listeners
    document.getElementById('btnRegistrar').addEventListener('click', registrarTransacao);
    document.getElementById('btnLimpar').addEventListener('click', limparForm);

    // Auto-uppercase ticker
    document.getElementById('txTicker').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
}

function registrarTransacao() {
    var tipo = document.getElementById('txTipo').value;
    var ticker = document.getElementById('txTicker').value.trim().toUpperCase();
    var qtd = document.getElementById('txQtd').value;
    var preco = document.getElementById('txPreco').value.replace(',', '.');
    var data = document.getElementById('txData').value;

    // Validação no frontend
    if (!ticker) { showToast('Informe o Ticker do ativo.', 'error'); return; }
    if (!qtd || isNaN(qtd) || parseInt(qtd) <= 0) { showToast('Informe uma quantidade válida.', 'error'); return; }
    if (!preco || isNaN(parseFloat(preco)) || parseFloat(preco) <= 0) { showToast('Informe um preço válido.', 'error'); return; }
    if (!data) { showToast('Informe a data da transação.', 'error'); return; }

    var btn = document.getElementById('btnRegistrar');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Registrando...';

    API.postTransacao({
        Tipo: tipo,
        Ticker: ticker,
        Quantidade: parseInt(qtd),
        Preco: parseFloat(preco),
        Data: data
    }).then(function(res) {
        showToast(res.mensagem, 'success');
        limparForm();
        loadHistorico();
    }).catch(function(err) {
        var msg = 'Erro ao registrar.';
        if (err && err.data) {
            msg = err.data.erro || msg;
            if (err.data.duplicata) {
                showToast(msg, 'warning');
                return;
            }
        }
        showToast(msg, 'error');
    }).finally(function() {
        btn.disabled = false;
        btn.innerHTML = '&#128190; Registrar Transação';
    });
}

function limparForm() {
    document.getElementById('txTicker').value = '';
    document.getElementById('txQtd').value = '';
    document.getElementById('txPreco').value = '';
    document.getElementById('txTipo').value = 'Compra';
    var hoje = new Date().toISOString().split('T')[0];
    document.getElementById('txData').value = hoje;
}

function loadHistorico() {
    API.getHistorico().then(function(historico) {
        var tbody = document.getElementById('tblHistorico');
        if (!Array.isArray(historico) || !historico.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">Nenhuma transa&ccedil;&atilde;o registrada ainda.</td></tr>';
            return;
        }
        // Sort by date descending
        historico.sort(function(a, b) { return b.Data.localeCompare(a.Data); });
        var html = '';
        historico.forEach(function(t) {
            var badgeCls = t.Tipo === 'Compra' ? 'compra' : 'venda';
            var total = t.Quantidade * t.Preco;
            var dataFmt = t.Data.split('-').reverse().join('/');
            html +=
                '<tr>' +
                '<td>' + dataFmt + '</td>' +
                '<td><span class="badge ' + badgeCls + '">' + t.Tipo + '</span></td>' +
                '<td class="ticker-cell">' + t.Ticker + '</td>' +
                '<td>' + t.Quantidade + '</td>' +
                '<td>' + fmtBRL(t.Preco) + '</td>' +
                '<td>' + fmtBRL(total) + '</td>' +
                '<td style="color:var(--text-muted);font-size:0.78rem">' + (t.Id || '-') + '</td>' +
                '</tr>';
        });
        tbody.innerHTML = html;
    }).catch(function() {
        document.getElementById('tblHistorico').innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--accent-red)">Erro ao carregar hist&oacute;rico</td></tr>';
    });
}
