import { useState, useEffect } from 'react';

interface GreetingProps {
  darkMode: boolean;
}

export default function Greeting({ darkMode }: GreetingProps) {
  const [name, setName] = useState(() => {
    return localStorage.getItem('dashboard-name') || '';
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboard-name', name);
  }, [name]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
  };

  return (
    <div className="text-center mb-6">
      <h2 className={`text-3xl md:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        {getEmoji()} {getGreeting()}
        {name && (
          <span className="block mt-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {name}
          </span>
        )}
      </h2>
      {!name || isEditing ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className={`px-4 py-2 rounded-xl border outline-none transition-all ${darkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-400'}`}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
          />
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={`mt-2 text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}
        >
          Click to change name
        </button>
      )}
    </div>
  );
}
