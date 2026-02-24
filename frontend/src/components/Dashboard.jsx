import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>CashWise</h1>
        <div className="user-info">
          <span>Welcome, {user?.fullName || user?.email}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>
      
      <div className="dashboard-content">
        <h2>Dashboard</h2>
        <p>You are successfully logged in!</p>
      </div>
    </div>
  );
}

export default Dashboard;
