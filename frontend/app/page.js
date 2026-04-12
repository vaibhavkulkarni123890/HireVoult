'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

function StarDisplay({ rating, size = 20 }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= full ? '#f59e0b' : (i === full + 1 && half ? '#f59e0b' : '#374151'), opacity: i === full + 1 && half ? 0.6 : 1 }}>★</span>
      ))}
    </span>
  );
}

const features = [
  { icon: '🤖', title: 'AI Question Generation', desc: 'Our advanced AI crafts personalized MCQ, coding challenges, and theory questions tailored to your exact JD, salary band, and required skills.' },
  { icon: '🛡️', title: 'Real-Time Proctoring', desc: 'Fullscreen enforcement, tab-switch detection, screen-share blocking, and periodic snapshots keep your assessment secure.' },
  { icon: '⚡', title: 'Sandboxed Code Execution', desc: 'HackerRank-style Monaco editor with JavaScript and Python support. Code runs in an isolated VM2 sandbox with visible and hidden test cases. Additional languages available on paid plans.' },
  { icon: '🎯', title: 'Logic Depth Score', desc: "After coding, our AI reads each candidate's specific solution and generates personalized follow-up questions about their logic choices. Trap questions detect AI-generated code. Theory answers are evaluated on depth and accuracy. Everything synthesizes into a Logic Depth Score and a final Hire / No-Hire recommendation." },
  { icon: '🔗', title: 'Personalized Tokens', desc: 'Generate unique, single-use tokens per candidate — with pre-filled identity that cannot be changed. Prevents link sharing and ensures integrity.' },
  { icon: '📊', title: 'Plagiarism Detection', desc: 'Code and text similarity analysis across all candidates for the same role, with percentage-based flagging.' },
];

const steps = [
  { n: '01', title: 'Post a Role', desc: 'Add your JD, salary, experience requirements, and select question types and difficulty.' },
  { n: '02', title: 'AI Generates Questions', desc: 'Our agent creates a tailored question bank — approve, edit, or regenerate with one click.' },
  { n: '03', title: 'Share Assessment Links', desc: 'Get a unique URL to share with candidates. Choose scheduled, immediate, or open-window delivery.' },
  { n: '04', title: 'Candidates Test in Secure Environment', desc: 'Full-screen proctored experience with Monaco IDE — tabs, screen share, and copy all blocked.' },
  { n: '05', title: 'AI Interrogates & Scores', desc: 'After coding, our AI reads each candidate\'s specific solution and asks follow-up questions about their logic choices. A Logic Depth Score is generated — proving genuine understanding, not just test case luck. You receive ranked candidates with hire/no-hire recommendations.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ratings, setRatings] = useState(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/feedback/aggregate`)
      .then(r => r.json())
      .then(data => setRatings(data))
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      {/* Nav */}
      <nav className="primary-nav" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'white' }}>H</div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Hirevoult</span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }} className="hidden-mobile">
          <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='var(--text-muted)'}>Features</a>
          <a href="#how" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='var(--text-muted)'}>How It Works</a>
          <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='var(--text-muted)'}>Sign In</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.875rem' }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', textAlign: 'center', padding: '120px 24px 80px', overflow: 'hidden' }}>
        <div className="hero-glow" />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
          <span style={{ fontSize: 12, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', borderRadius: 10, padding: '2px 8px', color: 'white', fontWeight: 700 }}>NEW</span>
          <span style={{ fontSize: '0.85rem', color: '#a78bfa' }}>First assessment is completely free</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24, maxWidth: 900, margin: '0 auto 24px' }}>
          Hire Engineers Who Can{' '}
          <span className="gradient-text">Actually Code</span>
        </h1>
        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: 600, margin: '24px auto 40px', lineHeight: 1.7 }}>
          Hirevoult goes beyond coding tests. Our AI interrogates candidates about their own solutions — detecting ChatGPT-generated code, hardcoded answers, and genuine engineering skill. Post a role, share a secure link, get candidates ranked by Logic Depth Score in hours.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
            Start Hiring for Free →
          </Link>
          <a href="#how" className="btn-secondary" style={{ fontSize: '1rem', padding: '14px 32px' }}>See How It Works</a>
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', marginTop: 72, flexWrap: 'wrap' }}>
          {[['AI-Generated', 'Personalized per JD'],['< 5 min', 'Question set ready'],['Zero Bias', 'Skills-only scoring']].map(([v, l]) => (
            <div key={v} style={{ textAlign: 'center' }}>
              <div className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>{v}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>Everything You Need to Hire <span className="gradient-text">Smarter</span></h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '1.05rem' }}>From JD to ranked candidates — one platform, end to end.</p>
        </div>
        <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="glass-card" style={{ padding: 28, transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 50px rgba(124,58,237,0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
              <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>From <span className="gradient-text">JD to Ranked Candidates</span> in 5 Steps</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', position: 'relative', paddingBottom: i < steps.length - 1 ? 40 : 0 }}>
              {i < steps.length - 1 && <div style={{ position: 'absolute', left: 24, top: 56, bottom: 0, width: 2, background: 'linear-gradient(180deg,rgba(124,58,237,0.5),transparent)' }} />}
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'white', flexShrink: 0 }}>{s.n}</div>
              <div style={{ paddingTop: 6 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>{s.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '80px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 60, maxWidth: 800, margin: '0 auto 60px' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Simple, <span className="gradient-text">Flat Pricing</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>One price for every role. No tiers. No surprises.</p>
        </div>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: 40, position: 'relative', border: '1px solid #7c3aed', boxShadow: '0 20px 40px rgba(124,58,237,0.15)', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 16px', borderRadius: '0 0 8px 8px', letterSpacing: '0.05em' }}>EVERYTHING INCLUDED</div>
              <div style={{ fontSize: '3rem', marginBottom: 20 }}>👑</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>Standard Assessment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>₹499 <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ assessment</span></div>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 600 }}>$6 / assessment (International)</div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                <li>✓ AI-Generated Questions tailored to your JD</li>
                <li>✓ Logic Verification + Logic Depth Score</li>
                <li>✓ Full Proctoring Engine (Fullscreen, Camera, Anti-cheat)</li>
                <li>✓ Sandboxed Code Execution (JavaScript & Python)</li>
                <li>✓ AI Grading with Hire / No-Hire Recommendation</li>
                <li>✓ Identity Verification + Periodic Snapshots</li>
                <li>✓ Plagiarism Detection across candidates</li>
                <li>✓ Personalized Candidate Tokens</li>
              </ul>
              <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, marginBottom: 20 }}>First batch completely free — no credit card required.</div>
              <Link href="/register" className="btn-primary" style={{ width: '100%', display: 'block', padding: '16px' }}>Start Hiring Now →</Link>
            </div>
            
            <div style={{ marginTop: 32, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>
                <strong>Note:</strong> Paid assessments support JavaScript, Python, and additional languages. Free assessments support JavaScript and Python only.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8 }}>Free Assessment (First Batch):</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>✓ Up to 10 candidates</li>
                    <li>✓ JavaScript & Python</li>
                    <li>✓ All core features included</li>
                    <li>✓ No credit card required</li>
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8 }}>Paid Assessments (₹499/candidate):</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>✓ Unlimited candidates</li>
                    <li>✓ JS, Python + more languages</li>
                    <li>✓ Priority AI processing</li>
                    <li>✓ Full results dashboard</li>
                  </ul>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Bulk Pricing Section */}
      <section id="bulk" style={{ padding: '80px 24px', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Hiring at Scale? <span className="gradient-text">Volume Discounts</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 40 }}>
            For organizations running large-scale hiring drives, Hirevoult offers significant volume discounts.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 48, maxWidth: 800, margin: '0 auto 48px' }}>
            {[
              { tier: '500 - 999', off: '15% off', price: '₹424' },
              { tier: '1,000 - 4,999', off: '25% off', price: '₹374' },
              { tier: '5,000+', off: '50% off', price: '₹249', highlight: true },
            ].map((b, i) => (
              <div key={i} className="glass-card" style={{ padding: 24, border: b.highlight ? '1px solid #10b981' : '1px solid var(--border)', background: b.highlight ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{b.tier} / month</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: b.highlight ? '#10b981' : '#fff', marginBottom: 4 }}>{b.off}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: b.highlight ? '#10b981' : 'var(--text-muted)' }}>{b.price}/assessment</div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 32, border: '1px dashed #10b981', maxWidth: 500, margin: '0 auto 40px', background: 'rgba(16,185,129,0.02)' }}>
             <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
               Example: "5,000 assessments at ₹249 = ₹12,45,000/month — <strong style={{ color: '#10b981' }}>Save ₹12,55,000</strong>"
             </div>
          </div>

          <a href="mailto:support@hirevoult.com" style={{ display: 'inline-block', background: '#10b981', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
            Contact Us for Bulk Pricing →
          </a>
        </div>
      </section>

      {/* Reviews Section — only shown after 3+ approved reviews */}
      {ratings?.hasEnoughReviews && (
        <section id="reviews" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>Trusted by <span className="gradient-text">Real Teams</span></h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '1.05rem' }}>Based on verifiable reviews from hiring companies and candidates.</p>
          </div>

          {/* Aggregate Rating */}
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 48 }}>
            <div>
              <div style={{ fontSize: '4rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{ratings.aggregateRating.toFixed(1)}</div>
              <StarDisplay rating={ratings.aggregateRating} size={24} />
              <div style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem' }}>Based on {ratings.totalReviews} reviews</div>
            </div>
            <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{ratings.companyReviews}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Companies</div>
                <StarDisplay rating={ratings.companyAvgRating || 0} size={14} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{ratings.candidateReviews}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Candidates</div>
                <StarDisplay rating={ratings.candidateAvgRating || 0} size={14} />
              </div>
            </div>
          </div>

          {/* Testimonials */}
          {ratings.testimonials?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {ratings.testimonials.map((t, i) => (
                <div key={i} className="glass-card" style={{ padding: 28 }}
                  onMouseOver={e => { e.currentTarget.style.transform='translateY(-4px)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform=''; }}>
                  <StarDisplay rating={t.rating} size={16} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: '12px 0', fontStyle: 'italic' }}>&ldquo;{t.comment}&rdquo;</p>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: t.type === 'company' ? '#a78bfa' : '#06b6d4' }}>
                    {t.type === 'company' ? '🏢' : '👤'} {t.displayName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="gradient-border" style={{ maxWidth: 700, margin: '0 auto', padding: 60 }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>Ready to hire on merit?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '1rem' }}>Your first role's assessment is completely free. No credit card required.</p>
          <Link href="/register" className="btn-primary" style={{ fontSize: '1rem', padding: '14px 40px' }}>Create Free Account →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        © 2026 Hirevoult · AI-Powered Technical Hiring · <Link href="/login" style={{ color: '#a78bfa', textDecoration: 'none' }}>Company Login</Link>
      </footer>
    </div>
  );
}
