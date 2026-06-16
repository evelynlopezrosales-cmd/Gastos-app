// ===== STORAGE MODULE - Manages all localStorage operations =====

const Storage = (() => {
    // Keys for localStorage
    const KEYS = {
        TRANSACTIONS: 'gastosapp_transactions',
        CATEGORIES: 'gastosapp_categories',
        WALLETS: 'gastosapp_wallets',
    };

    // Default wallets (accounts)
    const DEFAULT_WALLETS = {
        tarjeta: { name: 'Tarjeta', balance: 0 },
        efectivo: { name: 'Efectivo', balance: 0 },
        ahorro: { name: 'Ahorro', balance: 0 },
    };

    // Default categories for a fresh start
    const DEFAULT_CATEGORIES = [
        { id: 'cat_1', name: 'Comida', type: 'expense', color: '#a8d5ba', icon: 'fa-utensils' },
        { id: 'cat_2', name: 'Transporte', type: 'expense', color: '#f0c27a', icon: 'fa-car' },
        { id: 'cat_3', name: 'Casa', type: 'expense', color: '#c3aed6', icon: 'fa-home' },
        { id: 'cat_4', name: 'Entretenimiento', type: 'expense', color: '#f5b7b1', icon: 'fa-gamepad' },
        { id: 'cat_5', name: 'Salud', type: 'expense', color: '#f9c6d9', icon: 'fa-heartbeat' },
        { id: 'cat_6', name: 'Educación', type: 'expense', color: '#b8d4e3', icon: 'fa-graduation-cap' },
        { id: 'cat_7', name: 'Compras', type: 'expense', color: '#d4a5c6', icon: 'fa-shopping-cart' },
        { id: 'cat_8', name: 'Servicios', type: 'expense', color: '#f9e79f', icon: 'fa-bolt' },
        { id: 'cat_9', name: 'Sueldo', type: 'income', color: '#a8d5ba', icon: 'fa-briefcase' },
        { id: 'cat_10', name: 'Freelance', type: 'income', color: '#82c4c4', icon: 'fa-laptop-code' },
        { id: 'cat_11', name: 'Inversiones', type: 'income', color: '#c3aed6', icon: 'fa-chart-line' },
        { id: 'cat_12', name: 'Otros', type: 'expense', color: '#c8c8d6', icon: 'fa-box' },
    ];

    // ===== Internal helpers =====
    const generateId = (prefix) => {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    };

    const getData = (key) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    };

    const setData = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error writing to localStorage:', e);
            return false;
        }
    };

    // ===== Categories =====
    const getCategories = () => {
        let cats = getData(KEYS.CATEGORIES);
        if (!cats || !Array.isArray(cats) || cats.length === 0) {
            // Initialize with defaults
            cats = [...DEFAULT_CATEGORIES];
            setData(KEYS.CATEGORIES, cats);
        }
        return cats;
    };

    const addCategory = (categoryData) => {
        const cats = getCategories();
        const newCat = {
            id: generateId('cat'),
            name: categoryData.name.trim(),
            type: categoryData.type,
            color: categoryData.color || '#718096',
            icon: categoryData.icon || 'fa-other',
        };
        cats.push(newCat);
        setData(KEYS.CATEGORIES, cats);
        return newCat;
    };

    const updateCategory = (id, categoryData) => {
        let cats = getCategories();
        const idx = cats.findIndex(c => c.id === id);
        if (idx === -1) return false;
        cats[idx] = { ...cats[idx], ...categoryData };
        setData(KEYS.CATEGORIES, cats);
        return true;
    };

    const deleteCategory = (id) => {
        let cats = getCategories();
        cats = cats.filter(c => c.id !== id);
        setData(KEYS.CATEGORIES, cats);
        // Also remove category from transactions that use it
        let transactions = getTransactions();
        transactions = transactions.map(t => {
            if (t.categoryId === id) {
                // If deleted, keep reference but it'll be handled in UI gracefully
            }
            return t;
        });
        setData(KEYS.TRANSACTIONS, transactions);
        return true;
    };

    const getCategoryById = (id) => {
        const cats = getCategories();
        return cats.find(c => c.id === id) || null;
    };

    // ===== Wallets (Accounts) =====
    const getWallets = () => {
        let wallets = getData(KEYS.WALLETS);
        if (!wallets || typeof wallets !== 'object') {
            wallets = JSON.parse(JSON.stringify(DEFAULT_WALLETS));
            setData(KEYS.WALLETS, wallets);
        }
        // Ensure all wallets exist
        if (wallets.tarjeta === undefined) wallets.tarjeta = { name: 'Tarjeta', balance: 0 };
        if (wallets.efectivo === undefined) wallets.efectivo = { name: 'Efectivo', balance: 0 };
        if (wallets.ahorro === undefined) wallets.ahorro = { name: 'Ahorro', balance: 0 };
        return wallets;
    };

    const saveWallets = (wallets) => {
        setData(KEYS.WALLETS, wallets);
    };

    const getWalletBalance = (walletId) => {
        const wallets = getWallets();
        return wallets[walletId] ? wallets[walletId].balance : 0;
    };

    const updateWalletBalance = (walletId, amount) => {
        const wallets = getWallets();
        if (!wallets[walletId]) return false;
        wallets[walletId].balance += parseFloat(amount);
        saveWallets(wallets);
        return true;
    };

    const transferBetweenWallets = (fromWallet, toWallet, amount, description) => {
        const wallets = getWallets();
        if (!wallets[fromWallet] || !wallets[toWallet]) return false;
        const amt = parseFloat(amount);
        if (amt <= 0) return false;
        if (wallets[fromWallet].balance < amt) return false;

        wallets[fromWallet].balance -= amt;
        wallets[toWallet].balance += amt;
        saveWallets(wallets);

        // Add a transfer transaction record
        const tx = getTransactions();
        const transferTx = {
            id: generateId('tx'),
            type: 'transfer',
            description: description || `Transferencia de ${wallets[fromWallet].name} a ${wallets[toWallet].name}`,
            amount: amt,
            categoryId: '',
            date: new Date().toISOString().split('T')[0],
            fromWallet,
            toWallet,
            createdAt: new Date().toISOString(),
        };
        tx.push(transferTx);
        setData(KEYS.TRANSACTIONS, tx);
        return true;
    };

    // Recalculate all wallet balances from scratch based on transactions
    const recalculateWalletBalances = () => {
        const wallets = JSON.parse(JSON.stringify(DEFAULT_WALLETS));
        const tx = getTransactions();
        tx.forEach(t => {
            if (t.type === 'income' && t.paymentMethod) {
                if (wallets[t.paymentMethod]) {
                    wallets[t.paymentMethod].balance += t.amount;
                }
            } else if (t.type === 'expense' && t.paymentMethod) {
                if (wallets[t.paymentMethod]) {
                    wallets[t.paymentMethod].balance -= t.amount;
                }
            } else if (t.type === 'transfer' && t.fromWallet && t.toWallet) {
                if (wallets[t.fromWallet]) wallets[t.fromWallet].balance -= t.amount;
                if (wallets[t.toWallet]) wallets[t.toWallet].balance += t.amount;
            }
        });
        saveWallets(wallets);
        return wallets;
    };

    // ===== Transactions =====
    const getTransactions = () => {
        let tx = getData(KEYS.TRANSACTIONS);
        if (!tx || !Array.isArray(tx)) {
            tx = [];
            setData(KEYS.TRANSACTIONS, tx);
        }
        return tx;
    };

    const addTransaction = (txData) => {
        const tx = getTransactions();
        const newTx = {
            id: generateId('tx'),
            type: txData.type, // 'income' or 'expense' or 'transfer'
            description: txData.description.trim(),
            amount: parseFloat(txData.amount),
            categoryId: txData.categoryId,
            date: txData.date,
            extraType: txData.extraType || 'regular',
            paymentMethod: txData.paymentMethod || '', // 'tarjeta', 'efectivo', or '' for transfers
            createdAt: new Date().toISOString(),
        };
        tx.push(newTx);
        setData(KEYS.TRANSACTIONS, tx);

        // Update wallet balance
        if (txData.paymentMethod && (txData.type === 'income' || txData.type === 'expense')) {
            const amount = txData.type === 'income' ? parseFloat(txData.amount) : -parseFloat(txData.amount);
            updateWalletBalance(txData.paymentMethod, amount);
        }

        return newTx;
    };

    const updateTransaction = (id, txData) => {
        let tx = getTransactions();
        const idx = tx.findIndex(t => t.id === id);
        if (idx === -1) return false;
        const oldTx = tx[idx];

        // Reverse old wallet balance change
        if (oldTx.paymentMethod && (oldTx.type === 'income' || oldTx.type === 'expense')) {
            const oldAmount = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
            updateWalletBalance(oldTx.paymentMethod, oldAmount);
        }

        tx[idx] = { ...tx[idx], ...txData };
        if (txData.amount) tx[idx].amount = parseFloat(txData.amount);
        if (txData.description) tx[idx].description = txData.description.trim();
        setData(KEYS.TRANSACTIONS, tx);

        // Apply new wallet balance change
        if (tx[idx].paymentMethod && (tx[idx].type === 'income' || tx[idx].type === 'expense')) {
            const newAmount = tx[idx].type === 'income' ? tx[idx].amount : -tx[idx].amount;
            updateWalletBalance(tx[idx].paymentMethod, newAmount);
        }

        return true;
    };

    const deleteTransaction = (id) => {
        let tx = getTransactions();
        const oldTx = tx.find(t => t.id === id);
        if (oldTx) {
            // Reverse wallet balance
            if (oldTx.paymentMethod && (oldTx.type === 'income' || oldTx.type === 'expense')) {
                const amount = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
                updateWalletBalance(oldTx.paymentMethod, amount);
            }
        }
        tx = tx.filter(t => t.id !== id);
        setData(KEYS.TRANSACTIONS, tx);
        return true;
    };

    const getTransactionById = (id) => {
        const tx = getTransactions();
        return tx.find(t => t.id === id) || null;
    };

    // ===== Query helpers =====
    const getTransactionsByType = (type, month, year) => {
        let tx = getTransactions();
        if (type) {
            tx = tx.filter(t => t.type === type);
        }
        if (month !== undefined && month !== null && year) {
            tx = tx.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === parseInt(month) && d.getFullYear() === parseInt(year);
            });
        }
        return tx.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const getTransactionsByMonth = (month, year) => {
        return getTransactionsByType(null, month, year);
    };

    const getMonthlySummary = (month, year) => {
        const tx = getTransactionsByMonth(month, year);
        let totalIncome = 0;
        let totalExpenses = 0;
        tx.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else if (t.type === 'expense') totalExpenses += t.amount;
        });
        const balance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;
        return { totalIncome, totalExpenses, balance, savingsRate, count: tx.length };
    };

    // Get monthly data for last N months for trend chart
    const getMonthlyTrend = (months = 6) => {
        const now = new Date();
        const data = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.getMonth();
            const year = d.getFullYear();
            const summary = getMonthlySummary(month, year);
            data.push({
                month: d.toLocaleString('es-ES', { month: 'short' }),
                year,
                income: summary.totalIncome,
                expenses: summary.totalExpenses,
            });
        }
        return data;
    };

    // Get expenses grouped by category for a specific month
    const getExpensesByCategory = (month, year) => {
        const tx = getTransactionsByMonth(month, year)
            .filter(t => t.type === 'expense');
        const grouped = {};
        tx.forEach(t => {
            if (!grouped[t.categoryId]) {
                grouped[t.categoryId] = 0;
            }
            grouped[t.categoryId] += t.amount;
        });
        return grouped;
    };

    // ===== Export / Reset =====
    const exportData = () => {
        return {
            transactions: getTransactions(),
            categories: getCategories(),
            exportedAt: new Date().toISOString(),
        };
    };

    const importData = (data) => {
        if (data.transactions && Array.isArray(data.transactions)) {
            setData(KEYS.TRANSACTIONS, data.transactions);
        }
        if (data.categories && Array.isArray(data.categories)) {
            setData(KEYS.CATEGORIES, data.categories);
        }
        return true;
    };

    const resetAllData = () => {
        setData(KEYS.TRANSACTIONS, []);
        setData(KEYS.CATEGORIES, [...DEFAULT_CATEGORIES]);
        setData(KEYS.WALLETS, JSON.parse(JSON.stringify(DEFAULT_WALLETS)));
        return true;
    };

    // Public API
    return {
        // Categories
        getCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,

        // Transactions
        getTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionById,

        // Queries
        getTransactionsByType,
        getTransactionsByMonth,
        getMonthlySummary,
        getMonthlyTrend,
        getExpensesByCategory,

        // Wallets
        getWallets,
        saveWallets,
        getWalletBalance,
        updateWalletBalance,
        transferBetweenWallets,
        recalculateWalletBalances,

        // Utilities
        exportData,
        importData,
        resetAllData,
    };
})();
