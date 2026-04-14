import React from 'react';
import { Settings, Info, Phone, Mail, Clock } from 'lucide-react';

const Maintenance = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)',
      padding: '2rem',
      color: 'white',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(15px)',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '800px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          marginBottom: '2rem',
          animation: 'pulse 2s infinite'
        }}>
          <Settings size={60} color="#ffcc00" className="animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '800',
          marginBottom: '1rem',
          letterSpacing: '-1px',
          textShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          Under Maintenance
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          lineHeight: '1.6',
          marginBottom: '2.5rem',
          opacity: 0.9,
          color: '#fefefe'
        }}>
          नमस्ते! श्री मचैल माता यात्रा 2026 पोर्टल वर्तमान में तकनीकी सुधार के लिए अस्थायी रूप से डाउन है। 
          हम जल्द ही वापस आएंगे। असुविधा के लिए हमें खेद है। 
          <br /><br />
          Jai Mata Di! We are currently upgrading our system to serve you better. 
          Please check back in a short while.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          <div style={{
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Clock size={24} color="#ffcc00" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Estimated Return</h4>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0 0 0' }}>Soon</p>
          </div>
          <div style={{
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Phone size={24} color="#ffcc00" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Emergency Helpline</h4>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0 0 0' }}>+91 9906154100</p>
          </div>
          <div style={{
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Mail size={24} color="#ffcc00" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Email Support</h4>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0 0 0' }}>support@shrimachailmatayatra.com</p>
          </div>
        </div>

        <div style={{ marginTop: '3rem', opacity: 0.6, fontSize: '0.9rem' }}>
          &copy; 2026 District Administration Kishtwar | Shri Machail Mata Yatra
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(255, 204, 0, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 204, 0, 0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 8s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default Maintenance;
