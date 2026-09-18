// ================================================================
// app.js — Router SPA + inicialização do AppDividendos
// ================================================================

(function() {
    var currentTab = 'dashboard';

    // Tab renderers
    var tabs = {
        dashboard: { render: renderDashboard, label: 'Dashboard' },
        carteira:  { render: renderCarteira,  label: 'Carteira ao Vivo' },
        lancamentos: { render: renderLancamentos, label: 'Lançamentos' },
        metas: { render: renderMetas, label: 'Metas & Bola de Neve' }
    };

    function navigateTo(tabName) {
        if (!tabs[tabName]) return;
        currentTab = tabName;

        // Update active nav
        var navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(item) {
            item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
        });

        // Show loading
        var content = document.getElementById('tabContent');
        content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Carregando...</span></div>';

        // Render tab
        try {
            tabs[tabName].render(content);
        } catch (e) {
            content.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9888;&#65039;</div><h4>Erro ao carregar</h4><p>' + e.message + '</p></div>';
        }
    }

    // Init navigation
    function initNav() {
        var navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                var tab = this.getAttribute('data-tab');
                navigateTo(tab);
            });
        });
    }

    // Init sync button
    function initSync() {
        var btnSync = document.getElementById('btnSync');
        var syncStatus = document.getElementById('syncStatus');
        btnSync.addEventListener('click', function() {
            syncStatus.textContent = 'Sincronizando...';
            btnSync.style.pointerEvents = 'none';

            API.syncCotacoes()
                .then(function(data) {
                    syncStatus.textContent = 'Atualizado ' + data.atualizadoEm;
                    showToast('Cotações sincronizadas! Patrimônio: ' + fmtBRL(data.patrimonioTotal), 'success');
                    // Refresh current tab
                    navigateTo(currentTab);
                })
                .catch(function(err) {
                    syncStatus.textContent = 'Erro ao sincronizar';
                    var msg = (err && err.data && err.data.erro) ? err.data.erro : 'Falha na conexão';
                    showToast(msg, 'error');
                })
                .finally(function() {
                    btnSync.style.pointerEvents = 'auto';
                });
        });
    }

    // Init modal close
    function initModal() {
        var overlay = document.getElementById('modalOverlay');
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    }

    // Boot
    document.addEventListener('DOMContentLoaded', function() {
        initNav();
        initSync();
        initModal();
        navigateTo('dashboard');
    });

    // Global helper: open modal
    window.openModal = function(html) {
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.remove('hidden');
    };
    window.closeModal = function() {
        document.getElementById('modalOverlay').classList.add('hidden');
    };
    // Global helper: navigate
    window.navigateTo = navigateTo;
})();
