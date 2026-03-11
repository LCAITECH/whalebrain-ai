import React, { useState, useEffect, useRef } from 'react';
import {
  Search, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, Brain, Info, Loader2, MessageSquare, Send, X, User,
  Copy, Share2, History, Zap, Volume2, VolumeX, ArrowLeftRight,
  Briefcase, ShieldAlert, Settings, Coins, Wallet, Instagram, Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { CoinData, SearchResult, AnalysisResult, ChatMessage } from './types';
import { analyzeCoin, chatWithWhale } from './services/geminiService';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
              <ShieldAlert className="w-12 h-12 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black uppercase italic text-white">¡RUGPULL EN EL CÓDIGO!</h2>
            <p className="text-zinc-400">Algo salió muy mal, fiera. Mi cerebro de ballena explotó. Intenta recargar la página.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all"
            >
              RECARGAR SISTEMA
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const WHALE_IMAGE = "/cyber_whale.png";
const INVITIA_LOGO = "https://framerusercontent.com/images/9rW8rW8rW8rW8rW8rW8rW8rW8.png"; // Placeholder or real if found
const COINGECKO_LOGO = "https://static.coingecko.com/s/coingecko-logo-8903d34a19cf7469709f7830439660825021e4ad79afcb20057ca6f9790406b5.png";

interface ScanHistoryItem {
  id: string;
  name: string;
  symbol: string;
  score: number;
  timestamp: number;
}

// Typewriter Component for catchphrase
const Typewriter = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <span>{displayedText}</span>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <WhaleBrainApp />
    </ErrorBoundary>
  );
}

function WhaleBrainApp() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [catchphraseComplete, setCatchphraseComplete] = useState(false);

  useEffect(() => {
    setCatchphraseComplete(false);
  }, [analysis]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('La ballena está nadando por la blockchain…');
  const [searching, setSearching] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [degenMode, setDegenMode] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'contracts' | 'wallets' | 'compare' | 'portfolio'>('tokens');
  const [compareAddresses, setCompareAddresses] = useState({ addr1: '', addr2: '' });
  const [compareResults, setCompareResults] = useState<{ res1: AnalysisResult | null, res2: AnalysisResult | null }>({ res1: null, res2: null });

  const handleCompare = async () => {
    if (!compareAddresses.addr1 || !compareAddresses.addr2) return;
    setLoading(true);
    try {
      const res1 = await analyzeCoin({ id: compareAddresses.addr1, name: 'Wallet 1' } as any, degenMode, 'wallet', quickMode);
      const res2 = await analyzeCoin({ id: compareAddresses.addr2, name: 'Wallet 2' } as any, degenMode, 'wallet', quickMode);
      setCompareResults({ res1, res2 });
      setActiveTab('compare'); // Stay on tab to show results
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
  }, []);

  useEffect(() => {
    const ambient = document.getElementById('ambient-audio') as HTMLAudioElement;
    if (ambient) {
      if (soundEnabled) {
        ambient.volume = 0.05;
        ambient.play().catch(() => { });
      } else {
        ambient.pause();
      }
    }
  }, [soundEnabled]);

  // Play audio via ElevenLabs TTS
  const playWhaleAudio = async (text: string) => {
    if (!soundEnabled || !audioRef.current) return;
    try {
      // Limpiar markdown simple para el TTS
      const cleanText = text.replace(/[*_#]/g, '');
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      } else {
        console.error("TTS API Error:", await res.text());
      }
    } catch (err) {
      console.error('Error playing TTS:', err);
    }
  };

  // Cyber Whale Image URL from user
  const WHALE_IMAGE = "/cyber_whale.png";

  const loadingMessages = [
    "La ballena está nadando por la blockchain…",
    "Escaneando liquidez en el fondo del océano…",
    "Detectando ballenas y snipers…",
    "Analizando si esto es falopa o gema…",
    "Casi listo, aguantá los trapos, fiera…",
    "Calculando el riesgo de rugpull…",
    "Buscando señales entre las olas…"
  ];

  useEffect(() => {
    const savedHistory = localStorage.getItem('whale_history');
    if (savedHistory) setScanHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('whale_history', JSON.stringify(scanHistory));
  }, [scanHistory]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const addToHistory = (coin: CoinData, result: AnalysisResult) => {
    const newItem: ScanHistoryItem = {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      score: result.score,
      timestamp: Date.now()
    };
    setScanHistory(prev => {
      const filtered = prev.filter(item => item.id !== coin.id);
      return [newItem, ...filtered].slice(0, 5);
    });
  };

  const getCachedResult = (id: string): { coin: CoinData, analysis: AnalysisResult } | null => {
    const cached = localStorage.getItem(`cache_${id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 1000 * 60 * 10) { // 10 min cache
        return parsed.data;
      }
    }
    return null;
  };

  const setCachedResult = (id: string, data: { coin: CoinData, analysis: AnalysisResult }) => {
    localStorage.setItem(`cache_${id}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    if (val.startsWith('0x') && val.length > 30) {
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?query=${val}`);
        const data = await res.json();
        setSearchResults(data.coins || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectCoin = async (coinId: string) => {
    // Mobile iOS: Desbloquear stream de audio sincrónicamente con el tap del usuario
    if (soundEnabled && audioRef.current) audioRef.current.play().catch(() => { });

    if (coinId.length >= 30) {
      setQuery(coinId);
      analyzeAddress(coinId);
      return;
    }
    const cached = getCachedResult(coinId);
    if (cached) {
      setSelectedCoin(cached.coin);
      setAnalysis(cached.analysis);
      setSearchResults([]);
      setQuery('');
      return;
    }

    setLoading(true);
    setSearchResults([]);
    setQuery('');
    try {
      const res = await fetch(`/api/coin?id=${coinId}`);
      const data: CoinData = await res.json();

      if (!res.ok || (data as any)['error'] || !data.name) {
        throw new Error('CoinFetchError');
      }
      setSelectedCoin(data);

      const analysisResult = await analyzeCoin(data, degenMode, 'token', quickMode);
      setAnalysis(analysisResult);
      setCachedResult(coinId, { coin: data, analysis: analysisResult });
      addToHistory(data, analysisResult);

      const initialMessage = `¡Hola titán! He analizado **${data.name}**. \n\n### ¿Qué quieres saber?\n- ¿Por qué mi recomendación es **${getRecommendationLabel(analysisResult.recommendation)}**?\n- ¿Qué factores técnicos pesaron más?\n- ¿O prefieres que hablemos de otro proyecto, fiera?`;

      setChatMessages([
        { role: 'model', text: initialMessage }
      ]);

      if (soundEnabled) playWhaleAudio(initialMessage);
    } catch (err) {
      console.error(err);
      setChatMessages([{ role: 'model', text: "Esta moneda está más desaparecida que mi ex, rey. No encontré nada. 😂" }]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAddress = async (overrideAddress?: any) => {
    // Mobile iOS: Desbloquear stream de audio sincrónicamente con el tap del usuario
    if (soundEnabled && audioRef.current) audioRef.current.play().catch(() => { });

    const targetAddress = typeof overrideAddress === 'string' ? overrideAddress : query;
    if (targetAddress.length < 30) return;

    const cached = getCachedResult(targetAddress);
    if (cached) {
      setSelectedCoin(cached.coin);
      setAnalysis(cached.analysis);
      return;
    }

    setLoading(true);
    try {
      const type = activeTab === 'contracts' ? 'contract' : 'wallet';
      const analysisResult = await analyzeCoin({
        name: targetAddress,
        symbol: type,
        id: targetAddress,
        image: { large: WHALE_IMAGE },
        market_data: {
          current_price: { usd: 0 },
          price_change_percentage_24h: 0,
          price_change_percentage_7d: 0,
          price_change_percentage_30d: 0,
          market_cap: { usd: 0 },
          total_volume: { usd: 0 },
          circulating_supply: 0
        }
      } as any, degenMode, type as any, quickMode);

      const coinData: CoinData = {
        name: activeTab === 'contracts' ? 'Contrato Inteligente' : 'Billetera Crypto',
        symbol: targetAddress.slice(0, 6) + '...' + targetAddress.slice(-4),
        id: targetAddress,
        image: { large: WHALE_IMAGE, small: WHALE_IMAGE, thumb: WHALE_IMAGE },
        market_data: { current_price: { usd: 0 }, price_change_percentage_24h: 0 }
      } as any;

      setAnalysis(analysisResult);
      setSelectedCoin(coinData);
      setCachedResult(targetAddress, { coin: coinData, analysis: analysisResult });
      addToHistory(coinData, analysisResult);

      const typeName = activeTab === 'contracts' ? 'el contrato' : 'la billetera';
      const analysisMessage = `He analizado ${typeName}. \n\n${analysisResult.reasoning}`;

      const displayMessage = `He analizado ${typeName} **${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}**. \n\n${analysisResult.reasoning}`;

      setChatMessages([
        { role: 'model', text: displayMessage }
      ]);
      if (soundEnabled) playWhaleAudio(analysisMessage);
    } catch (err) {
      console.error(err);
      setChatMessages([{ role: 'model', text: "Esta dirección está más vacía que mi billetera después de un rugpull, rey. 😂" }]);
    } finally {
      setLoading(false);
    }
  };

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('¡Copiado al portapapeles!');
  };

  const shareAnalysis = async () => {
    if (!selectedCoin || !analysis) return;

    const shareText = `🐋 WhaleBrain AI Analysis: ${selectedCoin.name}\n📈 Score: ${analysis.score}/100\n💡 Recommendation: ${analysis.recommendation}\n💬 "${analysis.catchphrase}"\n\nAnaliza tus gemas en WhaleBrain AI!`;

    if (navigator.share) {
      navigator.share({
        title: `Análisis de ${selectedCoin.name}`,
        text: shareText,
        url: window.location.href,
      }).catch(console.error);
    } else {
      copyToClipboard(shareText);
    }
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && !chatImage) || chatLoading) return;

    // Mobile: Frenar el audio anterior si seguía sonando
    if (soundEnabled && audioRef.current) {
      audioRef.current.pause();
    }

    const userMsg: ChatMessage = { role: 'user', text: chatInput, image: chatImage || undefined };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatImage(null);
    setChatLoading(true);

    try {
      const response = await chatWithWhale(newHistory, selectedCoin || undefined, degenMode, quickMode, activeTab);
      setChatMessages([...newHistory, { role: 'model', text: response }]);
      if (soundEnabled) playWhaleAudio(response);
    } catch (err) {
      console.error(err);
      setChatMessages([...newHistory, { role: 'model', text: "Lo siento fiera, se me cortó la señal bajo el agua. ¿Repites?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'SAFE': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'WAIT': return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
      case 'CAUTION': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'SAFE': return <CheckCircle className="w-6 h-6" />;
      case 'WAIT': return <Clock className="w-6 h-6" />;
      case 'CAUTION': return <AlertTriangle className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case 'SAFE': return 'ENTRADA SEGURA';
      case 'WAIT': return 'ESPERAR / RIESGO';
      case 'CAUTION': return 'PRECAUCIÓN';
      default: return 'DESCONOCIDO';
    }
  };

  return (
    <div className="min-h-screen text-zinc-100 font-sans selection:bg-emerald-500/30 relative">
      {/* Degen Mode Frame Glow & Shark Effect */}
      <AnimatePresence>
        {degenMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[9999] pointer-events-none border-[8px] md:border-[16px] transition-colors duration-1000 ${analysis && analysis.score < 30
              ? 'border-rose-500/30 shadow-[inset_0_0_150px_rgba(244,63,94,0.5)]'
              : 'border-emerald-500/20 shadow-[inset_0_0_150px_rgba(16,185,129,0.4)]'
              }`}
          >
            <div className={`absolute inset-0 border-[2px] animate-pulse ${analysis && analysis.score < 30 ? 'border-rose-500/50' : 'border-emerald-500/50'}`} />
            <div className={`absolute inset-0 ${analysis && analysis.score < 30 ? 'bg-rose-500/[0.05]' : 'bg-emerald-500/[0.02]'}`} />

            {analysis && analysis.score < 30 && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  animate={{
                    x: ['-20%', '120%'],
                    y: ['20%', '80%', '20%'],
                    rotate: [45, 60, 45]
                  }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute w-64 h-64 opacity-20"
                >
                  <TrendingDown className="w-full h-full text-rose-500" />
                </motion.div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-500/10 font-black text-[20vw] uppercase italic pointer-events-none select-none">
                  PELIGRO
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ocean Background Layer */}
      <div
        className="fixed inset-0 z-[-1] bg-[#020617]"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.8)),
            url('/cyber_whale.png')
          `,
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <audio id="ambient-audio" src="/ocean-waves.mp3" loop />

      {/* Ambient Sound Toggle */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-2">
        {!soundEnabled && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-emerald-500 text-white text-[10px] sm:text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-lg shadow-emerald-500/20 whitespace-nowrap hidden sm:block"
          >
            ¡Activá el audio! 🔊
          </motion.div>
        )}
        <button
          onClick={() => {
            const ambient = document.getElementById('ambient-audio') as HTMLAudioElement;
            if (!soundEnabled) {
              setSoundEnabled(true);
              if (ambient) {
                ambient.volume = 0.05;
                ambient.play().catch(e => console.error("Audio Ambient Blocked:", e));
              }
            } else {
              setSoundEnabled(false);
              if (ambient) ambient.pause();
            }
          }}
          className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors relative"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Animated Bubbles */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: '110vh', x: `${Math.random() * 100}vw`, scale: Math.random() * 0.5 + 0.5 }}
            animate={{
              y: '-10vh',
              x: `${(Math.random() * 100) + (Math.sin(i) * 10)}vw`
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 20
            }}
            className={`absolute w-2 h-2 rounded-full blur-[1px] ${degenMode ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-white'}`}
          />
        ))}
      </div>

      {/* Degen Mode & Quick Mode Toggles */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 items-end">
        <button
          onClick={() => setDegenMode(!degenMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${degenMode
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
        >
          <Activity className={`w-4 h-4 ${degenMode ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-black uppercase tracking-widest">Modo Degen {degenMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => setQuickMode(!quickMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${quickMode
            ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
        >
          <Zap className={`w-4 h-4 ${quickMode ? 'animate-bounce' : ''}`} />
          <span className="text-xs font-black uppercase tracking-widest">Modo Rápido {quickMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/40 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="flex flex-col items-center mb-16 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-40 h-40 mb-6"
          >
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-full border-4 border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.8)] overflow-hidden bg-emerald-950/50">
              <img
                src={WHALE_IMAGE}
                alt="WhaleBrain AI"
                loading="eager"
                className="w-full h-full object-cover scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=400";
                }}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-xl">
              <Brain className="w-8 h-8 text-emerald-400" />
            </div>
          </motion.div>
          <h1 className={`text-4xl md:text-6xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-emerald-400 to-blue-500 bg-clip-text text-transparent uppercase italic transition-all duration-500 ${degenMode ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-105' : ''}`}>
            WhaleBrain AI
          </h1>
          <p className="text-zinc-500 text-lg max-w-md font-medium">
            Inteligencia de ballena para tus inversiones. Pregúntame y no dejes que te desplumen.
          </p>
        </header>

        {/* Daily Alerts */}
        <div className="mb-12 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-4 flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 shrink-0 px-4 py-2 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
            <AlertTriangle className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Alertas Hoy</span>
          </div>
          {[
            { name: 'SOL', price: '$142.5', change: '+5.2%', score: 88 },
            { name: 'PEPE', price: '$0.00001', change: '-12%', score: 12 },
            { name: 'ETH', price: '$2,450', change: '+1.8%', score: 92 },
          ].map((alert, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0 px-4 py-2 bg-zinc-900/40 rounded-2xl border border-zinc-800">
              <span className="font-black italic text-xs">{alert.name}</span>
              <span className={`text-[10px] font-mono ${alert.score > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>Score: {alert.score}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {[
            { id: 'tokens', label: 'Tokens', icon: TrendingUp },
            { id: 'contracts', label: 'Contratos', icon: Activity },
            { id: 'wallets', label: 'Billeteras', icon: User },
            { id: 'compare', label: 'Comparar', icon: ArrowLeftRight },
            { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Section */}
        <div className="relative mb-12">
          {activeTab === 'compare' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    value={compareAddresses.addr1}
                    onChange={(e) => setCompareAddresses({ ...compareAddresses, addr1: e.target.value })}
                    placeholder="Wallet 1 (0x...)"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-5 px-6 pl-12 focus:outline-none focus:border-emerald-500/50 transition-all text-lg placeholder:text-zinc-600 font-medium"
                  />
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={compareAddresses.addr2}
                    onChange={(e) => setCompareAddresses({ ...compareAddresses, addr2: e.target.value })}
                    placeholder="Wallet 2 (0x...)"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-5 px-6 pl-12 focus:outline-none focus:border-emerald-500/50 transition-all text-lg placeholder:text-zinc-600 font-medium"
                  />
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <button
                    onClick={handleCompare}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase italic"
                  >
                    Comparar
                  </button>
                </div>
              </div>

              {compareResults.res1 && compareResults.res2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[compareResults.res1, compareResults.res2].map((res, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Wallet {i + 1}</span>
                        <div className={`text-2xl font-mono font-black ${res.score >= 70 ? 'text-emerald-400' : res.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {res.score}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 italic mb-4">"{res.catchphrase}"</p>
                      <div className="space-y-2">
                        {res.keyFactors.slice(0, 3).map((f, j) => (
                          <div key={j} className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'portfolio' ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 text-center backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Alertas Activas</span>
                </div>
              </div>
              <Briefcase className="w-16 h-16 text-emerald-500/20 mx-auto mb-6" />
              <h3 className="text-2xl font-black uppercase italic mb-4">Tu Portfolio WhaleBrain</h3>
              <p className="text-zinc-500 mb-8 max-w-md mx-auto">Conecta tu wallet para trackear tus holdings y recibir alertas diarias de la ballena.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="bg-emerald-500 hover:bg-emerald-400 text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20">
                  Conectar Wallet
                </button>
                <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all border border-zinc-700">
                  Configurar Alertas
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                {searching ? (
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && query.length >= 30 && activeTab !== 'tokens' && analyzeAddress()}
                placeholder={
                  activeTab === 'tokens' ? "Busca una moneda (ej. Bitcoin, Solana, Pepe...)" :
                    activeTab === 'contracts' ? "Pega la dirección del contrato (EVM o Solana)" :
                      "Pega la dirección de la billetera (EVM o Solana)"
                }
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-lg placeholder:text-zinc-600 font-medium"
              />
              {(query.length >= 30 && activeTab !== 'tokens') && (
                <button
                  onClick={analyzeAddress}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-xl text-sm font-black uppercase italic transition-all"
                >
                  Escanear
                </button>
              )}
            </div>
          )}

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden z-50 shadow-2xl"
              >
                {searchResults.slice(0, 8).map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => selectCoin(coin.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800 last:border-0"
                  >
                    <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    <div>
                      <div className="font-bold">{coin.name}</div>
                      <div className="text-xs text-zinc-500 uppercase font-mono">{coin.symbol}</div>
                    </div>
                    <div className="ml-auto text-xs text-zinc-600 font-mono">Rank #{coin.market_cap_rank || 'N/A'}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {/* History Section */}
          {scanHistory.length > 0 && !selectedCoin && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 pt-8 border-t border-zinc-800/50"
            >
              <div className="flex items-center gap-2 text-zinc-500 mb-4 px-2">
                <History className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Historial Reciente</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {scanHistory.map((item) => (
                  <button
                    key={item.id + item.timestamp}
                    onClick={() => selectCoin(item.id)}
                    className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition-all group"
                  >
                    <div className="text-left">
                      <div className="font-bold text-sm group-hover:text-emerald-400 transition-colors">{item.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">{item.symbol}</div>
                    </div>
                    <div className={`text-lg font-mono font-black ${item.score >= 70 ? 'text-emerald-400' : item.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {item.score}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Analysis Display */}
        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-32 h-32 mb-10"
              >
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 m-auto w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
                <img
                  src={WHALE_IMAGE}
                  alt="Whale Loading"
                  className="absolute inset-0 m-auto w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
              </motion.div>
              <motion.p
                key={loadingMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-emerald-400 font-black tracking-widest uppercase text-sm text-center max-w-xs leading-relaxed"
              >
                {loadingMessage}
              </motion.p>
              <p className="text-zinc-600 text-[10px] mt-4 uppercase tracking-widest">(Puede tardar 8-12 seg)</p>
            </div>
          ) : selectedCoin && analysis ? (
            <motion.div
              id="share-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 relative"
            >
              {/* Personality Catchphrase */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`border rounded-3xl p-6 text-center relative overflow-hidden min-h-[100px] flex items-center justify-center ${analysis.score < 30 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent to-transparent opacity-50 ${analysis.score < 30 ? 'via-rose-400' : 'via-emerald-400'
                  }`} />
                <p className={`text-2xl font-black italic tracking-tight transition-all duration-500 ${analysis.score < 30
                  ? `text-rose-400 ${catchphraseComplete ? 'drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] scale-105' : ''}`
                  : `text-emerald-400 ${catchphraseComplete ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-105' : ''}`
                  }`}>
                  <Typewriter text={`"${analysis.catchphrase}"`} onComplete={() => setCatchphraseComplete(true)} />
                </p>
                {!catchphraseComplete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`w-1 h-8 ml-1 ${analysis.score < 30 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                  />
                )}
              </motion.div>

              {/* Coin Overview Card */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Brain className="w-32 h-32" />
                </div>

                <div className="flex flex-wrap items-start justify-between gap-6 mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <img src={selectedCoin.image.large} alt={selectedCoin.name} className="w-16 h-16 rounded-2xl shadow-lg" referrerPolicy="no-referrer" />
                    <div>
                      <h2 className="text-3xl font-black uppercase italic">{selectedCoin.name}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-zinc-500 uppercase tracking-widest text-sm font-mono">{selectedCoin.symbol} / USD</p>
                        <button
                          onClick={() => copyToClipboard(selectedCoin.id)}
                          className="p-1 text-zinc-600 hover:text-emerald-400 transition-colors"
                          title="Copiar dirección"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-3xl font-mono font-bold">
                        ${(selectedCoin.market_data?.current_price?.usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`flex items-center justify-end gap-1 font-bold ${(selectedCoin.market_data?.price_change_percentage_24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(selectedCoin.market_data?.price_change_percentage_24h || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(selectedCoin.market_data?.price_change_percentage_24h || 0).toFixed(2)}%
                      </div>
                    </div>
                    <button
                      onClick={shareAnalysis}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Share2 className="w-3 h-3" /> Compartir
                    </button>
                  </div>
                </div>

                {/* Recommendation Banner */}
                <div className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 p-6 rounded-2xl border-2 ${getRecommendationColor(analysis.recommendation)} relative z-10`}>
                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-4">
                    <div className="p-3 bg-white/10 rounded-xl shadow-inner shrink-0">
                      {getRecommendationIcon(analysis.recommendation)}
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] opacity-70 font-black leading-tight">Señal de la Ballena</div>
                      <div className="text-xl sm:text-2xl font-black italic break-words">{getRecommendationLabel(analysis.recommendation)}</div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-white/10 sm:hidden my-1"></div>

                  <div className="flex w-full sm:w-auto sm:ml-auto items-center justify-between sm:justify-end text-left sm:text-right">
                    <div className="sm:hidden text-[10px] uppercase tracking-[0.2em] opacity-70 font-black leading-tight text-zinc-400">Score Global</div>
                    <div className="text-right">
                      <div className="hidden sm:block text-xs uppercase tracking-[0.2em] opacity-70 font-black">Score de Seguridad</div>
                      <div className={`text-3xl font-mono font-black ${analysis.score < 30 ? 'animate-pulse' : ''}`}>
                        {analysis.score}<span className="text-sm opacity-50">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis - Hidden in Quick Mode */}
              {!quickMode && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 hover:border-emerald-500/30 transition-colors">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-emerald-400">
                      <Activity className="w-5 h-5" />
                      Razonamiento del Mercado
                    </h3>
                    <p className="text-zinc-400 leading-relaxed font-medium">
                      {analysis.reasoning}
                    </p>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 hover:border-blue-500/30 transition-colors">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-blue-400">
                      <Info className="w-5 h-5" />
                      Factores Clave
                    </h3>
                    <ul className="space-y-3">
                      {analysis.keyFactors.map((factor, i) => (
                        <li key={i} className="flex items-start gap-3 text-zinc-400 font-medium">
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500/50 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TradingView Widget - Solo para Tokens */}
              {!quickMode && activeTab === 'tokens' && selectedCoin.symbol && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 overflow-hidden h-[500px]">
                  <iframe
                    src={`https://s.tradingview.com/widgetembed/?symbol=CRYPTO:${selectedCoin.symbol.toUpperCase()}USD&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&wordwrap=1&no_referral_id=1`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Stats Grid - Hidden in Quick Mode */}
              {!quickMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Market Cap', value: `$${((selectedCoin.market_data?.market_cap?.usd || 0) / 1e9).toFixed(2)}B` },
                    { label: 'Volumen 24h', value: `$${((selectedCoin.market_data?.total_volume?.usd || 0) / 1e9).toFixed(2)}B` },
                    { label: 'Cambio 7d', value: `${(selectedCoin.market_data?.price_change_percentage_7d || 0).toFixed(2)}%`, color: (selectedCoin.market_data?.price_change_percentage_7d || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                    { label: 'Cambio 30d', value: `${(selectedCoin.market_data?.price_change_percentage_30d || 0).toFixed(2)}%`, color: (selectedCoin.market_data?.price_change_percentage_30d || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-1 font-black">{stat.label}</div>
                      <div className={`text-lg font-mono font-black ${stat.color || ''}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Search className="w-10 h-10" />
              </div>
              <p className="text-2xl font-black italic uppercase tracking-tighter">Busca un token para empezar</p>
              <p className="text-sm mt-2 font-medium">WhaleBrain AI evaluará el riesgo por ti</p>
            </div>
          )}
        </main>
      </div>

      {/* Mini Chat UI */}
      {!quickMode && (
        <div className="fixed bottom-6 right-6 z-[100]">
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[380px] h-[550px] max-h-[70vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[110]"
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/50 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full border border-emerald-500/30 flex items-center justify-center overflow-hidden">
                      <img src={WHALE_IMAGE} alt="Whale" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="text-sm font-black uppercase italic tracking-tight">Whale Chat</div>
                      <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        En línea
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowChat(false)} className="p-2 hover:bg-zinc-700 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-3 flex flex-wrap gap-2 max-w-full border-b border-zinc-800 bg-zinc-900/30">
                  {[
                    ...(degenMode ? [
                      { label: 'Simulador All-In', icon: Zap, prompt: 'Haz un simulador de All-In para esta moneda con 1000 USDT.' },
                      { label: 'Pump & Dump?', icon: AlertTriangle, prompt: '¿Esto huele a Pump & Dump coordinado?' },
                    ] : []),
                    { label: 'Simular Posición', icon: Activity, prompt: 'Si entro con 500 USDT en esta moneda, ¿cuánto puedo perder en el peor caso?' },
                    { label: 'Explicar L2', icon: Info, prompt: 'Explícame qué es un Layer 2 como si tuviera 5 años' },
                    { label: 'Comparar', icon: TrendingUp, prompt: 'Compara esta moneda con su principal competidor' },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (soundEnabled && audioRef.current) audioRef.current.pause();
                        setChatInput(action.prompt);
                      }}
                      className="flex items-center gap-2 shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <action.icon className="w-3 h-3 text-emerald-400" />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-zinc-900/80">
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] p-4 rounded-3xl text-sm relative ${msg.role === 'user'
                        ? 'bg-emerald-500 text-white rounded-tr-none font-bold shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-800/90 text-zinc-200 rounded-tl-none border border-zinc-700/50 shadow-2xl'
                        }`}>
                        {msg.role === 'model' && (
                          <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg">
                            <Brain className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {msg.role === 'model' ? (
                          <div className="markdown-body">
                            <Markdown
                              components={{
                                li: ({ node, children, ...props }) => (
                                  <li className="flex items-start gap-2 mb-2" {...props}>
                                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                    <div className="flex-1">{children}</div>
                                  </li>
                                ),
                              }}
                            >
                              {msg.text}
                            </Markdown>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-zinc-800/90 p-4 rounded-3xl rounded-tl-none border border-zinc-700/50 flex items-center gap-1">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Image Preview */}
                {chatImage && (
                  <div className="px-4 pt-3 pb-2 bg-zinc-900/50">
                    <div className="relative inline-block group">
                      <img src={chatImage} alt="Upload preview" className="h-16 max-w-full object-contain rounded-xl border border-zinc-700 shadow-lg shadow-black/50" />
                      <button
                        onClick={() => setChatImage(null)}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 rounded-full p-1 shadow-lg transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat Input */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                  <div className="relative flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setChatImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                        e.target.value = ''; // Permite subir la misma foto de nuevo si la borra
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Analizar captura o gráfico"
                      className="p-3 bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-2xl border border-zinc-700 hover:border-emerald-500/50 transition-colors shrink-0 shadow-inner"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (!items) return;
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                              const file = items[i].getAsFile();
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setChatImage(reader.result as string);
                                reader.readAsDataURL(file);
                                // Prevenir que pegue texto de nombre de archivo
                                e.preventDefault();
                              }
                            }
                          }
                        }}
                        placeholder={chatImage ? "Escribe algo sobre la imagen..." : "Pregúntale a la ballena (o pegá una imagen)..."}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 pl-4 pr-12 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 text-sm transition-all"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={chatLoading || (!chatInput.trim() && !chatImage)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowChat(!showChat)}
            className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-2xl shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {showChat ? <X className="w-7 h-7 relative z-10" /> : <MessageSquare className="w-7 h-7 relative z-10" />}
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-16 mt-12 flex flex-col items-center space-y-8 z-10 relative">
        {/* Aviso Legal Box */}
        <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-400 text-center leading-relaxed box-border shadow-xl">
          <span className="text-amber-500 font-bold">⚠️ Aviso Legal:</span> Esta herramienta es <span className="font-bold text-zinc-300">exclusivamente educativa e informativa</span>. Los cálculos son hipotéticos y no representan rendimientos garantizados. No constituye asesoramiento financiero, de inversión, legal ni fiscal. Invertir en criptomonedas conlleva riesgos significativos, incluida la pérdida total del capital. Consulte a un asesor financiero profesional antes de tomar decisiones de inversión.
        </div>

        {/* Desarrollado por */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[13px] font-black uppercase tracking-widest mt-4">
          <span className="text-zinc-500 flex items-center gap-2">
            Desarrollado por <span className="bg-gradient-to-r from-blue-400 via-blue-200 to-white bg-clip-text text-transparent text-sm">LCA ITECH</span>
          </span>
          <span className="hidden sm:block text-zinc-700">|</span>
          <span className="text-zinc-500 flex items-center gap-2">
            Potenciado por <span className="text-zinc-300 text-sm">InvitIA Studio</span>
          </span>
        </div>

        {/* Social Icons */}
        <div className="flex items-center gap-4 sm:gap-6 mt-2">
          {/* X / Twitter */}
          <a href="https://x.com/LCA_ITECH" target="_blank" rel="noopener noreferrer" className="p-2 sm:p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all shadow-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          {/* Instagram */}
          <a href="https://www.instagram.com/learncryptoacademy/" target="_blank" rel="noopener noreferrer" className="p-2 sm:p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all shadow-lg">
            <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
          </a>
          {/* Telegram */}
          <a href="https://t.me/LCAITECH_OFICIAL" target="_blank" rel="noopener noreferrer" className="p-2 sm:p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all shadow-lg">
            <Send className="w-5 h-5 sm:w-6 sm:h-6" />
          </a>
          {/* Invitia Icon */}
          <a href="https://www.instagram.com/invitia.studio/" target="_blank" rel="noopener noreferrer" className="p-2 sm:p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all shadow-lg">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-blue-500 to-amber-500 flex items-center justify-center text-white">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </a>
        </div>

        {/* Pills */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
          {/* CoinGecko Pill */}
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-3xl shadow-lg">
            <div className="w-5 h-5 bg-[#8dc63f] rounded-full flex items-center justify-center p-0.5 shadow-inner">
              <img src="https://static.coingecko.com/s/coingecko-logo-8903d34a19cf7469709f7830439660825021e4ad79afcb20057ca6f9790406b5.png" className="w-[120%] h-auto invert brightness-200 ml-1" alt="CG" style={{ clipPath: 'circle(40% at center)' }} />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Powered by <span className="text-[#8DC63F] font-black">CoinGecko API</span></span>
          </div>
          {/* InvitIA Pill */}
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-3xl shadow-lg">
            <div className="w-4 h-4 rounded-sm bg-gradient-to-tr from-blue-500 to-amber-500 flex items-center justify-center text-[8px] font-black text-black">IN</div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Potenciado por <span className="font-bold text-zinc-300">InvitIA Studio</span></span>
          </div>
        </div>

        {/* Links Bottom */}
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-widest text-zinc-700 mt-8 mb-4">
          <a href="#" className="hover:text-zinc-400 transition-colors">Política de Privacidad</a>
          <span className="text-zinc-900 hidden sm:block">|</span>
          <a href="#" className="hover:text-zinc-400 transition-colors">Términos de Uso</a>
          <span className="text-zinc-900 hidden sm:block">|</span>
          <a href="https://lcaitechs.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Acerca de LCA ITECH</a>
        </div>
      </footer>
    </div>
  );
}

// V5 FINAL ELEVENLABS FIX - CACHE BUSTER 00:41
