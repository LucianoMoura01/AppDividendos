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
            '<p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px">Selecione o arquivo Excel (.xlsx) ou CSV baixado do Portal do Investidor da B3. N&oacute;s leremos o arquivo localmente e ignoraremos transa&ccedil;&otilde;es duplicadas automaticamente.</p>' +
            '<div class="form-group mb-16">' +
                '<input type="file" id="fileB3" accept=".xlsx, .xls, .csv" style="padding: 12px; background: rgba(0,0,0,0.2); cursor: pointer;">' +
            '</div>' +
            '<button class="btn btn-success" id="btnImportarB3">&#128229; Enviar e Importar</button>' +
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
    var fileInput = document.getElementById('fileB3');
    if (!fileInput.files.length) {
        showToast('Selecione um arquivo da B3 primeiro.', 'error');
        return;
    }

    var file = fileInput.files[0];
    var reader = new FileReader();

    var btn = document.getElementById('btnImportarB3');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Lendo arquivo...';

    function resetBtn() {
        btn.disabled = false;
        btn.innerHTML = '&#128229; Enviar e Importar';
    }

    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            // Read Excel/CSV using SheetJS
            var workbook = XLSX.read(data, {type: 'array', cellDates: true});
            var firstSheet = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheet];

            // Get array of arrays with raw values
            var rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: true, defval: null});

            var headerRowIdx = -1;
            var colMap = { data: -1, tipo: -1, ativo: -1, qtd: -1, preco: -1 };

            // Find the header row
            for (var i = 0; i < Math.min(20, rows.length); i++) {
                var row = rows[i];
                if (!row) continue;
                
                var rowStr = row.map(function(c) { return String(c || '').toLowerCase().trim(); });
                var ativoIdx = rowStr.indexOf('código de negociação');
                if (ativoIdx === -1) ativoIdx = rowStr.indexOf('ativo');
                if (ativoIdx === -1) ativoIdx = rowStr.indexOf('produto');

                if (ativoIdx !== -1) {
                    headerRowIdx = i;
                    colMap.ativo = ativoIdx;
                    
                    for (var j = 0; j < rowStr.length; j++) {
                        var c = rowStr[j];
                        if (c.indexOf('data') !== -1) colMap.data = j;
                        if (c.indexOf('tipo') !== -1 || c.indexOf('movimentação') !== -1) colMap.tipo = j;
                        if (c === 'quantidade' || c === 'qtd') colMap.qtd = j;
                        if (c.indexOf('preço') !== -1 || c.indexOf('preco') !== -1) colMap.preco = j;
                    }
                    break;
                }
            }

            if (headerRowIdx === -1 || colMap.ativo === -1 || colMap.qtd === -1) {
                showToast('Não foi possível identificar as colunas (Ativo, Quantidade) no arquivo.', 'error');
                resetBtn();
                return;
            }

            var transacoes = [];
            var errosParsing = 0;

            for (var k = headerRowIdx + 1; k < rows.length; k++) {
                var r = rows[k];
                if (!r || r.length === 0) continue;

                var rawData = r[colMap.data];
                var rawTipo = String(r[colMap.tipo] || '').trim().toLowerCase();
                var ticker = String(r[colMap.ativo] || '').trim().toUpperCase();
                var rawQtd = r[colMap.qtd];
                var rawPreco = r[colMap.preco];

                if (!ticker || !rawQtd) continue;

                // Format Date
                var dataFormatada = new Date().toISOString().split('T')[0];
                if (rawData instanceof Date) {
                    dataFormatada = rawData.toISOString().split('T')[0];
                } else if (typeof rawData === 'string' && rawData.indexOf('/') !== -1) {
                    var dParts = rawData.split('/');
                    if (dParts.length === 3) {
                        // Assume DD/MM/YYYY
                        dataFormatada = dParts[2].split(' ')[0] + '-' + dParts[1] + '-' + dParts[0];
                    }
                }

                var tipo = 'Compra';
                if (rawTipo.indexOf('venda') !== -1 || rawTipo === 'v') tipo = 'Venda';

                var qtd = parseInt(rawQtd);
                var preco = 0;

                if (typeof rawPreco === 'number') {
                    preco = rawPreco;
                } else if (typeof rawPreco === 'string') {
                    preco = parseFloat(rawPreco.replace(/\R\$/g, '').replace(/\./g, '').replace(',', '.').trim());
                }

                if (ticker && !isNaN(qtd) && !isNaN(preco) && preco > 0) {
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
            }

            if (transacoes.length === 0) {
                showToast('Nenhuma transação válida encontrada após o cabeçalho.', 'error');
                resetBtn();
                return;
            }

            btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Importando...';
            API.postImportarB3({ transacoes: transacoes }).then(function(res) {
                showToast(res.mensagem, 'success');
                if (errosParsing > 0) {
                    showToast('Aviso: ' + errosParsing + ' linhas não puderam ser lidas.', 'warning');
                }
                document.getElementById('fileB3').value = '';
                loadHistorico();
            }).catch(function(err) {
                var msg = (err && err.data && err.data.erro) ? err.data.erro : 'Erro na importação.';
                showToast(msg, 'error');
            }).finally(function() {
                resetBtn();
            });

        } catch (ex) {
            console.error(ex);
            showToast('Erro ao processar arquivo. Verifique se é uma planilha válida.', 'error');
            resetBtn();
        }
    };

    reader.onerror = function() {
        showToast('Erro de leitura do arquivo no navegador.', 'error');
        resetBtn();
    };

    reader.readAsArrayBuffer(file);
}
