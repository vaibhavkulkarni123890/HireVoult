'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../dashboard/layout';
import api from '../../lib/api';

export default function RolesListPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/roles')
      .then(res => setRoles(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Job Roles</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage assessments, generate links, and view candidate submissions.</p>
        </div>
        <button
          className="btn-primary"
          style={{ textDecoration: 'none' }}
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
        >+ Create New Role</button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : roles.length === 0 ? (
        <div className="glass-card" style={{ padding: 64, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>💼</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>No roles created yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Start by creating a job role and letting AI generate an assessment.</p>
          <button
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
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
          >+ Create Your First Role</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {roles.map(r => (
            <Link key={r._id} href={`/roles/${r._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="glass-card card-hover" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{r.title}</h3>
                  <span className={`badge ${r.status==='active'?'badge-green':r.status==='paid'?'badge-purple':'badge-cyan'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>{r.experienceYears} years experience</div>
                  <div>{r.salary.min ? `${r.salary.currency} ${r.salary.min}-${r.salary.max}` : 'Salary unset'}</div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 16, fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.questionConfig?.mcq?.count || 5} MCQ • {r.questionConfig?.coding?.count || 2} Coding</span>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>Manage →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
