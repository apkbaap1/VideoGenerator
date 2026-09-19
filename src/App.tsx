import { useState, useEffect, useRef, useCallback } from 'react';

type GenerationMode = 'text-to-video' | 'image-to-video';
type ImageMode = 'reference' | 'first-last-frame';

interface VideoTask {
  id: string;
  operationName: string;
  prompt: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  videoUrl?: string;
  error?: string;
  createdAt: number;
  model: string;
  aspectRatio: string;
  resolution: string;
  duration: string;
  mode: GenerationMode;
  imageCount?: number;
}

interface UploadedImage {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
  preview: string;
}

interface AppSettings {
  apiKey: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  duration: string;
  personGeneration: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'veo-3.1-generate-preview',
  aspectRatio: '16:9',
  resolution: '720p',
  duration: '8',
  personGeneration: 'allow_all',
};

const EXAMPLE_PROMPTS = {
  'text-to-video': [
    "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'",
    "Drone shot following a classic red convertible driven by a man along a winding coastal road at sunset, waves crashing against the rocks below. The convertible accelerates fast and the engine roars loudly.",
    "A whimsical stop-motion animation of a tiny robot tending to a garden of glowing mushrooms on a miniature planet.",
    "A wide shot of a misty Pacific Northwest forest. Two exhausted hikers push through ferns when they stop abruptly, staring at a tree. Close-up: Fresh, deep claw marks are gouged into the tree's bark.",
    "Film noir style, man and woman walk on the street, mystery, cinematic, black and white.",
    "A POV shot from a vintage car driving in the rain, Canada at night, cinematic.",
  ],
  'image-to-video': [
    "Bring this image to life with subtle motion and natural lighting.",
    "Animate this scene with gentle camera movement and atmospheric effects.",
    "Transform this static image into a dynamic video with realistic motion.",
    "Add cinematic movement and depth to this scene.",
    "Make this image come alive with smooth, natural animation.",
  ],
};

const MODELS = [
  { value: 'veo-3.1-generate-preview', label: 'Veo 3.1 (Latest)', desc: 'Best quality, 4K support' },
  { value: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', desc: 'Faster generation' },
  { value: 'veo-3.1-lite-generate-preview', label: 'Veo 3.1 Lite', desc: 'Cost-efficient' },
  { value: 'veo-3.0-generate-001', label: 'Veo 3.0 (Stable)', desc: 'Stable release' },
  { value: 'veo-3.0-fast-generate-001', label: 'Veo 3.0 Fast (Stable)', desc: 'Stable & fast' },
];

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('veo-video-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [mode, setMode] = useState<GenerationMode>('text-to-video');
  const [imageMode, setImageMode] = useState<ImageMode>('reference');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [firstFrame, setFirstFrame] = useState<UploadedImage | null>(null);
  const [lastFrame, setLastFrame] = useState<UploadedImage | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tasks, setTasks] = useState<VideoTask[]>(() => {
    const saved = localStorage.getItem('veo-video-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeVideo, setActiveVideo] = useState<VideoTask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem('veo-video-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('veo-video-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Poll for task status
  const pollTask = useCallback(async (task: VideoTask): Promise<boolean> => {
    if (!settings.apiKey) return true;

    try {
      const response = await fetch(`${BASE_URL}/${task.operationName}`, {
        headers: {
          'x-goog-api-key': settings.apiKey,
        },
      });

      const data = await response.json();

      if (data.error) {
        setTasks(prev => prev.map(t =>
          t.operationName === task.operationName
            ? { ...t, status: 'FAILED', error: data.error.message || 'Unknown error' }
            : t
        ));
        return true;
      }

      if (data.done) {
        if (data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri) {
          const videoUrl = data.response.generateVideoResponse.generatedSamples[0].video.uri;
          setTasks(prev => prev.map(t =>
            t.operationName === task.operationName
              ? { ...t, status: 'SUCCEEDED', videoUrl }
              : t
          ));
        } else if (data.error) {
          setTasks(prev => prev.map(t =>
            t.operationName === task.operationName
              ? { ...t, status: 'FAILED', error: data.error.message || 'Generation failed' }
              : t
          ));
        } else {
          setTasks(prev => prev.map(t =>
            t.operationName === task.operationName
              ? { ...t, status: 'SUCCEEDED' }
              : t
          ));
        }
        return true;
      } else {
        setTasks(prev => prev.map(t =>
          t.operationName === task.operationName
            ? { ...t, status: 'RUNNING' }
            : t
        ));
        return false;
      }
    } catch (err) {
      console.error('Polling error:', err);
      return false;
    }
  }, [settings.apiKey]);

  // Start polling for pending tasks
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');

    if (pendingTasks.length > 0 && settings.apiKey) {
      pollingRef.current = setInterval(async () => {
        let allDone = true;
        for (const task of pendingTasks) {
          const done = await pollTask(task);
          if (!done) allDone = false;
        }

        if (allDone) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setIsGenerating(false);
        }
      }, 10000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING').length, settings.apiKey, pollTask]);

  // File handling
  const processFile = (file: File): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(`File ${file.name} is too large. Max size is 20MB.`));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({
          id: Date.now().toString() + Math.random(),
          file,
          base64,
          mimeType: file.type,
          preview: reader.result as string,
        });
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;

    try {
      const newImages: UploadedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          setError(`File ${file.name} is not an image`);
          continue;
        }
        const img = await processFile(file);
        newImages.push(img);
      }

      if (imageMode === 'reference') {
        setImages(prev => [...prev, ...newImages].slice(0, 3));
      } else {
        // First/last frame mode - only use first uploaded image
        if (newImages.length > 0) {
          if (!firstFrame) {
            setFirstFrame(newImages[0]);
          } else if (!lastFrame) {
            setLastFrame(newImages[0]);
          }
        }
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleImageUpload(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    if (imageMode === 'reference') {
      setImages(prev => prev.filter(img => img.id !== id));
    } else {
      if (firstFrame?.id === id) setFirstFrame(null);
      if (lastFrame?.id === id) setLastFrame(null);
    }
  };

  const generateVideo = async () => {
    if (!settings.apiKey) {
      setError('Please set your Gemini API key in settings');
      setShowSettings(true);
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    // Validate images for image-to-video mode
    if (mode === 'image-to-video') {
      if (imageMode === 'reference' && images.length === 0) {
        setError('Please upload at least one reference image');
        return;
      }
      if (imageMode === 'first-last-frame' && !firstFrame) {
        setError('Please upload a first frame image');
        return;
      }
    }

    setError('');
    setIsGenerating(true);

    // Build the request body
    const instance: Record<string, unknown> = {
      prompt: prompt.trim(),
    };

    if (mode === 'image-to-video') {
      if (imageMode === 'reference') {
        // Use referenceImages array for reference mode
        instance.referenceImages = images.map(img => ({
          bytesBase64Encoded: img.base64,
          mimeType: img.mimeType,
        }));
      } else {
        // First/last frame mode
        if (firstFrame) {
          instance.image = {
            bytesBase64Encoded: firstFrame.base64,
            mimeType: firstFrame.mimeType,
          };
        }
        if (lastFrame) {
          instance.lastFrame = {
            bytesBase64Encoded: lastFrame.base64,
            mimeType: lastFrame.mimeType,
          };
        }
      }
    }

    const body = {
      instances: [instance],
      parameters: {
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        durationSeconds: settings.duration,
        personGeneration: settings.personGeneration,
      },
    };

    try {
      const response = await fetch(`${BASE_URL}/models/${settings.model}:predictLongRunning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': settings.apiKey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        setError(`API Error: ${data.error.code} - ${data.error.message}`);
        setIsGenerating(false);
        return;
      }

      if (data.name) {
        const newTask: VideoTask = {
          id: Date.now().toString(),
          operationName: data.name,
          prompt: prompt.trim(),
          status: 'PENDING',
          createdAt: Date.now(),
          model: settings.model,
          aspectRatio: settings.aspectRatio,
          resolution: settings.resolution,
          duration: settings.duration,
          mode,
          imageCount: mode === 'image-to-video' ? (imageMode === 'reference' ? images.length : (firstFrame && lastFrame ? 2 : 1)) : undefined,
        };

        setTasks(prev => [newTask, ...prev]);
        setActiveVideo(newTask);
        setPrompt('');
        // Clear images after successful submission
        if (mode === 'image-to-video') {
          setImages([]);
          setFirstFrame(null);
          setLastFrame(null);
        }
      } else {
        setError('Unexpected response from API');
        setIsGenerating(false);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const deleteTask = (operationName: string) => {
    setTasks(prev => prev.filter(t => t.operationName !== operationName));
    if (activeVideo?.operationName === operationName) {
      setActiveVideo(null);
    }
  };

  const clearHistory = () => {
    setTasks([]);
    setActiveVideo(null);
  };

  const currentExamples = EXAMPLE_PROMPTS[mode];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950 text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                AI Video Generator
              </h1>
              <p className="text-xs text-gray-400">Powered by Google Veo 3.1</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
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
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Gemini API Key *</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="AIza..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Model</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-400 focus:outline-none transition-colors"
                >
                  {MODELS.map(m => (
                    <option key={m.value} value={m.value} className="bg-gray-900">
                      {m.label} — {m.desc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Aspect Ratio</label>
                <select
                  value={settings.aspectRatio}
                  onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-400 focus:outline-none transition-colors"
                >
                  <option value="16:9" className="bg-gray-900">16:9 (Landscape)</option>
                  <option value="9:16" className="bg-gray-900">9:16 (Portrait)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Resolution</label>
                <select
                  value={settings.resolution}
                  onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-400 focus:outline-none transition-colors"
                >
                  <option value="720p" className="bg-gray-900">720p (Default)</option>
                  <option value="1080p" className="bg-gray-900">1080p (8s only)</option>
                  <option value="4k" className="bg-gray-900">4K (8s only, Veo 3.1)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration</label>
                <select
                  value={settings.duration}
                  onChange={(e) => setSettings({ ...settings, duration: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-400 focus:outline-none transition-colors"
                >
                  <option value="4" className="bg-gray-900">4 seconds</option>
                  <option value="6" className="bg-gray-900">6 seconds</option>
                  <option value="8" className="bg-gray-900">8 seconds</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">People Generation</label>
                <select
                  value={settings.personGeneration}
                  onChange={(e) => setSettings({ ...settings, personGeneration: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-400 focus:outline-none transition-colors"
                >
                  <option value="allow_all" className="bg-gray-900">Allow All</option>
                  <option value="allow_adult" className="bg-gray-900">Adults Only</option>
                </select>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-300">
                💡 Get your free API key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline hover:text-blue-200">
                  Google AI Studio
                </a>
                . Free tier available with generous limits!
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selector */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setMode('text-to-video')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                    mode === 'text-to-video'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  ✍️ Text to Video
                </button>
                <button
                  onClick={() => setMode('image-to-video')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                    mode === 'image-to-video'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  🖼️ Image to Video
                </button>
              </div>

              {/* Image Mode Selector (only for image-to-video) */}
              {mode === 'image-to-video' && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setImageMode('reference')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      imageMode === 'reference'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    📸 Reference Images (up to 3)
                  </button>
                  <button
                    onClick={() => setImageMode('first-last-frame')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      imageMode === 'first-last-frame'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    🎬 First & Last Frame
                  </button>
                </div>
              )}

              {/* Image Upload Area (for image-to-video mode) */}
              {mode === 'image-to-video' && (
                <div className="mb-4">
                  {imageMode === 'reference' ? (
                    <>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-purple-400 bg-purple-500/10'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e.target.files)}
                          className="hidden"
                        />
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-400">
                          Drag & drop images or <span className="text-purple-300 underline">browse</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Up to 3 images, max 20MB each
                        </p>
                      </div>

                      {/* Image Preview Grid */}
                      {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {images.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.preview}
                                alt="Reference"
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* First & Last Frame Mode */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* First Frame */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">First Frame</label>
                          {firstFrame ? (
                            <div className="relative group">
                              <img
                                src={firstFrame.preview}
                                alt="First frame"
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => removeImage(firstFrame.id)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => firstFrameInputRef.current?.click()}
                              className="h-32 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                            >
                              <input
                                ref={firstFrameInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e.target.files)}
                                className="hidden"
                              />
                              <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs text-gray-400">Upload</span>
                            </div>
                          )}
                        </div>

                        {/* Last Frame */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Last Frame (optional)</label>
                          {lastFrame ? (
                            <div className="relative group">
                              <img
                                src={lastFrame.preview}
                                alt="Last frame"
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => removeImage(lastFrame.id)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => lastFrameInputRef.current?.click()}
                              className="h-32 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                            >
                              <input
                                ref={lastFrameInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e.target.files)}
                                className="hidden"
                              />
                              <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs text-gray-400">Upload</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Define the start and end of your video for precise control
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Prompt Input */}
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ✨ Video Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'text-to-video'
                  ? "Describe the video you want to generate... Include subject, action, style, camera motion, composition, and ambiance for best results."
                  : "Describe how you want the image(s) to be animated... Include motion, camera movement, and any specific actions."
                }
                rows={mode === 'image-to-video' ? 3 : 5}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors resize-none"
              />

              {/* Current settings summary */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {settings.aspectRatio}
                </span>
                <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {settings.resolution}
                </span>
                <span className="text-xs px-2 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  {settings.duration}s
                </span>
                <span className="text-xs px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  🎵 Audio included
                </span>
                {mode === 'image-to-video' && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20">
                    🖼️ {imageMode === 'reference' ? `${images.length}/3 images` : (firstFrame && lastFrame ? '2 frames' : firstFrame ? '1 frame' : 'No image')}
                  </span>
                )}
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
                    : mode === 'text-to-video'
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
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
                    🎬 Generate {mode === 'text-to-video' ? 'Video' : 'from Image'}
                  </span>
                )}
              </button>
            </div>

            {/* Example Prompts */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3">💡 Example Prompts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentExamples.map((ep, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ep)}
                    className="text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all text-xs text-gray-400 hover:text-gray-200 line-clamp-2"
                  >
                    {ep}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3">📝 Prompt Tips</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-blue-300 font-medium">Subject & Context</span>
                  <p className="mt-1">Describe what/who is in the scene and the environment</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-purple-300 font-medium">Action</span>
                  <p className="mt-1">What the subject is doing (walking, running, turning)</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-pink-300 font-medium">Style & Camera</span>
                  <p className="mt-1">Film style, camera motion (dolly, aerial, POV), composition</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-cyan-300 font-medium">Audio & Dialogue</span>
                  <p className="mt-1">Use quotes for speech, describe sounds and ambience</p>
                </div>
                {mode === 'image-to-video' && (
                  <>
                    <div className="p-3 rounded-lg bg-white/5 sm:col-span-2">
                      <span className="text-orange-300 font-medium">Image Animation</span>
                      <p className="mt-1">Describe how you want the image to move. Be specific about motion direction, speed, and camera movement. For reference images, describe the scene you want to create with those subjects.</p>
                    </div>
                  </>
                )}
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
                    src={`${activeVideo.videoUrl}${activeVideo.videoUrl.includes('?') ? '&' : '?'}key=${settings.apiKey}`}
                    controls
                    autoPlay
                    loop
                    className="w-full rounded-xl"
                  />
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{activeVideo.prompt}</p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`${activeVideo.videoUrl}${activeVideo.videoUrl.includes('?') ? '&' : '?'}key=${settings.apiKey}`}
                      download
                      target="_blank"
                      rel="noopener"
                      className="flex-1 text-center py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                    >
                      ⬇️ Download
                    </a>
                    <span className="text-[10px] text-gray-500 flex items-center">
                      ⏰ 2 days
                    </span>
                  </div>
                </div>
              ) : activeVideo ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-400">
                    {activeVideo.status === 'PENDING' ? 'Queued...' : 'Generating...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">This may take 1-6 minutes</p>
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
                      key={task.operationName}
                      onClick={() => setActiveVideo(task)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        activeVideo?.operationName === task.operationName
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-gray-300 line-clamp-2 flex-1">{task.prompt}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.operationName); }}
                          className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={task.status} />
                        <span className="text-[10px] text-gray-500">
                          {task.mode === 'text-to-video' ? '✍️' : '🖼️'} {task.model.replace('-generate-preview', '').replace('-fast-generate-preview', ' Fast')}
                        </span>
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
          <p>Built with React & Tailwind CSS • Powered by Google Veo 3.1 via Gemini API</p>
          <p className="mt-1">
            <a href="https://ai.google.dev/gemini-api/docs/veo" target="_blank" rel="noopener" className="hover:text-gray-300 underline">
              API Documentation
            </a>
            {' · '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="hover:text-gray-300 underline">
              Get API Key
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
