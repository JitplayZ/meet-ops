import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (supabaseUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error);
        // User may be newly registered and trigger hasn't finished, provide fallback
        setProfile({
          uid: supabaseUser.id,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          email: supabaseUser.email || '',
          role: (supabaseUser.user_metadata?.role as UserRole) || 'user',
          createdAt: new Date(supabaseUser.created_at),
        });
      } else if (data) {
        setProfile({
          uid: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          createdAt: new Date(data.created_at),
        });
      }
    } catch (err) {
      console.warn('Failed to fetch user profile, falling back to default:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Mimic Firebase for UI compatibility where tests expect specific strings
      if (error.message.includes('Invalid login credentials')) {
        const err = new Error('auth/invalid-credential');
        (err as any).code = 'auth/invalid-credential';
        throw err;
      }
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'user') => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
          role: role,
        },
      },
    });
    if (error) throw error;
    
    // In Supabase with email confirmation disabled, it returns a session immediately.
    // If we have a session, simulate a profile load:
    if (data?.session && data?.user) {
      setProfile({
        uid: data.user.id,
        name,
        email,
        role,
        createdAt: new Date(),
      });
      setUser(data.user);
      return true;
    }
    
    // Return false if email confirmation is required (session is null)
    return false;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: redirectUrl,
    });
    if (error) {
      throw error; 
    }
    // Note: Supabase often won't error out even if email doesn't exist for security reasons.
    // However if there is a way to detect it, the UI catches error payloads and maps messages anyway.
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
