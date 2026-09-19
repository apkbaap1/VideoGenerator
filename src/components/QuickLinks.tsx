interface QuickLinksProps {
  darkMode: boolean;
}

const links = [
  { name: 'GitHub', icon: '🐙', url: 'https://github.com', color: 'from-gray-600 to-gray-800' },
  { name: 'Twitter', icon: '🐦', url: 'https://twitter.com', color: 'from-blue-400 to-blue-600' },
  { name: 'YouTube', icon: '📺', url: 'https://youtube.com', color: 'from-red-500 to-red-700' },
  { name: 'Gmail', icon: '📧', url: 'https://mail.google.com', color: 'from-red-400 to-orange-400' },
  { name: 'Calendar', icon: '📅', url: 'https://calendar.google.com', color: 'from-blue-500 to-indigo-600' },
  { name: 'Notion', icon: '📓', url: 'https://notion.so', color: 'from-gray-700 to-gray-900' },
  { name: 'Spotify', icon: '🎵', url: 'https://spotify.com', color: 'from-green-500 to-green-700' },
  { name: 'Reddit', icon: '🤖', url: 'https://reddit.com', color: 'from-orange-500 to-red-500' },
];

export default function QuickLinks({ darkMode }: QuickLinksProps) {
  return (
    <div className={`rounded-2xl p-6 backdrop-blur-xl h-full ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
      <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        🔗 Quick Links
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-3 rounded-xl transition-all hover:scale-105 ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white/50 hover:bg-white/80'}`}
          >
            <span className="text-xl">{link.icon}</span>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {link.name}
            </span>
          </a>
        ))}
      </div>

      <div className={`mt-4 p-3 rounded-xl text-center ${darkMode ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20' : 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100'}`}>
        <p className={`text-xs ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
          💡 Tip: Right-click to open in new tab
        </p>
      </div>
    </div>
  );
}
