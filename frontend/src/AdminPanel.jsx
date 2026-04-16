import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Search, 
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  X,
  CreditCard,
  CheckCircle,
  TrendingUp,
  Activity,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Copy,
  Plus,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './App.css';

const API_BASE = '/api';

function getPhotoUrl(photo) {
  if (!photo) return '';
  if (photo.startsWith('data:') || photo.startsWith('http')) return photo;
  // Prepend backend URL for file-based photos
  return `${API_BASE}/uploads/${photo}`;
}

const AdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ totalBookings: 0, totalMembers: 0, totalUsers: 0, todaysBookings: 0, todaysPilgrims: 0, chartData: [] });
  const [searchReg, setSearchReg] = useState('');
  const [exportDate, setExportDate] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedPilgrim, setSelectedPilgrim] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 5;
  
  // API Key Management State
  const [apiClients, setApiClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: '', read: true, write: false });
  const [showKeyModal, setShowKeyModal] = useState(false);

  const handleSearchPrint = () => {
    if (!searchReg) {
      alert("Please enter a Registration Number");
      return;
    }
    let fullReg = searchReg.toUpperCase();
    if (!fullReg.startsWith('MATA/2026/')) {
      let cleanSuffix = searchReg;
      if (cleanSuffix.startsWith('/')) {
        cleanSuffix = cleanSuffix.substring(1);
      }
      fullReg = `MATA/2026/${cleanSuffix}`;
    }
    
    fullReg = fullReg.toUpperCase();

    // 1. First try to find the specific pilgrim in our flattened list
    const pilgrim = allPilgrims.find(p => p.regNo.toUpperCase() === fullReg);
    
    if (pilgrim) {
      setSelectedBooking(pilgrim.bookingObj);
      setSelectedPilgrim(pilgrim);
      setShowModal(true);
    } else {
      // 2. Fallback: Search by reference ID (booking ID)
      const booking = bookings.find(b => b.referenceId.toUpperCase() === fullReg);
      if (booking) {
        // Find the primary pilgrim for this booking
        const primaryP = allPilgrims.find(p => p.bookingObj._id === booking._id && p.isPrimary);
        setSelectedBooking(booking);
        setSelectedPilgrim(primaryP || {
          regNo: booking.referenceId,
          name: booking.primaryUser?.name,
          mobile: booking.primaryUserMobile,
          gender: booking.primaryUser?.gender,
          photo: booking.primaryUser?.photo,
          darshanDate: booking.darshanDate
        });
        setShowModal(true);
      } else {
        alert("Registration Number not found!");
      }
    }
  };

  // Auth Logic
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/admin/login`, loginData);
      if (res.data.success) {
        setIsLoggedIn(true);
        sessionStorage.setItem('adminSession', JSON.stringify(res.data.admin));
        fetchData();
      }
    } catch (err) {
      alert('Invalid admin credentials');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminSession');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const admin = sessionStorage.getItem('adminSession');
    if (admin) {
      setIsLoggedIn(true);
      fetchData();

      // Implement Live Polling (every 10 seconds)
      const interval = setInterval(() => {
        fetchData();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, []);

  const fetchData = async () => {
    // Only set loading on initial fetch to avoid flickering during polling
    if (bookings.length === 0 && activeTab === 'dashboard') setLoading(true); 
    setError(null);
    
    // Fetch stats, bookings, and api-clients independently to prevent blocking
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(`Stats Error: ${err.response?.data?.message || err.message}`);
      }
    };

    const fetchBookings = async (isMore = false) => {
      try {
        const currentSkip = isMore ? skip + LIMIT : 0;
        const res = await axios.get(`${API_BASE}/admin/bookings?limit=${LIMIT}&skip=${currentSkip}`);
        
        if (isMore) {
          setBookings(prev => [...prev, ...res.data]);
          setSkip(currentSkip);
        } else {
          setBookings(res.data);
          setSkip(0);
        }

        // If we got fewer results than the limit, there are no more records to load
        if (res.data.length < LIMIT) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(`Bookings Error: ${err.response?.data?.message || err.message}`);
      }
    };

    // Export this inner function so we can call it from "Load More" button
    window.loadMoreAdminData = () => fetchBookings(true);

    const fetchApiClients = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/api-clients`);
        setApiClients(res.data);
      } catch (err) {
        console.error("Error fetching API clients:", err);
      }
    };

    // Run them in parallel but don't wait for all if one fails
    await Promise.allSettled([
      fetchStats(),
      fetchBookings(),
      fetchApiClients()
    ]);
    
    setLoading(false);
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this registration? This will also release the slots.")) {
      try {
        const res = await axios.delete(`${API_BASE}/admin/bookings/${id}`);
        if (res.data.success) {
          alert("Registration deleted successfully");
          // Update local state to remove the deleted booking
          setBookings(bookings.filter(b => b._id !== id));
          // Refresh stats
          const statsRes = await axios.get(`${API_BASE}/admin/stats`);
          setStats(statsRes.data);
        }
      } catch (err) {
        alert("Error deleting registration");
        console.error(err);
      }
    }
  };

  // API Key Management Functions
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newClient.name) return alert("Please enter a client/project name");
    
    const permissions = [];
    if (newClient.read) permissions.push('read');
    if (newClient.write) permissions.push('write');

    if (permissions.length === 0) return alert("Select at least one permission");

    try {
      const res = await axios.post(`${API_BASE}/admin/api-clients`, { 
        name: newClient.name, 
        permissions 
      });
      if (res.data.success) {
        setApiClients([res.data.client, ...apiClients]);
        setShowKeyModal(false);
        setNewClient({ name: '', read: true, write: false });
        alert("API Key generated successfully!");
      }
    } catch (err) {
      alert("Error generating API key");
    }
  };

  const toggleClientStatus = async (id) => {
    try {
      const res = await axios.patch(`${API_BASE}/admin/api-clients/${id}`);
      if (res.data.success) {
        setApiClients(apiClients.map(c => c._id === id ? res.data.client : c));
      }
    } catch (err) {
      alert("Error updating status");
    }
  };

  const deleteApiClient = async (id) => {
    if (window.confirm("Are you sure you want to revoke this API Key? Customers using this key will lose access immediately.")) {
      try {
        const res = await axios.delete(`${API_BASE}/admin/api-clients/${id}`);
        if (res.data.success) {
          setApiClients(apiClients.filter(c => c._id !== id));
        }
      } catch (err) {
        alert("Error deleting API key");
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("API Key copied to clipboard!");
  };

  const allPilgrims = [];
  bookings.forEach(b => {
    const primaryInMembers = b.members?.some(m => m.regNo === b.referenceId);

    // If there's a primary member who isn't explicitly listed in the members array (legacy data)
    if (b.primaryUser && !primaryInMembers) {
      allPilgrims.push({
        _id: b._id,
        bookingObj: b,
        isPrimary: true,
        photo: b.primaryUser.photo,
        regNo: b.referenceId,
        name: b.primaryUser.name,
        gender: b.primaryUser.gender,
        email: b.primaryUser.email,
        mobile: b.primaryUserMobile,
        darshanDate: b.darshanDate,
        totalMembers: b.totalMembers
      });
    }
    
    // Process all members in the array
    if (b.members && b.members.length > 0) {
      b.members.forEach((m, idx) => {
        // A member is primary if their regNo matches the booking referenceId 
        // OR if they are the first member in a booking that doesn't have a separate primaryUser object
        const isActuallyPrimary = (m.regNo === b.referenceId) || (!b.primaryUser && idx === 0);
        
        // If we already added primary manually (legacy), skip it in members loop if IDs match
        if (isActuallyPrimary && !primaryInMembers && b.primaryUser) return;

        allPilgrims.push({
          _id: isActuallyPrimary ? b._id : `${b._id}-M${idx}`,
          bookingObj: b,
          isPrimary: isActuallyPrimary,
          photo: m.photo,
          // Fallback logic for legacy data: if regNo is missing, use referenceId/XX only if it's not the primary
          regNo: m.regNo || (idx === 0 ? b.referenceId : `${b.referenceId}/${(idx).toString().padStart(2, '0')}`),
          name: m.name,
          gender: m.gender,
          email: isActuallyPrimary ? (b.primaryUser?.email || '-') : '-',
          mobile: m.mobile || b.primaryUserMobile,
          darshanDate: b.darshanDate,
          totalMembers: isActuallyPrimary ? b.totalMembers : '-'
        });
      });
    }
  });

  const filteredPilgrims = allPilgrims.filter(p => {
    const dateMatch = filterDate ? p.darshanDate === filterDate : true;
    const genderMatch = filterGender ? p.gender === filterGender : true;
    return dateMatch && genderMatch;
  });

  if (!isLoggedIn) {
    return (
      <div className="admin-login-container">
        <div className="admin-login">
          <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: '#4e73df' }}>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label style={{ display: 'block', marginBottom: '8px', color: '#858796', fontWeight: 700, fontSize: '14px' }}>Username</label>
              <input 
                type="text" 
                className="admin-input"
                style={{ width: '100%', height: '40px', padding: '10px' }}
                placeholder="Enter Username"
                value={loginData.username} 
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                required 
              />
            </div>
            <div className="admin-form-group">
              <label style={{ display: 'block', marginBottom: '8px', color: '#858796', fontWeight: 700, fontSize: '14px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="admin-input"
                  style={{ width: '100%', height: '40px', padding: '10px', paddingRight: '40px' }}
                  placeholder="Enter Password"
                  value={loginData.password} 
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    color: '#858796', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className="login-btn-admin" 
              style={{ marginTop: '1.5rem' }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getRelativeTime = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const chartData = stats.chartData && stats.chartData.length > 0 ? stats.chartData : [
    { name: 'Mon', bookings: 40 },
    { name: 'Tue', bookings: 30 },
    { name: 'Wed', bookings: 60 },
    { name: 'Thu', bookings: 45 },
    { name: 'Fri', bookings: 75 },
    { name: 'Sat', bookings: 90 },
    { name: 'Sun', bookings: 55 },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <LayoutDashboard size={24} />
          <span>ADMIN PANEL</span>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button 
            className={activeTab === 'manage' ? 'active' : ''} 
            onClick={() => setActiveTab('manage')}
          >
            <Users size={20} /> <span>Manage Registration</span>
          </button>
          <button 
            className={activeTab === 'api-keys' ? 'active' : ''} 
            onClick={() => setActiveTab('api-keys')}
          >
            <Key size={20} /> <span>API Keys (Customers)</span>
          </button>
        </nav>
        <button className="logout-btn-admin" onClick={handleLogout}>
          <LogOut size={18} /> <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <div className="spiritual-marquee">
          <div className="marquee-content">
            {'\u0950'} जय माता दी {'\u0950'} श्री मचैल माता यात्रा 2026 Admin Portal में आपका स्वागत है {'\u0950'} जय चंडी माता {'\u0950'}
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '0.35rem', color: '#c53030', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="dashboard-view">
            <div className="dash-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h1>Dashboard Overview</h1>
                <div className="live-badge">
                  <span className="live-dot"></span>
                  LIVE DATA
                </div>
              </div>
              <p>Welcome back, Admin! (Last Updated: {new Date().toLocaleTimeString()})</p>
            </div>

            <div className="stats-grid-admin">
              <div className="stat-card-admin card-today text-glow">
                <div className="stat-icon-wrapper"><CreditCard size={24} /></div>
                <div className="stat-content-admin">
                  <span className="stat-label-admin">Today's Bookings</span>
                  <h2 className="stat-value-admin">{stats.todaysBookings || 0}</h2>
                </div>
                <Activity className="trend-icon" size={16} />
              </div>

              <div className="stat-card-admin card-today text-glow">
                <div className="stat-icon-wrapper"><Users size={24} /></div>
                <div className="stat-content-admin">
                  <span className="stat-label-admin">Today's Pilgrims</span>
                  <h2 className="stat-value-admin">{stats.todaysPilgrims || 0}</h2>
                </div>
                <Activity className="trend-icon" size={16} />
              </div>

              <div className="stat-card-admin card-blue">
                <div className="stat-icon-wrapper"><CreditCard size={24} /></div>
                <div className="stat-content-admin">
                  <span className="stat-label-admin">Total Bookings</span>
                  <h2 className="stat-value-admin">{stats.totalBookings}</h2>
                </div>
                <TrendingUp className="trend-icon" size={16} />
              </div>

              <div className="stat-card-admin card-green">
                <div className="stat-icon-wrapper"><Users size={24} /></div>
                <div className="stat-content-admin">
                  <span className="stat-label-admin">Total Pilgrims</span>
                  <h2 className="stat-value-admin">{stats.totalMembers}</h2>
                </div>
                <TrendingUp className="trend-icon" size={16} />
              </div>

              <div className="stat-card-admin card-orange">
                <div className="stat-icon-wrapper"><Activity size={24} /></div>
                <div className="stat-content-admin">
                  <span className="stat-label-admin">Total Users</span>
                  <h2 className="stat-value-admin">{stats.totalUsers}</h2>
                </div>
              </div>

              <div className="stat-card-admin card-purple">
                <div className="stat-icon-wrapper"><CheckCircle size={24} /></div>
                <div className="stat-content-admin">
                  <span className="stat-label-admin">Status</span>
                  <h2 className="stat-value-admin" style={{fontSize: '1rem'}}>Active</h2>
                </div>
              </div>
            </div>

            <div className="graph-section">
              <h3>Bookings Overview</h3>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888', fontSize: 12 }}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="bookings" fill="#4e73df" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="search-grid">
              <div className="search-card card-highlight">
                <div className="search-card-header">
                   <div className="stat-icon-wrapper-small"><Printer size={18} /></div>
                   <h3>Search & Print Slip</h3>
                </div>
                <div className="admin-form-group">
                  <label>Registration Number</label>
                  <div style={{ display: 'flex' }}>
                    <span style={{ 
                      padding: '0 15px', 
                      background: '#eaecf4', 
                      border: '1px solid #d1d3e2', 
                      borderRight: 'none', 
                      borderRadius: '0.35rem 0 0 0.35rem', 
                      color: '#4e73df', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      MATA/2026/
                    </span>
                    <input 
                      type="text" 
                      className="admin-input"
                      style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      placeholder="Enter Number (e.g. 100001)" 
                      value={searchReg}
                      onChange={(e) => setSearchReg(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchPrint();
                      }}
                    />
                  </div>
                </div>
                <button className="btn-print-admin btn-glow" onClick={handleSearchPrint}>
                  <Printer size={18} />
                  PRINT REGISTRATION SLIP
                </button>
              </div>

              {/* Recent Activity Feed */}
              <div className="search-card">
                <div className="search-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="stat-icon-wrapper-small" style={{background: '#1cc88a'}}><Activity size={18} /></div>
                    <h3 style={{ margin: 0 }}>Recent Registrations</h3>
                  </div>
                  <div className="live-badge" style={{ margin: 0 }}>
                    <span className="live-dot"></span> LIVE
                  </div>
                </div>
                <div className="recent-activity-list">
                  {stats.recentBookings && stats.recentBookings.length > 0 ? stats.recentBookings.map((rb, idx) => (
                    <div key={rb._id || idx} className="activity-item">
                      <div className="activity-info">
                        <span className="activity-name">{rb.referenceId}</span>
                        <span className="activity-time">{getRelativeTime(rb.createdAt)}</span>
                      </div>
                      <div className="activity-members">
                         <Users size={12} /> {rb.totalMembers} Members
                      </div>
                    </div>
                  )) : (
                    <p style={{textAlign: 'center', color: '#888', marginTop: '1rem'}}>No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'manage' ? (
          <div className="manage-view">
            <div className="manage-header">
              <h2>Manage Registration</h2>
              <div className="breadcrumb-admin" onClick={() => setActiveTab('dashboard')}>
                Dashboard
              </div>
            </div>

            <div className="filter-card-admin">
              <div className="filter-row-admin">
                <div className="admin-form-group" style={{ flex: 1 }}>
                  <label>Filter Date</label>
                  <input 
                    type="date" 
                    className="admin-input"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                <div className="admin-form-group" style={{ flex: 1 }}>
                  <label>Filter Gender</label>
                  <select 
                    className="admin-input"
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                  >
                    <option value="">--Select Gender--</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button className="btn-search-admin" onClick={fetchData}>
                  Search
                </button>
              </div>
              
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3e0', borderLeft: '4px solid #e67300', borderRadius: '0.35rem', fontWeight: 'bold', color: '#d35400', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' }}>
                <Users size={20} />
                Total Results Found: {filteredPilgrims.length}
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Registration ID</th>
                    <th>Full Name</th>
                    <th>Gender</th>
                    <th>Email</th>
                    <th>Mobile No.</th>
                    <th>Darshan Date</th>
                    <th>Total Members</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPilgrims.length > 0 ? filteredPilgrims.map((p) => (
                    <tr key={p._id} style={{ backgroundColor: p.isPrimary ? 'inherit' : '#fefaf6' }}>
                      <td>
                        {p.photo ? (
                          <img 
                            src={getPhotoUrl(p.photo)} 
                            alt="Pilgrim" 
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>No Photo</div>
                        )}
                      </td>
                      <td style={{ color: p.isPrimary ? '#d35400' : '#e67300', fontWeight: 600 }}>{p.regNo}</td>
                      <td>{p.name || 'N/A'}</td>
                      <td>{p.gender || 'N/A'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{p.email || 'N/A'}</td>
                      <td>{p.mobile}</td>
                      <td>{p.darshanDate}</td>
                      <td>{p.totalMembers}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-view-admin" onClick={() => { setSelectedBooking(p.bookingObj); setSelectedPilgrim(p); setShowModal(true); }}>
                            View
                          </button>
                          <button className="btn-delete-admin" onClick={() => handleDelete(p.bookingObj._id)}>
                            <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#858796' }}>
                        No registrations found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {hasMore && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <button 
                    className="btn-print-admin" 
                    style={{ background: '#4e73df', margin: 0 }}
                    onClick={() => window.loadMoreAdminData()}
                  >
                    Load More Registrations
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="api-keys-view">
            <div className="manage-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>External API Management</h2>
                <div className="breadcrumb-admin" onClick={() => setActiveTab('dashboard')}>Dashboard</div>
              </div>
              <button className="btn-print-admin btn-glow" onClick={() => setShowKeyModal(true)} style={{ marginTop: 0 }}>
                <Plus size={18} /> Generate New API Key
              </button>
            </div>

            <div className="api-info-banner" style={{ margin: '1.5rem 0', padding: '1rem', background: '#e3f2fd', borderLeft: '5px solid #2196f3', borderRadius: '8px' }}>
               <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0d47a1', margin: '0 0 8px 0' }}>
                 <ShieldCheck size={20} /> Developer Integration Guide
               </h4>
               <p style={{ margin: 0, fontSize: '14px', color: '#1565c0' }}>
                 Base URL: <code>{window.location.origin.replace('5173', '5000')}/api/v1/external</code> <br/>
                 Authentication: Include Header <code>x-api-key: YOUR_KEY</code> 
               </p>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer / Project Name</th>
                    <th>Permissions</th>
                    <th>API Key (Masked)</th>
                    <th>Created At</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apiClients.length > 0 ? apiClients.map((client) => (
                    <tr key={client._id}>
                      <td style={{ fontWeight: 'bold', color: '#4e73df' }}>{client.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {client.permissions.includes('read') && <span style={{ padding: '2px 8px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '12px', fontSize: '11px' }}>READ</span>}
                          {client.permissions.includes('write') && <span style={{ padding: '2px 8px', background: '#fff3e0', color: '#e65100', borderRadius: '12px', fontSize: '11px' }}>WRITE</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <code style={{ fontSize: '12px', background: '#f8f9fc', padding: '4px 8px', borderRadius: '4px' }}>
                            {client.apiKey.substring(0, 10)}...{client.apiKey.substring(client.apiKey.length - 4)}
                          </code>
                          <button 
                            className="btn-view-admin" 
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => copyToClipboard(client.apiKey)}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          onClick={() => toggleClientStatus(client._id)}
                          style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: client.isActive ? '#1cc88a' : '#858796',
                            color: 'white'
                          }}
                        >
                          {client.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td>
                        <button className="btn-delete-admin" onClick={() => deleteApiClient(client._id)}>
                          Revoke
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#858796' }}>
                        No API Keys found. Click "Generate New API Key" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showModal && selectedBooking && (
        <div className="modal-overlay-admin" onClick={() => setShowModal(false)}>
          <div className="modal-content-admin" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-admin">
              <h2>Registration Details - {selectedBooking.referenceId}</h2>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body-admin" id="admin-receipt-view" style={{ background: '#ffffcc', color: '#333', fontFamily: 'serif', padding: '2rem', border: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div style={{ background: '#8b0000', color: 'white', padding: '10px 20px', borderRadius: '4px', textAlign: 'center', width: '220px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Shri Machail Mata Yatra</span>
                  <br /><small>A journey of Faith</small>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h2 style={{ color: '#000', textShadow: 'none', border: 'none', margin: 0, fontSize: '24px' }}>Jai Mata Di</h2>
                </div>
                <div style={{ width: '100px', height: '100px', border: '1px solid #ccc', background: 'white', overflow: 'hidden' }}>
                  {(() => {
                    const qrText = encodeURIComponent(`MACHAIL MATA YATRA 2026\n----------------------------\nReg No: ${selectedPilgrim.regNo}\nName: ${selectedPilgrim.name}\nMobile: ${selectedPilgrim.mobile}\nDarshan Date: ${selectedPilgrim.darshanDate}\nJai Mata Di!`);
                    return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`} alt="QR" style={{ width: '100%' }} />;
                  })()}
                </div>
              </div>

              <div style={{ background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #eee', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#8b0000', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Individual Registration Slip</h4>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ width: '100px', height: '100px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                    {selectedPilgrim.photo ? (
                      <img src={getPhotoUrl(selectedPilgrim.photo)} alt={selectedPilgrim.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f5f5f5', fontSize: '10px' }}>No Photo</div>
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontSize: '14px' }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Registration ID:</strong> <span style={{ color: '#d35400', fontWeight: 'bold' }}>{selectedPilgrim.regNo}</span></p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Name:</strong> {selectedPilgrim.name}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Gender:</strong> {selectedPilgrim.gender}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Mobile:</strong> {selectedPilgrim.mobile}</p>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontSize: '14px' }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Darshan Date:</strong> {selectedPilgrim.darshanDate}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Status:</strong> <span style={{ color: 'green', fontWeight: 'bold' }}>Confirmed</span></p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '10px', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Emergency Help-Line</div>
                    <p>PCR Kishtwar - +91 9906154100</p>
                    <p>Control Room - +91 9484217492</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '0 0 5px 0' }}>Happy Yatra</p>
                     <p>District Administration Kishtwar</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer-admin">
               <button className="btn-print-admin" onClick={() => window.print()}>
                  <Printer size={18} /> Print Voucher
                </button>
                <button className="btn-cancel-admin" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showKeyModal && (
        <div className="modal-overlay-admin" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content-admin" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-admin">
              <h2>Generate New API Key</h2>
              <button className="close-modal-btn" onClick={() => setShowKeyModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateApiKey}>
              <div className="modal-body-admin" style={{ background: 'white', color: '#333' }}>
                <div className="admin-form-group">
                  <label>Customer or Project Name</label>
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="e.g. Travel Agency A" 
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="admin-form-group">
                  <label style={{ display: 'block', marginBottom: '10px' }}>Permissions</label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={newClient.read} 
                        onChange={(e) => setNewClient({ ...newClient, read: e.target.checked })}
                      />
                      <span>Read Access</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={newClient.write} 
                        onChange={(e) => setNewClient({ ...newClient, write: e.target.checked })}
                      />
                      <span>Write Access</span>
                    </label>
                  </div>
                  <p style={{ fontSize: '11px', color: '#858796', marginTop: '10px' }}>
                    <strong>Read:</strong> Allows fetching booking details and searching. <br/>
                    <strong>Write:</strong> Allows creating or modifying data (Reserved for future).
                  </p>
                </div>

                <div className="api-notice" style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', fontSize: '12px' }}>
                   <ShieldAlert size={14} style={{ color: '#856404', verticalAlign: 'middle', marginRight: '5px' }} />
                   Security Warning: Only share API keys with trusted partners.
                </div>
              </div>
              <div className="modal-footer-admin">
                <button type="submit" className="login-btn-admin" style={{ marginTop: 0 }}>Create API Key</button>
                <button type="button" className="btn-cancel-admin" onClick={() => setShowKeyModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
