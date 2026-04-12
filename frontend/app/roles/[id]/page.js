'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import DashboardLayout from '../../dashboard/layout';

const SENIORITY_LABELS = {
  junior: { label: 'Junior', range: '0-2 yrs' },
  mid:    { label: 'Mid Level', range: '3-5 yrs' },
  senior: { label: 'Senior', range: '6-8 yrs' },
  lead:   { label: 'Lead / Principal', range: '8+ yrs' }
};

function formatInput(input) {
  try {
    if (typeof input === 'object') return JSON.stringify(input, null, 2);
    // If string but looks like JSON, format it
    if (typeof input === 'string' && (input.startsWith('[') || input.startsWith('{'))) {
      return JSON.stringify(JSON.parse(input), null, 2);
    }
    return String(input);
  } catch (e) { return String(input); }
}

export default function RoleManagePage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [links, setLinks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions');

  // Generator states
  const [linkForm, setLinkForm] = useState({ 
    type: 'dynamic', 
    schedule: 'immediate', 
    bulkCandidates: '', 
    scheduleStartDate: '', 
    scheduleEndDate: '' 
  });
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/roles/${unwrappedParams.id}`).catch(()=>({data:null})),
      api.get(`/agent/assessment/${unwrappedParams.id}`).catch(()=>({data:null})),
      api.get(`/links/${unwrappedParams.id}`).catch(()=>({data:[]})),
      api.get(`/grade/results/${unwrappedParams.id}`).catch(()=>({data:[]}))
    ]).then(([rRes, aRes, lRes, resRes]) => {
      if (!rRes.data) return router.push('/dashboard');
      setRole(rRes.data);
      setAssessment(aRes.data);
      setLinks(lRes.data);
      setResults(resRes.data);
      if (rRes.data.status === 'questions_ready') setActiveTab('questions');
      else if (rRes.data.status === 'approved') setActiveTab('payment');
      else if (['paid','active'].includes(rRes.data.status)) setActiveTab('links');
      setLoading(false);
    });
  }, [unwrappedParams.id, router]);

  const handleApprove = async () => {
    try {
      await api.post('/agent/approve', { assessmentId: assessment._id });
      toast.success('Questions approved!');
      setRole(r => ({ ...r, status: 'approved' }));
      setActiveTab('payment');
    } catch (err) { toast.error('Approval failed'); }
  };

  const handlePay = async (currency = 'INR') => {
    setPaying(true);
    try {
      if (assessment.isFree) {
        const { data } = await api.post('/agent/activate-free', { assessmentId: assessment._id });
        toast.success(data.message || 'Free assessment activated!');
      } else {
        const { data } = await api.post('/agent/pay', { assessmentId: assessment._id, currency });
        toast.success(`Assessment activated in ${currency}!`);
        setAssessment(prev => ({ ...prev, pricing: { ...prev.pricing, currency } }));
      }
      setRole(r => ({ ...r, status: 'paid' }));
      setActiveTab('links');
    } catch (err) { 
      toast.error(err.response?.data?.error || 'Payment activation failed'); 
    }
    finally { setPaying(false); }
  };

  const refreshResults = async () => {
    try {
      const resRes = await api.get(`/grade/results/${unwrappedParams.id}`);
      setResults(resRes.data);
      toast.success('Results refreshed', { duration: 1000 });
    } catch (err) {}
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      // Split by real newlines (Windows or Unix format)
      const lines = linkForm.bulkCandidates.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const candidates = lines.map(l => {
        const parts = l.split(',').map(s => s.trim());
        return { name: parts[0] || 'Candidate', email: parts[1] || parts[0] };
      });
      
      if (candidates.length === 0) return toast.error('Please provide at least one candidate');

      const payload = {
        roleId: role._id,
        candidates,
        scheduleType: linkForm.schedule,
        scheduleStartDate: linkForm.schedule === 'scheduled' ? linkForm.scheduleStartDate : undefined,
        scheduleEndDate: linkForm.schedule === 'scheduled' ? linkForm.scheduleEndDate : undefined
      };
      const { data } = await api.post('/links/bulk-generate', payload);
      setLinks([ ...data.links, ...links]);
      
      setLinkForm({ 
        type: 'dynamic', 
        schedule: 'immediate', 
        bulkCandidates: '', 
        scheduleStartDate: '', 
        scheduleEndDate: '' 
      });
      toast.success('Links generated! Ready to share.');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to generate link(s)'); }
    finally { setGeneratingLink(false); }
  };

  const exportLinksCSV = () => {
    const dynamicLinks = links.filter(l => l.linkType === 'dynamic');
    if (dynamicLinks.length === 0) return toast.error('No dynamic links to export');
    const csvStr = "Name,Email,Link\n" + dynamicLinks.map(l => `${l.candidateName},${l.candidateEmail},${l.url}`).join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${role.title.replace(/\s+/g,'_')}_links.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gradeAll = async () => {
    try {
      toast.loading('Running AI Grading Agent...', { id: 'grade' });
      const { data } = await api.post(`/grade/bulk/${role._id}`);
      toast.success(data.message, { id: 'grade' });
      const { data: updatedResults } = await api.get(`/grade/results/${role._id}`);
      setResults(updatedResults);
    } catch (err) { toast.error('Grading failed', { id: 'grade' }); }
  };

  if (loading) return <DashboardLayout><div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}/></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{role.title}</h1>
            <span className="badge badge-cyan" style={{ textTransform: 'uppercase' }}>{role.status.replace('_',' ')}</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {(() => {
              const sInfo = SENIORITY_LABELS[role.seniorityLevel || 'junior'];
              const price = role.pricePerAssessment ? `₹${role.pricePerAssessment}` : 'Free';
              const salaryStr = role.salary?.min ? ` • ${role.salary.currency} ${role.salary.min.toLocaleString()}-${role.salary.max?.toLocaleString()}` : '';
              return (
                <span style={{ fontWeight: 500 }}>
                  {sInfo.label} <span style={{ color: '#4b5563' }}>•</span> {sInfo.range} <span style={{ color: '#4b5563' }}>•</span> <span style={{ color: '#a78bfa' }}>{price}/assessment</span>{salaryStr}
                </span>
              );
            })()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {['questions', 'payment', 'links', 'results'].map(t => {
          // Disable logic based on role status
          const disabled = 
            (t === 'payment' && !['approved','paid','active'].includes(role.status)) ||
            (t === 'links' && !['paid','active'].includes(role.status)) ||
            (t === 'results' && !['active'].includes(role.status));
          
          return (
            <button key={t} onClick={() => !disabled && setActiveTab(t)} style={{ padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === t ? '2px solid #7c3aed' : '2px solid transparent', color: activeTab === t ? 'white' : disabled ? 'rgba(100,116,139,0.3)' : 'var(--text-muted)', fontWeight: activeTab === t ? 600 : 500, fontSize: '0.95rem', cursor: disabled ? 'not-allowed' : 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
              {t} {t === 'results' && results.length > 0 && `(${results.length})`}
            </button>
          );
        })}
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Generated Assessment</h2>
            {role.status === 'questions_ready' && (
              <button className="btn-primary" onClick={handleApprove}>✓ Approve Assessment</button>
            )}
            {role.status !== 'questions_ready' && role.status !== 'questions_pending' && (
              <span className="badge badge-green">✓ Approved</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {assessment?.questions.map((q, i) => (
              <div key={i} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{q.type}</span>
                  {q.difficulty && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                      background: q.difficulty === 'easy' ? 'rgba(16,185,129,0.1)' : q.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      color: q.difficulty === 'easy' ? '#10b981' : q.difficulty === 'hard' ? '#ef4444' : '#f59e0b'
                    }}>{q.difficulty}</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{q.points} points • {Math.round(q.timeLimit/60)} mins</span>
                </div>

                {q.reasoning && (
                  <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', padding: '10px 14px', borderRadius: 8, color: '#c4b5fd', fontSize: '0.9rem', marginBottom: 16 }}>
                    <strong style={{ color: '#a78bfa' }}>Why this question:</strong> {q.reasoning}
                  </div>
                )}

                <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>
                  {i+1}. {q.title ? <span style={{ color: 'white', marginRight: 8 }}>{q.title}</span> : ''}
                </div>
                
                <p style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: q.type==='mcq'?16:20, whiteSpace: 'pre-wrap' }}>
                  {q.description || q.question}
                </p>

                {q.type === 'coding' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {q.constraints?.length > 0 && (
                      <div style={{ background: '#0d0d12', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Constraints</div>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                          {q.constraints.map((c, idx) => (
                            <li key={idx} className="mono" style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: 4 }}>• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.examples?.length > 0 && (
                      <div style={{ background: '#0d0d12', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Examples</div>
                        {q.examples.map((ex, idx) => (
                          <div key={idx} style={{ marginBottom: idx < q.examples.length - 1 ? 16 : 0, paddingBottom: idx < q.examples.length - 1 ? 16 : 0, borderBottom: idx < q.examples.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div className="mono" style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: 4 }}><span style={{ color: '#a78bfa' }}>Input:</span> {formatInput(ex.input)}</div>
                            <div className="mono" style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: 4 }}><span style={{ color: '#10b981' }}>Output:</span> {formatInput(ex.output)}</div>
                            {ex.explanation && <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>{ex.explanation}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.testCases?.length > 0 && (
                      <div style={{ background: '#0d0d12', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Test Cases</div>
                        {q.testCases.map((tc, tcIdx) => (
                          <div key={tcIdx} style={{ marginBottom: tcIdx < q.testCases.length - 1 ? 12 : 0, paddingBottom: tcIdx < q.testCases.length - 1 ? 12 : 0, borderBottom: tcIdx < q.testCases.length - 1 ? '1px solid #1f1f23' : 'none', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div className="mono" style={{ fontSize: '0.8rem', color: '#9ca3af' }}><span style={{ color: '#a78bfa', fontWeight: 700 }}>IN:</span> {formatInput(tc.input)}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="mono" style={{ fontSize: '0.8rem', color: '#9ca3af' }}><span style={{ color: '#10b981', fontWeight: 700 }}>OUT:</span> {formatInput(tc.expectedOutput)}</div>
                            </div>
                            <div style={{ fontSize: '0.7rem' }}>
                               <span className={`badge ${tc.isVisible !== false ? 'badge-cyan' : 'badge-purple'}`} style={{ padding: '1px 6px' }}>{tc.isVisible !== false ? 'VISIBLE' : 'HIDDEN'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ background: 'rgba(6,182,212,0.1)', padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>🧪</span>
                      <span style={{ fontSize: '0.9rem', color: '#67e8f9', fontWeight: 500 }}>
                        {q.testCases?.filter(tc => tc.isVisible !== false && tc.isHidden !== true).length || 0} visible + {q.testCases?.filter(tc => tc.isVisible === false || tc.isHidden === true).length || 0} private test cases
                      </span>
                    </div>
                  </div>
                )}

                {q.type === 'mcq' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ padding: '8px 12px', background: oi === q.correctOption ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: oi === q.correctOption ? '1px solid #10b981' : '1px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', color: oi === q.correctOption ? '#34d399' : 'inherit' }}>
                        {String.fromCharCode(65+oi)}. {opt}
                        {oi === q.correctOption && <span style={{ float: 'right' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && assessment?.pricing && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="gradient-border" style={{ padding: 40, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Activate Assessment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Pay to unlock assessment links and the grading agent.</p>
            
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 24, textAlign: 'left', marginBottom: 24, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Pricing Tier</span>
                <span>{assessment.pricing.seniorityLabel || role.seniorityLabel || 'Seniority Based Assessment'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Cost per Assessment</span>
                <span>{assessment.pricing.currency === 'USD' ? '$' : '₹'}{assessment.pricing.currency === 'USD' ? (assessment.pricing.breakdown?.pricePerAssessmentUSD || role.pricePerAssessmentUSD || assessment.pricing.basePrice) : (assessment.pricing.breakdown?.pricePerAssessmentINR || role.pricePerAssessment || assessment.pricing.basePrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Batch Size Limit</span>
                <span>× {assessment.pricing.candidateCount || role.candidateLimit || 1} candidates</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 800, color: assessment.isFree ? '#10b981' : role.status === 'approved' ? 'white' : '#10b981' }}>
                <span>{role.status === 'approved' ? 'Total Due' : 'Total Paid'}</span>
                <span>
                  {(() => {
                    if (assessment.isFree) return 'FREE (1st Role)';
                    const isUsd = assessment.pricing.currency === 'USD';
                    const unitPrice = isUsd 
                      ? (assessment.pricing.breakdown?.pricePerAssessmentUSD || role.pricePerAssessmentUSD || assessment.pricing.basePrice || 0)
                      : (assessment.pricing.breakdown?.pricePerAssessmentINR || role.pricePerAssessment || assessment.pricing.basePrice || 0);
                    const count = assessment.pricing.candidateCount || role.candidateLimit || 1;
                    const totalCost = (isUsd ? assessment.pricing.totalCostUSD : assessment.pricing.totalCostINR) || (unitPrice * count);
                    
                    return `${isUsd ? '$' : '₹'}${totalCost}`;
                  })()}
                </span>
              </div>
            </div>

            {role.status === 'approved' ? (
              assessment.isFree ? (
                <button className="btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '16px', justifyContent: 'center' }} onClick={() => handlePay('INR')} disabled={paying}>
                  {paying ? 'Processing...' : 'Activate Free Assessment ✨'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 16 }}>
                  {(() => {
                    const count = assessment.pricing.candidateCount || role.candidateLimit || 1;
                    const inrTotal = assessment.pricing.totalCostINR || ((assessment.pricing.breakdown?.pricePerAssessmentINR || role.pricePerAssessment || assessment.pricing.basePrice || 0) * count);
                    const usdTotal = assessment.pricing.totalCostUSD || ((assessment.pricing.breakdown?.pricePerAssessmentUSD || role.pricePerAssessmentUSD || 0) * count);
                    return (
                      <>
                        <button className="btn-primary" style={{ flex: 1, fontSize: '1.05rem', padding: '16px', justifyContent: 'center' }} onClick={() => handlePay('INR')} disabled={paying}>
                           Pay ₹{inrTotal} (INR)
                        </button>
                        <button className="btn-secondary" style={{ flex: 1, fontSize: '1.05rem', padding: '16px', justifyContent: 'center', borderColor: '#3b82f6', color: '#3b82f6' }} onClick={() => handlePay('USD')} disabled={paying}>
                           Pay ${usdTotal} (USD)
                        </button>
                      </>
                    );
                  })()}
                </div>
              )
            ) : (
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>✓ Activated</div>
            )}
          </div>
        </div>
      )}

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>
          <div className="glass-card" style={{ padding: 24, alignSelf: 'start' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Generate Link</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Schedule Type</label>
                <select className="input-field" value={linkForm.schedule} onChange={e => setLinkForm({ ...linkForm, schedule: e.target.value })}>
                  <option value="immediate">Immediate (Always Open)</option>
                  <option value="scheduled">Scheduled Window (Start & End)</option>
                </select>
              </div>

              {linkForm.schedule === 'scheduled' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Window Start Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className="input-field" 
                      min={new Date().toISOString().slice(0, 16)}
                      value={linkForm.scheduleStartDate} 
                      onChange={e => setLinkForm({ ...linkForm, scheduleStartDate: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Window End Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className="input-field" 
                      min={linkForm.scheduleStartDate || new Date().toISOString().slice(0, 16)}
                      value={linkForm.scheduleEndDate} 
                      onChange={e => setLinkForm({ ...linkForm, scheduleEndDate: e.target.value })} 
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Candidates (Name, Email) - One per row</label>
                <textarea className="input-field" rows={4} placeholder="John Doe, john@example.com\nJane Smith, jane@example.com" value={linkForm.bulkCandidates} onChange={e => setLinkForm({ ...linkForm, bulkCandidates: e.target.value })} />
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={generateLink} disabled={generatingLink || !linkForm.bulkCandidates}>
                {generatingLink ? 'Generating...' : '+ Create Link'}
              </button>
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>Active Links ({links.length})</h3>
              {links.some(l => l.linkType === 'dynamic') && (
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={exportLinksCSV}>⬇ Export Dynamics (CSV)</button>
              )}
            </div>
            {links.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--border)' }}>No links generated yet. Create one to invite candidates.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {links.map((link) => (
                  <div key={link._id} className="glass-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge ${link.linkType==='static' ? 'badge-cyan' : 'badge-purple'}`}>{link.linkType.toUpperCase()}</span>
                        {link.linkType === 'dynamic' && <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{link.candidateName} ({link.candidateEmail})</span>}
                      </div>
                      <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', display: 'inline-block' }}>{link.url}</div>
                    </div>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Copied!'); }}>Copy</button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Info box about dynamic links */}
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(6,182,212,0.1)', borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)', fontSize: '0.85rem', color: '#a5f3fc' }}>
              <strong>💡 Pro tip:</strong> Dynamic links are locked to a specific candidate's email and name. This ensures that every test session is uniquely associated with a verified identity and prevents link sharing.
            </div>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Candidate Submissions</h2>
              <button 
                onClick={refreshResults} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                title="Refresh results"
              >
                🔄
              </button>
            </div>
            <button className="btn-primary" onClick={gradeAll}>🤖 Grade Ungraded Submissions</button>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Status</th>
                <th>Score</th>
                <th>Plagiarism</th>
                <th>Recommendation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No candidate submissions yet.</td></tr>
              )}
              {results.map((r) => {
                let displayStatus = r.status;
                if (displayStatus === 'active') {
                  const hoursSinceStart = (new Date() - new Date(r.createdAt)) / (1000 * 60 * 60);
                  if (hoursSinceStart > 4) displayStatus = 'expired';
                }

                return (
                <tr key={r._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.candidateName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.candidateEmail}</div>
                  </td>
                  <td>
                    <span className={`badge ${displayStatus==='graded'?'badge-green':(displayStatus==='terminated' || displayStatus==='expired')?'badge-red':'badge-orange'}`}>{displayStatus}</span>
                  </td>
                  <td>
                    {r.status === 'graded' ? (
                      <div style={{ fontWeight: 700, color: r.scores?.percentage >= 65 ? '#10b981' : '#f59e0b' }}>
                        {r.scores?.percentage}% <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({r.scores?.total}/{r.scores?.maxTotal})</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    {r.scores?.plagiarismFlag ? <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>🚩 {r.scores.plagiarismScore}% match</span> : r.status === 'graded' ? <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓ Clean</span> : '-'}
                  </td>
                  <td>
                    {r.scores?.recommendation ? (
                      <span className={`badge ${r.scores.recommendation==='strong_hire'?'badge-green':r.scores.recommendation==='hire'?'badge-cyan':r.scores.recommendation==='maybe'?'badge-orange':'badge-red'}`}>
                        {r.scores.recommendation.replace('_', ' ').toUpperCase()}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <Link href={`/results/${r._id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>View Detail →</Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </DashboardLayout>
  );
}
