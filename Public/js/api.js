// ================================================================
// api.js — Camada de comunicação com a API REST do AppDividendos
// ================================================================

var API = (function() {
    var BASE = '';

    function request(method, endpoint, body) {
        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            opts.body = JSON.stringify(body);
        }
        return fetch(BASE + endpoint, opts)
            .then(function(res) {
                return res.json().then(function(data) {
                    if (!res.ok) {
                        throw { status: res.status, data: data };
                    }
                    return data;
                });
            });
    }

    return {
        // Carteira
        getCarteira: function() { return request('GET', '/api/carteira'); },

        // Cotações ao vivo (sincroniza com Yahoo Finance)
        syncCotacoes: function() { return request('GET', '/api/cotacoes'); },

        // Detalhes de um ativo
        getCotacaoDetalhe: function(ticker) { return request('GET', '/api/cotacao/' + ticker); },

        // Transações
        getHistorico: function() { return request('GET', '/api/historico'); },
        postTransacao: function(data) { return request('POST', '/api/transacao', data); },
        postImportarB3: function(data) { return request('POST', '/api/importar-b3', data); },

        // Metas
        getMetas: function() { return request('GET', '/api/metas'); },
        postMetas: function(data) { return request('POST', '/api/metas', data); },

        // Dividendos
        getDividendos: function() { return request('GET', '/api/dividendos'); },
        postDividendo: function(data) { return request('POST', '/api/dividendos', data); },

        // Snapshots (evolução patrimônio)
        getSnapshots: function() { return request('GET', '/api/snapshots'); },

        // Snowball check
        getSnowball: function(ticker) { return request('GET', '/api/snowball/' + ticker); }
    };
})();

// ================================================================
// Utility: formatação BRL
// ================================================================
function fmtBRL(valor) {
    if (valor == null || isNaN(valor)) return 'R$ 0,00';
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ================================================================
// Utility: toast notifications
// ================================================================
function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
}
