// Moved from /app/paid-assessment/page.js
'use client';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function PaidAssessmentPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    assessments: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.assessments) {
      return toast.error('Please fill in all required fields');
    }
    setLoading(true);
    try {
      const mailtoLink = `mailto:support@hirevoult.com?subject=Paid%20Assessment%20Inquiry&body=Name:%20${encodeURIComponent(form.name)}%0ACompany:%20${encodeURIComponent(form.company)}%0AEmail:%20${encodeURIComponent(form.email)}%0A%0AAssessment%20Details:%0A-${encodeURIComponent(form.assessments)}%0A%0AMessage:%0A${encodeURIComponent(form.message)}`;
      window.location.href = mailtoLink;
      toast.success('Opening email client...');
    } catch (err) {
      toast.error('Failed to open email client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Oops message for utilized free assessment */}
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Oops! You have utilized your free assessment.</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>To create more roles and assessments, please upgrade to a paid plan.</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'white' }}>V</div>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'white' }}>HireVoult</span>
            </div>
          </Link>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>Enterprise Assessment Solutions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Create multiple role assessments with our paid plans. Free plan allows 1 assessment only.</p>
        </div>

        <div className="glass-card" style={{ padding: 40 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, padding: 24, marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>Why Choose HireVoult Paid Assessments?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[ 
                { icon: '✓', title: 'Multiple Assessments', desc: 'Create as many role assessments as your paid plan allows (free plan: 1 assessment)' },
                { icon: '✓', title: 'All Languages', desc: 'JavaScript, Python, Java, C++, Go, Rust & more' },
                { icon: '✓', title: 'Advanced Proctoring', desc: 'AI-powered proctoring with tab switches & more' },
                { icon: '✓', title: 'Priority Support', desc: 'Dedicated support with 24-hour response time' },
                { icon: '✓', title: 'Custom Branding', desc: 'White-label assessments with your company branding' },
                { icon: '✓', title: 'Detailed Analytics', desc: 'In-depth reports on candidate performance' }
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{f.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Full Name *</label>
                <input className="input-field" type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Work Email *</label>
                <input className="input-field" type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Company Name</label>
              <input className="input-field" type="text" placeholder="Acme Corporation" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Number of Assessments Needed *</label>
              <input className="input-field" type="text" placeholder="e.g., 50 assessments per month" value={form.assessments} onChange={e => setForm({ ...form, assessments: e.target.value })} required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Additional Requirements</label>
              <textarea className="input-field" style={{ minHeight: 100, resize: 'vertical' }} placeholder="Any specific requirements, preferred languages, custom features, etc." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Opening Email Client...' : 'Request Paid Assessment Inquiry'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            We typically respond within <strong style={{ color: '#10b981' }}>24 hours</strong> to all paid assessment inquiries.
            <br />
            Or email us directly at <a href="mailto:support@hirevoult.com" style={{ color: '#7c3aed' }}>support@hirevoult.com</a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
