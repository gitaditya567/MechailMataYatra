import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Phone, Calendar, Users, HelpCircle, X, PlusCircle, CheckCircle, ShieldCheck, Camera, Image } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import Maintenance from './Maintenance';

// Toggle this to true to show the "Under Maintenance" page to users
const MAINTENANCE_MODE = false; 

const API_BASE = '/api';

function getPhotoUrl(photo) {
  if (!photo) return '';
  if (photo.startsWith('data:') || photo.startsWith('http')) return photo;
  // Prepend backend URL for file-based photos
  return `${API_BASE}/uploads/${photo}`;
}

const compressImageBase64 = (base64Str, maxW = 1024, maxH = 1024, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;

      if (w > h) {
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
      } else {
        if (h > maxH) {
          w = Math.round((w * maxH) / h);
          h = maxH;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Fill canvas with white background to cleanly flatten transparent PNG images
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

function UserPortal() {
  const today = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    photo: '',
    address: '', // New field
    age: '',
    gender: 'Male',
    darshanDate: today
  });
  const [members, setMembers] = useState([]);
  const [slots, setSlots] = useState({ total: 6000, booked: 0, available: 6000 });
  const [isRegistered, setIsRegistered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [websiteSource, setWebsiteSource] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    type: 'primary', // 'primary' | 'member'
    memberIndex: null
  });

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const activeUploadRef = useRef({ type: 'primary', index: null });
  const [liveCamera, setLiveCamera] = useState({ isOpen: false, stream: null });

  const handlePrimaryUploadClick = () => {
    activeUploadRef.current = { type: 'primary', index: null };
    setPhotoModal({
      isOpen: true,
      type: 'primary',
      memberIndex: null
    });
  };

  const handleMemberUploadClick = (index) => {
    activeUploadRef.current = { type: 'member', index: index };
    setPhotoModal({
      isOpen: true,
      type: 'member',
      memberIndex: index
    });
  };

  const triggerGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const triggerCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("camera not show");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setLiveCamera({ isOpen: true, stream });
    } catch (error) {
      alert("camera not show");
    }
  };

  const captureLivePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      const { type, index } = activeUploadRef.current;
      if (type === 'primary') {
        setFormData(prev => ({ ...prev, photo: dataUrl }));
      } else if (type === 'member' && index !== null) {
        const updated = [...members];
        updated[index].photo = dataUrl;
        setMembers(updated);
      }

      closeLiveCamera();
    }
  };

  const closeLiveCamera = () => {
    if (liveCamera.stream) {
      liveCamera.stream.getTracks().forEach(track => track.stop());
    }
    setLiveCamera({ isOpen: false, stream: null });
    setPhotoModal({ isOpen: false, type: 'primary', memberIndex: null });
  };

  useEffect(() => {
    if (liveCamera.isOpen && videoRef.current && liveCamera.stream) {
      videoRef.current.srcObject = liveCamera.stream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [liveCamera]);

  const handleSourceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('File size exceeds 20MB limit');
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Always compress to 800x800 at 0.5 quality to ensure lightweight uploads (< 100KB)
        let finalImage = await compressImageBase64(reader.result, 800, 800, 0.5);
        
        const { type, index } = activeUploadRef.current;
        if (type === 'primary') {
          setFormData(prev => ({ ...prev, photo: finalImage }));
        } else if (type === 'member' && index !== null) {
          const updated = [...members];
          updated[index].photo = finalImage;
          setMembers(updated);
        }
        // Close modal
        setPhotoModal({ isOpen: false, type: 'primary', memberIndex: null });
        
        // Reset file input values AFTER the file has been fully processed
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [formData.darshanDate]);

  const fetchSlots = async () => {
    if (!formData.darshanDate) return;
    setLoadingSlots(true);
    // Reset slots to 0 while loading so user doesn't see old data
    setSlots({ total: 6000, booked: 0, available: 6000 });
    
    try {
      // Add cache-busting timestamp to ensure fresh data
      const res = await axios.get(`${API_BASE}/slots/${formData.darshanDate}`, {
        params: { t: Date.now() }
      });
      setSlots(res.data);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'age') {
      value = value.replace(/\D/g, '').slice(0, 2);
    }
    setFormData({ ...formData, [name]: value });
    if (name === 'mobile' && value.length === 10) {
      checkUser(value);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('File size exceeds 20MB limit');
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Compress to 800x800 at 0.5 quality to ensure lightweight uploads (< 100KB)
        const compressed = await compressImageBase64(reader.result, 800, 800, 0.5);
        setFormData({ ...formData, photo: compressed });
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
    if (field === 'age') {
      value = value.replace(/\D/g, '').slice(0, 2);
    }
    updated[index][field] = value;
    setMembers(updated);
  };

  const handleMemberFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('Member photo exceeds 20MB limit');
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Compress to 800x800 at 0.5 quality to ensure lightweight uploads (< 100KB)
        const compressed = await compressImageBase64(reader.result, 800, 800, 0.5);
        const updated = [...members];
        updated[index].photo = compressed;
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
    if (!formData.photo) {
      alert('Please upload your photo');
      return;
    }
    const missingPhotoIdx = members.findIndex(m => !m.photo);
    if (missingPhotoIdx !== -1) {
      alert(`Please upload photo for member ${missingPhotoIdx + 1} (${members[missingPhotoIdx].name || 'Unnamed'})`);
      return;
    }
    if (isBooking) return;

    setIsBooking(true);

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
        members: members.map(m => ({ ...m, age: parseInt(m.age) })),
        websiteSource: websiteSource
      };

      const res = await axios.post(`${API_BASE}/book`, payload);
      if (res.data.success) {
        setBookingRef(res.data.referenceId);
        setBookingResult(res.data);
        alert('Registration Successful! Ref ID: ' + res.data.referenceId);
      }
    } catch (err) {
      console.error('Booking Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error occurred';
      alert('Booking Failed: ' + errorMsg);
    } finally {
      setIsBooking(false);
    }
  };

  const downloadPDF = (elementId, filename) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const loadAndGenerate = () => {
      const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().from(element).set(opt).save();
    };

    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = loadAndGenerate;
      document.body.appendChild(script);
    } else {
      loadAndGenerate();
    }
  };

  return (
    <div className="app-container">

      <div className="shree-om">{"\u0950"}</div>
      <h1>Shri Machail Mata Yatra 2026</h1>
      <h3 style={{ marginBottom: '2rem' }}>Online Registration Portal</h3>

      <div className="spiritual-marquee" style={{ marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem auto', boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)' }}>
        <div className="marquee-content">
          {'\u0950'} जय माता दी {'\u0950'} श्री मचैल माता यात्रा 2026 में आपका स्वागत है {'\u0950'} कृपया अपनी सारी जानकारी ध्यानपूर्वक भरें {'\u0950'} जय चंडी माता {'\u0950'} <span className="flash-otp" style={{ color: '#FFD700', padding: '0 10px' }}>[TEST MODE] USE OTP: 123456</span> {'\u0950'}
        </div>
      </div>

      <div className="glass-card">
        {!bookingRef && (
        <form onSubmit={handleSubmit}>
          {/* Honeypot field for bot protection */}
          <input 
            type="text" 
            name="website_source" 
            value={websiteSource} 
            onChange={(e) => setWebsiteSource(e.target.value)} 
            style={{ display: 'none' }} 
            tabIndex="-1" 
            autoComplete="off" 
          />
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
              <button 
                type="button" 
                className={`btn btn-accent ${loadingSlots ? 'loading' : ''}`}
                onClick={fetchSlots}
                disabled={loadingSlots}
              >
                {loadingSlots ? 'FETCHING...' : 'CHECK SLOT'}
              </button>
            </div>
          </div>

          {formData.darshanDate && (
            <div className={`slot-indicator ${loadingSlots ? 'opacity-50' : ''}`} style={{ transition: 'all 0.3s ease' }}>
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
              {loadingSlots && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ffcc00', fontWeight: 'bold' }}>Updating...</div>}
            </div>
          )}

          <hr style={{ margin: '2rem 0', opacity: 0.2 }} />

          <div className="form-grid">
            <div className="input-group">
              <label><Phone size={16} /> Mobile Number *</label>
              <div className="input-with-button" style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <input 
                  type="text" 
                  name="mobile" 
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder="Enter Mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                />
                {!isOtpVerified && !otpSent && (
                  <button 
                    type="button" 
                    className="btn btn-otp" 
                    onClick={sendOtp}
                    style={{ flexShrink: 0 }}
                  >
                    OTP
                  </button>
                )}
              </div>
              {message && <small style={{ color: '#FFD700' }}>{message}</small>}
              {!isOtpVerified && !otpSent && (
                <small className="flash-otp" style={{ color: '#FFD700', marginTop: '4px' }}>
                  * Use test OTP "123456" for verification
                </small>
              )}
            </div>

            {otpSent && !isOtpVerified && (
              <div className="input-group">
                <label>Enter OTP <span className="flash-otp" style={{ color: '#FFD700', fontSize: '0.85rem', marginLeft: '8px' }}>(Use OTP: 123456)</span></label>
                <div className="input-with-button" style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <input 
                    type="text" 
                    placeholder="123456"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-accent" 
                    onClick={verifyOtp}
                    style={{ flexShrink: 0 }}
                  >
                    VERIFY
                  </button>
                </div>
              </div>
            )}

            <div className="input-group">
              <label><User size={16} /> Full Name *</label>
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
              <label>Address *</label>
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
              <label>Email ID (Optional)</label>
              <input 
                type="email" 
                name="email" 
                placeholder="example@mail.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isOtpVerified}
              />
            </div>

            <div className="input-group">
              <label>Upload Photo *</label>
              <div 
                onClick={isOtpVerified ? handlePrimaryUploadClick : undefined}
                className={`custom-file-upload ${!isOtpVerified ? 'disabled' : ''}`}
              >
                <span style={{ color: formData.photo ? '#333' : '#777', fontSize: '0.95rem' }}>
                  {formData.photo ? '✓ Photo selected' : 'Choose Photo...'}
                </span>
                <Camera size={18} style={{ color: isOtpVerified ? 'var(--primary)' : '#aaa' }} />
              </div>
              <small style={{ color: '#FFD700', fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>(kindly use what's taken image that is lower in size)</small>
              {formData.photo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                  <img 
                    src={getPhotoUrl(formData.photo)} 
                    alt="Preview" 
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--primary)' }} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://shrimachailmatayatra.com/uploads/${formData.photo}`;
                    }}
                  />
                  <small style={{ color: '#00C851', fontWeight: 'bold' }}>✓ Photo attached</small>
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Age *</label>
              <input 
                type="number" 
                name="age" 
                placeholder="Age"
                value={formData.age}
                onChange={handleInputChange}
                onInput={(e) => { if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2); }}
                required
                disabled={!isOtpVerified}
              />
            </div>

            <div className="input-group">
              <label>Gender *</label>
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
                  <label style={{ fontSize: '12px' }}>Member Name *</label>
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={member.name}
                    onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px' }}>Age *</label>
                  <input 
                    type="number" 
                    placeholder="Age" 
                    value={member.age}
                    onChange={(e) => handleMemberChange(index, 'age', e.target.value)}
                    onInput={(e) => { if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2); }}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px' }}>Mobile (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Mobile" 
                    value={member.mobile}
                    onChange={(e) => handleMemberChange(index, 'mobile', e.target.value)}
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
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px' }}>Upload Photo *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div 
                      onClick={() => handleMemberUploadClick(index)}
                      className="custom-file-upload"
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#333',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <span style={{ fontSize: '14px', color: member.photo ? '#333' : '#777' }}>
                        {member.photo ? '✓ Photo selected' : 'Choose Photo...'}
                      </span>
                      <Camera size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    {member.photo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <img 
                          src={getPhotoUrl(member.photo)} 
                          alt="Member Preview" 
                          style={{ width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--primary)' }} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://shrimachailmatayatra.com/uploads/${member.photo}`;
                          }}
                        />
                        <span style={{ color: '#00C851', fontWeight: 'bold', fontSize: '12px' }}>✓ Attached</span>
                      </div>
                    )}
                    <button type="button" className="btn-delete" onClick={() => removeMember(index)} style={{ padding: '0.5rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} />
                    </button>
                  </div>
                  <small style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold', display: 'block', marginTop: '4px' }}>(kindly use what's taken image that is lower in size)</small>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button type="submit" className={`btn btn-primary ${isBooking ? 'loading' : ''}`} disabled={isBooking} style={{ padding: '1rem 3rem' }}>
              {isBooking ? 'PROCESSING...' : 'BOOK DARSHAN SLOT'}
            </button>
          </div>
        </form>
        )}

        {bookingRef && bookingResult?.members && (
          <div className="tickets-container" id="all-tickets-container">
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  .ticket-printable, .ticket-printable * { visibility: visible; }
                  .ticket-printable { position: static !important; width: 100%; margin: 0 0 20px 0 !important; border: 1px solid #000; page-break-after: always; }
                  .btn-print-ticket { display: none !important; }
                  .tickets-container { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                }
              `}
            </style>

            {bookingResult.members.map((m, idx) => (
              <div key={idx} style={{ maxWidth: '600px', margin: '2rem auto', position: 'relative' }}>
                <div style={{ textAlign: 'right', marginBottom: '8px' }} className="btn-print-ticket">
                  <button 
                    type="button"
                    onClick={() => downloadPDF(`ticket-card-${idx}`, `Slip_${m.name.replace(/\s+/g, '_')}_${m.regNo.replace(/\//g, '_')}.pdf`)}
                    className="btn"
                    style={{ background: '#00C851', color: 'white', border: 'none', padding: '6px 15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }}
                  >
                    Download PDF
                  </button>
                </div>
                <div id={`ticket-card-${idx}`} className="ticket-printable" style={{ 
                  marginTop: '2rem', 
                  background: '#ffffcc', 
                  padding: '2rem', 
                  borderRadius: '4px', 
                  color: '#333', 
                  textAlign: 'left',
                  fontFamily: 'serif',
                  border: '2px solid #ddd',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#8b0000', color: 'white', padding: '10px 20px', borderRadius: '4px', textAlign: 'center', width: '220px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Shri Machail Mata Yatra</span>
                    <br /><small>A journey of Faith</small>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ color: '#000', textShadow: 'none', margin: 0, fontSize: '24px', border: 'none' }}>Jai Mata Di</h2>
                  </div>
                  <div style={{ width: '100px', height: '100px', border: '1px solid #ccc', background: 'white' }}>
                    {(() => {
                      const qrText = encodeURIComponent(`MACHAIL MATA YATRA 2026\n----------------------------\nReg No: ${m.regNo}\nName: ${m.name}\nMobile: ${m.mobile || formData.mobile}\nDarshan Date: ${formData.darshanDate}\nJai Mata Di!`);
                      return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`} alt="QR" style={{ width: '100%' }} />;
                    })()}
                  </div>
                </div>

                <div style={{ background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #eee', marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#8b0000', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Individual Registration Slip</h4>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '100px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                      {m.photo ? (
                        <img 
                          src={getPhotoUrl(m.photo)} 
                          alt={m.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => {
                             e.target.onerror = null;
                             const photoVal = m.photo || '';
                             const filename = photoVal.substring(photoVal.lastIndexOf('/') + 1);
                             e.target.src = `https://shrimachailmatayatra.com/uploads/${filename}`;
                           }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f5f5f5', fontSize: '10px' }}>No Photo</div>
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', fontSize: '14px' }}>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Registration ID:</strong> <span style={{ color: '#d35400', fontWeight: 'bold' }}>{m.regNo}</span></p>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Name:</strong> {m.name}</p>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Gender:</strong> {m.gender}</p>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Mobile:</strong> {m.mobile || formData.mobile}</p>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', fontSize: '14px' }}>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Darshan Date:</strong> {formData.darshanDate}</p>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Status:</strong> <span style={{ color: 'green', fontWeight: 'bold' }}>Confirmed</span></p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '10px' }}>
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
            </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }} className="btn-print-ticket">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ background: '#d9534f', border: 'none', padding: '12px 30px', fontWeight: 'bold', textShadow: 'none' }}
              >
                PRINT ALL SLIPS
              </button>
              <button 
                onClick={() => downloadPDF('all-tickets-container', `All_Slips_${bookingRef.replace(/\//g, '_')}.pdf`)}
                className="btn btn-primary"
                style={{ background: '#00C851', border: 'none', padding: '12px 30px', fontWeight: 'bold', textShadow: 'none' }}
              >
                DOWNLOAD ALL SLIPS (PDF)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs for Gallery & Camera selection */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/png, image/jpeg, image/jpg, image/webp, image/*" 
        style={{ display: 'none' }} 
        onChange={handleSourceFileChange} 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/png, image/jpeg, image/jpg, image/webp, image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={handleSourceFileChange} 
      />

      {/* Photo Source Choice Modal Popup */}
      {photoModal.isOpen && !liveCamera.isOpen && (
        <div className="photo-modal-overlay" onClick={() => setPhotoModal({ isOpen: false, type: 'primary', memberIndex: null })}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-title">
              <Camera size={24} style={{ color: 'var(--accent)' }} />
              Choose Photo Source
            </div>
            <p style={{ marginBottom: '1.5rem', color: '#ddd', fontSize: '0.95rem' }}>
              Select where you want to upload the photo from. <br/>
              <span style={{ color: '#FFD700', fontWeight: '600' }}>Note: kindly use what's taken image that is lower in size</span>
            </p>
            <div className="photo-options-container">
              <div className="photo-option-card" onClick={triggerCamera}>
                <Camera className="photo-option-icon" size={40} />
                <span className="photo-option-label">Camera</span>
                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Take a new picture</span>
              </div>
              <div className="photo-option-card" onClick={triggerGallery}>
                <Image className="photo-option-icon" size={40} />
                <span className="photo-option-label">Gallery</span>
                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Choose from library</span>
              </div>
            </div>
            <button 
              type="button" 
              className="photo-modal-cancel-btn"
              onClick={() => setPhotoModal({ isOpen: false, type: 'primary', memberIndex: null })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Live Camera Modal */}
      {liveCamera.isOpen && (
        <div className="photo-modal-overlay">
          <div className="photo-modal-content" style={{ width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="photo-modal-title" style={{ marginBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={24} style={{ color: 'var(--accent)' }} />
                Take Photo
              </div>
              <button type="button" onClick={closeLiveCamera} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ width: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <video 
                ref={videoRef} 
                playsInline 
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-accent" 
                style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}
                onClick={captureLivePhoto}
              >
                Capture Image
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  return (
    <Router basename="/registration">
      <Routes>
        <Route path="/" element={MAINTENANCE_MODE ? <Maintenance /> : <UserPortal />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;

