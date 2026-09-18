# Arquivo: .\Scripts\Start-Dashboard.ps1

function Start-Dashboard {
    Write-Host "🎨 Gerando Dashboard Web..." -ForegroundColor Cyan

    $caminhoDados = ".\Data\dashboard_data.json"
    $caminhoMetas = ".\Data\metas.json"
    $caminhoHtml = ".\Public\index.html"

    # Verifica se há dados
    if (-not (Test-Path $caminhoDados)) {
        Write-Host "⚠️ Arquivo de dados não encontrado. Rode o Sync-Mercado primeiro!" -ForegroundColor Red
        return
    }

    $carteiraJson = Get-Content -Path $caminhoDados -Raw
    $metasJson = Get-Content -Path $caminhoMetas -Raw

    # Aqui criamos todo o visual do site (HTML + CSS + Gráficos)
    $html = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Efeito Bola de Neve</title>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <style>
        body { background-color: #0f172a; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5rem; color: #38bdf8; }
        .cards { display: flex; gap: 20px; margin-bottom: 30px; justify-content: space-between; }
        .card { background: #1e293b; padding: 20px; border-radius: 12px; flex: 1; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .card h3 { margin: 0 0 10px 0; color: #94a3b8; font-size: 1.1rem; }
        .card p { margin: 0; font-size: 2rem; font-weight: bold; color: #22c55e; }
        .charts-row { display: flex; gap: 20px; margin-bottom: 30px; }
        .chart-container { background: #1e293b; padding: 20px; border-radius: 12px; flex: 1; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: #0f172a; color: #38bdf8; }
        tr:hover { background: #334155; }
        .lucro { color: #22c55e; }
        .preju { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❄️ Bola de Neve App</h1>
            <p>Seu controle de patrimônio e dividendos</p>
        </div>

        <div class="cards">
            <div class="card">
                <h3>Patrimônio Total</h3>
                <p id="totalPatrimonio">R$ 0,00</p>
            </div>
            <div class="card">
                <h3>Meta de Patrimônio</h3>
                <p id="metaPatrimonio" style="color: #38bdf8;">R$ 0,00</p>
            </div>
            <div class="card">
                <h3>Progresso da Meta</h3>
                <p id="progressoMeta" style="color: #f59e0b;">0%</p>
            </div>
        </div>

        <div class="charts-row">
            <div class="chart-container">
                <h3 style="text-align:center; color:#94a3b8; margin-top:0;">Composição da Carteira</h3>
                <div id="graficoPizza"></div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Ativo</th>
                    <th>Quantidade</th>
                    <th>Preço Médio</th>
                    <th>Cotação Atual</th>
                    <th>Total Atual</th>
                    <th>Rentabilidade</th>
                </tr>
            </thead>
            <tbody id="tabelaAtivos">
                <!-- Injetado via JS -->
            </tbody>
        </table>
    </div>

    <script>
        // Recebendo os dados do PowerShell
        const carteira = $carteiraJson;
        const metas = $metasJson;

        let patrimonioTotal = 0;
        let nomesAtivos = [];
        let valoresAtivos = [];
        const tabela = document.getElementById('tabelaAtivos');

        carteira.forEach(ativo => {
            patrimonioTotal += ativo.ValorTotal;
            nomesAtivos.push(ativo.Ticker);
            valoresAtivos.push(ativo.ValorTotal);

            // Calcula rentabilidade
            const rentabilidade = ativo.PrecoAtual - ativo.PrecoMedio;
            const classeCor = rentabilidade >= 0 ? 'lucro' : 'preju';
            const sinal = rentabilidade >= 0 ? '+' : '';
            const percentual = ((ativo.PrecoAtual / ativo.PrecoMedio) - 1) * 100;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>\${ativo.Ticker}</strong></td>
                <td>\${ativo.Quantidade}</td>
                <td>R$ \${ativo.PrecoMedio.toFixed(2).replace('.', ',')}</td>
                <td>R$ \${ativo.PrecoAtual.toFixed(2).replace('.', ',')}</td>
                <td>R$ \${ativo.ValorTotal.toFixed(2).replace('.', ',')}</td>
                <td class="\${classeCor}">\${sinal}R$ \${rentabilidade.toFixed(2).replace('.', ',')} (\${sinal}\${percentual.toFixed(2)}%)</td>
            `;
            tabela.appendChild(tr);
        });

        // Atualizando Cards
        document.getElementById('totalPatrimonio').innerText = 'R$ ' + patrimonioTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        document.getElementById('metaPatrimonio').innerText = 'R$ ' + metas.MetaPatrimonio.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        
        const progresso = (patrimonioTotal / metas.MetaPatrimonio) * 100;
        document.getElementById('progressoMeta').innerText = progresso.toFixed(2) + '%';

        // Gráfico de Pizza (ApexCharts)
        var options = {
            series: valoresAtivos,
            labels: nomesAtivos,
            chart: { type: 'donut', height: 350, foreColor: '#f8fafc' },
            theme: { mode: 'dark' },
            plotOptions: {
                pie: { donut: { size: '70%' } }
            },
            dataLabels: { enabled: true },
            stroke: { show: false },
            tooltip: {
                y: { formatter: function(val) { return "R$ " + val.toFixed(2) } }
            }
        };

        var chart = new ApexCharts(document.querySelector("#graficoPizza"), options);
        chart.render();
    </script>
</body>
</html>
"@

    # Salva o arquivo HTML e abre no navegador padrão
    $html | Set-Content -Path $caminhoHtml -Encoding UTF8
    Write-Host "🚀 Dashboard criado! Abrindo o navegador..." -ForegroundColor Green
    Invoke-Item $caminhoHtml
}