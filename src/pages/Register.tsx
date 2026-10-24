import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setAuthError('');
      setSuccessMessage('');
      const autoLogin = await signUp(data.name, data.email, data.password);
      
      if (autoLogin) {
        navigate('/dashboard');
      } else {
        setSuccessMessage('Registration successful! Please check your email inbox to verify your account.');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('already in use') || err.message?.includes('rate limit')) {
        setAuthError(err.message || 'Email already in use or rate limit exceeded.');
      } else {
        setAuthError('Registration failed. ' + err.message);
      }
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0B0F19, #080B14)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: 40,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                marginBottom: 16,
              }}
            >
              <Sparkles size={24} />
            </div>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-neutral-900)' }}>
            Create an account
          </h1>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.875rem', marginTop: 6 }}>
            Get started with MeetOps for free
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-50)',
              color: 'var(--color-error-700)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--color-error-200)',
              marginBottom: 20,
            }}
          >
            {authError}
          </div>
        )}

        {successMessage && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-50)',
              color: 'var(--color-success-700)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--color-success-200)',
              marginBottom: 20,
            }}
          >
            <Sparkles size={18} />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="name" className="label">Full Name</label>
            <input
              id="name"
              type="text"
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="John Doe"
              {...register('name')}
            />
            {errors.name && <p className="error-message" role="alert">{errors.name.message}</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@company.com"
              {...register('email')}
            />
            {errors.email && <p className="error-message" role="alert">{errors.email.message}</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password" className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                style={{ paddingRight: 42 }}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-400)',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="error-message" role="alert">{errors.password.message}</p>}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label htmlFor="confirmPassword" className="label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="error-message" role="alert">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '12px 20px' }}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: '0.875rem',
            color: 'var(--color-neutral-500)',
          }}
        >
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary-600)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
