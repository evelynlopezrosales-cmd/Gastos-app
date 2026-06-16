// ===== APP MODULE - Main application logic, event handlers, initialization =====

const App = (() => {
    // Current state
    let currentSection = 'dashboard';

    // ===== Transaction CRUD =====
    const handleAddIncome = () => {
        UI.showModal('Nuevo Ingreso', 'income');
    };

    const handleAddExpense = () => {
        UI.showModal('Nuevo Gasto', 'expense');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        
        const id = document.getElementById('formId').value;
        const type = document.getElementById('formType').value;
        const description = document.getElementById('formDescription').value.trim();
        const amount = parseFloat(document.getElementById('formAmount').value);
        const categoryId = document.getElementById('formCategory').value;
        const date = document.getElementById('formDate').value;
        const extraType = document.getElementById('formExtra').value;
        const paymentMethod = document.getElementById('formPayment').value;

        if (!description || !amount || !categoryId || !date) {
            alert('Por favor completa todos los campos.');
            return;
        }

        const txData = { type, description, amount, categoryId, date, extraType, paymentMethod };

        if (id) {
            // Updating
            Storage.updateTransaction(id, txData);
        } else {
            // Creating
            Storage.addTransaction(txData);
        }

        UI.hideModal();
        refreshCurrentSection();
    };

    const editTransaction = (id) => {
        const tx = Storage.getTransactionById(id);
        if (!tx) return;

        const title = tx.type === 'income' ? 'Editar Ingreso' : 'Editar Gasto';
        UI.showModal(title, tx.type, tx);
    };

    const confirmDelete = (id) => {
        const tx = Storage.getTransactionById(id);
        if (!tx) return;
        UI.showConfirmDialog(
            `¿Eliminar "${tx.description}" (${UI.formatCurrency(tx.amount)})?`,
            () => {
                Storage.deleteTransaction(id);
                refreshCurrentSection();
            }
        );
    };

    // ===== Category CRUD =====
    const handleAddCategory = () => {
        UI.showCategoryModal('Nueva Categoría');
    };

    const handleCategoryFormSubmit = (e) => {
        e.preventDefault();

        const id = document.getElementById('catFormId').value;
        const name = document.getElementById('catFormName').value.trim();
        const color = document.getElementById('catFormColor').value;
        const icon = document.getElementById('catFormIcon').value;
        const type = document.querySelector('input[name="catType"]:checked').value;

        if (!name) {
            alert('Por ingresa un nombre para la categoría.');
            return;
        }

        const catData = { name, color, icon, type };

        if (id) {
            Storage.updateCategory(id, catData);
        } else {
            Storage.addCategory(catData);
        }

        UI.hideCategoryModal();
        refreshCurrentSection();
    };

    const editCategory = (id) => {
        const cat = Storage.getCategoryById(id);
        if (!cat) return;
        UI.showCategoryModal('Editar Categoría', cat);
    };

    const confirmDeleteCategory = (id) => {
        const cat = Storage.getCategoryById(id);
        if (!cat) return;
        
        // Check if category is in use
        const tx = Storage.getTransactions().filter(t => t.categoryId === id);
        const extraMsg = tx.length > 0 
            ? ` (${tx.length} transacción(es) perderán su categoría)`
            : '';
        
        UI.showConfirmDialog(
            `¿Eliminar la categoría "${cat.name}"?${extraMsg}`,
            () => {
                Storage.deleteCategory(id);
                refreshCurrentSection();
            }
        );
    };

    // ===== Dashboard Controls =====
    const handleDashboardMonthChange = () => {
        const month = parseInt(document.getElementById('dashboardMonth').value);
        const year = parseInt(document.getElementById('dashboardYear').value);
        UI.renderDashboard(month, year);
    };

    // ===== History Filters =====
    const handleFilterChange = () => {
        UI.renderHistoryTable();
    };

    const clearFilters = () => {
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterDate').value = '';
        UI.renderHistoryTable();
    };

    // ===== Export / Reset =====
    const handleExport = () => {
        const data = Storage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gastosapp_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        UI.showConfirmDialog(
            '¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.',
            () => {
                Storage.resetAllData();
                refreshCurrentSection();
                // Also switch to dashboard to show clean state
                UI.switchSection('dashboard');
                currentSection = 'dashboard';
            }
        );
    };

    // ===== Navigation =====
    const handleNavClick = (section) => {
        currentSection = section;
        UI.switchSection(section);
    };

    // ===== Refresh =====
    const refreshCurrentSection = () => {
        UI.switchSection(currentSection);
    };

    // ===== Dark Mode =====
    const toggleDarkMode = () => {
        const body = document.body;
        const btn = document.getElementById('darkModeToggle');
        const icon = btn.querySelector('i');
        
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            icon.className = 'fas fa-sun';
            btn.innerHTML = '<i class="fas fa-sun"></i> Claro';
            localStorage.setItem('gastosapp-darkmode', 'true');
        } else {
            icon.className = 'fas fa-moon';
            btn.innerHTML = '<i class="fas fa-moon"></i> Oscuro';
            localStorage.setItem('gastosapp-darkmode', 'false');
        }
    };

    const loadDarkModePreference = () => {
        const saved = localStorage.getItem('gastosapp-darkmode');
        if (saved === 'true') {
            document.body.classList.add('dark-mode');
            const btn = document.getElementById('darkModeToggle');
            btn.innerHTML = '<i class="fas fa-sun"></i> Claro';
        }
    };

    // ===== Mobile Menu =====
    const toggleMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        const icon = toggle.querySelector('i');
        if (sidebar.classList.contains('open')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    };

    const closeMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        toggle.querySelector('i').className = 'fas fa-bars';
    };

    // ===== Transfer =====
    const handleOpenTransfer = () => {
        UI.showTransferModal();
    };

    const handleTransferSubmit = (e) => {
        e.preventDefault();
        const from = document.getElementById('transferFrom').value;
        const to = document.getElementById('transferTo').value;
        const amount = document.getElementById('transferAmount').value;
        const description = document.getElementById('transferDescription').value.trim();

        if (!amount || parseFloat(amount) <= 0) {
            alert('Por favor ingresa un monto válido.');
            return;
        }

        if (from === to) {
            alert('No puedes transferir a la misma cuenta.');
            return;
        }

        const fromBalance = Storage.getWalletBalance(from);
        if (parseFloat(amount) > fromBalance) {
            alert(`No tienes suficiente saldo en ${UI.getPaymentMethodLabel(from)}. Saldo disponible: ${UI.formatCurrency(fromBalance)}`);
            return;
        }

        const success = Storage.transferBetweenWallets(from, to, amount, description);
        if (success) {
            UI.hideTransferModal();
            refreshCurrentSection();
        } else {
            alert('Error al realizar la transferencia.');
        }
    };

    // ===== Initialize =====
    const init = () => {
        // Ensure default data exists
        Storage.getCategories();
        Storage.getTransactions();

        // Recalculate wallet balances from existing data (for migration)
        Storage.recalculateWalletBalances();

        // Set current month/year
        const now = new Date();
        document.getElementById('dashboardMonth').value = now.getMonth();
        UI.populateYears();

        // Render initial dashboard
        UI.renderDashboard(now.getMonth(), now.getFullYear());

        // Load dark mode preference
        loadDarkModePreference();

        // ===== Event Listeners =====

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

        // Mobile menu
        document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);
        document.getElementById('mobileOverlay').addEventListener('click', closeMobileMenu);

        // Navigation (close mobile menu on nav click)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                handleNavClick(section);
                closeMobileMenu();
            });
        });

        // Add buttons
        document.getElementById('addIncomeBtn').addEventListener('click', handleAddIncome);
        document.getElementById('addExpenseBtn').addEventListener('click', handleAddExpense);
        document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);

        // Transfer
        document.getElementById('openTransferBtn').addEventListener('click', handleOpenTransfer);
        document.getElementById('transferForm').addEventListener('submit', handleTransferSubmit);
        document.getElementById('transferFrom').addEventListener('change', () => {
            const from = document.getElementById('transferFrom').value;
            const to = document.getElementById('transferTo');
            to.value = from === 'tarjeta' ? 'efectivo' : 'tarjeta';
        });
        document.getElementById('transferTo').addEventListener('change', () => {
            const to = document.getElementById('transferTo').value;
            const from = document.getElementById('transferFrom');
            from.value = to === 'tarjeta' ? 'efectivo' : 'tarjeta';
        });
        document.getElementById('transferCancel').addEventListener('click', UI.hideTransferModal);
        document.getElementById('transferModalClose').addEventListener('click', UI.hideTransferModal);
        document.getElementById('transferModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) UI.hideTransferModal();
        });

        // Modal form submit
        document.getElementById('modalForm').addEventListener('submit', handleFormSubmit);
        document.getElementById('formCancel').addEventListener('click', UI.hideModal);
        document.getElementById('modalClose').addEventListener('click', UI.hideModal);
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) UI.hideModal();
        });

        // Category modal form submit
        document.getElementById('categoryModalForm').addEventListener('submit', handleCategoryFormSubmit);
        document.getElementById('categoryFormCancel').addEventListener('click', UI.hideCategoryModal);
        document.getElementById('categoryModalClose').addEventListener('click', UI.hideCategoryModal);
        document.getElementById('categoryModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) UI.hideCategoryModal();
        });

        // Dashboard month/year change
        document.getElementById('dashboardMonth').addEventListener('change', handleDashboardMonthChange);
        document.getElementById('dashboardYear').addEventListener('change', handleDashboardMonthChange);

        // History filters
        document.getElementById('filterType').addEventListener('change', handleFilterChange);
        document.getElementById('filterCategory').addEventListener('change', handleFilterChange);
        document.getElementById('filterDate').addEventListener('change', handleFilterChange);
        document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

        // Export / Reset
        document.getElementById('exportDataBtn').addEventListener('click', handleExport);
        document.getElementById('resetDataBtn').addEventListener('click', handleReset);

        console.log('🚀 Gastos App initialized successfully!');
    };

    // Public API (exposed for onclick handlers in HTML)
    return {
        init,
        editTransaction,
        confirmDelete,
        editCategory,
        confirmDeleteCategory,
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});