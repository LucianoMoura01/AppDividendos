# Arquivo: .\Scripts\Sync-Mercado.ps1

function Sync-Mercado {
    $caminhoCarteira = ".\Data\carteira.json"
    $caminhoDashboard = ".\Data\dashboard_data.json"
    
    # Lê a carteira que criamos no passo anterior
    $json = Get-Content -Path $caminhoCarteira -Raw
    $carteira = if ($json -and $json -ne "[]") { $json | ConvertFrom-Json } else { @() }
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }

    if ($carteira.Count -eq 0) {
        Write-Host "⚠️ Sua carteira está vazia! Adicione ativos primeiro com Add-Aporte." -ForegroundColor Red
        return
    }

    $patrimonioTotal = 0
    Write-Host "🌐 Conectando ao mercado e buscando cotações ao vivo..." -ForegroundColor Cyan
    Write-Host "------------------------------------------------------"

    foreach ($ativo in $carteira) {
        # O Yahoo Finance usa o sufixo .SA para ativos brasileiros
        $tickerYahoo = "$($ativo.Ticker).SA"
        $url = "https://query1.finance.yahoo.com/v8/finance/chart/$tickerYahoo"
        
        try {
            # Faz a requisição na API
            $resposta = Invoke-RestMethod -Uri $url -Method Get
            $precoAtual = $resposta.chart.result[0].meta.regularMarketPrice
            
            # Matemática da posição atual
            $valorPosicao = $ativo.Quantidade * $precoAtual
            $patrimonioTotal += $valorPosicao
            
            # Calcula se está no lucro ou prejuízo para colorir o terminal
            $rentabilidade = $precoAtual - $ativo.PrecoMedio
            $corRentabilidade = if ($rentabilidade -ge 0) { "Green" } else { "Red" }
            $sinal = if ($rentabilidade -ge 0) { "+" } else { "" }
            
            Write-Host "[$($ativo.Ticker)] PM: R$ $($ativo.PrecoMedio) -> Atual: R$ $precoAtual" -NoNewline
            Write-Host " ($sinal R$ $([math]::Round($rentabilidade, 2))) | Total: R$ $valorPosicao" -ForegroundColor $corRentabilidade
            
            # Injeta os novos dados no objeto para o nosso Dashboard Web ler depois
            $ativo | Add-Member -NotePropertyName PrecoAtual -NotePropertyValue $precoAtual -Force
            $ativo | Add-Member -NotePropertyName ValorTotal -NotePropertyValue $valorPosicao -Force
            
        } catch {
            Write-Host "❌ Erro ao buscar cotação de $($ativo.Ticker). O ativo existe na B3?" -ForegroundColor Red
        }
    }

    Write-Host "------------------------------------------------------"
    Write-Host "💰 PATRIMÔNIO TOTAL ATUALIZADO: R$ $([math]::Round($patrimonioTotal, 2))" -ForegroundColor Yellow
    
    # Salva um novo arquivo com os dados enriquecidos (Preço Atual e Valor Total)
    # Esse é o arquivo que o nosso Dashboard Web vai ler!
    $carteira | ConvertTo-Json -Depth 10 | Set-Content -Path $caminhoDashboard
    Write-Host "✅ Arquivo dashboard_data.json atualizado com sucesso!" -ForegroundColor Cyan
}