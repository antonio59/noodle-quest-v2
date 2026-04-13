import { useState, useEffect, useMemo } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

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
  { code: 'MO', name: 'Macau', flag: '🇲🇴' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
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
  const targetScore = Math.min(stage * 10, 100);
  
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedFlag, setSelectedFlag] = useState<Country | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [gameRound, setGameRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [options, setOptions] = useState<{ flags: Country[]; countries: Country[] }>({ flags: [], countries: [] });

  const allRounds = useMemo(() => {
    const shuffled = shuffle(COUNTRIES);
    return Array.from({ length: 10 }, (_, i) => shuffled.slice(i * numFlags, (i + 1) * numFlags));
  }, [numFlags]);

  useEffect(() => {
    if (gameRound >= 10) {
      const stars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
      onEnd({ score, stars, summary: `Matched ${score / 10} flags correctly!` });
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

  const handleFlagClick = (country: Country) => {
    if (feedback || roundComplete) return;
    setSelectedFlag(country);
    if (selectedCountry) {
      checkAnswer(country, selectedCountry);
    }
  };

  const handleCountryClick = (country: Country) => {
    if (feedback || roundComplete) return;
    setSelectedCountry(country);
    if (selectedFlag) {
      checkAnswer(selectedFlag, country);
    }
  };

  const checkAnswer = (flag: Country, country: Country) => {
    const isCorrect = flag.code === country.code;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setRoundComplete(true);

    if (isCorrect) {
      const newScore = score + 10;
      setScore(newScore);
      onScore(10);
      onProgress((gameRound + 1) / 10);
      onMessage('Correct! Great job!');
    } else {
      onMessage(`Wrong! The flag ${flag.flag} belongs to ${flag.name}`);
    }

    setTimeout(() => {
      setGameRound(prev => prev + 1);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Flag Match</h2>
        <div className="flex gap-2 text-xs">
          <span className="bg-card rounded-lg px-2 py-1 text-text-muted">Round {gameRound + 1}/10</span>
          <span className="bg-accent rounded-lg px-2 py-1 text-bg font-bold">{score} pts</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="text-center mb-3 text-sm text-text-muted">
          Tap a flag, then tap its matching country
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold text-accent mb-2 text-center">Flags</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {options.flags.map((country) => (
                <button
                  key={`flag-${country.code}-${gameRound}`}
                  onClick={() => handleFlagClick(country)}
                  disabled={roundComplete}
                  className={`w-14 h-14 rounded-xl text-3xl flex items-center justify-center transition-all ${
                    selectedFlag?.code === country.code
                      ? feedback === 'correct'
                        ? 'bg-success/30 ring-2 ring-success'
                        : feedback === 'wrong' && selectedCountry?.code === country.code
                        ? 'bg-danger/30 ring-2 ring-danger'
                        : 'bg-accent/30 ring-2 ring-accent'
                      : 'bg-card hover:bg-card-hover'
                  } ${roundComplete ? 'opacity-60' : ''}`}
                >
                  {country.flag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-accent mb-2 text-center">Countries</h3>
            <div className="flex flex-col gap-2">
              {options.countries.map((country) => (
                <button
                  key={`country-${country.code}-${gameRound}`}
                  onClick={() => handleCountryClick(country)}
                  disabled={roundComplete}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCountry?.code === country.code
                      ? feedback === 'correct'
                        ? 'bg-success/30 ring-2 ring-success'
                        : feedback === 'wrong' && selectedFlag?.code === country.code
                        ? 'bg-danger/30 ring-2 ring-danger'
                        : 'bg-accent/30 ring-2 ring-accent'
                      : 'bg-card hover:bg-card-hover text-text'
                  } ${roundComplete ? 'opacity-60' : ''}`}
                >
                  {country.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`mt-4 p-3 rounded-xl text-center ${
            feedback === 'correct' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
          }`}>
            {feedback === 'correct' ? '✓ Correct!' : `✗ The answer was ${options.flags.find(c => c.code === selectedFlag?.code || c.code === selectedCountry?.code)?.name}`}
          </div>
        )}
      </div>
    </div>
  );
}

registerGame('flag-match', {
  name: 'Flag Match',
  emoji: '🚩',
  description: 'Match flags to their countries!',
  category: 'memory',
  stages: 10,
  component: FlagGame,
  aiDifficulty: 'medium',
});

export default FlagGame;