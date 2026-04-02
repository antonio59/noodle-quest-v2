import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { AVATARS } from '@/lib/avatars';

export function Auth({ onBack }: { onBack: () => void }) {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [avatar, setAvatar] = useState(AVATARS[0]);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || !pin.trim()) { setError('Fill in both fields!'); return; }
    setLoading(true);
    const err = isSignup ? await signup(name.trim(), pin, avatar) : await login(name.trim(), pin);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center p-4">
        <button onClick={onBack} className="text-text-muted hover:text-text p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-5xl mb-4">🍜</div>
        <h2 className="text-2xl font-bold mb-1">{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-text-muted text-sm mb-6">
          {isSignup ? 'Pick an avatar and choose a name' : 'Enter your name and PIN'}
        </p>

        {isSignup && (
          <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-[280px]">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`text-2xl p-1.5 rounded-lg transition-all ${
                  avatar === a ? 'bg-accent-soft ring-2 ring-accent scale-110' : 'opacity-50 hover:opacity-80'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-card rounded-xl px-4 py-3 text-text placeholder-text-muted border border-transparent focus:border-accent outline-none"
            maxLength={20}
            autoFocus
          />
          <input
            type="password"
            placeholder="PIN (6-8 digits)"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="w-full bg-card rounded-xl px-4 py-3 text-text placeholder-text-muted border border-transparent focus:border-accent outline-none"
            maxLength={8}
            inputMode="numeric"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          {error && <p className="text-danger text-sm text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-accent text-bg font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-95"
          >
            {loading ? '...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>

          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            className="w-full text-text-muted text-sm hover:text-accent transition-colors"
          >
            {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
