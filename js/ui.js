// ===== UI MODULE - Handles all rendering and DOM manipulation =====

const UI = (() => {
    // Format currency
    const formatCurrency = (amount) => {
        return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Format date to locale
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Get category display info
    const getCategoryInfo = (categoryId) => {
        const cat = Storage.getCategoryById(categoryId);
        return cat || { name: 'Sin categoría', color: '#718096', icon: 'fa-other', type: 'expense' };
    };

    // Get a friendly icon HTML for a category
    const getCategoryIconHTML = (categoryId) => {
        const cat = getCategoryInfo(categoryId);
        const iconClass = cat.icon || 'fa-box';
        return `<i class="fas ${iconClass}"></i>`;
    };

    // ===== Dashboard =====
    const renderDashboard = (month, year) => {
        const summary = Storage.getMonthlySummary(month, year);
        
        document.getElementById('totalIncome').textContent = formatCurrency(summary.totalIncome);
        document.getElementById('totalExpenses').textContent = formatCurrency(summary.totalExpenses);
        document.getElementById('totalBalance').textContent = formatCurrency(summary.balance);
        document.getElementById('totalBalance').style.color = summary.balance >= 0 ? 'var(--income)' : 'var(--expense)';
        document.getElementById('savingsRate').textContent = summary.savingsRate.toFixed(1) + '%';
        document.getElementById('savingsRate').style.color = summary.savingsRate >= 15 ? 'var(--income)' : summary.savingsRate >= 0 ? '#d69e2e' : 'var(--expense)';

        renderRecentTransactions(month, year);
        renderExpenseChart(month, year);
        renderTrendChart();
    };

    const renderRecentTransactions = (month, year) => {
        const tx = Storage.getTransactionsByMonth(month, year).slice(0, 10);
        const container = document.getElementById('recentTransactionsList');
        
        if (tx.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay transacciones este mes.</p>';
            return;
        }

        container.innerHTML = tx.map(t => {
            const cat = getCategoryInfo(t.categoryId);
            const icon = getCategoryIconHTML(t.categoryId);
            const typeClass = t.type === 'income' ? 'income' : 'expense';
            const sign = t.type === 'income' ? '+' : '-';
            return `
                <div class="transaction-item">
                    <div class="tx-left">
                        <div class="tx-icon ${typeClass}">${icon}</div>
                        <div class="tx-details">
                            <h4>${t.description}</h4>
                            <span>${formatDate(t.date)} · ${cat.name}</span>
                        </div>
                    </div>
                    <div class="tx-amount ${typeClass}">${sign}${formatCurrency(t.amount)}</div>
                </div>
            `;
        }).join('');
    };

    let expenseChartInstance = null;
    const renderExpenseChart = (month, year) => {
        const grouped = Storage.getExpensesByCategory(month, year);
        const labels = [];
        const data = [];
        const colors = [];
        
        Object.entries(grouped).forEach(([catId, amount]) => {
            const cat = getCategoryInfo(catId);
            labels.push(cat.name);
            data.push(amount);
            colors.push(cat.color);
        });

        if (data.length === 0) {
            labels.push('Sin gastos');
            data.push(1);
            colors.push('#e2e8f0');
        }

        const ctx = document.getElementById('expenseChart').getContext('2d');
        
        if (expenseChartInstance) {
            expenseChartInstance.destroy();
        }

        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 12, usePointStyle: true, font: { size: 12 } }
                    }
                }
            }
        });
    };

    let trendChartInstance = null;
    const renderTrendChart = () => {
        const trendData = Storage.getMonthlyTrend(6);
        const labels = trendData.map(d => d.month);
        const incomeData = trendData.map(d => d.income);
        const expenseData = trendData.map(d => d.expenses);

        const ctx = document.getElementById('trendChart').getContext('2d');
        
        if (trendChartInstance) {
            trendChartInstance.destroy();
        }

        trendChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(72, 187, 120, 0.7)',
                        borderColor: '#48bb78',
                        borderWidth: 2,
                        borderRadius: 4,
                    },
                    {
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(252, 129, 129, 0.7)',
                        borderColor: '#fc8181',
                        borderWidth: 2,
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, font: { size: 12 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (v) => '$' + v.toFixed(0) }
                    }
                }
            }
        });
    };

    // ===== Wallet Account Helpers =====
    const getPaymentMethodLabel = (method) => {
        const labels = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', ahorro: 'Ahorro' };
        return labels[method] || method || '—';
    };

    const getPaymentMethodIcon = (method) => {
        if (method === 'tarjeta') return '<i class="fas fa-credit-card"></i>';
        if (method === 'efectivo') return '<i class="fas fa-money-bill-wave"></i>';
        if (method === 'ahorro') return '<i class="fas fa-piggy-bank"></i>';
        return '';
    };

    const renderWalletBalances = () => {
        const wallets = Storage.getWallets();
        const tarjetaEl = document.getElementById('walletTarjetaBalance');
        const efectivoEl = document.getElementById('walletEfectivoBalance');
        const ahorroEl = document.getElementById('walletAhorroBalance');
        if (tarjetaEl) tarjetaEl.textContent = formatCurrency(wallets.tarjeta.balance);
        if (efectivoEl) efectivoEl.textContent = formatCurrency(wallets.efectivo.balance);
        if (ahorroEl) ahorroEl.textContent = formatCurrency(wallets.ahorro.balance);
    };

    // ===== Income Table =====
    const renderIncomeTable = () => {
        const tx = Storage.getTransactionsByType('income');
        const tbody = document.getElementById('incomeTableBody');
        const emptyState = document.getElementById('incomeEmpty');

        if (tx.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';

        tbody.innerHTML = tx.map(t => {
            const cat = getCategoryInfo(t.categoryId);
            const extraLabel = t.extraType === 'extra' ? ' (Extra)' : '';
            const pmIcon = getPaymentMethodIcon(t.paymentMethod);
            const pmLabel = getPaymentMethodLabel(t.paymentMethod);
            return `
                <tr>
                    <td data-label="Fecha">${formatDate(t.date)}</td>
                    <td data-label="Descripción">${t.description}${extraLabel}</td>
                    <td data-label="Categoría"><span class="category-tag" style="background:${cat.color}20;color:${cat.color}"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span></td>
                    <td data-label="Cuenta">${pmIcon} ${pmLabel}</td>
                    <td data-label="Monto"><span class="amount-positive">+${formatCurrency(t.amount)}</span></td>
                    <td class="actions-cell">
                        <button class="btn-icon btn-edit" onclick="App.editTransaction('${t.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon btn-delete" onclick="App.confirmDelete('${t.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // ===== Expense Table =====
    const renderExpenseTable = () => {
        const tx = Storage.getTransactionsByType('expense');
        const tbody = document.getElementById('expenseTableBody');
        const emptyState = document.getElementById('expenseEmpty');

        if (tx.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';

        tbody.innerHTML = tx.map(t => {
            const cat = getCategoryInfo(t.categoryId);
            const pmIcon = getPaymentMethodIcon(t.paymentMethod);
            const pmLabel = getPaymentMethodLabel(t.paymentMethod);
            return `
                <tr>
                    <td data-label="Fecha">${formatDate(t.date)}</td>
                    <td data-label="Descripción">${t.description}</td>
                    <td data-label="Categoría"><span class="category-tag" style="background:${cat.color}20;color:${cat.color}"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span></td>
                    <td data-label="Cuenta">${pmIcon} ${pmLabel}</td>
                    <td data-label="Monto"><span class="amount-negative">-${formatCurrency(t.amount)}</span></td>
                    <td class="actions-cell">
                        <button class="btn-icon btn-edit" onclick="App.editTransaction('${t.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon btn-delete" onclick="App.confirmDelete('${t.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // ===== History Table =====
    const renderHistoryTable = () => {
        const filterType = document.getElementById('filterType').value;
        const filterCategory = document.getElementById('filterCategory').value;
        const filterDate = document.getElementById('filterDate').value;

        let tx = Storage.getTransactions();
        
        if (filterType !== 'all') {
            tx = tx.filter(t => t.type === filterType);
        }
        if (filterCategory !== 'all') {
            tx = tx.filter(t => t.categoryId === filterCategory);
        }
        if (filterDate) {
            const [year, month] = filterDate.split('-');
            tx = tx.filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === parseInt(year) && d.getMonth() === parseInt(month) - 1;
            });
        }

        tx.sort((a, b) => new Date(b.date) - new Date(a.date));

        const tbody = document.getElementById('historyTableBody');
        const emptyState = document.getElementById('historyEmpty');

        if (tx.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';

        tbody.innerHTML = tx.map(t => {
            const cat = getCategoryInfo(t.categoryId);
            const typeLabel = t.type === 'income' ? 'Ingreso' : 'Gasto';
            const typeBadge = t.type === 'income' ? 'badge-income' : 'badge-expense';
            const amountClass = t.type === 'income' ? 'amount-positive' : 'amount-negative';
            const sign = t.type === 'income' ? '+' : '-';
            return `
                <tr>
                    <td data-label="Fecha">${formatDate(t.date)}</td>
                    <td data-label="Tipo"><span class="badge ${typeBadge}">${typeLabel}</span></td>
                    <td data-label="Descripción">${t.description}</td>
                    <td data-label="Categoría"><span class="category-tag" style="background:${cat.color}20;color:${cat.color}"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span></td>
                    <td data-label="Monto"><span class="${amountClass}">${sign}${formatCurrency(t.amount)}</span></td>
                    <td class="actions-cell">
                        <button class="btn-icon btn-edit" onclick="App.editTransaction('${t.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon btn-delete" onclick="App.confirmDelete('${t.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // ===== Categories Grid =====
    const renderCategoriesGrid = () => {
        const cats = Storage.getCategories();
        const grid = document.getElementById('categoriesGrid');

        if (cats.length === 0) {
            grid.innerHTML = '<p class="empty-state">No hay categorías. ¡Crea tu primera categoría!</p>';
            return;
        }

        const expenseCats = cats.filter(c => c.type === 'expense');
        const incomeCats = cats.filter(c => c.type === 'income');

        let html = '';
        if (expenseCats.length > 0) {
            html += '<div style="grid-column:1/-1"><h3 style="color:var(--expense);margin-bottom:12px"><i class="fas fa-arrow-down"></i> Gastos</h3></div>';
            html += expenseCats.map(cat => renderCategoryCard(cat)).join('');
        }
        if (incomeCats.length > 0) {
            html += '<div style="grid-column:1/-1;margin-top:8px"><h3 style="color:var(--income);margin-bottom:12px"><i class="fas fa-arrow-up"></i> Ingresos</h3></div>';
            html += incomeCats.map(cat => renderCategoryCard(cat)).join('');
        }

        grid.innerHTML = html;
    };

    const renderCategoryCard = (cat) => {
        const icon = getCategoryIconHTML(cat.id);
        return `
            <div class="category-card">
                <div class="cat-icon">${icon}</div>
                <div class="cat-color" style="background:${cat.color}"></div>
                <h4>${cat.name}</h4>
                <p class="cat-type">${cat.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
                <div class="cat-actions">
                    <button class="btn-icon btn-edit" onclick="App.editCategory('${cat.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon btn-delete" onclick="App.confirmDeleteCategory('${cat.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    };

    // ===== Populate category selectors =====
    const populateCategorySelect = (selectId, type = null) => {
        const select = document.getElementById(selectId);
        let cats = Storage.getCategories();
        if (type) {
            cats = cats.filter(c => c.type === type);
        }
        select.innerHTML = cats.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
    };

    const populateFilterCategory = () => {
        const select = document.getElementById('filterCategory');
        const cats = Storage.getCategories();
        select.innerHTML = '<option value="all">Todas las categorías</option>' +
            cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    };

    const populateYears = () => {
        const select = document.getElementById('dashboardYear');
        const year = new Date().getFullYear();
        let options = '';
        for (let y = year - 5; y <= year + 1; y++) {
            options += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
        }
        select.innerHTML = options;
    };

    // ===== Modal helpers =====
    const showModal = (title, type, editData = null) => {
        const overlay = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('formType').value = type;
        document.getElementById('formId').value = editData ? editData.id : '';
        document.getElementById('formDescription').value = editData ? editData.description : '';
        document.getElementById('formAmount').value = editData ? editData.amount : '';
        document.getElementById('formDate').value = editData ? editData.date : new Date().toISOString().split('T')[0];

        // Show/hide extra type field (only for income)
        const extraField = document.getElementById('formExtraField');
        extraField.style.display = type === 'income' ? 'block' : 'none';
        document.getElementById('formExtra').value = editData?.extraType || 'regular';

        // Show/hide savings field (only for income)
        const savingsField = document.getElementById('formSavingsField');
        const savingsInput = document.getElementById('formSavings');
        const savingsHint = document.getElementById('savingsHint');
        if (type === 'income') {
            savingsField.style.display = 'block';
            // Calculate hint: if amount changes, update hint
            const updateSavingsHint = () => {
                const amount = parseFloat(document.getElementById('formAmount').value) || 0;
                savingsHint.textContent = `De $${amount.toFixed(2)}`;
                if (parseFloat(savingsInput.value) > amount) {
                    savingsInput.value = amount;
                }
            };
            document.getElementById('formAmount').addEventListener('input', updateSavingsHint);
            savingsInput.value = editData?.savingsAmount || '';
            updateSavingsHint();
            // Validate savings does not exceed amount
            savingsInput.addEventListener('input', () => {
                const amount = parseFloat(document.getElementById('formAmount').value) || 0;
                if (parseFloat(savingsInput.value) > amount) {
                    savingsInput.value = amount;
                }
            });
        } else {
            savingsField.style.display = 'none';
            savingsInput.value = '';
        }

        // Show payment method field for both income and expense
        const paymentField = document.getElementById('formPaymentField');
        paymentField.style.display = 'block';
        const paymentSelect = document.getElementById('formPayment');
        paymentSelect.value = editData?.paymentMethod || 'efectivo';

        // Populate categories based on type
        populateCategorySelect('formCategory', type);
        if (editData) {
            document.getElementById('formCategory').value = editData.categoryId;
        }

        overlay.classList.add('active');
        document.getElementById('formDescription').focus();
    };

    const hideModal = () => {
        document.getElementById('modalOverlay').classList.remove('active');
        document.getElementById('modalForm').reset();
        document.getElementById('formId').value = '';
    };

    const showCategoryModal = (title, editData = null) => {
        const overlay = document.getElementById('categoryModalOverlay');
        document.getElementById('categoryModalTitle').textContent = title;
        document.getElementById('catFormId').value = editData ? editData.id : '';
        document.getElementById('catFormName').value = editData ? editData.name : '';
        document.getElementById('catFormColor').value = editData ? editData.color : '#4a90d9';
        document.getElementById('catFormIcon').value = editData ? editData.icon : 'fa-other';
        
        // Show type group for new categories, hide for edit (type changes would break data)
        document.getElementById('catTypeGroup').style.display = editData ? 'none' : 'block';
        if (editData) {
            document.querySelector(`input[name="catType"][value="${editData.type}"]`).checked = true;
        }

        overlay.classList.add('active');
        document.getElementById('catFormName').focus();
    };

    const hideCategoryModal = () => {
        document.getElementById('categoryModalOverlay').classList.remove('active');
        document.getElementById('categoryModalForm').reset();
        document.getElementById('catFormId').value = '';
    };

    const showConfirmDialog = (message, onConfirm) => {
        const overlay = document.getElementById('confirmModalOverlay');
        document.getElementById('confirmMessage').textContent = message;
        overlay.classList.add('active');
        
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        
        const cleanup = () => {
            overlay.classList.remove('active');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        okBtn.onclick = () => {
            cleanup();
            onConfirm();
        };
        cancelBtn.onclick = cleanup;
    };

    // ===== Transfer Modal =====
    const showTransferModal = () => {
        const overlay = document.getElementById('transferModalOverlay');
        const fromSelect = document.getElementById('transferFrom');
        const toSelect = document.getElementById('transferTo');
        // Swap values so "Desde" and "Hacia" don't default to same
        fromSelect.value = 'tarjeta';
        toSelect.value = 'efectivo';
        document.getElementById('transferAmount').value = '';
        document.getElementById('transferDescription').value = '';
        overlay.classList.add('active');
        document.getElementById('transferAmount').focus();
    };

    const hideTransferModal = () => {
        document.getElementById('transferModalOverlay').classList.remove('active');
        document.getElementById('transferForm').reset();
    };

    // ===== Navigation =====
    const switchSection = (section) => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${section}`).classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');

        // Refresh data when switching
        const now = new Date();
        const month = parseInt(document.getElementById('dashboardMonth').value);
        const year = parseInt(document.getElementById('dashboardYear').value);

        switch (section) {
            case 'dashboard':
                renderDashboard(month, year);
                break;
            case 'income':
                renderWalletBalances();
                renderIncomeTable();
                break;
            case 'expenses':
                renderExpenseTable();
                break;
            case 'categories':
                renderCategoriesGrid();
                break;
            case 'history':
                populateFilterCategory();
                renderHistoryTable();
                break;
        }
    };

    // Public API
    return {
        formatCurrency,
        formatDate,
        getCategoryInfo,
        getCategoryIconHTML,
        renderDashboard,
        renderIncomeTable,
        renderExpenseTable,
        renderHistoryTable,
        renderCategoriesGrid,
        populateCategorySelect,
        populateFilterCategory,
        populateYears,
        showModal,
        hideModal,
        showCategoryModal,
        hideCategoryModal,
        showConfirmDialog,
        switchSection,
        getPaymentMethodLabel,
        getPaymentMethodIcon,
        renderWalletBalances,
        showTransferModal,
        hideTransferModal,
    };
})();