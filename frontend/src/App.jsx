import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, Calendar, Users, HelpCircle, X, PlusCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPanel from './AdminPanel';

const API_BASE = 'http://localhost:5000/api';

function UserPortal() {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    photo: '',
    address: '', // New field
    age: '',
    gender: 'Male',
    darshanDate: ''
  });
  const [members, setMembers] = useState([]);
  const [slots, setSlots] = useState({ total: 6000, booked: 0, available: 6000 });
  const [isRegistered, setIsRegistered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingRef, setBookingRef] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (formData.darshanDate) {
      axios.get(`${API_BASE}/slots/${formData.darshanDate}`)
        .then(res => setSlots(res.data))
        .catch(err => console.error(err));
    }
  }, [formData.darshanDate]);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData({ ...formData, [name]: value });
    if (name === 'mobile' && value.length === 10) {
      checkUser(value);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('File size exceeds 1MB limit');
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const checkUser = async (mobile) => {
    try {
      const res = await axios.get(`${API_BASE}/check-user/${mobile}`);
      if (res.data.registered) {
        setIsRegistered(true);
        setIsOtpVerified(true);
        setFormData(prev => ({
          ...prev,
          name: res.data.user.name,
          email: res.data.user.email || '',
          photo: res.data.user.photo || '',
          address: res.data.user.address || '',
          age: res.data.user.age,
          gender: res.data.user.gender
        }));
        setMessage('Welcome back! You are already registered.');
      } else {
        setIsRegistered(false);
        setIsOtpVerified(false);
        setMessage('New user detected. Please verify OTP.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendOtp = async () => {
    if (!formData.mobile || formData.mobile.length < 10) {
      alert('Please enter a valid mobile number');
      return;
    }
    try {
      await axios.post(`${API_BASE}/send-otp`, { mobile: formData.mobile });
      setOtpSent(true);
      alert('OTP Sent! Use "123456" for testing.');
    } catch (err) {
      alert('Error sending OTP');
    }
  };

  const verifyOtp = () => {
    if (otpValue === '123456') {
      setIsOtpVerified(true);
      setMessage('OTP Verified successfully!');
    } else {
      alert('Invalid OTP. Use 123456');
    }
  };

  const addMember = () => {
    setMembers([...members, { name: '', age: '', mobile: '', gender: 'Male', photo: '' }]);
  };

  const removeMember = (index) => {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...members];
    if (field === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    updated[index][field] = value;
    setMembers(updated);
  };

  const handleMemberFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('Member photo exceeds 1MB limit');
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = [...members];
        updated[index].photo = reader.result;
        setMembers(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOtpVerified) {
      alert('Please verify your mobile first');
      return;
    }
    if (!formData.darshanDate) {
      alert('Please select a Darshan date');
      return;
    }

    try {
      const payload = {
        primaryUser: {
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          photo: formData.photo,
          address: formData.address,
          age: parseInt(formData.age),
          gender: formData.gender
        },
        darshanDate: formData.darshanDate,
        members: members.map(m => ({ ...m, age: parseInt(m.age) }))
      };

      const res = await axios.post(`${API_BASE}/book`, payload);
      if (res.data.success) {
        setBookingRef(res.data.referenceId);
        alert('Registration Successful! Ref ID: ' + res.data.referenceId);
      }
    } catch (err) {
      console.error('Booking Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error occurred';
      alert('Booking Failed: ' + errorMsg);
    }
  };

  return (
    <div className="app-container">

      <div className="shree-om">{"\u0950"}</div>
      <h1>Shri Machail Mata Yatra 2026</h1>
      <h3 style={{ marginBottom: '2rem' }}>Online Registration Portal</h3>

      <div className="spiritual-marquee" style={{ marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem auto', boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)' }}>
        <div className="marquee-content">
          {'\u0950'} जय माता दी {'\u0950'} श्री मचैल माता यात्रा 2026 में आपका स्वागत है {'\u0950'} कृपया अपनी सारी जानकारी ध्यानपूर्वक भरें {'\u0950'} जय चंडी माता {'\u0950'}
        </div>
      </div>

      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <div className="input-group">
              <label><Calendar size={16} /> Check Availability (Select Date)</label>
              <input 
                type="date" 
                name="darshanDate" 
                min={today}
                value={formData.darshanDate}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-group" style={{ justifyContent: 'end' }}>
              <button type="button" className="btn btn-accent">CHECK SLOT</button>
            </div>
          </div>

          {formData.darshanDate && (
            <div className="slot-indicator">
              <div className="slot-item">
                <span className="slot-count">{slots.total}</span>
                <span className="slot-label">Total Slots</span>
              </div>
              <div className="slot-item">
                <span className="slot-count" style={{ color: '#ff4444' }}>{slots.booked}</span>
                <span className="slot-label">Booked Slots</span>
              </div>
              <div className="slot-item">
                <span className="slot-count" style={{ color: '#00C851' }}>{slots.available}</span>
                <span className="slot-label">Available Slots</span>
              </div>
            </div>
          )}

          <hr style={{ margin: '2rem 0', opacity: 0.2 }} />

          <div className="form-grid">
            <div className="input-group">
              <label><Phone size={16} /> Mobile Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  name="mobile" 
                  placeholder="Enter Mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  maxLength={10}
                  required
                />
                {!isOtpVerified && !otpSent && (
                  <button type="button" className="btn btn-primary" onClick={sendOtp}>OTP</button>
                )}
              </div>
              {message && <small style={{ color: '#FFD700' }}>{message}</small>}
            </div>

            {otpSent && !isOtpVerified && (
              <div className="input-group">
                <label>Enter OTP</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="6 Digit OTP"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                  />
                  <button type="button" className="btn btn-accent" onClick={verifyOtp}>Verify</button>
                </div>
              </div>
            )}

            <div className="input-group">
              <label><User size={16} /> Full Name</label>
              <input 
                type="text" 
                name="name" 
                placeholder="Pilgrim Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={!isOtpVerified}
              />
            </div>

            <div className="input-group">
              <label>Address</label>
              <input 
                type="text" 
                name="address" 
                placeholder="Your City, State"
                value={formData.address}
                onChange={handleInputChange}
                required
                disabled={!isOtpVerified}
              />
            </div>

            <div className="input-group">
              <label>Email ID</label>
              <input 
                type="email" 
                name="email" 
                placeholder="example@mail.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={!isOtpVerified}
              />
            </div>

            <div className="input-group">
              <label>Upload Photo (Max 1MB)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                disabled={!isOtpVerified}
                style={{ padding: '0.4rem' }}
              />
              {formData.photo && <small style={{ color: '#00C851' }}>✓ Photo attached</small>}
            </div>

            <div className="input-group">
              <label>Age</label>
              <input 
                type="number" 
                name="age" 
                placeholder="Age"
                value={formData.age}
                onChange={handleInputChange}
                required
                disabled={!isOtpVerified}
              />
            </div>

            <div className="input-group">
              <label>Gender</label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleInputChange} 
                disabled={!isOtpVerified}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Family / Group Members</h3>
              <button type="button" className="btn btn-accent" onClick={addMember} disabled={!isOtpVerified}>
                <PlusCircle size={18} /> ADD MEMBER
              </button>
            </div>

            {members.map((member, index) => (
              <div key={index} className="member-row" style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div className="input-group">
                  <label style={{ fontSize: '12px' }}>Member Name</label>
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={member.name}
                    onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px' }}>Age</label>
                  <input 
                    type="number" 
                    placeholder="Age" 
                    value={member.age}
                    onChange={(e) => handleMemberChange(index, 'age', e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px' }}>Mobile</label>
                  <input 
                    type="text" 
                    placeholder="Mobile" 
                    value={member.mobile}
                    onChange={(e) => handleMemberChange(index, 'mobile', e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px' }}>Gender</label>
                  <select 
                    value={member.gender}
                    onChange={(e) => handleMemberChange(index, 'gender', e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px' }}>Upload Photo (Max 1MB)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleMemberFileChange(index, e)}
                      style={{ flex: 1, padding: '5px' }}
                    />
                    {member.photo && <span style={{ color: '#00C851', fontWeight: 'bold' }}>✓ Attached</span>}
                    <button type="button" className="btn-delete" onClick={() => removeMember(index)} style={{ padding: '0.5rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '1rem 3rem' }}>
              BOOK DARSHAN SLOT
            </button>
          </div>
        </form>

        {bookingRef && (
          <div className="ticket-printable" id="yatra-ticket" style={{ 
            marginTop: '3rem', 
            background: '#ffffcc', 
            padding: '2rem', 
            borderRadius: '4px', 
            color: '#333', 
            textAlign: 'left',
            fontFamily: 'serif',
            border: '2px solid #ddd',
            maxWidth: '600px',
            margin: '3rem auto'
          }}>
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  #yatra-ticket, #yatra-ticket * { visibility: visible; }
                  #yatra-ticket { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: none; }
                  .btn-print-ticket { display: none !important; }
                }
              `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <div style={{ background: '#8b0000', color: 'white', padding: '10px 20px', borderRadius: '4px', textAlign: 'center', width: '250px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Shri Machail Mata Yatra</span>
                <br /><small>A journey of Faith</small>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <h2 style={{ color: '#000', textShadow: 'none', margin: 0, fontSize: '24px' }}>Jai Mata Di</h2>
              </div>
              <div style={{ width: '100px', height: '100px', border: '1px solid #ccc' }}>
                {(() => {
                  const coPilgrims = members.length > 0 
                    ? `\nCo-Pilgrims:\n${members.map(m => `- ${m.name}`).join('\n')}` 
                    : '';
                  const qrText = encodeURIComponent(`SHRI MACHAIL MATA YATRA 2026\n----------------------------\nReg No: ${bookingRef}\nPilgrim: ${formData.name}\nMobile: ${formData.mobile}\nDarshan Date: ${formData.darshanDate}\nTotal Members: ${members.length + 1}${coPilgrims}\nJai Mata Di!`);
                  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`} alt="QR" style={{ width: '100%' }} />;
                })()}
              </div>
            </div>

            <h3 style={{ color: '#d9534f', fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px' }}>
              Registration No. - {bookingRef}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '15px', fontSize: '13px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', border: '1px solid #ccc', overflow: 'hidden' }}>
                {formData.photo ? <img src={formData.photo} alt="Primary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '30px' }}>No Photo</div>}
              </div>
              <div>
                <p><strong>Name : </strong>{formData.name}</p>
                <p><strong>Mobile : </strong>{formData.mobile}</p>
                <p><strong>Email : </strong>{formData.email}</p>
                <p><strong>Address : </strong>{formData.address}</p>
              </div>
              <div>
                <p>Age : {formData.age} Year</p>
                <p>Gender : {formData.gender.toLowerCase()}</p>
                <p>Registration Date : {new Date().toISOString().split('T')[0]}</p>
                <p>Darshan Date : {formData.darshanDate}</p>
              </div>
            </div>

            {members.length > 0 && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8b0000' }}>Co-Pilgrims / Family Members</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Reg No.</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Photo</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Name</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Age</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Gender</th>
                      <th style={{ padding: '4px', border: '1px solid #ddd' }}>Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px', border: '1px solid #ddd', fontWeight: 'bold', color: '#8b0000' }}>{`${bookingRef}/M${idx + 1}`}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'center' }}>
                          {m.photo ? <img src={m.photo} alt={m.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} /> : <div style={{ padding: '10px' }}>No Photo</div>}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{m.name}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{m.age}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{m.gender}</td>
                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{m.mobile}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Emergency Help-Line Number</div>
                  <p>PCR Kishtwar - +91 9906154100</p>
                  <p>Control Room DC Office - +91 9484217492</p>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Timing of Journey</div>
                  <p><strong>DEPARTURE</strong></p>
                  <p>Kishtwar to Gulabgarh - 05:00 AM to 05:00 PM</p>
                  <p>Gulabgarh to Machail - 04:30 AM to 04:30 PM</p>
                  <p><strong>ARRIVAL</strong></p>
                  <p>Machail to Gulabgarh - 04:30 AM to 04:30 PM</p>
                  <p>Gulabgarh to Kishtwar - 05:00 AM to 05:00 PM</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13px' }}>DISTRICT ADMINISTRATION KISHTWAR/ SHRI MACHAIL MATA YATRA CELL KISHTWAR</p>
              <h4 style={{ margin: '10px 0', color: '#000' }}>Wishing You A Happy Yatra</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '10px', color: '#006400', border: '1px solid #006400', padding: '5px' }}>
                <span>#SayNoToPlastic</span>
                <span>#MaintainCleanliness&Sanctity</span>
                <span>#NoTobaccoZone</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }} className="btn-print-ticket">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ background: '#d9534f', border: 'none' }}
              >
                PRINT TICKET
              </button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserPortal />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;

