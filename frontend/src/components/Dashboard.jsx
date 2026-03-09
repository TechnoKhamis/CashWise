import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import authService from '../services/authService';
import { useCurrency } from '../context/CurrencyContext';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const { currency } = useCurrency();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showStripeDrawer, setShowStripeDrawer] = useState(false);
  const [txType, setTxType] = useState('EXPENSE');
  const [paymentMode, setPaymentMode] = useState('manual');
  const [chartData, setChartData] = useState({
    categoryLabels: [],
    categoryData: [],
    categoryColors: ['#00E5A0', '#FF4D6A', '#FFB547', '#4D9FFF', '#A78BFA', '#8B5CF6', '#EC4899'],
    monthLabels: [],
    monthIncomeData: [],
    monthExpenseData: []
  });
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    isManual: true
  });
  
  const [stripeFormData, setStripeFormData] = useState({
    recipientStripeId: '',
    amount: '',
    categoryId: '',
    description: ''
  });

  useEffect(() => {
    fetchDashboardData();
    fetchCategories();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = authService.getToken();
      
      const [statsRes, txRes] = await Promise.all([
        fetch('http://localhost:8080/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8080/api/transactions', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (statsRes.ok && txRes.ok) {
        const statsData = await statsRes.json();
        const txData = await txRes.json();
        setStats(statsData);
        setTransactions(txData.slice(0, 5));
        
        // Process chart data
        if (statsData.spendingByCategory) {
          const categoryEntries = Object.entries(statsData.spendingByCategory);
          setChartData(prev => ({
            ...prev,
            categoryLabels: categoryEntries.map(([name]) => name),
            categoryData: categoryEntries.map(([, amount]) => parseFloat(amount))
          }));
        }
        
        if (statsData.monthlyTrends) {
          setChartData(prev => ({
            ...prev,
            monthLabels: statsData.monthlyTrends.map(t => t.month),
            monthIncomeData: statsData.monthlyTrends.map(t => parseFloat(t.income)),
            monthExpenseData: statsData.monthlyTrends.map(t => parseFloat(t.expenses))
          }));
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = authService.getToken();
      const res = await fetch('http://localhost:8080/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = authService.getToken();
      
      // If Stripe mode, charge the card first
      if (paymentMode === 'stripe') {
        const chargeRes = await fetch('http://localhost:8080/api/payment/charge', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: parseFloat(formData.amount),
            currency: currency,
            description: formData.description || 'Transaction payment'
          })
        });

        const chargeData = await chargeRes.json();
        
        if (!chargeRes.ok || !chargeData.success) {
          alert('Payment failed: ' + (chargeData.error || 'Unknown error'));
          return;
        }
      }

      // Create transaction record
      const res = await fetch('http://localhost:8080/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          type: txType,
          amount: parseFloat(formData.amount),
          categoryId: parseInt(formData.categoryId),
          isManual: paymentMode === 'manual'
        })
      });
      
      if (res.ok) {
        setShowDrawer(false);
        setFormData({
          amount: '',
          categoryId: '',
          description: '',
          transactionDate: new Date().toISOString().split('T')[0],
          isManual: true
        });
        setPaymentMode('manual');
        fetchDashboardData();
        
        if (paymentMode === 'stripe') {
          alert('Payment successful! Transaction recorded.');
        }
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleStripePayment = async (e) => {
    e.preventDefault();
    try {
      const token = authService.getToken();
      
      // Charge via Stripe
      const chargeRes = await fetch('http://localhost:8080/api/payment/charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(stripeFormData.amount),
          currency: currency,
          description: stripeFormData.description || 'Stripe payment',
          recipientStripeId: stripeFormData.recipientStripeId
        })
      });

      const chargeData = await chargeRes.json();
      
      if (!chargeRes.ok || !chargeData.success) {
        alert('Payment failed: ' + (chargeData.error || 'Unknown error'));
        return;
      }

      // Create transaction record
      const res = await fetch('http://localhost:8080/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(stripeFormData.amount),
          categoryId: parseInt(stripeFormData.categoryId),
          description: stripeFormData.description,
          type: 'EXPENSE',
          transactionDate: new Date().toISOString().split('T')[0],
          isManual: false
        })
      });
      
      if (res.ok) {
        setShowStripeDrawer(false);
        setStripeFormData({
          recipientStripeId: '',
          amount: '',
          categoryId: '',
          description: ''
        });
        fetchDashboardData();
        alert('Payment successful! Money sent via Stripe.');
      }
    } catch (err) {
      console.error('Error processing Stripe payment:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-dot"></div> Cash<span>Wise</span>
        </div>
        <nav className="nav">
          <div className="nav-section">Overview</div>
          <div className="nav-item active">▦ Dashboard</div>
          <div className="nav-item" onClick={() => navigate('/analytics')}>📊 Analytics</div>
          
          <div className="nav-section">Money</div>
          <div className="nav-item" onClick={() => navigate('/transactions')}>↕ Transactions</div>
          <div className="nav-item" onClick={() => navigate('/categories')}>🏷 Categories</div>
          <div className="nav-item" onClick={() => navigate('/budget')}>🎯 Budget Goals</div>
          
          <div className="nav-section">Finance</div>
          <div className="nav-item" onClick={() => navigate('/loan-planner')}>🏦 Loan Planner</div>
          <div className="nav-item" onClick={() => navigate('/friend-loans')}>🤝 Friend Loans</div>
          
          <div className="sidebar-divider"></div>
          
          <div className="nav-section">Account</div>
          <div className="nav-item" onClick={() => navigate('/settings')}>⚙ Settings</div>
          <div className="nav-item" onClick={handleLogout}>⤴ Sign Out</div>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.fullName?.substring(0,2).toUpperCase() || 'U'}</div>
            <div>
              <div className="user-name">{user?.fullName || user?.email}</div>
              <div className="user-role">Personal · {currency}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="dash-hero">
          <div className="hero-left">
            <div className="hero-greeting">FEBRUARY 2026 · ALL ACCOUNTS</div>
            <div className="hero-title">Good morning, <span>{user?.fullName?.split(' ')[0] || 'User'}</span> 👋</div>
            <div className="hero-sub">You've tracked {stats?.transactionCount || 0} transactions this month</div>
          </div>
          <div className="hero-right">
            <div className="stripe-pill">
              <div className="stripe-dot"></div>
              Stripe · Test Mode
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card income-card">
            <div className="stat-label">TOTAL INCOME</div>
            <div className="stat-value">{currency} {stats?.totalIncome?.toFixed(3) || '0.000'}</div>
            <div className="stat-change">+{currency} 0.0 from last month</div>
            <div className="stat-icon">↑</div>
          </div>
          
          <div className="stat-card expense-card">
            <div className="stat-label">TOTAL EXPENSES</div>
            <div className="stat-value">{currency} {stats?.totalExpenses?.toFixed(3) || '0.000'}</div>
            <div className="stat-change">+ 0.0% vs last month</div>
            <div className="stat-icon">↓</div>
          </div>
          
          <div className="stat-card savings-card">
            <div className="stat-label">NET SAVINGS</div>
            <div className="stat-value">{currency} {stats?.netSavings?.toFixed(3) || '0.000'}</div>
            <div className="stat-change">+{currency} 0.0 from last month</div>
            <div className="stat-icon">💰</div>
          </div>
          
          <div className="stat-card tx-card">
            <div className="stat-label">TRANSACTIONS</div>
            <div className="stat-value">{stats?.transactionCount || 0}</div>
            <div className="stat-change">This month</div>
            <div className="stat-icon">📊</div>
          </div>
        </div>

        <div className="quick-actions">
          <button className="qa-btn primary" onClick={() => {
            setPaymentMode('manual');
            setShowDrawer(true);
          }}>+ Add Transaction</button>
          <button className="qa-btn stripe-qa" onClick={() => setShowStripeDrawer(true)}>💳 Pay via Stripe</button>
          <button className="qa-btn" onClick={() => navigate('/budget')}>📊 View Budgets</button>
          <button className="qa-btn" onClick={() => navigate('/analytics')}>📈 Analytics</button>
        </div>

        {/* CHARTS */}
        <div className="charts-row">
          <div className="chart-card">
            <div className="chart-title">Spending by Category</div>
            <div style={{height: '210px'}}>
              {chartData.categoryLabels.length > 0 ? (
                <Doughnut 
                  data={{
                    labels: chartData.categoryLabels,
                    datasets: [{
                      data: chartData.categoryData,
                      backgroundColor: chartData.categoryColors.slice(0, chartData.categoryLabels.length),
                      borderColor: '#0F1419',
                      borderWidth: 3,
                      hoverOffset: 8
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: '#5B7A94',
                          font: { family: 'JetBrains Mono', size: 10 },
                          boxWidth: 8,
                          padding: 10
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '11px'}}>
                  No expense data available
                </div>
              )}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-title">Income vs Expenses — Last 6 Months</div>
            <div style={{height: '210px'}}>
              {chartData.monthLabels.length > 0 ? (
                <Bar 
                  data={{
                    labels: chartData.monthLabels,
                    datasets: [
                      {
                        label: 'Income',
                        data: chartData.monthIncomeData,
                        backgroundColor: '#00E5A0',
                        borderRadius: 5,
                        borderSkipped: false
                      },
                      {
                        label: 'Expenses',
                        data: chartData.monthExpenseData,
                        backgroundColor: '#FF4D6A',
                        borderRadius: 5,
                        borderSkipped: false
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#5B7A94',
                          font: { family: 'JetBrains Mono', size: 10 },
                          boxWidth: 8
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: { color: 'rgba(30,45,61,0.8)' },
                        ticks: { 
                          color: '#5B7A94',
                          font: { family: 'JetBrains Mono', size: 10 }
                        }
                      },
                      y: {
                        grid: { color: 'rgba(30,45,61,0.8)' },
                        ticks: { 
                          color: '#5B7A94',
                          font: { family: 'JetBrains Mono', size: 10 },
                          callback: (value) => currency + ' ' + value
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '11px'}}>
                  No transaction data available
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div className="table-title">Recent Transactions</div>
            <button className="btn-sm" onClick={() => navigate('/transactions')}>View All →</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>CATEGORY</th>
                <th>DESCRIPTION</th>
                <th>METHOD</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.transactionDate}</td>
                  <td>
                    <span className="cat-badge">
                      {tx.categoryEmoji} {tx.categoryName}
                    </span>
                  </td>
                  <td className="tx-note">{tx.description}</td>
                  <td>
                    <span className={`method-badge ${tx.isManual ? 'manual' : 'stripe'}`}>
                      {tx.isManual ? '📄 Manual' : '💳 Stripe'}
                    </span>
                  </td>
                  <td>
                    <span className={`type-badge ${tx.type.toLowerCase()}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`tx-amount ${tx.type.toLowerCase()}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{currency} {tx.amount.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ADD TRANSACTION DRAWER */}
      {showDrawer && <div className="drawer-overlay open" onClick={() => setShowDrawer(false)}></div>}
      <div className={`drawer ${showDrawer ? 'open' : ''}`}>
        <div className="drawer-close" onClick={() => setShowDrawer(false)}>✕</div>
        <div className="drawer-title">Add Transaction</div>
        <div className="drawer-subtitle">Log a transaction manually</div>

        <form onSubmit={handleSubmitTransaction}>
          {/* Type Toggle */}
          <div className="type-toggle">
            <div 
              className={`type-btn income ${txType === 'INCOME' ? 'active' : ''}`}
              onClick={() => setTxType('INCOME')}
            >
              ↑ Income
            </div>
            <div 
              className={`type-btn expense ${txType === 'EXPENSE' ? 'active' : ''}`}
              onClick={() => setTxType('EXPENSE')}
            >
              ↓ Expense
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">AMOUNT ({currency})</label>
            <input 
              className="form-input" 
              type="number" 
              step="0.001"
              placeholder="0.000"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">CATEGORY</label>
            <select 
              className="form-input"
              value={formData.categoryId}
              onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
              required
            >
              <option value="">Select category</option>
              {categories
                .filter(cat => cat.type === txType)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">WHAT WAS THIS FOR?</label>
            <textarea 
              className="form-input"
              placeholder="e.g. Lunch at Nando's with team"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">DATE</label>
            <input 
              className="form-input" 
              type="date"
              value={formData.transactionDate}
              onChange={(e) => setFormData({...formData, transactionDate: e.target.value})}
              required
            />
          </div>

          <div className="drawer-divider"></div>

          {/* Payment Mode Toggle */}
          <div className="mode-toggle">
            <div 
              className={`mode-btn ${paymentMode === 'manual' ? 'active manual-mode' : ''}`}
              onClick={() => setPaymentMode('manual')}
            >
              📄 Manual Entry
              <span className="mode-label">No card charged</span>
            </div>
            <div 
              className={`mode-btn ${paymentMode === 'stripe' ? 'active stripe-mode' : ''}`}
              onClick={() => setPaymentMode('stripe')}
            >
              💳 Pay via Stripe
              <span className="mode-label">Charge card</span>
            </div>
          </div>

          {paymentMode === 'manual' && (
            <div className="mode-info manual-info">
              📄 Manual Entry — Log cash payments, bank transfers, or any transaction made outside the app. No card is charged.
            </div>
          )}

          {paymentMode === 'stripe' && (
            <div className="mode-info stripe-info">
              💳 This will charge your connected Stripe payment method and log the transaction automatically.
            </div>
          )}

          <button type="submit" className="btn-primary">Save Transaction →</button>
        </form>
      </div>

      {/* STRIPE PAYMENT DRAWER */}
      {showStripeDrawer && <div className="drawer-overlay open" onClick={() => setShowStripeDrawer(false)}></div>}
      <div className={`drawer ${showStripeDrawer ? 'open' : ''}`}>
        <div className="drawer-close" onClick={() => setShowStripeDrawer(false)}>✕</div>
        <div className="drawer-title">Pay via Stripe</div>
        <div className="drawer-subtitle">Send money to a Stripe account</div>

        <form onSubmit={handleStripePayment}>
          {/* Recipient Stripe ID */}
          <div className="form-group">
            <label className="form-label">RECIPIENT STRIPE CUSTOMER ID</label>
            <input 
              className="form-input" 
              type="text"
              placeholder="cus_xxxxxxxxxxxxx"
              value={stripeFormData.recipientStripeId}
              onChange={(e) => setStripeFormData({...stripeFormData, recipientStripeId: e.target.value})}
            />
            <div style={{fontSize: '10px', color: 'var(--muted)', marginTop: '6px'}}>
              Enter recipient's Stripe Customer ID (starts with cus_). Leave empty to test without recipient.
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">AMOUNT ({currency})</label>
            <input 
              className="form-input" 
              type="number" 
              step="0.001"
              placeholder="0.000"
              value={stripeFormData.amount}
              onChange={(e) => setStripeFormData({...stripeFormData, amount: e.target.value})}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">CATEGORY</label>
            <select 
              className="form-input"
              value={stripeFormData.categoryId}
              onChange={(e) => setStripeFormData({...stripeFormData, categoryId: e.target.value})}
              required
            >
              <option value="">Select category</option>
              {categories
                .filter(cat => cat.type === 'EXPENSE')
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea 
              className="form-input"
              placeholder="e.g. Payment to John for dinner"
              value={stripeFormData.description}
              onChange={(e) => setStripeFormData({...stripeFormData, description: e.target.value})}
              rows="3"
            />
          </div>

          <div className="mode-info stripe-info">
            💳 This will charge your connected Stripe payment method and send the money to the recipient's Stripe account.
          </div>

          <button type="submit" className="btn-primary">Send Payment via Stripe →</button>
        </form>
      </div>
    </div>
  );
}

export default Dashboard;
