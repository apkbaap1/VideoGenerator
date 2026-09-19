import { useState, useEffect } from 'react';

interface NotesProps {
  darkMode: boolean;
}

export default function Notes({ darkMode }: NotesProps) {
  const [note, setNote] = useState(() => {
    return localStorage.getItem('dashboard-notes') || 'Write your thoughts here...\n\n💡 Tips:\n- Use this space for quick notes\n- Your notes are saved automatically\n- Perfect for brainstorming ideas';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('dashboard-notes', note);
    }, 500);
    return () => clearTimeout(timer);
  }, [note]);

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;
  const charCount = note.length;

  return (
    <div className={`rounded-2xl p-6 backdrop-blur-xl h-full ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          📝 Notes
        </h3>
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {wordCount} words · {charCount} chars
        </span>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`w-full h-48 px-4 py-3 rounded-xl border outline-none resize-none transition-all text-sm leading-relaxed ${darkMode ? 'bg-white/5 border-white/10 text-gray-200 placeholder-gray-500 focus:border-purple-400' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-purple-400'}`}
        placeholder="Start writing..."
      />
      <div className={`mt-3 flex items-center justify-between text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span>Auto-saved</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Live
        </span>
      </div>
    </div>
  );
}
