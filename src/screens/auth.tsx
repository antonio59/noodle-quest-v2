import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Lock, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PIN_LENGTH = 6;
const PROFILE_COLORS = [
  'from-yellow-400 to-orange-500',
  'from-blue-400 to-purple-500',
  'from-green-400 to-emerald-500',
  'from-pink-400 to-rose-500',
  'from-cyan-400 to-teal-500',
  'from-indigo-400 to-violet-500',
];

interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export function Auth() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('🦊');
  const [signupPin, setSignupPin] = useState('');
  const [signupPinConfirm, setSignupPinConfirm] = useState('');

  const AVATARS = ['🦊','🐱','🐶','🦁','🐼','🐨','🦄','🐸','🐙','🦋','🐢','🦖','🐧','🦜','🐝'];

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({ path: 'auth:getAllPlayers', format: 'convex_encoded_json', args: {} }),
      });
      const data = await res.json();
      if (data.value) {
        const mapped = data.value.map((p: { id: string; name: string; avatar: string }, i: number) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: PROFILE_COLORS[i % PROFILE_COLORS.length],
        }));
        setProfiles(mapped);
        if (mapped.length === 0) setShowSignup(true);
      }
    } catch (e) { console.error('Failed to fetch players:', e); /* offline fallback */ }
  };

  const handlePinPress = async (num: string) => {
    if (pin.length >= PIN_LENGTH || !selectedProfile || loading) return;
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      const err = await login(selectedProfile.name, newPin);
      setLoading(false);
      if (err) {
        setError('Incorrect passcode. Try again!');
        setPin('');
        setTimeout(() => setError(''), 2000);
      } else {
        navigate('/');
      }
    }
  };

  const handleBackspace = () => setPin(pin.slice(0, -1));

  const handleBack = () => {
    setSelectedProfile(null);
    setPin('');
    setError('');
  };

  const handleSignup = async () => {
    if (!signupName.trim()) { setError('Enter your name!'); return; }
    if (signupName.trim().length < 2) { setError('Name needs 2+ characters!'); return; }
    if (!/^\d{6}$/.test(signupPin)) { setError('Passcode must be 6 digits'); return; }
    if (signupPin !== signupPinConfirm) { setError('Passcodes don\'t match!'); return; }
    setLoading(true);
    const err = await signup(signupName.trim(), signupPin);
    setLoading(false);
    if (err) setError(err);
    else navigate('/');
  };

  if (showSignup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-bg via-surface to-bg">
        <div className="bg-card rounded-3xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setShowSignup(false); setError(''); }} className="text-text-muted hover:text-text p-2 -ml-2">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-text">Create Account</h2>
            <div className="w-8" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-[280px] mx-auto">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setSignupAvatar(a)}
                className={`text-2xl p-1.5 rounded-lg transition-all ${
                  signupAvatar === a ? 'bg-accent-soft ring-2 ring-accent scale-110' : 'opacity-50 hover:opacity-80'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={signupName}
              onChange={e => { setSignupName(e.target.value); setError(''); }}
              className="w-full bg-surface rounded-xl px-4 py-3 text-text placeholder-text-muted border border-transparent focus:border-accent outline-none"
              maxLength={20}
              autoFocus
            />
            <input
              type="password"
              placeholder="6-digit passcode"
              value={signupPin}
              onChange={e => { setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              className="w-full bg-surface rounded-xl px-4 py-3 text-text placeholder-text-muted border border-transparent focus:border-accent outline-none"
              maxLength={8}
              inputMode="numeric"
            />
            <input
              type="password"
              placeholder="Confirm passcode"
              value={signupPinConfirm}
              onChange={e => { setSignupPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              className="w-full bg-surface rounded-xl px-4 py-3 text-text placeholder-text-muted border border-transparent focus:border-accent outline-none"
              maxLength={8}
              inputMode="numeric"
            />

            {error && <p className="text-danger text-sm text-center">{error}</p>}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-accent text-bg font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-95"
            >
              {loading ? '...' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-bg via-surface to-bg">
        <div className="bg-card rounded-3xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex items-center justify-between mb-8">
            <button onClick={handleBack} className="text-text-muted hover:text-text">
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{selectedProfile.avatar}</span>
              <span className="font-bold text-text text-lg">{selectedProfile.name}</span>
            </div>
            <div className="w-6" />
          </div>

          <div className="text-center mb-8">
            <Lock className="w-8 h-8 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text">Enter your passcode</h2>
            <div className="flex justify-center gap-3 mt-6">
              {[...Array(PIN_LENGTH)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    i < pin.length ? 'bg-accent scale-110' : 'bg-surface'
                  }`}
                />
              ))}
            </div>
            {error && <p className="text-danger text-sm mt-4 font-medium">{error}</p>}
            {loading && <p className="text-text-muted text-sm mt-4">Signing in...</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinPress(num.toString())}
                className="bg-surface hover:bg-card-hover text-text text-2xl font-bold py-4 rounded-2xl transition-colors active:scale-95"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => handlePinPress('0')}
              className="bg-surface hover:bg-card-hover text-text text-2xl font-bold py-4 rounded-2xl transition-colors active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="text-text-muted hover:text-text flex items-center justify-center"
            >
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-bg via-surface to-bg">
      <div className="text-center w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2 text-text">Who's playing? 🎮</h1>
        <p className="text-text-muted text-sm mb-8">Pick your profile</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={`bg-gradient-to-br ${profile.color} p-6 rounded-3xl shadow-xl text-white flex flex-col items-center gap-3 hover:scale-105 transition-transform active:scale-95`}
            >
              <span className="text-5xl">{profile.avatar}</span>
              <span className="text-lg font-bold capitalize">{profile.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSignup(true)}
          className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto bg-card hover:bg-card-hover text-text font-bold py-3 px-6 rounded-xl transition-colors"
        >
          <Plus size={18} /> New Player
        </button>
      </div>
    </div>
  );
}
