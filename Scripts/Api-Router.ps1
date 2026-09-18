# Arquivo: .\Scripts\Api-Router.ps1
# Contém todos os handlers da API REST do AppDividendos

# ====== CAMINHOS DOS DADOS ======
$global:DataPath = Join-Path $PSScriptRoot "..\Data"

# ====== FUNÇÕES AUXILIARES ======

function Read-JsonFile {
    param([string]$FileName)
    $path = Join-Path $global:DataPath $FileName
    if (Test-Path $path) {
        $raw = Get-Content -Path $path -Raw -Encoding UTF8
        if ($raw -and $raw.Trim() -ne "" -and $raw.Trim() -ne "[]") {
            return ($raw | ConvertFrom-Json)
        }
    }
    return @()
}

function Write-JsonFile {
    param([string]$FileName, $Data)
    $path = Join-Path $global:DataPath $FileName
    if ($null -eq $Data) { $Data = @() }
    $Data | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding UTF8
}

function Send-JsonResponse {
    param($Response, $Data, [int]$StatusCode = 200)
    $json = ConvertTo-Json -InputObject $Data -Depth 10
    if ([string]::IsNullOrEmpty($json)) { $json = "[]" }
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"
    $Response.ContentLength64 = $buffer.Length
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
}

function Read-RequestBody {
    param($Request)
    $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
    $body = $reader.ReadToEnd()
    $reader.Close()
    return ($body | ConvertFrom-Json)
}

# ====== HANDLERS DA API ======

function Handle-GetCarteira {
    param($Response)
    $carteira = Read-JsonFile "carteira.json"
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }

    # Enriquecer com dados de cotação se disponíveis
    $dashData = Read-JsonFile "dashboard_data.json"
    if ($dashData -isnot [System.Array]) { $dashData = @($dashData) }

    foreach ($ativo in $carteira) {
        $cached = $dashData | Where-Object { $_.Ticker -eq $ativo.Ticker }
        if ($cached) {
            $ativo | Add-Member -NotePropertyName PrecoAtual -NotePropertyValue $cached.PrecoAtual -Force
            $ativo | Add-Member -NotePropertyName ValorTotal -NotePropertyValue $cached.ValorTotal -Force
        } else {
            $ativo | Add-Member -NotePropertyName PrecoAtual -NotePropertyValue 0 -Force
            $ativo | Add-Member -NotePropertyName ValorTotal -NotePropertyValue 0 -Force
        }
    }
    Send-JsonResponse -Response $Response -Data $carteira
}

function Handle-GetCotacoes {
    param($Response)
    $carteira = Read-JsonFile "carteira.json"
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }

    if ($carteira.Count -eq 0) {
        Send-JsonResponse -Response $Response -Data @{ erro = "Carteira vazia" } -StatusCode 400
        return
    }

    $patrimonioTotal = 0
    foreach ($ativo in $carteira) {
        $tickerYahoo = "$($ativo.Ticker).SA"
        $url = "https://query1.finance.yahoo.com/v8/finance/chart/$tickerYahoo"
        try {
            $resposta = Invoke-RestMethod -Uri $url -Method Get
            $precoAtual = $resposta.chart.result[0].meta.regularMarketPrice
            $valorPosicao = $ativo.Quantidade * $precoAtual
            $patrimonioTotal += $valorPosicao

            $ativo | Add-Member -NotePropertyName PrecoAtual -NotePropertyValue $precoAtual -Force
            $ativo | Add-Member -NotePropertyName ValorTotal -NotePropertyValue ([math]::Round($valorPosicao, 2)) -Force
        } catch {
            $ativo | Add-Member -NotePropertyName PrecoAtual -NotePropertyValue 0 -Force
            $ativo | Add-Member -NotePropertyName ValorTotal -NotePropertyValue 0 -Force
        }
    }

    # Salvar cache para o dashboard
    Write-JsonFile "dashboard_data.json" $carteira

    # Salvar snapshot diário
    $hoje = (Get-Date).ToString("yyyy-MM-dd")
    $snapshots = Read-JsonFile "snapshots.json"
    if ($snapshots -isnot [System.Array]) { $snapshots = @($snapshots) }
    $jaExiste = $snapshots | Where-Object { $_.Data -eq $hoje }
    if (-not $jaExiste) {
        $novoSnap = [PSCustomObject]@{
            Data = $hoje
            Patrimonio = [math]::Round($patrimonioTotal, 2)
            QtdAtivos = $carteira.Count
        }
        $snapshots = @($snapshots) + @($novoSnap)
        Write-JsonFile "snapshots.json" $snapshots
    }

    $resultado = @{
        carteira = $carteira
        patrimonioTotal = [math]::Round($patrimonioTotal, 2)
        atualizadoEm = (Get-Date).ToString("dd/MM/yyyy HH:mm:ss")
    }
    Send-JsonResponse -Response $Response -Data $resultado
}

function Handle-GetCotacaoDetalhe {
    param($Response, [string]$Ticker)
    $Ticker = $Ticker.ToUpper()
    $tickerYahoo = "$Ticker.SA"

    try {
        # Cotação atual
        $urlChart = "https://query1.finance.yahoo.com/v8/finance/chart/$($tickerYahoo)?range=6mo&interval=1d"
        $respostaChart = Invoke-RestMethod -Uri $urlChart -Method Get
        $meta = $respostaChart.chart.result[0].meta
        $timestamps = $respostaChart.chart.result[0].timestamp
        $closes = $respostaChart.chart.result[0].indicators.quote[0].close

        # Montar histórico de preços
        $historicoPrecosArr = @()
        if ($timestamps -and $closes) {
            for ($i = 0; $i -lt $timestamps.Count; $i++) {
                if ($null -ne $closes[$i]) {
                    $dataEpoch = [DateTimeOffset]::FromUnixTimeSeconds($timestamps[$i]).DateTime
                    $historicoPrecosArr += [PSCustomObject]@{
                        Data = $dataEpoch.ToString("yyyy-MM-dd")
                        Preco = [math]::Round($closes[$i], 2)
                    }
                }
            }
        }

        # Dados da carteira do usuario
        $carteira = Read-JsonFile "carteira.json"
        if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }
        $posicao = $carteira | Where-Object { $_.Ticker -eq $Ticker }

        # Historico de transações desse ativo
        $historico = Read-JsonFile "historico.json"
        if ($historico -isnot [System.Array]) { $historico = @($historico) }
        $transacoes = @($historico | Where-Object { $_.Ticker -eq $Ticker })

        # Dividendos desse ativo
        $divs = Read-JsonFile "dividendos.json"
        if ($divs -isnot [System.Array]) { $divs = @($divs) }
        $dividendos = @($divs | Where-Object { $_.Ticker -eq $Ticker })

        $resultado = @{
            ticker = $Ticker
            precoAtual = $meta.regularMarketPrice
            precoAnterior = $meta.chartPreviousClose
            moeda = $meta.currency
            exchange = $meta.exchangeName
            historicoPrecos = $historicoPrecosArr
            posicao = $posicao
            transacoes = $transacoes
            dividendos = $dividendos
        }
        Send-JsonResponse -Response $Response -Data $resultado
    } catch {
        Send-JsonResponse -Response $Response -Data @{ erro = "Erro ao buscar dados de $Ticker"; detalhe = $_.Exception.Message } -StatusCode 500
    }
}

function Handle-PostTransacao {
    param($Response, $Request)
    $body = Read-RequestBody $Request

    # Validação
    if (-not $body.Ticker -or -not $body.Quantidade -or -not $body.Preco -or -not $body.Tipo) {
        Send-JsonResponse -Response $Response -Data @{ erro = "Campos obrigatórios: Ticker, Quantidade, Preco, Tipo" } -StatusCode 400
        return
    }

    $ticker = $body.Ticker.ToString().ToUpper()
    $quantidade = [int]$body.Quantidade
    $preco = [decimal]$body.Preco
    $tipo = $body.Tipo.ToString()
    $data = if ($body.Data) { $body.Data.ToString() } else { (Get-Date).ToString("yyyy-MM-dd") }

    # Verificar duplicidade
    $historico = Read-JsonFile "historico.json"
    if ($historico -isnot [System.Array]) { $historico = @($historico) }

    $duplicata = $historico | Where-Object {
        $_.Ticker -eq $ticker -and $_.Data -eq $data -and [int]$_.Quantidade -eq $quantidade -and [decimal]$_.Preco -eq $preco -and $_.Tipo -eq $tipo
    }
    if ($duplicata) {
        Send-JsonResponse -Response $Response -Data @{ erro = "Transação duplicada detectada! Já existe um lançamento com esses mesmos dados."; duplicata = $true } -StatusCode 409
        return
    }

    # Registrar transação no histórico
    $novaTransacao = [PSCustomObject]@{
        Id = [guid]::NewGuid().ToString().Substring(0, 8)
        Tipo = $tipo
        Ticker = $ticker
        Quantidade = $quantidade
        Preco = [math]::Round($preco, 2)
        Data = $data
        RegistradoEm = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    $historico = @($historico) + @($novaTransacao)
    Write-JsonFile "historico.json" $historico

    # Atualizar carteira
    $carteira = Read-JsonFile "carteira.json"
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }

    $ativoExistente = $carteira | Where-Object { $_.Ticker -eq $ticker }

    if ($tipo -eq "Compra") {
        if ($ativoExistente) {
            # Preço Médio ponderado
            $valorTotalAntigo = $ativoExistente.Quantidade * $ativoExistente.PrecoMedio
            $valorTotalNovo = $quantidade * $preco
            $novaQuantidade = $ativoExistente.Quantidade + $quantidade
            $novoPrecoMedio = ($valorTotalAntigo + $valorTotalNovo) / $novaQuantidade

            $ativoExistente.Quantidade = $novaQuantidade
            $ativoExistente.PrecoMedio = [math]::Round($novoPrecoMedio, 2)
        } else {
            $novoAtivo = [PSCustomObject]@{
                Ticker = $ticker
                Quantidade = $quantidade
                PrecoMedio = [math]::Round($preco, 2)
            }
            $carteira = @($carteira) + @($novoAtivo)
        }
    }
    elseif ($tipo -eq "Venda") {
        if (-not $ativoExistente) {
            Send-JsonResponse -Response $Response -Data @{ erro = "Ativo $ticker não encontrado na carteira para venda." } -StatusCode 400
            return
        }
        if ($ativoExistente.Quantidade -lt $quantidade) {
            Send-JsonResponse -Response $Response -Data @{ erro = "Quantidade insuficiente. Você tem $($ativoExistente.Quantidade) cotas de $ticker." } -StatusCode 400
            return
        }
        $ativoExistente.Quantidade = $ativoExistente.Quantidade - $quantidade
        # Remover ativo se quantidade zerou
        if ($ativoExistente.Quantidade -le 0) {
            $carteira = @($carteira | Where-Object { $_.Ticker -ne $ticker })
        }
    }

    Write-JsonFile "carteira.json" $carteira

    Send-JsonResponse -Response $Response -Data @{
        sucesso = $true
        mensagem = "$tipo de $quantidade cotas de $ticker registrada com sucesso!"
        transacao = $novaTransacao
    }
}

function Handle-PostImportarB3 {
    param($Response, $Request)
    $body = Read-RequestBody $Request

    if (-not $body.transacoes -or $body.transacoes -isnot [System.Array]) {
        Send-JsonResponse -Response $Response -Data @{ erro = "O payload deve conter um array 'transacoes'." } -StatusCode 400
        return
    }

    $historico = Read-JsonFile "historico.json"
    if ($historico -isnot [System.Array]) { $historico = @($historico) }

    $carteira = Read-JsonFile "carteira.json"
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }

    $importados = 0
    $ignorados = 0

    foreach ($tx in $body.transacoes) {
        $ticker = $tx.Ticker.ToString().ToUpper()
        $quantidade = [int]$tx.Quantidade
        $preco = [decimal]$tx.Preco
        $tipo = $tx.Tipo.ToString()
        $data = $tx.Data.ToString()

        # Verificar duplicidade
        $duplicata = $historico | Where-Object {
            $_.Ticker -eq $ticker -and $_.Data -eq $data -and [int]$_.Quantidade -eq $quantidade -and [decimal]$_.Preco -eq $preco -and $_.Tipo -eq $tipo
        }

        if ($duplicata) {
            $ignorados++
            continue
        }

        # Registrar transação
        $novaTransacao = [PSCustomObject]@{
            Id = [guid]::NewGuid().ToString().Substring(0, 8)
            Tipo = $tipo
            Ticker = $ticker
            Quantidade = $quantidade
            Preco = [math]::Round($preco, 2)
            Data = $data
            RegistradoEm = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        $historico = @($historico) + @($novaTransacao)
        $importados++

        # Atualizar carteira
        $ativoExistente = $carteira | Where-Object { $_.Ticker -eq $ticker }

        if ($tipo -eq "Compra") {
            if ($ativoExistente) {
                $valorTotalAntigo = $ativoExistente.Quantidade * $ativoExistente.PrecoMedio
                $valorTotalNovo = $quantidade * $preco
                $novaQuantidade = $ativoExistente.Quantidade + $quantidade
                $novoPrecoMedio = ($valorTotalAntigo + $valorTotalNovo) / $novaQuantidade
                $ativoExistente.Quantidade = $novaQuantidade
                $ativoExistente.PrecoMedio = [math]::Round($novoPrecoMedio, 2)
            } else {
                $novoAtivo = [PSCustomObject]@{
                    Ticker = $ticker
                    Quantidade = $quantidade
                    PrecoMedio = [math]::Round($preco, 2)
                }
                $carteira = @($carteira) + @($novoAtivo)
            }
        }
        elseif ($tipo -eq "Venda") {
            if ($ativoExistente) {
                $ativoExistente.Quantidade = $ativoExistente.Quantidade - $quantidade
                if ($ativoExistente.Quantidade -le 0) {
                    $carteira = @($carteira | Where-Object { $_.Ticker -ne $ticker })
                }
            }
        }
    }

    if ($importados -gt 0) {
        Write-JsonFile "historico.json" $historico
        Write-JsonFile "carteira.json" $carteira
    }

    Send-JsonResponse -Response $Response -Data @{
        sucesso = $true
        importados = $importados
        ignorados = $ignorados
        mensagem = "Importação concluída. $importados inseridos, $ignorados ignorados (duplicatas)."
    }
}

function Handle-GetHistorico {
    param($Response)
    $historico = Read-JsonFile "historico.json"
    if ($historico -isnot [System.Array]) { $historico = @($historico) }
    Send-JsonResponse -Response $Response -Data $historico
}

function Handle-GetMetas {
    param($Response)
    $metas = Read-JsonFile "metas.json"
    Send-JsonResponse -Response $Response -Data $metas
}

function Handle-PostMetas {
    param($Response, $Request)
    $body = Read-RequestBody $Request
    $metas = @{
        MetaDividendoMensal = if ($body.MetaDividendoMensal) { [decimal]$body.MetaDividendoMensal } else { 1000 }
        MetaPatrimonio = if ($body.MetaPatrimonio) { [decimal]$body.MetaPatrimonio } else { 100000 }
    }
    Write-JsonFile "metas.json" ([PSCustomObject]$metas)
    Send-JsonResponse -Response $Response -Data @{ sucesso = $true; metas = $metas }
}

function Handle-GetDividendos {
    param($Response)
    $divs = Read-JsonFile "dividendos.json"
    if ($divs -isnot [System.Array]) { $divs = @($divs) }
    Send-JsonResponse -Response $Response -Data $divs
}

function Handle-PostDividendo {
    param($Response, $Request)
    $body = Read-RequestBody $Request

    if (-not $body.Ticker -or -not $body.ValorPorCota) {
        Send-JsonResponse -Response $Response -Data @{ erro = "Campos obrigatórios: Ticker, ValorPorCota" } -StatusCode 400
        return
    }

    $ticker = $body.Ticker.ToString().ToUpper()
    $valorPorCota = [decimal]$body.ValorPorCota
    $data = if ($body.Data) { $body.Data.ToString() } else { (Get-Date).ToString("yyyy-MM-dd") }

    # Buscar quantidade na carteira
    $carteira = Read-JsonFile "carteira.json"
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }
    $ativo = $carteira | Where-Object { $_.Ticker -eq $ticker }

    $qtdCotas = if ($ativo) { $ativo.Quantidade } else { 0 }
    $totalRecebido = [math]::Round($qtdCotas * $valorPorCota, 2)

    $divs = Read-JsonFile "dividendos.json"
    if ($divs -isnot [System.Array]) { $divs = @($divs) }

    $novoDividendo = [PSCustomObject]@{
        Id = [guid]::NewGuid().ToString().Substring(0, 8)
        Ticker = $ticker
        ValorPorCota = $valorPorCota
        Quantidade = $qtdCotas
        TotalRecebido = $totalRecebido
        Data = $data
        RegistradoEm = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    $divs = @($divs) + @($novoDividendo)
    Write-JsonFile "dividendos.json" $divs

    Send-JsonResponse -Response $Response -Data @{ sucesso = $true; dividendo = $novoDividendo }
}

function Handle-GetSnapshots {
    param($Response)
    $snapshots = Read-JsonFile "snapshots.json"
    if ($snapshots -isnot [System.Array]) { $snapshots = @($snapshots) }
    Send-JsonResponse -Response $Response -Data $snapshots
}

function Handle-GetSnowball {
    param($Response, [string]$Ticker)
    $Ticker = $Ticker.ToUpper()

    $carteira = Read-JsonFile "carteira.json"
    if ($carteira -isnot [System.Array]) { $carteira = @($carteira) }
    $ativo = $carteira | Where-Object { $_.Ticker -eq $Ticker }

    if (-not $ativo) {
        Send-JsonResponse -Response $Response -Data @{ erro = "Ativo $Ticker não encontrado na carteira." } -StatusCode 404
        return
    }

    # Buscar cotação atual
    $dashData = Read-JsonFile "dashboard_data.json"
    if ($dashData -isnot [System.Array]) { $dashData = @($dashData) }
    $cached = $dashData | Where-Object { $_.Ticker -eq $Ticker }
    $precoCota = if ($cached) { $cached.PrecoAtual } else { 0 }

    # Buscar dividendos desse ativo
    $divs = Read-JsonFile "dividendos.json"
    if ($divs -isnot [System.Array]) { $divs = @($divs) }
    $divsAtivo = @($divs | Where-Object { $_.Ticker -eq $Ticker })

    # Pegar o último dividendo registrado
    $ultimoDiv = if ($divsAtivo.Count -gt 0) { $divsAtivo[-1] } else { $null }
    $dividendoPorCota = if ($ultimoDiv) { $ultimoDiv.ValorPorCota } else { 0 }

    $rendimentoTotal = [math]::Round($ativo.Quantidade * $dividendoPorCota, 2)
    $alcancou = $rendimentoTotal -ge $precoCota

    $resultado = @{
        ticker = $Ticker
        quantidade = $ativo.Quantidade
        precoCota = $precoCota
        dividendoPorCota = $dividendoPorCota
        rendimentoTotal = $rendimentoTotal
        alcancouBolaDeNeve = $alcancou
        diferenca = [math]::Round(($rendimentoTotal - $precoCota), 2)
    }

    if ($alcancou) {
        $resultado.mensagem = "Parabéns, Luciano! Você alcançou o Efeito Bola de Neve com o ativo $Ticker! Seus dividendos (R$ $rendimentoTotal) já compram uma nova cota (R$ $precoCota)!"
    } else {
        $resultado.mensagem = "Continue aportando! Faltam R$ $([math]::Round(($precoCota - $rendimentoTotal), 2)) para o Efeito Bola de Neve em $Ticker."
    }

    Send-JsonResponse -Response $Response -Data $resultado
}
