import { useState, useEffect, useRef, useCallback } from 'react';

interface VideoTask {
  id: string;
  taskId: string;
  prompt: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  videoUrl?: string;
  error?: string;
  createdAt: number;
  model: string;
  resolution: string;
  ratio: string;
  duration: number;
}

interface AppSettings {
  apiKey: string;
  workspaceId: string;
  region: string;
  model: string;
  resolution: string;
  ratio: string;
  duration: number;
  promptExtend: boolean;
  watermark: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  workspaceId: '',
  region: 'ap-southeast-1',
  model: 'wan2.7-t2v',
  resolution: '720P',
  ratio: '16:9',
  duration: 5,
  promptExtend: true,
  watermark: false,
};

const EXAMPLE_PROMPTS = [
  "A majestic eagle soaring over snow-capped mountains at golden hour, cinematic wide shot, dramatic clouds",
  "A cute robot dancing in a neon-lit cyberpunk city at night, rain reflections on the ground, anime style",
  "Ocean waves crashing against rocky cliffs, slow motion, aerial drone shot, golden sunset light",
  "A magical forest with glowing mushrooms and fireflies, misty atmosphere, fantasy style, gentle camera pan",
  "A futuristic sports car driving through a desert highway at sunset, cinematic, motion blur",
  "Cherry blossom petals falling in slow motion in a Japanese garden, koi pond reflection, peaceful atmosphere",
];

const REGIONS: Record<string, string> = {
  'ap-southeast-1': 'Singapore',
  'cn-beijing': 'Beijing',
  'us-east-1': 'US (Virginia)',
  'eu-central-1': 'Frankfurt',
};

function getBaseUrl(settings: AppSettings): string {
  const { workspaceId, region } = settings;
  if (workspaceId) {
    return `https://${workspaceId}.${region}.maas.aliyuncs.com/api/v1`;
  }
  // Fallback to general endpoint
  if (region === 'cn-beijing') {
    return 'https://dashscope.aliyuncs.com/api/v1';
  }
  return 'https://dashscope-intl.aliyuncs.com/api/v1';
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('video-gen-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [tasks, setTasks] = useState<VideoTask[]>(() => {
    const saved = localStorage.getItem('video-gen-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeVideo, setActiveVideo] = useState<VideoTask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem('video-gen-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('video-gen-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Poll for task status
  const pollTask = useCallback(async (task: VideoTask) => {
    if (!settings.apiKey) return;
    
    const baseUrl = getBaseUrl(settings);
    try {
      const response = await fetch(`${baseUrl}/tasks/${task.taskId}`, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
        },
      });
      
      const data = await response.json();
      
      if (data.output) {
        const status = data.output.task_status;
        
        setTasks(prev => prev.map(t => 
          t.taskId === task.taskId 
            ? { 
                ...t, 
                status, 
                videoUrl: data.output.video_url || t.videoUrl,
                error: data.output.message || t.error 
              }
            : t
        ));

        if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'UNKNOWN') {
          return true; // Stop polling
        }
      }
      return false; // Continue polling
    } catch (err) {
      console.error('Polling error:', err);
      return false;
    }
  }, [settings]);

  // Start polling for pending tasks
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
    
    if (pendingTasks.length > 0 && settings.apiKey) {
      pollingRef.current = setInterval(async () => {
        for (const task of pendingTasks) {
          const done = await pollTask(task);
          if (done) {
            // Update active video if needed
            setActiveVideo(prev => {
              if (prev && prev.taskId === task.taskId) {
                const updated = tasks.find(t => t.taskId === task.taskId);
                return updated || prev;
              }
              return prev;
            });
          }
        }
        
        // Check if all tasks are done
        setTasks(current => {
          const stillPending = current.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
          if (stillPending.length === 0 && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setIsGenerating(false);
          }
          return current;
        });
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tasks.length, settings.apiKey, pollTask]);

  const generateVideo = async () => {
    if (!settings.apiKey) {
      setError('Please set your API key in settings');
      setShowSettings(true);
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError('');
    setIsGenerating(true);

    const baseUrl = getBaseUrl(settings);
    const isWan27 = settings.model.startsWith('wan2.7');

    const body: Record<string, unknown> = {
      model: settings.model,
      input: {
        prompt: prompt.trim(),
        ...(negativePrompt.trim() && { negative_prompt: negativePrompt.trim() }),
      },
      parameters: isWan27 ? {
        resolution: settings.resolution,
        ratio: settings.ratio,
        duration: settings.duration,
        prompt_extend: settings.promptExtend,
        watermark: settings.watermark,
      } : {
        size: getSizeFromSettings(settings),
        duration: settings.duration,
        prompt_extend: settings.promptExtend,
        watermark: settings.watermark,
      },
    };

    try {
      const response = await fetch(`${baseUrl}/services/aigc/video-generation/video-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.output && data.output.task_id) {
        const newTask: VideoTask = {
          id: Date.now().toString(),
          taskId: data.output.task_id,
          prompt: prompt.trim(),
          status: data.output.task_status || 'PENDING',
          createdAt: Date.now(),
          model: settings.model,
          resolution: settings.resolution,
          ratio: settings.ratio,
          duration: settings.duration,
        };

        setTasks(prev => [newTask, ...prev]);
        setActiveVideo(newTask);
        setPrompt('');
      } else if (data.code) {
        setError(`API Error: ${data.code} - ${data.message}`);
        setIsGenerating(false);
      } else {
        setError('Unexpected response from API');
        setIsGenerating(false);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (activeVideo?.taskId === taskId) {
      setActiveVideo(null);
    }
  };

  const clearHistory = () => {
    setTasks([]);
    setActiveVideo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/50 to-gray-950 text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">
                AI Video Generator
              </h1>
              <p className="text-xs text-gray-400">Powered by Qwen Wan Models</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl animate-in">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>⚙️</span> API Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">API Key *</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Workspace ID (optional)</label>
                <input
                  type="text"
                  value={settings.workspaceId}
                  onChange={(e) => setSettings({ ...settings, workspaceId: e.target.value })}
                  placeholder="Your workspace ID"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Region</label>
                <select
                  value={settings.region}
                  onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-400 focus:outline-none transition-colors"
                >
                  {Object.entries(REGIONS).map(([key, name]) => (
                    <option key={key} value={key} className="bg-gray-900">{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Model</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-400 focus:outline-none transition-colors"
                >
                  <option value="wan2.7-t2v" className="bg-gray-900">Wan 2.7 T2V (Latest)</option>
                  <option value="wan2.6-t2v" className="bg-gray-900">Wan 2.6 T2V</option>
                  <option value="wan2.5-t2v-preview" className="bg-gray-900">Wan 2.5 T2V Preview</option>
                  <option value="wan2.2-t2v-plus" className="bg-gray-900">Wan 2.2 T2V Plus</option>
                  <option value="wan2.1-t2v-turbo" className="bg-gray-900">Wan 2.1 T2V Turbo (Fast)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-300">
                💡 Get your free API key from{' '}
                <a href="https://modelstudio.console.alibabacloud.com/model/settings/api-key" target="_blank" rel="noopener" className="underline hover:text-blue-200">
                  Alibaba Cloud Model Studio
                </a>
                . New accounts get free credits to try the API!
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prompt Input */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ✨ Video Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate... Be descriptive about the scene, camera movement, lighting, and style."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors resize-none"
              />
              
              {/* Negative prompt toggle */}
              <button
                onClick={() => setShowNegative(!showNegative)}
                className="mt-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showNegative ? '▾ Hide' : '▸ Show'} negative prompt
              </button>
              {showNegative && (
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Elements to exclude (e.g., blurry, low quality, deformed)"
                  className="mt-2 w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors text-sm"
                />
              )}

              {/* Generation Settings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Resolution</label>
                  <select
                    value={settings.resolution}
                    onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-400 focus:outline-none"
                  >
                    <option value="720P" className="bg-gray-900">720P</option>
                    <option value="1080P" className="bg-gray-900">1080P</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Aspect Ratio</label>
                  <select
                    value={settings.ratio}
                    onChange={(e) => setSettings({ ...settings, ratio: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-400 focus:outline-none"
                  >
                    <option value="16:9" className="bg-gray-900">16:9</option>
                    <option value="9:16" className="bg-gray-900">9:16</option>
                    <option value="1:1" className="bg-gray-900">1:1</option>
                    <option value="4:3" className="bg-gray-900">4:3</option>
                    <option value="3:4" className="bg-gray-900">3:4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Duration</label>
                  <select
                    value={settings.duration}
                    onChange={(e) => setSettings({ ...settings, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-400 focus:outline-none"
                  >
                    {[2, 3, 5, 10, 15].map(d => (
                      <option key={d} value={d} className="bg-gray-900">{d}s</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Enhance</label>
                  <button
                    onClick={() => setSettings({ ...settings, promptExtend: !settings.promptExtend })}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${settings.promptExtend ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                  >
                    {settings.promptExtend ? '✓ On' : 'Off'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={generateVideo}
                disabled={isGenerating || !prompt.trim()}
                className={`mt-4 w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
                  isGenerating || !prompt.trim()
                    ? 'bg-gray-700 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:opacity-90 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🎬 Generate Video
                  </span>
                )}
              </button>
            </div>

            {/* Example Prompts */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3">💡 Example Prompts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_PROMPTS.map((ep, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ep)}
                    className="text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all text-xs text-gray-400 hover:text-gray-200 line-clamp-2"
                  >
                    {ep}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Video Preview & History */}
          <div className="space-y-6">
            {/* Video Preview */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3">🎥 Preview</h3>
              {activeVideo?.videoUrl && activeVideo.status === 'SUCCEEDED' ? (
                <div>
                  <video
                    src={activeVideo.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full rounded-xl"
                  />
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{activeVideo.prompt}</p>
                  <a
                    href={activeVideo.videoUrl}
                    download
                    target="_blank"
                    rel="noopener"
                    className="mt-2 block text-center py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                  >
                    ⬇️ Download Video
                  </a>
                </div>
              ) : activeVideo ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-400">
                    {activeVideo.status === 'PENDING' ? 'Queued...' : 'Generating...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">This may take 1-5 minutes</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No video yet</p>
                  <p className="text-xs mt-1">Generate one to see it here</p>
                </div>
              )}
            </div>

            {/* History */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">📋 History</h3>
                {tasks.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No videos generated yet</p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.taskId}
                      onClick={() => setActiveVideo(task)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        activeVideo?.taskId === task.taskId
                          ? 'bg-purple-500/10 border border-purple-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-gray-300 line-clamp-2 flex-1">{task.prompt}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.taskId); }}
                          className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={task.status} />
                        <span className="text-[10px] text-gray-500">{task.model}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-500">
          <p>Built with React & Tailwind CSS • Powered by Alibaba Cloud Qwen Wan Models</p>
          <p className="mt-1">
            <a href="https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference" target="_blank" rel="noopener" className="hover:text-gray-300 underline">
              API Documentation
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    PENDING: { color: 'bg-yellow-500/20 text-yellow-300', label: '⏳ Pending' },
    RUNNING: { color: 'bg-blue-500/20 text-blue-300', label: '🔄 Running' },
    SUCCEEDED: { color: 'bg-green-500/20 text-green-300', label: '✅ Done' },
    FAILED: { color: 'bg-red-500/20 text-red-300', label: '❌ Failed' },
    UNKNOWN: { color: 'bg-gray-500/20 text-gray-300', label: '⚠️ Unknown' },
  };
  const { color, label } = config[status] || config.UNKNOWN;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${color}`}>
      {label}
    </span>
  );
}

function getSizeFromSettings(settings: AppSettings): string {
  const resMap: Record<string, Record<string, string>> = {
    '480P': { '16:9': '832*480', '9:16': '480*832', '1:1': '624*624' },
    '720P': { '16:9': '1280*720', '9:16': '720*1280', '1:1': '960*960', '4:3': '1088*832', '3:4': '832*1088' },
    '1080P': { '16:9': '1920*1080', '9:16': '1080*1920', '1:1': '1440*1440', '4:3': '1632*1248', '3:4': '1248*1632' },
  };
  return resMap[settings.resolution]?.[settings.ratio] || '1280*720';
}
