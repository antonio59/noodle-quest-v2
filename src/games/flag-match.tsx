import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';

interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FlagGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const difficulty = aiDifficulty || 'medium';
  const numFlags = difficulty === 'hard' ? 8 : difficulty === 'medium' ? 6 : 4;

  const [score, setScore] = useState(0);
  const [selectedFlag, setSelectedFlag] = useState<Country | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [gameRound, setGameRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [options, setOptions] = useState<{ flags: Country[]; countries: Country[] }>({ flags: [], countries: [] });

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const streakRef = useRef(0);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const numRounds = Math.min(10 + stage, 50);

  const allRounds = useMemo(() => {
    const shuffled = shuffle(COUNTRIES);
    return Array.from({ length: numRounds }, (_, i) => shuffled.slice(i * numFlags, (i + 1) * numFlags));
  }, [numFlags, numRounds]);

  useEffect(() => {
    if (gameRound >= numRounds) {
      if (endedRef.current) return;
      endedRef.current = true;
      const stars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
      onEnd({ score, stars, summary: `Matched ${Math.round(score / 10)} flags correctly across ${numRounds} rounds!` });
      return;
    }

    const roundCountries = allRounds[gameRound] || [];
    const flags = shuffle([...roundCountries]);
    const countries = shuffle([...roundCountries]);

    setOptions({ flags, countries });
    setSelectedFlag(null);
    setSelectedCountry(null);
    setFeedback(null);
    setRoundComplete(false);
    onMessage('Match the flag to the correct country!');
  }, [gameRound, allRounds, score, onEnd, onMessage]);

  const checkAnswer = useCallback((flag: Country, country: Country) => {
    const isCorrect = flag.code === country.code;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setRoundComplete(true);

    if (isCorrect) {
      streakRef.current++;
      setStreak(streakRef.current);
      const bonus = streakRef.current >= 3 ? 5 : 0;
      const pts = 10 + bonus;
      setScore(prev => prev + pts);
      onScore(pts);
      onMessage(streakRef.current >= 3 ? `🔥 ${streakRef.current} streak! +${pts}` : 'Correct! Great job!');
    } else {
      streakRef.current = 0;
      setStreak(0);
      onMessage(`Wrong! ${flag.flag} is ${flag.name}`);
    }

    onProgress(Math.min((gameRound + 1) / numRounds, 1));
    schedule(() => setGameRound(prev => prev + 1), 1400);
  }, [gameRound, onScore, onMessage, onProgress, schedule, numRounds]);

  const handleFlagClick = (country: Country) => {
    if (feedback || roundComplete) return;
    setSelectedFlag(country);
    if (selectedCountry) checkAnswer(country, selectedCountry);
  };

  const handleCountryClick = (country: Country) => {
    if (feedback || roundComplete) return;
    setSelectedCountry(country);
    if (selectedFlag) checkAnswer(selectedFlag, country);
  };

  const progressPct = numRounds > 0 ? (gameRound / numRounds) * 100 : 0;

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-accent">Flag Match</span>
          {streak >= 3 && (
            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold animate-pulse">
              🔥 {streak} streak!
            </span>
          )}
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-card rounded-lg px-2 py-1 text-text-muted">{gameRound + 1}/{numRounds}</span>
          <span className="bg-accent/20 text-accent rounded-lg px-2 py-1 font-bold">{score} pts</span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-surface rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, var(--color-accent), #67e8f9)',
          }}
        />
      </div>

      <div className="text-center mb-3 text-sm text-text-muted">
        Tap a flag, then tap its matching country name
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold text-accent mb-2 text-center">🚩 Flags</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {options.flags.map((country) => {
                const isSelected = selectedFlag?.code === country.code;
                const isCorrectResult = feedback === 'correct' && isSelected;
                const isWrongResult = feedback === 'wrong' && isSelected;
                return (
                  <button
                    key={`flag-${country.code}-${gameRound}`}
                    onClick={() => handleFlagClick(country)}
                    disabled={roundComplete}
                    className="w-14 h-14 rounded-xl text-3xl flex items-center justify-center transition-all duration-150"
                    style={{
                      background: isCorrectResult
                        ? 'rgba(74,222,128,0.25)'
                        : isWrongResult
                          ? 'rgba(239,68,68,0.25)'
                          : isSelected
                            ? 'rgba(167,139,250,0.25)'
                            : 'var(--color-card)',
                      border: isCorrectResult
                        ? '2px solid #4ade80'
                        : isWrongResult
                          ? '2px solid #ef4444'
                          : isSelected
                            ? '2px solid var(--color-accent)'
                            : '2px solid transparent',
                      boxShadow: isCorrectResult
                        ? '0 0 12px #4ade8066'
                        : isWrongResult
                          ? '0 0 12px #ef444466'
                          : isSelected
                            ? '0 0 12px rgba(167,139,250,0.4)'
                            : 'none',
                      opacity: roundComplete && !isSelected ? 0.5 : 1,
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {country.flag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-accent mb-2 text-center">🌍 Countries</h3>
            <div className="flex flex-col gap-1.5">
              {options.countries.map((country) => {
                const isSelected = selectedCountry?.code === country.code;
                const isCorrectResult = feedback === 'correct' && isSelected;
                const isWrongResult = feedback === 'wrong' && isSelected;
                return (
                  <button
                    key={`country-${country.code}-${gameRound}`}
                    onClick={() => handleCountryClick(country)}
                    disabled={roundComplete}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left"
                    style={{
                      background: isCorrectResult
                        ? 'rgba(74,222,128,0.25)'
                        : isWrongResult
                          ? 'rgba(239,68,68,0.25)'
                          : isSelected
                            ? 'rgba(167,139,250,0.25)'
                            : 'var(--color-card)',
                      border: isCorrectResult
                        ? '2px solid #4ade80'
                        : isWrongResult
                          ? '2px solid #ef4444'
                          : isSelected
                            ? '2px solid var(--color-accent)'
                            : '2px solid transparent',
                      color: isSelected ? 'white' : 'var(--color-text)',
                      opacity: roundComplete && !isSelected ? 0.5 : 1,
                    }}
                  >
                    {country.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className="mt-4 p-3 rounded-xl text-center font-medium transition-all"
            style={{
              background: feedback === 'correct' ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              color: feedback === 'correct' ? '#4ade80' : '#ef4444',
              border: `1px solid ${feedback === 'correct' ? '#4ade8044' : '#ef444444'}`,
            }}
          >
            {feedback === 'correct'
              ? `✓ Correct!${streak >= 3 ? ` 🔥 ${streak} in a row!` : ''}`
              : `✗ ${selectedFlag?.name ?? ''} is ${options.flags.find(c => c.code === selectedFlag?.code)?.name ?? ''}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlagGame;
