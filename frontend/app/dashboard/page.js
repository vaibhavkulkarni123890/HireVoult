'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';

const statusColors = { draft: 'badge-orange', questions_pending: 'badge-cyan', questions_ready: 'badge-purple', approved: 'badge-green', paid: 'badge-green', active: 'badge-green', closed: 'badge-red' };

export default function DashboardPage() {
  const [roles, setRoles] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Quick cache for instant render
    const c = localStorage.getItem('vh_company');
    if (c) setCompany(JSON.parse(c));
    
    // Fetch fresh profile state to sync metrics like freeAssessmentsUsed
    api.get('/auth/me').then(res => {
      setCompany(res.data.company);
      localStorage.setItem('vh_company', JSON.stringify(res.data.company));
    }).catch(() => {});

    api.get('/roles').then(r => setRoles(r.data)).finally(() => setLoading(false));
  }, []);

  const activeRoles = roles.filter(r => r.status === 'active').length;
  const totalRoles = roles.length;
  const freeUsed = company?.freeAssessmentsUsed || 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Welcome back, {company?.name || '...'}</p>
      </div>

      {/* Stats cards */}
      <div className="responsive-grid" style={{ marginBottom: 36 }}>
        {[
          { label: 'Total Roles', value: totalRoles, icon: '💼', color: '#7c3aed' },
          { label: 'Active Assessments', value: activeRoles, icon: '✅', color: '#10b981' },
          { label: 'Free Assessments Used', value: `${freeUsed}/1`, icon: '🆓', color: '#06b6d4' },
          { label: 'Plan', value: company?.plan === 'paid' ? 'Paid' : 'Free', icon: '⚡', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Free banner */}
      {freeUsed === 0 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>🎉 You have 1 free assessment available!</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Create your first role and activate a complete AI-powered assessment at no cost.</div>
          </div>
          <button
            className="btn-primary"
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
                window.location.href = '/roles/paid-assessment';
              } else {
                window.location.href = '/roles/new';
              }
            }}
          >Create Role →</button>
        </div>
      )}

      {/* Roles table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Job Roles</h2>
          <button
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.875rem' }}
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
                window.location.href = '/roles/paid-assessment';
              } else {
                window.location.href = '/roles/new';
              }
            }}
          >+ New Role</button>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : roles.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>💼</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>No roles yet</div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Create your first role and let AI generate the assessment</div>
            <Link href="/roles/new" className="btn-primary">Create First Role →</Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Role</th><th>Status</th><th>MCQ</th><th>Coding</th><th>Theory</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
              {roles.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td><span className={`badge ${statusColors[r.status] || 'badge-orange'}`}>{r.status.replace('_',' ')}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.questionConfig?.mcq?.count ?? 0}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.questionConfig?.coding?.count ?? 0}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.questionConfig?.theory?.count ?? 0}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/roles/${r._id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Manage →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
