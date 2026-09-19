import { useState, useEffect } from 'react';

interface ClockProps {
  darkMode: boolean;
}

export default function Clock({ darkMode }: ClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`text-center py-6 px-8 rounded-2xl backdrop-blur-xl ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
      <div className={`text-6xl md:text-7xl font-mono font-bold tracking-wider ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          {hours}
        </span>
        <span className={`animate-pulse ${darkMode ? 'text-purple-300' : 'text-purple-500'}`}>:</span>
        <span className="bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          {minutes}
        </span>
        <span className={`text-3xl ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {seconds}
        </span>
      </div>
      <p className={`mt-3 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {dateStr}
      </p>
    </div>
  );
}
