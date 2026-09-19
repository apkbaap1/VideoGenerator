import { useState, useEffect, useRef } from 'react';

interface PomodoroTimerProps {
  darkMode: boolean;
}

type TimerMode = 'work' | 'break';

export default function PomodoroTimer({ darkMode }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'work') {
        setSessions((prev) => prev + 1);
        setMode('break');
        setTimeLeft(BREAK_TIME);
      } else {
        setMode('work');
        setTimeLeft(WORK_TIME);
      }
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const totalTime = mode === 'work' ? WORK_TIME : BREAK_TIME;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className={`rounded-2xl p-6 backdrop-blur-xl h-full ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          🍅 Focus Timer
        </h3>
        <span className={`text-sm px-2 py-1 rounded-lg ${darkMode ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-600'}`}>
          {sessions} sessions
        </span>
      </div>

      {/* Mode tabs */}
      <div className={`flex rounded-xl p-1 mb-6 ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
        <button
          onClick={() => switchMode('work')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mode === 'work' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Focus
        </button>
        <button
          onClick={() => switchMode('break')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mode === 'break' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg' : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Break
        </button>
      </div>

      {/* Timer display */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-40 h-40 -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
            strokeWidth="8"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={mode === 'work' ? 'url(#gradient-work)' : 'url(#gradient-break)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="gradient-work" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="gradient-break" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {minutes}:{seconds}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={resetTimer}
          className={`p-3 rounded-xl transition-all ${darkMode ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={toggleTimer}
          className={`px-8 py-3 rounded-xl font-medium text-white transition-all shadow-lg ${isRunning ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'}`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
      </div>
    </div>
  );
}
