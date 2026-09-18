# Arquivo: .\Menu.ps1

# 1. Carrega as engrenagens do app (seus scripts)
. .\Scripts\Add-Aporte.ps1
. .\Scripts\Sync-Mercado.ps1
. .\Scripts\Start-Dashboard.ps1
. .\Scripts\Check-Snowball.ps1

function Show-Menu {
    Clear-Host
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "       ❄️  APP BOLA DE NEVE - MENU PRINCIPAL ❄️   " -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host " 1. ➕ Adicionar Aporte" -ForegroundColor Yellow
    Write-Host " 2. 🌐 Sincronizar Mercado (Cotações ao vivo)" -ForegroundColor Yellow
    Write-Host " 3. 📊 Abrir Dashboard Web" -ForegroundColor Yellow
    Write-Host " 4. ❄️ Checar Efeito Bola de Neve" -ForegroundColor Yellow
    Write-Host " 0. ❌ Sair" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Cyan
}

# 2. O laço infinito que mantém o app rodando até você escolher Sair
do {
    Show-Menu
    $escolha = Read-Host "`nEscolha uma opção"

    switch ($escolha) {
        '1' {
            Write-Host "`n-- ADICIONAR APORTE --" -ForegroundColor Cyan
            $ticker = Read-Host "Digite o Ticker (ex: MXRF11)"
            $qtd = Read-Host "Digite a Quantidade"
            $preco = Read-Host "Digite o Preço Pago (ex: 10,50 ou 10.50)"
            
            try {
                $qtdInt = [int]$qtd
                $precoDec = [decimal]($preco -replace ',', '.')
                Add-Aporte -Ticker $ticker -Quantidade $qtdInt -Preco $precoDec
            }
            catch {
                Write-Host "Erro! Digite números válidos." -ForegroundColor Red
            }
            Read-Host "`nPressione ENTER para voltar ao menu..."
        }
        '2' {
            Write-Host "`n"
            Sync-Mercado
            Read-Host "`nPressione ENTER para voltar ao menu..."
        }
        '3' {
            Write-Host "`n"
            Start-Dashboard
            Read-Host "`nPressione ENTER para voltar ao menu..."
        }
        '4' {
            Write-Host "`n-- CHECAR BOLA DE NEVE --" -ForegroundColor Cyan
            $ticker = Read-Host "Digite o Ticker (ex: MXRF11)"
            $div = Read-Host "Digite o Dividendo por Cota (ex: 0,11 ou 0.11)"
            
            try {
                $divDec = [decimal]($div -replace ',', '.')
                Check-Snowball -Ticker $ticker -DividendoPorCota $divDec
            }
            catch {
                Write-Host "Erro! Digite números válidos." -ForegroundColor Red
            }
            Read-Host "`nPressione ENTER para voltar ao menu..."
        }
        '0' {
            Write-Host "`nSaindo do App Bola de Neve. Bons investimentos, Luciano!" -ForegroundColor Green
        }
        default {
            Write-Host "`nOpção inválida! Tente novamente." -ForegroundColor Red
            Read-Host "`nPressione ENTER para continuar..."
        }
    }
} until ($escolha -eq '0')