import { useState } from 'react';
import Clock from './components/Clock';
import Greeting from './components/Greeting';
import TodoList from './components/TodoList';
import Notes from './components/Notes';
import Weather from './components/Weather';
import PomodoroTimer from './components/PomodoroTimer';
import QuickLinks from './components/QuickLinks';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-purple-500' : 'bg-purple-300'}`}></div>
        <div className={`absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-blue-500' : 'bg-blue-300'}`}></div>
        <div className={`absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-pink-500' : 'bg-pink-300'}`}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl transition-all duration-300 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* Greeting & Clock */}
        <div className="mb-8">
          <Greeting darkMode={darkMode} />
          <Clock darkMode={darkMode} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Todo List */}
          <div className="lg:col-span-1">
            <TodoList darkMode={darkMode} />
          </div>

          {/* Pomodoro Timer */}
          <div className="lg:col-span-1">
            <PomodoroTimer darkMode={darkMode} />
          </div>

          {/* Weather */}
          <div className="lg:col-span-1">
            <Weather darkMode={darkMode} />
          </div>

          {/* Notes */}
          <div className="md:col-span-2 lg:col-span-2">
            <Notes darkMode={darkMode} />
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-1">
            <QuickLinks darkMode={darkMode} />
          </div>
        </div>

        {/* Footer */}
        <footer className={`mt-12 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>Built with React & Tailwind CSS ✨</p>
        </footer>
      </div>
    </div>
  );
}
