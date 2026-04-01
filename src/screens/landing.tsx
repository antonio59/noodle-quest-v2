interface LandingProps {
  onLogin: () => void;
}

export function Landing({ onLogin }: LandingProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-7xl mb-6">🍜</div>
      <h1 className="text-4xl font-extrabold text-text mb-2">Noodle Quest</h1>
      <p className="text-text-dim text-lg mb-2">Brain games for the whole family</p>
      <p className="text-text-muted text-sm mb-8 max-w-xs">
        Train your focus, memory, and flexibility with fun games. Play board games with friends. Vibe to lo-fi beats.
      </p>
      <button
        onClick={onLogin}
        className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 transition-opacity active:scale-95"
      >
        Get Started
      </button>
    </div>
  );
}
