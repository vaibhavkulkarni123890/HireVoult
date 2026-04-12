'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import DashboardLayout from '../../dashboard/layout';

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go', 'rust'];

const SENIORITY_TIERS = [
  { key: 'junior', label: 'Junior',       range: '0-2 years',  inr: 499,  usd: 6  },
  { key: 'mid',    label: 'Mid Level',    range: '3-5 years',  inr: 499,  usd: 6  },
  { key: 'senior', label: 'Senior',       range: '6-8 years',  inr: 499,  usd: 6  },
  { key: 'lead',   label: 'Lead / Principal', range: '8+ years', inr: 499, usd: 6  },
];

function getSeniorityInfo(experienceYears) {
  const yrs = Number(experienceYears) || 0;
  if (yrs >= 8) return SENIORITY_TIERS[3];
  if (yrs >= 6) return SENIORITY_TIERS[2];
  if (yrs >= 3) return SENIORITY_TIERS[1];
  return SENIORITY_TIERS[0];
}

export default function NewRolePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [isFreeTier, setIsFreeTier] = useState(false);
  const [form, setForm] = useState({
    title: '', jd: '', about: '',
    candidateLimit: 50,
    salary: { min: '', max: '', currency: 'INR' },
    experienceYears: 0, skills: '',
    scheduleStartDate: '',
    scheduleEndDate: '',
    enableMCQ: true,
    questionConfig: { 
      mcq: { count: 4, difficulty: 'medium' }, 
      coding: { 
        count: 3, 
        questions: [
          { difficulty: 'medium' },
          { difficulty: 'medium' },
          { difficulty: 'medium' }
        ] 
      }, 
      languages: ['javascript','python'] 
    }
  });

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        if (!res.data.company.freeBatchUsed) {
          setIsFreeTier(true);
          setForm(f => ({ ...f, candidateLimit: Math.min(10, f.candidateLimit) })); 
        }
      }).catch(() => {});
  }, []);

  const toggleLang = (lang) => {
    const langs = form.questionConfig.languages;
    setForm({ ...form, questionConfig: { ...form.questionConfig, languages: langs.includes(lang) ? langs.filter(l => l !== lang) : [...langs, lang] } });
  };

  const handleCreateAndGenerate = async () => {
    if (form.title.trim().length < 5) return toast.error('Role title must be at least 5 characters');
    if (form.jd.trim().length < 100) return toast.error('Job Description must be at least 100 characters');
    if (form.skills.trim().length < 10) return toast.error('Please provide at least 10 characters for skills');
    setLoading(true);
    setGeneratingQuestions(true);
    try {
      const isHighSalary = (form.salary.currency === 'INR' && Number(form.salary.max) >= 1000000) || 
                           (form.salary.currency === 'USD' && Number(form.salary.max) >= 15000);

      const roleData = { 
        ...form, 
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean), 
        salary: { min: Number(form.salary.min), max: Number(form.salary.max), currency: form.salary.currency } 
      };

      // If MCQs are disabled, set count to 0
      if (!form.enableMCQ) {
        roleData.questionConfig.mcq.count = 0;
      }

      // If standard salary, reset difficulties to let Agent decide
      if (!isHighSalary) {
        roleData.questionConfig.coding.questions = roleData.questionConfig.coding.questions.map(q => ({ ...q, difficulty: 'auto' }));
      }
      
      const { data } = await api.post('/agent/create-role', roleData);
      toast.success(`Role created & ✨ ${data.questions.length} questions generated!`);
      router.push(`/roles/${data.role._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create role and generate questions');
    } finally {
      setLoading(false);
      setGeneratingQuestions(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 780 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Create New Role</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Fill in the role details and our AI agent will generate a personalized assessment.</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {['Role Details', 'Question Config', 'Review & Generate'].map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setStep(i + 1)}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: step > i ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'var(--bg-card-2)', border: step === i+1 ? '2px solid #7c3aed' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, color: step > i ? 'white' : 'var(--text-muted)' }}>{step > i+1 ? '✓' : i+1}</div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: step === i+1 ? 'white' : 'var(--text-muted)', display: typeof window !== 'undefined' && window.innerWidth < 600 ? 'none' : 'block' }}>{s}</span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: step > i+1 ? '#7c3aed' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Role Details</h2>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Job Title *</label>
                <input className="input-field" placeholder="e.g. Senior Backend Engineer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>About Company / Product Context * <span style={{ fontWeight: 400 }}>(e.g. "We are a FinTech startup building high-frequency systems...")</span></label>
                <textarea className="input-field" rows={3} placeholder="Provide 1-2 paragraphs about your company, the team, and what this role will actually build. This helps the AI generate extremely targeted questions." value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} style={{ minHeight: 100 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Job Description * <span style={{ fontWeight: 400 }}>(the AI uses this to generate questions)</span></label>
                <textarea className="input-field" rows={8} placeholder="Paste the full job description here. Include responsibilities, requirements, and tech stack..." value={form.jd} onChange={e => setForm({ ...form, jd: e.target.value })} style={{ minHeight: 200 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Number of Candidates {isFreeTier ? '' : '(Min 50)'} *</label>
                    {isFreeTier && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, padding: '2px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: 10 }}>First Batch Capped at 10 (Free)</span>}
                  </div>
                  <input className="input-field" type="number" min={isFreeTier ? 10 : 50} max={isFreeTier ? 10 : undefined} disabled={isFreeTier} value={form.candidateLimit} onChange={e => setForm({ ...form, candidateLimit: Math.max(isFreeTier ? 10 : 50, Number(e.target.value)) })} />
                  {isFreeTier && (
                    <div style={{
                      marginTop: 14,
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid #f59e0b55',
                      borderRadius: 10,
                      padding: '14px 18px',
                      marginBottom: 4
                    }}>
                      <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 6, fontSize: '1rem' }}>Note: Free Assessment Limit</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 2 }}>
                        Each company gets <strong style={{ color: '#fff' }}>1 free assessment</strong>.
                      </div>
                      <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.93rem', marginBottom: 2 }}>
                        Only <span style={{ color: '#fff', fontWeight: 700 }}>JavaScript</span> & <span style={{ color: '#fff', fontWeight: 700 }}>Python</span> languages are available for students to choose in free assessments.
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.93rem' }}>
                        To create more, please upgrade to a paid plan.
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Experience Required (years)</label>
                  <input className="input-field" type="number" min={0} max={20} value={form.experienceYears} onChange={e => setForm({ ...form, experienceYears: Number(e.target.value) })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Salary Range (Annual)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-field" type="number" placeholder="Min" value={form.salary.min} onChange={e => setForm({ ...form, salary: { ...form.salary, min: e.target.value } })} />
                    <input className="input-field" type="number" placeholder="Max" value={form.salary.max} onChange={e => setForm({ ...form, salary: { ...form.salary, max: e.target.value } })} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Currency</label>
                  <select className="input-field" value={form.salary.currency} onChange={e => setForm({ ...form, salary: { ...form.salary, currency: e.target.value } })}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Assessment Window Start (Optional)</label>
                  <input 
                    className="input-field" 
                    type="datetime-local" 
                    min={new Date().toISOString().slice(0, 16)}
                    value={form.scheduleStartDate} 
                    onChange={e => setForm({ ...form, scheduleStartDate: e.target.value })} 
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Candidates can only start after this time</div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Assessment Window End (Optional)</label>
                  <input 
                    className="input-field" 
                    type="datetime-local" 
                    min={form.scheduleStartDate || new Date().toISOString().slice(0, 16)}
                    value={form.scheduleEndDate} 
                    onChange={e => setForm({ ...form, scheduleEndDate: e.target.value })} 
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>The link will expire after this time</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Key Skills (comma-separated)</label>
                  <input className="input-field" placeholder="React, Node.js, MongoDB..." value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
                </div>
              </div>
              <button className="btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => { 
                if (form.title.trim().length < 5) return toast.error('Role title must be at least 5 characters');
                if (form.about.trim().length < 50) return toast.error('Company/Role Background must be at least 50 characters');
                if (form.jd.trim().length < 100) return toast.error('Job Description must be at least 100 characters (currently ' + form.jd.length + ') to get accurate results');
                if (form.skills.trim().length < 10) return toast.error('Please provide at least 2 key skills or 10 characters');
                setStep(2); 
              }}>Next: Question Config →</button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Question Configuration</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--bg-card-2)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>MCQ Questions</div>
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, enableMCQ: !form.enableMCQ })}
                      style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 6, border: 'none', background: form.enableMCQ ? 'rgba(124,58,237,0.2)' : '#333', color: form.enableMCQ ? '#a78bfa' : '#888', cursor: 'pointer' }}
                    >
                      {form.enableMCQ ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  
                  {form.enableMCQ && (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 120 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Count (4-15)</label>
                        <input 
                          className="input-field" 
                          type="number" 
                          min={4} max={15} 
                          value={form.questionConfig.mcq.count} 
                          onChange={e => setForm({ 
                            ...form, 
                            questionConfig: { 
                              ...form.questionConfig, 
                              mcq: { ...form.questionConfig.mcq, count: Math.max(4, Math.min(15, Number(e.target.value))) } 
                            } 
                          })} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Difficulty</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['medium','hard'].map(d => (
                            <button key={d} type="button" onClick={() => setForm({ ...form, questionConfig: { ...form.questionConfig, mcq: { ...form.questionConfig.mcq, difficulty: d } } })} style={{ flex: 1, padding: '8px', borderRadius: 8, border: form.questionConfig.mcq.difficulty === d ? '1px solid #7c3aed' : '1px solid var(--border)', background: form.questionConfig.mcq.difficulty === d ? 'rgba(124,58,237,0.15)' : 'transparent', color: form.questionConfig.mcq.difficulty === d ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize', transition: 'all 0.15s' }}>{d}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--bg-card-2)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 600 }}>Coding Problems</div>
                    <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
                      {[1, 2, 3].map(n => (
                        <button key={n} type="button" onClick={() => {
                          const currentQs = form.questionConfig.coding.questions || [];
                          let nextQs = [...currentQs];
                          if (n > currentQs.length) {
                             for(let i=currentQs.length; i<n; i++) nextQs.push({ difficulty: 'medium' });
                          } else {
                             nextQs = nextQs.slice(0, n);
                          }
                          setForm({ ...form, questionConfig: { ...form.questionConfig, coding: { count: n, questions: nextQs } } });
                        }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: form.questionConfig.coding.count === n ? '#7c3aed' : 'transparent', color: form.questionConfig.coding.count === n ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{n} {n === 1 ? 'Prob' : 'Probs'}</button>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(form.questionConfig.coding.questions || []).map((q, idx) => {
                      const isHighSalary = (form.salary.currency === 'INR' && Number(form.salary.max) >= 1000000) || 
                                           (form.salary.currency === 'USD' && Number(form.salary.max) >= 15000);
                      
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', width: 80 }}>Prob #{idx + 1}</div>
                          
                          {isHighSalary ? (
                            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                              {['medium','hard'].map(d => (
                                <button key={d} type="button" onClick={() => {
                                  const nextQs = [...form.questionConfig.coding.questions];
                                  nextQs[idx] = { ...nextQs[idx], difficulty: d };
                                  setForm({ ...form, questionConfig: { ...form.questionConfig, coding: { ...form.questionConfig.coding, questions: nextQs } } });
                                }} style={{ flex: 1, padding: '6px', borderRadius: 6, border: q.difficulty === d ? '1px solid #7c3aed' : '1px solid var(--border)', background: q.difficulty === d ? 'rgba(124,58,237,0.15)' : 'transparent', color: q.difficulty === d ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textTransform: 'capitalize' }}>{d}</button>
                              ))}
                            </div>
                          ) : (
                            <div style={{ flex: 1, fontSize: '0.8rem', color: '#06b6d4', fontWeight: 600, fontStyle: 'italic' }}>
                              Difficulty decided by Agent based on JD
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Info block for Section 3 */}
                <div style={{ background: 'rgba(6,182,212,0.05)', padding: '16px 20px', borderRadius: 12, border: '1px dashed rgba(6,182,212,0.3)', display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>🧠</span>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#06b6d4', marginBottom: 4 }}>Logic Verification (AI Generated)</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Theory questions are now automatically generated <strong>during the test</strong> based on the candidate's actual code submissions to verify their logic.</p>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 10, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Programming Languages</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {LANGUAGES.map(lang => (
                    <button key={lang} type="button" onClick={() => toggleLang(lang)} style={{ padding: '6px 14px', borderRadius: 8, border: form.questionConfig.languages.includes(lang) ? '1.5px solid #7c3aed' : '1px solid var(--border)', background: form.questionConfig.languages.includes(lang) ? 'rgba(124,58,237,0.15)' : 'transparent', color: form.questionConfig.languages.includes(lang) ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', transition: 'all 0.15s' }}>
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(3)}>Next: Review →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.9rem' }}>
                  {[['Role', form.title],['Candidates', `${form.candidateLimit}`],['Experience', `${form.experienceYears} years`],['Salary', `${form.salary.min||'?'}–${form.salary.max||'?'} ${form.salary.currency}`],['MCQ', `${form.questionConfig.mcq.count} (${form.questionConfig.mcq.difficulty})`],['Coding', `${form.questionConfig.coding.count} problems`]].map(([k,v]) => (
                    <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}: </span><span style={{ fontWeight: 600 }}>{v}</span></div>
                  ))}
                  {form.scheduleStartDate && <div><span style={{ color: 'var(--text-muted)' }}>Starts: </span><span style={{ fontWeight: 600 }}>{new Date(form.scheduleStartDate).toLocaleString()}</span></div>}
                  {form.scheduleEndDate && <div><span style={{ color: 'var(--text-muted)' }}>Ends: </span><span style={{ fontWeight: 600 }}>{new Date(form.scheduleEndDate).toLocaleString()}</span></div>}
                </div>
              </div>

              {/* Pricing Box */}
              <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.1))', padding: 24, borderRadius: 16, border: '1px solid rgba(124,58,237,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Estimated Investment</h3>
                    <div style={{ padding: '4px 12px', background: '#7c3aed', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>PAY-AS-YOU-GO</div>
                </div>
              {(() => {
                const tier = getSeniorityInfo(form.experienceYears);
                const count = form.candidateLimit;
                const totalINR = tier.inr * count;
                const totalUSD = tier.usd * count;
                return (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>BATCH SUMMARY</div>
                    {isFreeTier ? (
                      <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: '3rem' }}>🎁</div>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginBottom: 4 }}>First Batch is 100% Free</div>
                      <div style={{ color: '#a7f3d0', fontSize: '0.9rem', lineHeight: 1.5 }}>Because this is your first role, Hirevoult is complimenting your first batch. Limit is aggressively locked at 10 candidates.</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {[['Role', form.title || '—'],['Seniority', `${tier.label} (${tier.range})`],['Price per assessment', `₹${tier.inr}  /  $${tier.usd}`],['Candidates in batch', `${count}`]].map(([k,v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                          <span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border)', marginTop: 4 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                        <span>Total</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <span style={{ color: '#a78bfa' }}>₹{totalINR.toLocaleString()}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>${totalUSD}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
          {generatingQuestions && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 600 }}>AI is generating your questions...</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 8 }}>This takes ~40 seconds to 2 minute. Do not close the page.</div>
            </div>
          )}
          {!generatingQuestions && (
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: 16, fontSize: '0.875rem' }}>
              <strong>🤖 What happens next:</strong> Our AI Agent will generate {form.questionConfig.mcq.count + form.questionConfig.coding.count} core questions. Logic verification theory will be generated dynamically for each candidate.
            </div>
          )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setStep(2)} disabled={loading}>← Back</button>
                <button className="btn-primary" onClick={handleCreateAndGenerate} disabled={loading || generatingQuestions}>
                  {loading ? '⏳ Generating...' : '✨ Create & Generate Questions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
