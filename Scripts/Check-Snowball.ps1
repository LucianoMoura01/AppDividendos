# Arquivo: .\Scripts\Check-Snowball.ps1

function Check-Snowball {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Ticker,
        
        [Parameter(Mandatory = $true)]
        [decimal]$DividendoPorCota
    )
    
    $caminhoDados = ".\Data\dashboard_data.json"
    
    if (-not (Test-Path $caminhoDados)) {
        Write-Host "⚠️ Rode Sync-Mercado primeiro para ter as cotações atualizadas!" -ForegroundColor Red
        return
    }

    # Lê os dados da carteira enriquecidos com a cotação atual
    $carteira = Get-Content -Path $caminhoDados -Raw | ConvertFrom-Json
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }
    
    $Ticker = $Ticker.ToUpper()
    $ativo = $carteira | Where-Object { $_.Ticker -eq $Ticker }
    
    if (-not $ativo) {
        Write-Host "❌ Ativo $Ticker não encontrado na sua carteira." -ForegroundColor Red
        return
    }

    # Matemática da Bola de Neve
    $rendimentoTotal = $ativo.Quantidade * $DividendoPorCota
    $precoCota = [math]::Round($ativo.PrecoAtual, 2)
    $rendimentoTotal = [math]::Round($rendimentoTotal, 2)
    
    Write-Host "------------------------------------------------------"
    Write-Host "📊 Analisando Bola de Neve para [$Ticker]" -ForegroundColor Cyan
    Write-Host "Cotas na Carteira : $($ativo.Quantidade)"
    Write-Host "Preço da Cota Hoje: R$ $precoCota"     Write-Host "Rendimento Total  : R$ $rendimentoTotal"
    Write-Host "------------------------------------------------------"

    if ($rendimentoTotal -ge $precoCota) {
        $sobra = [math]::Round(($rendimentoTotal - $precoCota), 2)
        
        # O Pop-up nativo do Windows
        $mensagem = "Parabéns, Luciano! Você alcançou o Efeito Bola de Neve com o ativo $Ticker!`n`nSeus dividendos (R$ $rendimentoTotal) já compram uma nova cota (R$ $precoCota) e ainda sobram R$ $sobra."
        
        Write-Host "❄️ BOLA DE NEVE ALCANÇADA! ❄️" -ForegroundColor Green
        
        # Chama a interface do Windows para exibir o alerta
        $wshell = New-Object -ComObject Wscript.Shell
        $wshell.Popup($mensagem, 0, "❄️ Efeito Bola de Neve!", 64) | Out-Null
        
    }
    else {
        $falta = [math]::Round(($precoCota - $rendimentoTotal), 2)
        Write-Host "🚧 Continue aportando! Faltam R$ $falta em dividendos para o Efeito Bola de Neve em $Ticker." -ForegroundColor Yellow
    }
}