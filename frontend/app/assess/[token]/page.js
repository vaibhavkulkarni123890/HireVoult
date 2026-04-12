'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';

// ── Scheduling countdown helper ───────────────────────────────────────────────
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!targetDate) return;
    const calcLeft = () => {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) return setTimeLeft(null);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h > 0 ? `${h}h ` : ''}${m}m ${s}s`);
    };
    calcLeft();
    const id = setInterval(calcLeft, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function formatIST(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short'
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AssessLandingPage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [starting, setStarting] = useState(false);
  const [permsGranted, setPermsGranted] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const countdown = useCountdown(linkData?.opensAt || linkData?.nextWindowAt);

  useEffect(() => {
    api.get(`/links/validate/${unwrappedParams.token}`)
      .then(res => {
        setLinkData(res.data);
        if (res.data.linkType === 'dynamic') {
          setForm({ name: res.data.candidateName || '', email: res.data.candidateEmail || '' });
        }
      })
      .catch(err => setError(err.response?.data?.error || 'Invalid or expired assessment link'))
      .finally(() => setLoading(false));

    const detectMobile = () => {
      const ua = navigator.userAgent || '';
      const isPhone = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua);
      const isTouch = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints > 1 : false;
      const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
      setIsMobileDevice(isPhone || isTouch || hasCoarsePointer || window.innerWidth <= 900);
    };

    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, [unwrappedParams.token]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setPermsGranted(true);
      toast.success('Camera access granted');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch {
      toast.error('Camera access is required for this assessment');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    setPhotoData(canvasRef.current.toDataURL('image/jpeg', 0.8));
    const stream = videoRef.current.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (isMobileDevice) return toast.error('Desktop required for this assessment. Please reopen on a laptop or PC.');
    if (!form.name || !form.email) return toast.error('Name and email required');
    if (!permsGranted) return toast.error('Please grant camera access first');
    setStarting(true);
    try {
      const { data } = await api.post('/assessment/start', {
        token: unwrappedParams.token,
        candidateName: form.name,
        candidateEmail: form.email,
        identityPhoto: photoData
      });
      sessionStorage.setItem('vh_session', JSON.stringify({
        id: data.sessionId,
        token: unwrappedParams.token,
        questions: data.questions,
        startedAt: data.startedAt
      }));
      try { await document.documentElement.requestFullscreen(); } catch {}
      router.push(`/assess/${unwrappedParams.token}/test`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not start assessment');
      setStarting(false);
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (error) return (
    <div style={{ 
  minHeight: '100vh', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  padding: 24, 
  position: 'relative',
  background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%), var(--bg)',
  overflow: 'hidden'
}}>
      <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>Access Denied</h1>
        <p style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: 8 }}>{error}</p>
      </div>
    </div>
  );

  // ── Scheduling state messages ─────────────────────────────────────────────
  const scheduleState = linkData?.scheduleState;
  const isOpen = linkData?.valid && scheduleState === 'open';

  if (scheduleState === 'not_open') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ padding: 48, maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 24 }}>🕐</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>Assessment Not Open Yet</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
            This assessment is not yet open. It will be available from:
          </p>
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: '16px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' }}>{formatIST(linkData.opensAt)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Indian Standard Time (IST)</div>
          </div>
          {countdown && <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4' }}>Opens in: {countdown}</div>}
          <button className="btn-primary" disabled style={{ marginTop: 32, width: '100%', opacity: 0.4, cursor: 'not-allowed' }}>
            Start Assessment (Not Yet Open)
          </button>
        </div>
      </div>
    );
  }

  if (scheduleState === 'closed') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ padding: 48, maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 24 }}>🔒</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>Assessment Window Closed</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            This assessment window has closed. Please contact the hiring team if you believe this is an error.
          </p>
          <button className="btn-secondary" disabled style={{ marginTop: 32, width: '100%', opacity: 0.4, cursor: 'not-allowed' }}>
            Assessment Closed
          </button>
        </div>
      </div>
    );
  }

  if (scheduleState === 'outside_daily_window') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ padding: 48, maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 24 }}>⏰</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>Outside Assessment Window</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16 }}>
            Today's assessment window is <strong>{linkData.dailyWindowStart} – {linkData.dailyWindowEnd} IST</strong>.
            Please return during that time.
          </p>
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12, padding: '16px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Next window opens in:</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#06b6d4', fontFamily: 'monospace' }}>{countdown || 'Calculating...'}</div>
          </div>
          <button className="btn-primary" disabled style={{ width: '100%', opacity: 0.4, cursor: 'not-allowed' }}>
            Opens at {linkData.dailyWindowStart} IST
          </button>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', background: '#0a0a0c' }}>
      <div style={{ 
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 50% 20%, rgba(124,58,237,0.12) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: 900, 
        padding: '60px 40px', 
        position: 'relative', 
        zIndex: 10,
        background: 'rgba(17, 17, 21, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          {linkData.company?.logo ? (
            <img src={linkData.company.logo} alt="Logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', margin: '0 auto 20px' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 32, color: 'white', margin: '0 auto 20px' }}>{linkData.company?.name?.charAt(0) || 'T'}</div>
          )}
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: 12, color: '#f8fafc' }}>{linkData.company?.name} is inviting you</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem' }}>Role: <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{linkData.jobRole?.title}</span></p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820, margin: '0 auto' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 10, fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>Full Name *</label>
            <input 
              className="input-field" 
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                padding: '16px 20px', 
                fontSize: '1rem',
                borderRadius: 12,
                color: '#fff',
                width: '100%'
              }}
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              disabled={linkData.linkType === 'dynamic'} 
              placeholder="Your full name" 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 10, fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>Email Address *</label>
            <input 
              className="input-field" 
              type="email" 
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                padding: '16px 20px', 
                fontSize: '1rem',
                borderRadius: 12,
                color: '#fff',
                width: '100%'
              }}
              value={form.email} 
              onChange={e => setForm({ ...form, email: e.target.value })} 
              disabled={linkData.linkType === 'dynamic'} 
              placeholder="your@email.com" 
            />
            {linkData.linkType === 'dynamic' && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>🔒 Locked by invitation</div>}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, marginTop: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#fff' }}>Assessment Instructions</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem', color: '#94a3b8' }}>
              <li style={{ display: 'flex', gap: 10 }}><span>⏱️</span><span>This assessment consists of multiple sections including MCQs, Coding, and Logic Verification.</span></li>
              <li style={{ display: 'flex', gap: 10 }}><span>⏲️</span><span>Total estimated time: <strong>{linkData.totalTimeMinutes || 60} minutes</strong>. Each question has its own individual timer.</span></li>
              {linkData.closedAt && (
                <li style={{ display: 'flex', gap: 10 }}>
                  <span>⏳</span>
                  <span><strong>Deadline:</strong> This assessment link expires on <strong>{formatIST(linkData.closedAt)}</strong>. Please complete it before then.</span>
                </li>
              )}
              <li style={{ display: 'flex', gap: 10 }}><span>🚫</span><span><strong>Strict Anti-Cheat:</strong> Exiting fullscreen, switching tabs, or using external tools will result in immediate termination.</span></li>
              <li style={{ display: 'flex', gap: 10 }}><span>📷</span><span><strong>Proctoring:</strong> Your camera will be active for identity verification and periodic snapshots during the test.</span></li>
            </ul>
            
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '12px', background: 'rgba(124,58,237,0.05)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.1)' }}>
              <input 
                type="checkbox" 
                checked={rulesAccepted} 
                onChange={e => setRulesAccepted(e.target.checked)}
                style={{ marginTop: 4, width: 18, height: 18, cursor: 'pointer', accentColor: '#7c3aed' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                I understand the rules for this assessment and acknowledge that any form of cheating or violation of instructions will result in <strong>immediate termination</strong> of my session.
              </span>
            </label>
          </div>

          {!permsGranted ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!rulesAccepted}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '18px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '1.05rem',
                background: rulesAccepted ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : '#334155',
                color: rulesAccepted ? '#fff' : '#94a3b8',
                border: 'none',
                boxShadow: rulesAccepted ? '0 8px 20px rgba(124,58,237,0.2)' : 'none',
                transition: 'all 0.2s ease',
                cursor: rulesAccepted ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: rulesAccepted ? 1 : 0.6
              }}
              onMouseOver={e => {
                if (!rulesAccepted) return;
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(124,58,237,0.3)';
              }}
              onMouseOut={e => {
                if (!rulesAccepted) return;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(124,58,237,0.2)';
              }}
              onClick={requestPermissions}
            >
              <span>📸</span> Enable Camera for Identity Verification
            </button>
          ) : !photoData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <video ref={videoRef} style={{ width: 320, height: 240, background: '#000', borderRadius: 8, objectFit: 'cover' }} muted playsInline />
              <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
              <button
                type="button"
                className="btn-primary"
                style={{
                  width: 220,
                  padding: '14px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg,#10b981 0%,#06b6d4 100%)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(16,185,129,0.10)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(135deg,#06b6d4 0%,#10b981 100%)'}
                onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg,#10b981 0%,#06b6d4 100%)'}
                onClick={capturePhoto}
              >
                📸 Capture Identity Photo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={photoData} alt="Identity" style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, border: '2px solid #10b981' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>✓ Identity Verified</div>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c3aed',
                      textDecoration: 'underline',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                    onClick={() => { setPhotoData(null); requestPermissions(); }}
                  >Retake Photo</button>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, width: '100%', marginTop: 16 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, color: 'white' }}>Final Assessment Guidelines</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9rem' }}>
                  <li style={{ display: 'flex', gap: 10 }}><span>⏱️</span><span><strong>Time Limits:</strong> Each coding question has a strict isolated countdown clock.</span></li>
                  <li style={{ display: 'flex', gap: 10 }}><span>🛡️</span><span><strong>Strict Proctoring:</strong> The test runs in Fullscreen. Modifying tabs, pressing Escape, or minimizing the window will trigger fatal warnings.</span></li>
                  <li style={{ display: 'flex', gap: 10 }}><span>📷</span><span><strong>Camera Monitoring:</strong> We will securely take snapshots during your session.</span></li>
                </ul>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleStart}
                disabled={starting || isMobileDevice}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '16px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '1.08rem',
                  background: isMobileDevice ? 'rgba(107,114,128,0.85)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: isMobileDevice ? 'none' : '0 4px 20px rgba(16,185,129,0.3)',
                  opacity: starting || isMobileDevice ? 0.7 : 1,
                  cursor: starting || isMobileDevice ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={e => { if (!isMobileDevice && !starting) e.currentTarget.style.background = 'linear-gradient(135deg,#059669 0%,#10b981 100%)'; }}
                onMouseOut={e => { if (!isMobileDevice && !starting) e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; }}
              >
                {starting ? '⏳ Preparing environment...' : '✅ Accept Rules & Start Assessment'}
              </button>
            </div>
          )}
        </div>
      </div>
      {isMobileDevice && !loading && !error && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.88)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="glass-card" style={{ maxWidth: 520, width: '100%', padding: 28, textAlign: 'center', borderRadius: 20, background: 'rgba(15,23,42,0.96)' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 18 }}>💻 Desktop Required</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.8, marginBottom: 24 }}>
              This assessment requires a laptop or desktop device for reliable proctoring and the best experience. Mobile devices and small screens are not supported.
            </p>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#a7f3d0' }}>For the best experience, please reopen this assessment link on a laptop or desktop PC.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>The assessment is optimized for desktop browsers only. Mobile mode is disabled to maintain secure proctoring.</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              disabled
              style={{
                width: '100%',
                opacity: 0.65,
                cursor: 'not-allowed',
                padding: '14px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '1rem',
                background: 'linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 12px rgba(124,58,237,0.10)',
              }}
            >
              Start Assessment Disabled on Mobile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
