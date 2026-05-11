'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.2,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.02 + 0.005,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    const meteors: {
      x: number; y: number; len: number; speed: number;
      alpha: number; active: boolean; timer: number;
    }[] = Array.from({ length: 8 }, (_, i) => ({
      x: 0, y: 0, len: Math.random() * 150 + 80,
      speed: Math.random() * 10 + 7,
      alpha: 0, active: false,
      timer: i * 60 + Math.random() * 120,
    }));

    function resetMeteor(m: typeof meteors[0]) {
  if (!canvas) return;
  m.x = Math.random() * canvas.width * 0.7;
  m.y = Math.random() * canvas.height * 0.4;
  m.alpha = 1;
  m.active = true;
  m.len = Math.random() * 150 + 80;
  m.speed = Math.random() * 10 + 7;
  m.timer = Math.random() * 400 + 200;
}

    let raf: number;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space background
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, '#000812');
      bg.addColorStop(0.5, '#010d20');
      bg.addColorStop(1, '#000510');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula 1 - blue
      const n1 = ctx.createRadialGradient(
        canvas.width * 0.25, canvas.height * 0.35, 0,
        canvas.width * 0.25, canvas.height * 0.35, 280
      );
      n1.addColorStop(0, 'rgba(20,60,140,0.22)');
      n1.addColorStop(0.5, 'rgba(10,30,80,0.1)');
      n1.addColorStop(1, 'transparent');
      ctx.fillStyle = n1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula 2 - purple
      const n2 = ctx.createRadialGradient(
        canvas.width * 0.75, canvas.height * 0.65, 0,
        canvas.width * 0.75, canvas.height * 0.65, 220
      );
      n2.addColorStop(0, 'rgba(70,20,100,0.18)');
      n2.addColorStop(1, 'transparent');
      ctx.fillStyle = n2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula 3 - subtle gold hint
      const n3 = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.5, 0,
        canvas.width * 0.5, canvas.height * 0.5, 350
      );
      n3.addColorStop(0, 'rgba(180,130,0,0.04)');
      n3.addColorStop(1, 'transparent');
      ctx.fillStyle = n3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      stars.forEach(s => {
        s.alpha += s.speed * s.dir;
        if (s.alpha >= 1) { s.alpha = 1; s.dir = -1; }
        if (s.alpha <= 0.1) { s.alpha = 0.1; s.dir = 1; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      });

      // Meteors
      meteors.forEach(m => {
        if (!m.active) {
          m.timer--;
          if (m.timer <= 0) resetMeteor(m);
          return;
        }
        m.x += m.speed;
        m.y += m.speed * 0.45;
        m.alpha -= 0.015;
        if (m.alpha <= 0 || m.x > canvas.width + 100 || m.y > canvas.height + 100) {
          m.active = false;
          m.timer = Math.random() * 400 + 150;
          return;
        }
        const tail = ctx.createLinearGradient(
          m.x - m.len, m.y - m.len * 0.45,
          m.x, m.y
        );
        tail.addColorStop(0, 'transparent');
        tail.addColorStop(0.6, `rgba(160,200,255,${m.alpha * 0.3})`);
        tail.addColorStop(1, `rgba(255,255,255,${m.alpha})`);
        ctx.beginPath();
        ctx.moveTo(m.x - m.len, m.y - m.len * 0.45);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Head glow
        const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
        glow.addColorStop(0, `rgba(255,255,255,${m.alpha})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      toast({ title: 'Welcome back!', variant: 'success' });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password');
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: 'var(--font-sans)' }}>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-input {
          width: 100%;
          height: 48px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 0 16px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: all 0.25s;
          box-sizing: border-box;
          backdrop-filter: blur(4px);
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.2); }
        .auth-input:focus {
          border-color: rgba(234,163,0,0.5);
          background: rgba(255,255,255,0.09);
          box-shadow: 0 0 0 3px rgba(234,163,0,0.08);
        }
        .auth-submit {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #F5C400 0%, #e6b800 100%);
          color: #060e1c;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.08em;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .auth-submit:hover {
          background: linear-gradient(135deg, #f5b800 0%, #d99200 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(234,163,0,0.35);
        }
        .auth-submit:active { transform: translateY(0); }
        .auth-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
      `}</style>

      {/* Full screen canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>

        {/* Glass card */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(5,14,35,0.55)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '44px 40px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'fadeUp 0.7s ease both',
        }}>

          {/* Logo */}
          <div style={{ marginBottom: '36px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '6px' }}>
              <span style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '20px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>OUTERSPACE</span>
              <span style={{
                color: '#F5C400',
                fontWeight: 800,
                fontSize: '20px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginLeft: '6px',
              }}>DIGITAL</span>
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: 0,
            }}>Project Management</p>
          </div>

          {/* Heading */}
          <h1 style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 700,
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>Sign in</h1>
          <p style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '13px',
            margin: '0 0 28px',
          }}>Welcome back to your workspace</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@outerspace.dev"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(220,50,50,0.1)',
                border: '1px solid rgba(220,50,50,0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#ff7070',
                fontSize: '13px',
              }}>{error}</div>
            )}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontSize: '13px',
            marginTop: '24px',
            marginBottom: 0,
          }}>
            No account?{' '}
            <Link href="/auth/register" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>

        {/* Bottom tagline */}
        <p style={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginTop: '28px',
          textAlign: 'center',
        }}>
          Let's Talk Digital. No Spacesuits Required.
        </p>
      </div>
    </div>
  );
}