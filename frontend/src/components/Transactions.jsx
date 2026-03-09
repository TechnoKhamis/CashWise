import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useCurrency } from '../context/CurrencyContext';
import './Transactions.css';

function Transactions() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const { currency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showStripeDrawer, setShowStripeDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [txType, setTxType] = useState('EXPENSE');
  const [paymentMode, setPaymentMode] = useState('manual');
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
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = authService.getToken();
      const res = await fetch('http://localhost:8080/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
        setFilteredTransactions(data);
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
        fetchTransactions();
        
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
        fetchTransactions();
        alert('Payment successful! Money sent via Stripe.');
      }
    } catch (err) {
      console.error('Error processing Stripe payment:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(tx => 
      tx.description?.toLowerCase().includes(query.toLowerCase()) ||
      tx.categoryName?.toLowerCase().includes(query.toLowerCase()) ||
      tx.amount.toString().includes(query) ||
      tx.transactionDate.includes(query)
    );
    setFilteredTransactions(filtered);
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
          <div className="nav-item" onClick={() => navigate('/dashboard')}>▦ Dashboard</div>
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
        <div className="page-header">
          <div>
            <div className="page-title">Transactions</div>
            <div className="page-sub">All income & expenses · Manual & Stripe</div>
          </div>
          <div className="header-actions">
            <button className="btn-outline" onClick={() => setShowStripeDrawer(true)}>💳 Stripe Payments</button>
            <button className="btn-sm" onClick={() => {
              setPaymentMode('manual');
              setShowDrawer(true);
            }}>+ Manual Entry</button>
          </div>
        </div>

        <div className="tx-filters">
          <div className="filter-label">🔍 SEARCH</div>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by description, category, amount, or date..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="tx-table-card">
          <div className="tx-table-header">
            <div className="tx-header-title">All Transactions</div>
          </div>
          
          <table className="tx-table">
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
              {filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  <td className="tx-date">{tx.transactionDate}</td>
                  <td>
                    <span className="cat-badge">
                      {tx.categoryEmoji} {tx.categoryName}
                    </span>
                  </td>
                  <td className="tx-desc">{tx.description}</td>
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
            <label className="form-label">RECIPIENT STRIPE ID</label>
            <input 
              className="form-input" 
              type="text"
              placeholder="acct_xxxxxxxxxxxxx or cus_xxxxxxxxxxxxx"
              value={stripeFormData.recipientStripeId}
              onChange={(e) => setStripeFormData({...stripeFormData, recipientStripeId: e.target.value})}
              required
            />
            <div style={{fontSize: '10px', color: 'var(--muted)', marginTop: '6px'}}>
              Enter the recipient's Stripe Account ID or Customer ID
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

export default Transactions;
