import { Link } from 'react-router-dom';
import { useState, type CSSProperties } from 'react';
import {
  Sparkles,
  Calendar,
  Shield,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  PlayCircle,
  Send,
} from 'lucide-react';

export default function Landing() {
  const [demoInput, setDemoInput] = useState('');
  const [demoMessages, setDemoMessages] = useState([
    { role: 'assistant', text: "👋 Hi! I'm your AI Meeting Booking Assistant. I can help you find rooms, check availability, book meetings, or show your bookings. How can I help you today?" },
    { role: 'user', text: "Find a room for 5 people tomorrow at 2 PM with a whiteboard." },
    { role: 'assistant', text: "I found 2 available rooms matching your criteria for tomorrow at 2:00 PM: Focus Room 202 (Cap: 8, Whiteboard) and Apollo (Cap: 12, Whiteboard). Would you like to book Focus Room 202?" }
  ]);

  // Interactive demo calendar state
  const DEMO_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const DEMO_MEETINGS = [
    { title: 'Board Review', room: 'Boardroom A', type: 'boardroom', floor: 'Executive Wing', day: 'Mon', time: '09:00 - 10:30', status: 'Approved' },
    { title: 'Team Sync', room: 'Boardroom B', type: 'boardroom', floor: 'HQ - Floor 12', day: 'Mon', time: '11:30 - 13:00', status: 'Approved' },
    { title: 'Design Huddle', room: 'Huddle 2A', type: 'huddle', floor: 'HQ - Floor 4', day: 'Tue', time: '10:00 - 10:30', status: 'Pending' },
    { title: '1:1 Check-in', room: 'Huddle 4B', type: 'huddle', floor: 'HQ - Floor 4', day: 'Wed', time: '14:00 - 14:30', status: 'Approved' },
    { title: 'Sprint Planning', room: 'Boardroom A', type: 'boardroom', floor: 'Executive Wing', day: 'Thu', time: '09:30 - 11:00', status: 'Approved' },
    { title: 'Standup', room: 'Huddle 2A', type: 'huddle', floor: 'HQ - Floor 4', day: 'Fri', time: '09:00 - 09:15', status: 'Pending' },
  ];
  const [demoRoomType, setDemoRoomType] = useState<'all' | 'boardroom' | 'huddle'>('all');
  const [demoDay, setDemoDay] = useState<string>('');

  const demoFilteredMeetings = DEMO_MEETINGS.filter(
    m => (demoRoomType === 'all' || m.type === demoRoomType) && (!demoDay || m.day === demoDay),
  );

  const demoChipStyle = (active: boolean): CSSProperties => ({
    height: 32,
    borderRadius: '4px',
    border: `1px solid ${active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.08)'}`,
    background: active ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
    color: active ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)',
    fontSize: '11px',
    fontWeight: active ? 700 : 500,
    padding: '0 10px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s',
  });

  const handleDemoSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoInput.trim()) return;
    setDemoMessages(prev => [
      ...prev,
      { role: 'user', text: demoInput },
      { role: 'assistant', text: `Got it! I will process "${demoInput}" for you. Sign up or log in to complete this action and manage actual bookings.` }
    ]);
    setDemoInput('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)', color: 'var(--color-on-surface)', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Radial Glow Gradient */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '1200px',
          height: '600px',
          background: 'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15) 0%, rgba(18, 19, 21, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Navigation Header */}
      <nav 
        className="glass-panel" 
        style={{ 
          position: 'fixed', 
          width: '100%', 
          zIndex: 50, 
          borderBottom: '1px solid var(--color-border-subtle)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--meetops-purple), #6D28D9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
              }}
            >
              <Sparkles size={16} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>
              MeetOps
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="#features" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--color-on-surface)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}>Features</a>
            <a href="#assistant" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--color-on-surface)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}>AI Assistant</a>
            <div style={{ width: 1, height: 16, background: 'var(--color-border-subtle)' }} />
            <Link to="/login" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)', textDecoration: 'none', fontWeight: 500 }} className="btn btn-ghost">
              Log In
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: '140px', paddingBottom: '80px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          
          {/* AI Capsule Tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              color: 'var(--meetops-purple)',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: 32,
              animation: 'fadeIn 0.5s ease-out',
            }}
          >
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--meetops-purple)', animation: 'pulse 1.5s infinite' }} />
            Introducing AI Meeting Assistant v2.0
          </div>

          <h1
            className="font-display-lg"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              color: 'var(--color-on-surface)',
              marginBottom: 24,
              lineHeight: 1.1,
              maxWidth: 900,
              margin: '0 auto 24px',
            }}
          >
            Schedule Rooms. <br />
            <span
              style={{
                background: 'linear-gradient(to right, #C4B5FD, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Eliminate Conflicts.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-on-surface-variant)',
              maxWidth: 640,
              margin: '0 auto 40px',
              lineHeight: 1.6,
            }}
          >
            The centralized operations platform that streamlines meeting schedules, prevents overlap, and gives your team full visibility into room availability with AI-powered assistance.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '12px 28px', borderRadius: 'var(--radius-full)', fontSize: '0.9375rem' }}>
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#demo" className="btn btn-secondary" style={{ padding: '12px 28px', borderRadius: 'var(--radius-full)', fontSize: '0.9375rem' }}>
              <PlayCircle size={16} /> View Demo
            </a>
          </div>

          {/* Premium Preview Dashboard Mockup */}
          <div
            id="demo"
            className="bento-card"
            style={{
              maxWidth: 960,
              margin: '0 auto',
              padding: '20px 24px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-container-highest)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                <Calendar size={14} color="var(--meetops-purple)" />
                Meeting Calendar Mockup
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 20 }}>
              {/* Interactive demo filter panel */}
              <div style={{ borderRight: '1px solid var(--color-border-subtle)', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-outline)', textTransform: 'uppercase', marginBottom: 2 }}>Room Type</span>
                <button type="button" aria-pressed={demoRoomType === 'all'} style={demoChipStyle(demoRoomType === 'all')} onClick={() => setDemoRoomType('all')}>
                  All Rooms
                </button>
                <button type="button" aria-pressed={demoRoomType === 'boardroom'} style={demoChipStyle(demoRoomType === 'boardroom')} onClick={() => setDemoRoomType('boardroom')}>
                  Boardroom (10+)
                </button>
                <button type="button" aria-pressed={demoRoomType === 'huddle'} style={demoChipStyle(demoRoomType === 'huddle')} onClick={() => setDemoRoomType('huddle')}>
                  Huddle Room (2-4)
                </button>
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-outline)', textTransform: 'uppercase', margin: '10px 0 2px' }}>Day</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {DEMO_DAYS.map(d => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={demoDay === d}
                      title={d}
                      style={{ ...demoChipStyle(demoDay === d), padding: 0, justifyContent: 'center', textAlign: 'center' }}
                      onClick={() => setDemoDay(prev => (prev === d ? '' : d))}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {(demoRoomType !== 'all' || demoDay) && (
                  <button
                    type="button"
                    style={{ ...demoChipStyle(false), color: 'var(--meetops-purple)', marginTop: 6, justifyContent: 'center' }}
                    onClick={() => { setDemoRoomType('all'); setDemoDay(''); }}
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {/* Demo meetings list, driven by the filters above */}
              <div style={{ minHeight: 200, position: 'relative', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                    {demoFilteredMeetings.length} meeting{demoFilteredMeetings.length === 1 ? '' : 's'}
                    {demoRoomType !== 'all' ? ` · ${demoRoomType}` : ' · all rooms'}
                    {demoDay ? ` · ${demoDay}` : ' · all days'}
                  </span>
                </div>
                {demoFilteredMeetings.length === 0 ? (
                  <div style={{ border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '32px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                    No meetings match the selected filters.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {demoFilteredMeetings.map(m => (
                      <div
                        key={`${m.title}-${m.day}`}
                        style={{
                          background: 'rgba(139, 92, 246, 0.10)',
                          borderLeft: '4px solid var(--meetops-purple)',
                          borderRadius: '0 8px 8px 0',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', display: 'block' }}>
                            {m.title} - {m.room}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                            {m.day} · {m.time} · {m.floor}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: m.status === 'Approved' ? 'rgba(137, 206, 255, 0.12)' : 'rgba(255, 184, 105, 0.15)',
                            color: m.status === 'Approved' ? 'var(--color-secondary)' : 'var(--color-tertiary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trusted By Monochrome Corporate Logo Grid */}
      <section style={{ padding: '40px 0', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-container-low)', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-outline)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>TRUSTED BY INNOVATIVE TEAMS WORLDWIDE</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '48px 64px', opacity: 0.5 }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={16} /> Acme Corp</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={16} /> Globex</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={16} /> Initech</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={16} /> Umbrella Corp</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ padding: '100px 0', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 60px' }}>
            <h2 className="font-headline-lg" style={{ fontSize: '2.25rem', color: 'var(--color-on-surface)', marginBottom: 16 }}>Everything You Need</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem' }}>
              Powerful tools to manage every aspect of meeting room management, designed for modern enterprise operations.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div className="bento-card" style={{ padding: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--meetops-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Calendar size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 12 }}>Smart Scheduling</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Schedule meeting rooms with real-time slot availability, instant booking permissions, and automatic conflict detection algorithms.
              </p>
            </div>

            <div className="bento-card" style={{ padding: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--meetops-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Shield size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 12 }}>Approval Workflows</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Route bookings through office administrators for approval. Control premium conference resources and priority slots easily.
              </p>
            </div>

            <div className="bento-card" style={{ padding: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--meetops-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <BarChart3 size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 12 }}>Usage Analytics</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Analyze room utilization rate, peak booking times, and capacity requirements. Maximize office space efficiency using real-time analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Feature section with Mock Chatbox */}
      <section id="assistant" style={{ padding: '100px 0', borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-container-low)', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: 'var(--meetops-purple)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: 24,
                }}
              >
                <Sparkles size={12} /> AI-Powered Operations
              </div>
              
              <h2 className="font-headline-lg" style={{ fontSize: '2.5rem', color: 'var(--color-on-surface)', marginBottom: 20 }}>
                Meet Your New Booking Assistant
              </h2>
              
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: 32 }}>
                Stop searching manually for available rooms. Just ask the AI Assistant in natural language, and it will compute availability, respect capacities, and book meetings instantly.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} color="var(--meetops-purple)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>Natural language processing for complex booking requests.</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} color="var(--meetops-purple)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>Context-aware suggestions based on previous layouts.</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} color="var(--meetops-purple)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>Conflict resolution and smart booking recommendations.</span>
                </div>
              </div>
            </div>

            {/* Simulated Chatbot Interface */}
            <div className="bento-card" style={{ height: 440, display: 'flex', flexDirection: 'column', background: 'var(--color-surface-container-highest)', boxShadow: 'var(--shadow-ambient)' }}>
              {/* Chat Header */}
              <div style={{ padding: '14px 20px', background: 'var(--meetops-purple)', display: 'flex', gap: 12, alignItems: 'center', color: 'white' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Meeting Assistant</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>AI booking support</div>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--color-surface-container-lowest)' }}>
                {demoMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.role === 'user' ? 'var(--meetops-purple)' : 'var(--color-surface-container-low)',
                      color: msg.role === 'user' ? 'white' : 'var(--color-on-surface)',
                      border: msg.role === 'assistant' ? '1px solid var(--color-border-subtle)' : 'none',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '0.8125rem',
                      maxWidth: '85%',
                      textAlign: 'left',
                      lineHeight: 1.4,
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleDemoSend} style={{ padding: 12, borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-container-highest)', display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Type booking request..."
                  value={demoInput}
                  onChange={e => setDemoInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--color-surface-container-low)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 16px',
                    fontSize: '0.8125rem',
                    color: 'white',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--meetops-purple)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section style={{ padding: '80px 0', background: 'var(--meetops-purple)', color: 'white', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, textAlign: 'center' }}>
            <div>
              <div className="font-display-lg" style={{ fontSize: '3rem', color: 'white', marginBottom: 8 }}>30%</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 500 }}>Time saved on scheduling</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <div className="font-display-lg" style={{ fontSize: '3rem', color: 'white', marginBottom: 8 }}>0</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 500 }}>Double-bookings</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <div className="font-display-lg" style={{ fontSize: '3rem', color: 'white', marginBottom: 8 }}>45%</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 500 }}>Increased room utilization</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <div className="font-display-lg" style={{ fontSize: '3rem', color: 'white', marginBottom: 8 }}>10k+</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 500 }}>Meetings managed daily</div>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section style={{ padding: '100px 0', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div 
            style={{ 
              background: 'linear-gradient(135deg, var(--meetops-purple) 0%, #6D28D9 100%)', 
              borderRadius: '24px', 
              padding: '60px 48px',
              boxShadow: '0 20px 50px rgba(139,92,246,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Ambient bubble decoration */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 240, height: 240, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(30px)', transform: 'translate(30%, -30%)' }} />

            <h2 className="font-headline-lg" style={{ fontSize: '2.5rem', color: 'white', marginBottom: 16 }}>Ready to streamline your meetings?</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.0625rem', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.6 }}>
              Start managing your office slots today – free to use, easy to set up. Join thousands of teams already using MeetOps.
            </p>
            <Link to="/register" className="btn btn-secondary" style={{ background: 'white', color: 'var(--meetops-purple)', border: 'none', padding: '14px 32px', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-full)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
              Get Started Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '48px 0', borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-container-highest)', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--meetops-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Sparkles size={14} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-on-surface)' }}>MeetOps</span>
            </div>
            
            <div style={{ display: 'flex', gap: 24 }}>
              <a href="#" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Terms</a>
              <a href="#" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-outline)' }}>
            © {new Date().getFullYear()} MeetOps. Built for hackathon demonstration. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
