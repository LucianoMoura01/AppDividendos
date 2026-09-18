# Arquivo: .\Scripts\Add-Aporte.ps1

function Add-Aporte {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Ticker,
        
        [Parameter(Mandatory=$true)]
        [int]$Quantidade,
        
        [Parameter(Mandatory=$true)]
        [decimal]$Preco
    )
    
    $caminhoJson = ".\Data\carteira.json"
    
    # Lê a carteira atual
    $json = Get-Content -Path $caminhoJson -Raw
    $carteira = if ($json -and $json -ne "[]") { $json | ConvertFrom-Json } else { @() }
    
    # Garante que seja tratado como um Array (lista)
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }
    
    # Padroniza o Ticker para maiúsculo
    $Ticker = $Ticker.ToUpper()
    
    # Procura se o ativo já está na carteira
    $ativoExistente = $carteira | Where-Object { $_.Ticker -eq $Ticker }
    
    if ($ativoExistente) {
        # Matemática financeira: Cálculo do novo Preço Médio
        $valorTotalAntigo = $ativoExistente.Quantidade * $ativoExistente.PrecoMedio
        $valorTotalNovo = $Quantidade * $Preco
        $novaQuantidade = $ativoExistente.Quantidade + $Quantidade
        
        $novoPrecoMedio = ($valorTotalAntigo + $valorTotalNovo) / $novaQuantidade
        
        # Atualiza os dados na memória
        $ativoExistente.Quantidade = $novaQuantidade
        $ativoExistente.PrecoMedio = [math]::Round($novoPrecoMedio, 2)
        
        Write-Host "🔄 Ativo já existente: [$Ticker]. Quantidade total: $novaQuantidade | Novo PM: R$ $($ativoExistente.PrecoMedio)" -ForegroundColor Yellow
    } else {
        # Cria um novo ativo na carteira
        $novoAtivo = [PSCustomObject]@{
            Ticker = $Ticker
            Quantidade = $Quantidade
            PrecoMedio = [math]::Round($Preco, 2)
        }
        $carteira += $novoAtivo
        Write-Host "✅ Novo ativo adicionado: [$Ticker] com PM de R$ $($novoAtivo.PrecoMedio)." -ForegroundColor Cyan
    }
    
    # Salva o JSON atualizado e formatado
    $carteira | ConvertTo-Json -Depth 10 | Set-Content -Path $caminhoJson
    Write-Host "💾 Banco de dados atualizado com sucesso!" -ForegroundColor Green
}