import { useState, useEffect } from 'react';

interface WeatherProps {
  darkMode: boolean;
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  location: string;
}

const weatherConditions: WeatherData[] = [
  { temp: 24, condition: 'Sunny', icon: '☀️', humidity: 45, wind: 12, location: 'San Francisco' },
  { temp: 18, condition: 'Cloudy', icon: '☁️', humidity: 65, wind: 18, location: 'London' },
  { temp: 28, condition: 'Clear', icon: '🌤️', humidity: 35, wind: 8, location: 'Tokyo' },
  { temp: 15, condition: 'Rainy', icon: '🌧️', humidity: 80, wind: 25, location: 'Seattle' },
  { temp: 22, condition: 'Partly Cloudy', icon: '⛅', humidity: 55, wind: 15, location: 'New York' },
];

export default function Weather({ darkMode }: WeatherProps) {
  const [weather, setWeather] = useState<WeatherData>(weatherConditions[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Simulate weather based on time of day
    const hour = new Date().getHours();
    const index = hour % weatherConditions.length;
    setWeather(weatherConditions[index]);
  }, []);

  const refreshWeather = () => {
    setIsAnimating(true);
    const randomIndex = Math.floor(Math.random() * weatherConditions.length);
    setTimeout(() => {
      setWeather(weatherConditions[randomIndex]);
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div className={`rounded-2xl p-6 backdrop-blur-xl h-full ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          🌤️ Weather
        </h3>
        <button
          onClick={refreshWeather}
          className={`p-2 rounded-lg transition-all ${isAnimating ? 'animate-spin' : ''} ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className={`text-center py-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
        <div className={`text-5xl mb-2 transition-transform ${isAnimating ? 'scale-0' : 'scale-100'}`}>
          {weather.icon}
        </div>
        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {weather.temp}°C
        </div>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {weather.condition}
        </p>
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          📍 {weather.location}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Humidity</p>
          <p className={`text-lg font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{weather.humidity}%</p>
        </div>
        <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Wind</p>
          <p className={`text-lg font-semibold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{weather.wind} km/h</p>
        </div>
      </div>
    </div>
  );
}
