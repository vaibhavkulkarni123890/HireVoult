'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useState as useModalState } from 'react';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/roles/new', icon: '➕', label: 'New Role' },
  { href: '/roles', icon: '💼', label: 'All Roles' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [company, setCompany] = useState(null);
  
  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem('vh_company');
    if (!c) { router.push('/login'); return; }
    setCompany(JSON.parse(c));
  }, []);

  const logout = () => {
    localStorage.removeItem('vh_token');
    localStorage.removeItem('vh_company');
    router.push('/login');
  };

  const submitFeedback = async () => {
    if (!feedbackComment.trim()) return alert('Please enter a comment');
    setFeedbackSubmitting(true);
    try {
      // Lazy-load API to prevent circular dependencies in layout
      const api = (await import('../../lib/api')).default;
      await api.post('/feedback/company', {
        platformRating: feedbackRating,
        comment: feedbackComment.trim()
      });
      alert('Feedback submitted successfully! Thank you for helping us improve.');
      setShowFeedbackModal(false);
      setFeedbackComment('');
    } catch {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div style={{ padding: '0 24px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'white' }}>H</div>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'white' }}>Hirevoult</span>
          </Link>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map((item) => {
            if (item.href === '/roles/new') {
              return (
                <button
                  key={item.href}
                  className={`sidebar-link${pathname === item.href ? ' active' : ''}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 24px',
                    margin: 0,
                    cursor: 'pointer',
                    color: pathname === item.href ? '#a78bfa' : 'var(--text-muted)',
                    fontWeight: pathname === item.href ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '1rem',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                  onClick={() => {
                    const c = localStorage.getItem('vh_company');
                    let freeUsed = 0;
                    let plan = 'free';
                    if (c) {
                      try {
                        const company = JSON.parse(c);
                        freeUsed = company.freeAssessmentsUsed || 0;
                        plan = company.plan || 'free';
                      } catch {}
                    }
                    if (plan !== 'paid' && freeUsed >= 1) {
                      router.push('/roles/paid-assessment');
                    } else {
                      router.push('/roles/new');
                    }
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#a78bfa'}
                  onMouseOut={e => e.currentTarget.style.color = pathname === item.href ? '#a78bfa' : 'var(--text-muted)'}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link${pathname === item.href || (item.href !== '/dashboard' && item.href !== '/roles/new' && pathname.startsWith(item.href)) ? ' active' : ''}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
          {company && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{company.email}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${company.plan === 'paid' ? 'badge-purple' : 'badge-cyan'}`}>
                  {company.plan === 'paid' ? '⚡ Paid' : '🆓 Free Plan'}
                </span>
              </div>
            </div>
          )}
          <button onClick={logout} className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem', padding: '10px' }}>Sign Out</button>
        </div>
      </aside>
      <main className="dash-main" style={{ paddingBottom: 120 }}>{children}</main>

      {/* Global Feedback Footer */}
      <div className="dashboard-footer" style={{ position: 'fixed', bottom: 0, left: 260, right: 0, background: 'rgba(17, 17, 24, 0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 40 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Need assistance or want to request a feature? We&apos;re listening.
        </div>
        <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, borderColor: 'rgba(124,58,237,0.5)' }} onClick={() => setShowFeedbackModal(true)}>
          <span style={{ color: '#f59e0b' }}>★</span> Give Feedback
        </button>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ padding: 32, width: '100%', maxWidth: 450 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>How are we doing?</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>Your feedback directly influences HireVault&apos;s product development roadmap.</p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Rating</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(star => (
                  <button key={star} type="button" onClick={() => setFeedbackRating(star)} style={{ fontSize: '1.8rem', background: 'none', border: 'none', cursor: 'pointer', color: star <= feedbackRating ? '#f59e0b' : '#374151', padding: 0 }}>★</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Comments or Feature Requests</label>
              <textarea className="input-field" rows={4} value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="I love the AI questions! One feature I'd like to see is..." style={{ resize: 'none' }}></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowFeedbackModal(false)} disabled={feedbackSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={submitFeedback} disabled={feedbackSubmitting || !feedbackComment.trim()}>
                {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
      <UtilizedModal />
    </div>
  );
}

// Utilized Modal Component
function UtilizedModal() {
  const [open, setOpen] = useModalState(false);
  if (typeof window !== 'undefined') window.__showUtilizedModal = () => setOpen(true);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', zIndex: 9999, inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#18181b', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px #0008', textAlign: 'center', border: '1.5px solid #ef4444' }}>
        <div style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Oops! You have utilized your free assessment.</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 24 }}>To create more roles and assessments, please upgrade to a paid plan.</div>
        <Link href="/paid-assessment" className="btn-primary" style={{ marginBottom: 12, display: 'inline-block' }}>View Paid Plans</Link>
        <br />
        <button className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}
