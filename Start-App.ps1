# Arquivo: .\Start-App.ps1
# Servidor HTTP local do AppDividendos
# Uso: .\Start-App.ps1
# Acesse: http://localhost:5000

# Carrega os handlers da API
. .\Scripts\Api-Router.ps1

$porta = 5000
$prefix = "http://localhost:$porta/"

# ====== MIME TYPES ======
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
}

# ====== SERVIDOR ======
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "ERRO: Não foi possível iniciar o servidor na porta $porta." -ForegroundColor Red
    Write-Host "Tente rodar o PowerShell como Administrador ou mude a porta." -ForegroundColor Yellow
    exit
}

Clear-Host
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   [*] APP BOLA DE NEVE - SERVIDOR WEB LOCAL" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  > Acesse: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:$porta" -ForegroundColor Green
Write-Host ""
Write-Host "  > Servindo: $((Resolve-Path .\Public).Path)" -ForegroundColor Gray
Write-Host "  > API:      http://localhost:$porta/api/*" -ForegroundColor Gray
Write-Host ""
Write-Host "  Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ====== LOOP PRINCIPAL ======
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $method = $request.HttpMethod
        $path = $request.Url.LocalPath

        # CORS headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        # Handle preflight OPTIONS
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        $timestamp = (Get-Date).ToString("HH:mm:ss")

        try {
            # ====== ROTAS DA API ======
            if ($path.StartsWith("/api/")) {

                switch -Regex ($path) {
                    "^/api/carteira$" {
                        if ($method -eq "GET") { Handle-GetCarteira -Response $response }
                    }
                    "^/api/cotacoes$" {
                        if ($method -eq "GET") { Handle-GetCotacoes -Response $response }
                    }
                    "^/api/cotacao/(.+)$" {
                        if ($method -eq "GET") {
                            $ticker = $Matches[1]
                            Handle-GetCotacaoDetalhe -Response $response -Ticker $ticker
                        }
                    }
                    "^/api/transacao$" {
                        if ($method -eq "POST") { Handle-PostTransacao -Response $response -Request $request }
                    }
                    "^/api/historico$" {
                        if ($method -eq "GET") { Handle-GetHistorico -Response $response }
                    }
                    "^/api/metas$" {
                        if ($method -eq "GET") { Handle-GetMetas -Response $response }
                        elseif ($method -eq "POST") { Handle-PostMetas -Response $response -Request $request }
                    }
                    "^/api/dividendos$" {
                        if ($method -eq "GET") { Handle-GetDividendos -Response $response }
                        elseif ($method -eq "POST") { Handle-PostDividendo -Response $response -Request $request }
                    }
                    "^/api/snapshots$" {
                        if ($method -eq "GET") { Handle-GetSnapshots -Response $response }
                    }
                    "^/api/snowball/(.+)$" {
                        if ($method -eq "GET") {
                            $ticker = $Matches[1]
                            Handle-GetSnowball -Response $response -Ticker $ticker
                        }
                    }
                    default {
                        $response.StatusCode = 404
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"erro":"Endpoint não encontrado"}')
                        $response.ContentType = "application/json"
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    }
                }

                $cor = if ($response.StatusCode -lt 400) { "Green" } else { "Red" }
                Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
                Write-Host "$method $path " -NoNewline -ForegroundColor White
                Write-Host "$($response.StatusCode)" -ForegroundColor $cor

            }
            # ====== ARQUIVOS ESTÁTICOS ======
            else {
                # Resolver caminho do arquivo
                $filePath = $path
                if ($filePath -eq "/") { $filePath = "/index.html" }

                $fullPath = Join-Path (Resolve-Path .\Public).Path ($filePath.TrimStart("/").Replace("/", "\"))

                if (Test-Path $fullPath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                    $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

                    $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
                    $response.ContentType = $contentType
                    $response.StatusCode = 200
                    $response.ContentLength64 = $fileBytes.Length
                    $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                } else {
                    # SPA fallback: retorna index.html para rotas desconhecidas
                    $indexPath = Join-Path (Resolve-Path .\Public).Path "index.html"
                    if (Test-Path $indexPath) {
                        $fileBytes = [System.IO.File]::ReadAllBytes($indexPath)
                        $response.ContentType = "text/html; charset=utf-8"
                        $response.StatusCode = 200
                        $response.ContentLength64 = $fileBytes.Length
                        $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                    } else {
                        $response.StatusCode = 404
                    }
                }
            }
        }
        catch {
            Write-Host "[$timestamp] ERRO: $($_.Exception.Message)" -ForegroundColor Red
            try {
                $errJson = '{"erro":"Erro interno do servidor"}'
                $errBuf = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.StatusCode = 500
                $response.ContentType = "application/json"
                $response.OutputStream.Write($errBuf, 0, $errBuf.Length)
            } catch {}
        }
        finally {
            try { $response.Close() } catch {}
        }
    }
}
finally {
    Write-Host "`n[X] Servidor encerrado." -ForegroundColor Yellow
    $listener.Stop()
    $listener.Close()
}
