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

        // Importação em Lote B3
        '<div class="form-card mb-24">' +
            '<h3>&#128229; Importar Planilha da B3</h3>' +
            '<p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px">Copie as colunas (Data, Tipo, Ativo, Quantidade, Preço) do Excel do Portal do Investidor da B3 e cole abaixo. Nós ignoraremos transações duplicadas automaticamente.</p>' +
            '<div class="form-group mb-16">' +
                '<textarea id="txB3Data" rows="6" placeholder="Cole os dados copiados do Excel aqui..." style="background:var(--bg-input);border:1px solid var(--border-input);border-radius:var(--radius-xs);padding:10px;color:var(--text-primary);width:100%;font-family:inherit;resize:vertical;"></textarea>' +
            '</div>' +
            '<button class="btn btn-success" id="btnImportarB3">&#128229; Processar e Importar</button>' +
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
    document.getElementById('btnImportarB3').addEventListener('click', importarB3);

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

function importarB3() {
    var rawText = document.getElementById('txB3Data').value.trim();
    if (!rawText) {
        showToast('Cole os dados na área de texto primeiro.', 'error');
        return;
    }

    // Parse simple TSV / CSV
    var lines = rawText.split('\n');
    var transacoes = [];
    var errosParsing = 0;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        // Try to separate by tab (Excel paste) or comma/semicolon (CSV)
        var parts = line.split('\t');
        if (parts.length < 5) parts = line.split(';');
        if (parts.length < 5) parts = line.split(',');

        // Skip header lines broadly
        if (line.toLowerCase().indexOf('data') !== -1 && line.toLowerCase().indexOf('ativo') !== -1) continue;
        if (parts.length < 5) continue;

        try {
            var rawData = parts[0].trim(); // expected DD/MM/YYYY
            var dataFormatada = rawData;
            if (rawData.indexOf('/') !== -1) {
                var dParts = rawData.split('/');
                if (dParts.length === 3) {
                    dataFormatada = dParts[2] + '-' + dParts[1] + '-' + dParts[0]; // YYYY-MM-DD
                }
            }

            var rawTipo = parts[1].trim().toLowerCase();
            var tipo = 'Compra';
            if (rawTipo.indexOf('venda') !== -1 || rawTipo === 'v') tipo = 'Venda';

            var ticker = parts[2].trim().toUpperCase();

            // Handle quantities and prices that might use comma as decimal separator or have dots for thousands
            var rawQtd = parts[3].replace(/\./g, '').replace(',', '.');
            var rawPreco = parts[4].replace(/\./g, '').replace(',', '.');

            var qtd = parseInt(rawQtd);
            var preco = parseFloat(rawPreco);

            if (ticker && !isNaN(qtd) && !isNaN(preco)) {
                transacoes.push({
                    Data: dataFormatada,
                    Tipo: tipo,
                    Ticker: ticker,
                    Quantidade: qtd,
                    Preco: preco
                });
            } else {
                errosParsing++;
            }
        } catch (e) {
            errosParsing++;
        }
    }

    if (transacoes.length === 0) {
        showToast('Não foi possível identificar nenhuma transação válida no texto.', 'error');
        return;
    }

    var btn = document.getElementById('btnImportarB3');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Processando...';

    API.postImportarB3({ transacoes: transacoes }).then(function(res) {
        showToast(res.mensagem, 'success');
        if (errosParsing > 0) {
            showToast('Aviso: ' + errosParsing + ' linhas não puderam ser lidas.', 'warning');
        }
        document.getElementById('txB3Data').value = '';
        loadHistorico();
    }).catch(function(err) {
        var msg = (err && err.data && err.data.erro) ? err.data.erro : 'Erro na importação.';
        showToast(msg, 'error');
    }).finally(function() {
        btn.disabled = false;
        btn.innerHTML = '&#128229; Processar e Importar';
    });
}
