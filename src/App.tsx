import React, { useState, useEffect, useRef } from 'react';
import {
  Search, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, Brain, Info, Loader2, MessageSquare, Send, X, User,
  Copy, Share2, History, Zap, Volume2, VolumeX, ArrowLeftRight,
  Briefcase, ShieldAlert, Settings, Coins, Wallet, Instagram, Twitter, Flame, Trophy, ClipboardPaste, Cpu, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { CoinData, SearchResult, AnalysisResult, ChatMessage } from './types';
import { analyzeCoin, chatWithWhale, summarizeForAudio } from './services/aiService';
import { CalculatorModal } from './components/CalculatorModal';

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
  const [tonConnectUI] = useTonConnectUI();
  const [showEnergyStore, setShowEnergyStore] = useState(false);
  const MASTER_WALLET = "UQA-NgT-KI4FF17BSIxw1ZUsN0a0yEzARUECQwV7oS-f7pJv"; // Telegram Wallet Oficial

  const handleBuyEnergy = async (tonAmount: number, creditsToAdd: number) => {
    if (!tonConnectUI.connected) {
      alert("Conectá tu wallet TON primero loco!");
      return;
    }
    try {
      setLoading(true);
      setLoadingMessage('Generando contrato inteligente de recarga...');
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: MASTER_WALLET,
            amount: (tonAmount * 1e9).toString(), // Convert TON to nanoTON
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);

      // Actualizar Base de Datos
      try {
        const tgId = tgUser?.id;
        if (tgId) {
          const addRes = await fetch('/api/add-energy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: tgId, creditsToAdd, txHash: 'optimistic' })
          });
          const addData = await addRes.json();
          if (addData.newCredits) {
            setCredits(addData.newCredits);
          } else {
            setCredits(prev => (prev || 0) + creditsToAdd); // fallback
          }
        } else {
          setCredits(prev => (prev || 0) + creditsToAdd); // Fallback local
        }
      } catch (dbError) {
        console.error('Fallo sumando en DB:', dbError);
        setCredits(prev => (prev || 0) + creditsToAdd); // Optimistic Update Fallback
      }

      setShowEnergyStore(false);
      alert(`¡Compra exitosa! Se acreditaron ${creditsToAdd} de Energía.`);
    } catch (e) {
      console.error(e);
      alert("Transacción cancelada o fallida.");
    } finally {
      setLoading(false);
    }
  };

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
  const [audioLoading, setAudioLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [degenMode, setDegenMode] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [rataMode, setRataMode] = useState(false);
  const [traderMode, setTraderMode] = useState(false);
  const [casinoMode, setCasinoMode] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Audio UX Helpers
  const playClick = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } catch (e) { console.error("WebAudio Ping Blocked", e); }
  };

  const playSound = (filename: string) => {
    try {
      const a = new Audio(`/${filename}`);
      a.volume = 0.6;
      a.play().catch(e => console.error("Audio File Blocked", e));
    } catch (e) { console.error("Audio Instance Failed", e); }
  };

  // Saludo Automático
  useEffect(() => {
    if (!tgUser?.first_name) return;
    const timeout = setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastGreeting = localStorage.getItem('whale_last_greeting');
      const inauguralDone = localStorage.getItem('whale_inaugural_greeting');

      if (!inauguralDone) {
        localStorage.setItem('whale_inaugural_greeting', 'done');
        localStorage.setItem('whale_last_greeting', todayStr);
        const greetingMsg = `¡Bienvenido soldado ${tgUser.first_name}! Soy Neural Guru, tu ballena de cabecera. Esta app es el búnker definitivo de LCA, un loco demente experto en DEFI, cripto e IA que juntó todas las herramientas acá para que revientes el mercado. Preguntame lo que quieras. Para una experiencia más cómoda y de verdadero Degen, te sugiero fuertemente usar Telegram Desktop.`;
        setChatMessages(prev => prev.length === 0 ? [{ role: 'model', text: greetingMsg }] : prev);
        setShowChat(true);
      } else if (lastGreeting !== todayStr) {
        localStorage.setItem('whale_last_greeting', todayStr);
        const hour = new Date().getHours();
        let timeOfDay = "buen día";
        if (hour >= 12 && hour < 20) timeOfDay = "buenas tardes";
        if (hour >= 20) timeOfDay = "buenas noches";

        const greetingMsg = `¡${timeOfDay} soldado ${tgUser.first_name}! Acá está la ballena lista para otra sesión de scaneo en la blockchain. ¿Qué andamos buscando hoy?`;
        setChatMessages(prev => prev.length === 0 ? [{ role: 'model', text: greetingMsg }] : prev);
        setShowChat(true);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [tgUser]);
  const [activeTab, setActiveTab] = useState<'tokens' | 'contracts' | 'wallets' | 'compare' | 'portfolio' | 'academy' | 'airdrops'>('tokens');
  const [compareAddresses, setCompareAddresses] = useState({ addr1: '', addr2: '' });
  const [compareResults, setCompareResults] = useState<{ res1: AnalysisResult | null, res2: AnalysisResult | null }>({ res1: null, res2: null });

  // Saludo Automático
  useEffect(() => {
    if (!tgUser?.first_name) return;
    const timeout = setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastGreeting = localStorage.getItem('whale_last_greeting');
      const inauguralDone = localStorage.getItem('whale_inaugural_greeting');

      if (!inauguralDone) {
        localStorage.setItem('whale_inaugural_greeting', 'done');
        localStorage.setItem('whale_last_greeting', todayStr);
        const greetingMsg = `¡Bienvenido soldado ${tgUser.first_name}! Soy Neural Guru, tu ballena de cabecera. Esta app es el búnker definitivo de LCA, un loco demente experto en DEFI, cripto e IA que juntó todas las herramientas acá para que revientes el mercado. Preguntame lo que quieras.`;
        setChatMessages(prev => prev.length === 0 ? [{ role: 'model', text: greetingMsg }] : prev);
        setShowChat(true);
      } else if (lastGreeting !== todayStr) {
        localStorage.setItem('whale_last_greeting', todayStr);
        const hour = new Date().getHours();
        let timeOfDay = "buen día";
        if (hour >= 12 && hour < 20) timeOfDay = "buenas tardes";
        if (hour >= 20) timeOfDay = "buenas noches";

        const greetingMsg = `¡${timeOfDay} soldado ${tgUser.first_name}! Acá está la ballena lista para otra sesión de scaneo en la blockchain. ¿Qué andamos buscando hoy?`;
        setChatMessages(prev => prev.length === 0 ? [{ role: 'model', text: greetingMsg }] : prev);
        setShowChat(true);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [tgUser]);

  // Telegram Mini App Initialization
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();

      // Deep Linking hook (startapp=airdrops)
      if (tg.initDataUnsafe?.start_param === 'airdrops') {
        setActiveTab('airdrops');
        setRataMode(true);
      }

      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user);

        // Registrar en Supabase y obtener créditos silenciosamente
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tgUser: tg.initDataUnsafe.user })
        })
          .then(res => res.json())
          .then(data => {
            if (data.credits !== undefined) setCredits(data.credits);
          })
          .catch(err => console.error("Fallo registrando en base de datos:", err));
      }
    }
  }, []);

  // Haptic Feedback Helper
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'heavy') => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style);
    }
  };

  // Si se activa Modo Rata, forzamos a la pestaña de airdrops
  useEffect(() => {
    if (rataMode) setActiveTab('airdrops');
  }, [rataMode]);

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
  // Portfolio Wallet
  const [portfolioWallet, setPortfolioWallet] = useState(localStorage.getItem('whale_portfolio_wallet') || '');
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (portfolioWallet) {
      // Auto-fetch the wallet security score on load
      const fetchPortfolioSecurity = async () => {
        try {
          const res = await analyzeCoin({ id: portfolioWallet, name: 'Mi Billetera' } as any, degenMode, 'wallet', quickMode);
          setPortfolioAnalysis(res);
        } catch (err) {
          console.error(err);
        }
      };
      fetchPortfolioSecurity();
    }
  }, [portfolioWallet, degenMode]);

  const savePortfolioWallet = (address: string) => {
    setPortfolioWallet(address);
    localStorage.setItem('whale_portfolio_wallet', address);
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
    if (!audioRef.current || audioLoading) return;

    // Mobile/Safari Async Audio Unlock Workaround
    audioRef.current.play().catch(() => { });

    try {
      if (credits !== null && credits <= 0) {
        triggerToast("¡ENERGÍA AGOTADA! GASTASTE TUS CRÉDITOS DIARIOS. VOLVÉ MAÑANA GORDO.");
        return;
      }

      setAudioLoading(true);
      // Limpiar markdown y silenciar direcciones hexadecimales para no quemar tokens de TTS
      const cleanText = text
        .replace(/[*_#]/g, '')
        .replace(/0x[a-fA-F0-9]{2,}\.\.\.[a-fA-F0-9]{2,}/gi, 'esta billetera')
        .replace(/0x[a-fA-F0-9]{5,}/gi, 'este hash');

      const compressedScript = await summarizeForAudio(cleanText);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: compressedScript, tg_id: tgUser?.id })
      });

      if (res.ok) {
        setCredits(prev => prev !== null ? prev - 1 : prev); // Restamos crédito igual para gamificación
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        audioRef.current.play().catch(e => {
          console.error("Audio play error:", e);
          triggerToast(`SISTEMA AUDIO BLOQUEADO: ${e.message}`);
        });
      } else {
        const errText = await res.text();
        console.error("TTS API Error:", errText);
        triggerToast(`API RECHAZADA: ${errText.slice(0, 60)}`);
      }
    } catch (err: any) {
      console.error('Error playing TTS:', err);
      triggerToast(`Fallo de Red TTS: ${err.message}`);
    } finally {
      setAudioLoading(false);
    }
  };

  const generatePremiumVerdict = async () => {
    if (credits === null || credits < 1) {
      triggerToast('Batería insuficiente. Recargá energía para el Veredicto Premium.');
      setShowEnergyStore(true);
      return;
    }

    try {
      setChatLoading(true);
      setAudioLoading(true);

      let dataContext = "NO HAY TOKEN SELECCIONADO. Haz un análisis macro del mercado cripto hoy.";

      if (selectedCoin) {
        dataContext = `
📊 DATOS HARDCORE DEL ESCÁNER DEXSCREENER:
- Nombre: ${selectedCoin.name} (${selectedCoin.symbol})
- Red/Chain: ${selectedCoin.chain_id?.toUpperCase() || 'Desconocida'}
- Precio: $${selectedCoin.market_data?.current_price?.usd || 'N/D'}
- Liquidez Total (USD): $${selectedCoin.liquidity?.usd || 'N/D'}
- Volumen 24h: $${selectedCoin.market_data?.total_volume?.usd || 'N/D'}
- Market Cap / FDV: $${selectedCoin.market_data?.market_cap?.usd || selectedCoin.fdv || 'N/D'}
- Txns 24h (Compras/Ventas): ${selectedCoin.txns?.h24?.buys || 0} compras / ${selectedCoin.txns?.h24?.sells || 0} ventas.
`;
      } else {
        try {
          const btcRes = await fetch('/api/coin?id=bitcoin&degen=false');
          if (btcRes.ok) {
            const btcData = await btcRes.json();
            const btcPrice = btcData.market_data?.current_price?.usd;
            const btcChange = btcData.market_data?.price_change_percentage_24h;
            if (btcPrice) {
              dataContext = `NO HAY TOKEN SELECCIONADO. Haz un análisis macro del mercado cripto hoy. DATOS EN TIEMPO REAL: Bitcoin (BTC) está en $${btcPrice.toLocaleString()} (Cambio 24h: ${btcChange || 0}%). Usa este dato para no alucinar precios viejos.`;
            }
          }
        } catch (err) {
          console.error("Error fetching live BTC for macro verdict:", err);
        }
      }

      const prompt = `[SISTEMA PREMIUM DESBLOQUEADO]: EL USUARIO ACABA DE PAGAR 1 BATERÍA POR ESTO. Sos la Ballena experta y tenés acceso VIP a esta data on-chain. Resumile brutalmente qué significa esto en un AUDIO EXPLICATIVO (responde 1 solo párrafo directo para TTS, sin usar markdown, asteriscos ni listas). 
${dataContext}
INSTRUCCIONES CLAVE: 
1. Si tiene poca liquidez decile "TE VAN A RUGPULLAR". 
2. Mencioná en qué Blockchain está (ej: Solana, Base, ETH).
3. Si la liquidez o los datos duros son buenos pero te falta info de Top Holders o Supply, EXPLICÁLE verbalmente: "yo soy una ballena de liquidez, para ver los top holders metete al contrato en Solscan/Etherscan a mano porque acá importan los tiburones actuando en Dex Screener".
4. Hablá como un Degen cínico y experto. Usá lunfardo argentino moderado.
5. DEBES IGNORAR TOTALMENTE EL HISTORIAL DE CHAT PASADO PARA NO REPETIRTE. Da un Veredicto Fresco.`;

      const isolatedContext: ChatMessage[] = [{ role: 'user', text: prompt }];
      const responseText = await chatWithWhale(
        isolatedContext,
        selectedCoin || undefined,
        degenMode,
        quickMode,
        rataMode ? 'airdrops' : (degenMode ? 'contracts' : 'tokens'),
        rataMode
      );

      setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
      await playWhaleAudio(responseText);

    } catch (err) {
      console.error(err);
      triggerToast("Error generando Veredicto Premium.");
    } finally {
      setChatLoading(false);
      setAudioLoading(false);
    }
  };

  const generateTraderNewsAudio = async () => {
    if (credits === null || credits < 1) {
      triggerToast('Batería insuficiente. Recargá energía para escuchar las Noticias Macro.');
      setShowEnergyStore(true);
      return;
    }

    try {
      setChatLoading(true);
      setAudioLoading(true);
      
      const prompt = `[SISTEMA PREMIUM DESBLOQUEADO]: EL USUARIO ACABA DE PAGAR 1 BATERÍA POR ESTO. Eres "Neural Guru", pero para este reporte adopta el rol de un LOCUTOR DE RADIO PROFESIONAL, INSTITUCIONAL Y SERIO. 
No te burles del usuario. No uses sarcasmo. Da un reporte macroeconómico y cripto del día de forma coherente y objetiva, como si fuera un boletín informativo de primera línea.
Haz un resumen de lo que está pasando hoy con Bitcoin, Ethereum, y el sentimiento general del mercado.
Si no tienes noticias en vivo exactas de hoy, da un panorama general de análisis técnico y macro realista sobre inflación, ETFs, liquidez, y tasas de interés.
EL TEXTO SERÁ LEÍDO POR TTS, RESPONSDE 1 PÁRRAFO UNICAMENTE.`;

      const isolatedContext: ChatMessage[] = [{ role: 'user', text: prompt }];
      const responseText = await chatWithWhale(
        isolatedContext,
        undefined,
        false,
        false,
        'tokens',
        false
      );
      
      setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
      await playWhaleAudio(responseText);
    } catch (err) {
      console.error(err);
      triggerToast("Error generando Noticias Macro.");
    } finally {
      setChatLoading(false);
      setAudioLoading(false);
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

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?query=${val}&degen=${degenMode}`);
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
    if (soundEnabled && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "data:audio/mp3;base64,"; // Limpiar buffer viejo
      audioRef.current.play().catch(() => { });
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
      const res = await fetch(`/api/coin?id=${coinId}&degen=${degenMode}`);
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
    } catch (err) {
      console.error(err);
      setChatMessages([{ role: 'model', text: "Esta dirección está más vacía que mi billetera después de un rugpull, rey. 😂" }]);
    } finally {
      setLoading(false);
    }
  };

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);

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

    // Mostramos la Card Visual cinematográfica para que el usuario haga captura de pantalla
    setShowShareCard(true);
  };

  const handleSendMessage = async (overrideText?: string | React.MouseEvent | any) => {
    const inputText = typeof overrideText === 'string' ? overrideText : chatInput;
    if ((!inputText.trim() && !chatImage) || chatLoading) return;

    // Mobile iOS: Frenar audio anterior y desbloquear el contexto de audio sincrónicamente en este click originario
    if (soundEnabled && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "data:audio/mp3;base64,"; // Limpiar buffer viejo
      audioRef.current.play().catch(() => { });
    }

    const finalInput = inputText.trim() || (chatImage ? "Che ballena, fíjate lo que te adjunto en esta imagen y tirame tu análisis Degen." : "");
    const userMsg: ChatMessage = { role: 'user', text: finalInput, image: chatImage || undefined };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatImage(null);
    setChatLoading(true);

    try {
      const response = await chatWithWhale(newHistory, selectedCoin || undefined, degenMode, quickMode, activeTab, rataMode);
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
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] bg-zinc-900 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] text-emerald-400 font-black uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-3 whitespace-nowrap"
          >
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Card Alpha Receipt (Visual Overlay UI para Capturas de Pantalla) */}
      <AnimatePresence>
        {showShareCard && selectedCoin && analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <div className="w-full max-w-sm relative">
              <button
                onClick={() => setShowShareCard(false)}
                className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>

              <div id="share-card-content" className="bg-[#0f172a] border border-cyan-500/30 rounded-[2rem] p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <Brain className="w-8 h-8 text-cyan-400" />
                  <div>
                    <h3 className="text-cyan-400 font-black tracking-widest text-xs uppercase">WhaleBrain AI</h3>
                    <p className="text-zinc-500 text-[10px] uppercase font-mono">Alpha Receipt v1.0</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <img src={selectedCoin.image.large} alt={selectedCoin.name} className="w-16 h-16 rounded-2xl shadow-lg border border-zinc-700/50" />
                  <div>
                    <h2 className="text-2xl font-black italic uppercase leading-none">{selectedCoin.name}</h2>
                    <span className="text-zinc-500 font-mono text-sm tracking-widest">{selectedCoin.symbol}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                  <div className="bg-black/40 rounded-2xl p-4 border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Score Global</p>
                    <p className={`text-4xl font-mono font-black ${analysis.score < 30 ? 'text-rose-500' : 'text-emerald-400'}`}>
                      {analysis.score}<span className="text-sm text-zinc-600">/100</span>
                    </p>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-4 border border-zinc-800 flex flex-col justify-center">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Veredicto</p>
                    <p className={`text-sm font-black uppercase ${analysis.score < 30 ? 'text-rose-400' : (analysis.score < 70 ? 'text-amber-400' : 'text-emerald-400')}`}>
                      {getRecommendationLabel(analysis.recommendation)}
                    </p>
                  </div>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 relative z-10">
                  <p className="text-cyan-400 font-black italic text-sm leading-relaxed text-center">
                    "{analysis.catchphrase}"
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center text-zinc-500 text-xs font-black tracking-widest uppercase animate-pulse">
                📸 Saca captura de pantalla para compartir
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Trader Mode Pulse */}
      <AnimatePresence>
        {traderMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none border-[8px] md:border-[16px] border-indigo-500/30 shadow-[inset_0_0_200px_rgba(99,102,241,0.3)] transition-colors duration-1000"
          >
            <div className="absolute inset-0 bg-indigo-500/[0.02] mix-blend-overlay pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Casino Mode Roulette Flasher */}
      <AnimatePresence>
        {casinoMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none transition-colors duration-[400ms]"
          >
            <style>{`
              @keyframes roulette-flash {
                0%, 100% { box-shadow: inset 0 0 300px rgba(9, 9, 11, 0.4); border-color: rgba(9, 9, 11, 0.8); }
                33% { box-shadow: inset 0 0 300px rgba(239, 68, 68, 0.8); border-color: rgba(239, 68, 68, 1); }
                66% { box-shadow: inset 0 0 300px rgba(34, 197, 94, 0.6); border-color: rgba(34, 197, 94, 0.8); }
              }
            `}</style>
            <div className="absolute inset-0 border-[12px] md:border-[24px]" style={{ animation: 'roulette-flash 1s infinite' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Degen Mode Warning Frame */}
      <AnimatePresence>
        {degenMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none border-[8px] md:border-[16px] border-orange-500/40 shadow-[inset_0_0_250px_rgba(249,115,22,0.35)] transition-colors duration-1000"
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')" }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rata Mode Frame Glow & Falling Rats Effect */}
      <AnimatePresence>
        {rataMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none border-[8px] md:border-[16px] border-yellow-500/50 shadow-[inset_0_0_300px_rgba(234,179,8,0.5)] transition-colors duration-1000"
          >
            <div className="absolute inset-0 border-[4px] border-yellow-400/60 animate-pulse mix-blend-overlay" />
            <div className="absolute inset-0 bg-yellow-500/[0.03]" />

            <style>{`
              @keyframes fall-rata {
                0% { transform: translateY(-10vh) rotate(0deg); }
                100% { transform: translateY(110vh) rotate(360deg); }
              }
              .rata-pixel {
                position: absolute;
                font-size: 1.5rem;
                opacity: 0.2;
                animation: fall-rata linear infinite;
                will-change: transform;
              }
            `}</style>
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(15)].map((_, i) => (
                <div
                  key={`rata-${i}`}
                  className="rata-pixel"
                  style={{
                    left: `${Math.random() * 100}vw`,
                    animationDuration: `${Math.random() * 5 + 3}s`,
                    animationDelay: `${Math.random() * 5}s`
                  }}
                >
                  🐀
                </div>
              ))}
            </div>
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

      {/* Global Action Toggles */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 items-end">
        <TonConnectButton className="mb-2 shadow-[0_0_15px_rgba(0,152,234,0.3)] transition-all hover:scale-105" />

        {credits !== null && (
          <button
            onClick={() => { triggerHaptic('heavy'); setShowEnergyStore(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border bg-zinc-900/80 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-md hover:bg-cyan-900/40 transition-all group scale-100 hover:scale-105 active:scale-95"
          >
            <span className="text-sm font-black italic">{credits}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 group-hover:text-cyan-400 transition-colors">⚡ BATERÍA</span>
          </button>
        )}

        <button
          onClick={() => { playClick(); setShowModes(!showModes); }}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-lg backdrop-blur-md scale-100 hover:scale-105 active:scale-95 ${showModes ? 'bg-zinc-800 border-zinc-500 text-zinc-300' :
            traderMode ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.6)]' :
              degenMode ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.6)]' :
                casinoMode ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse' :
                  rataMode ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)]' :
                    'bg-zinc-900/80 border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10 hover:border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-[pulse_2s_ease-in-out_infinite]'
            }`}
        >
          {traderMode && !showModes ? <TrendingUp className="w-5 h-5 animate-pulse" /> :
            degenMode && !showModes ? <Activity className="w-5 h-5 animate-bounce" /> :
              casinoMode && !showModes ? <Flame className="w-5 h-5 animate-pulse" /> :
                rataMode && !showModes ? <Coins className="w-5 h-5 animate-bounce" /> :
                  <Cpu className={`w-5 h-5 ${showModes ? 'animate-pulse text-zinc-400' : ''}`} />}
          <span className="text-xs font-black uppercase tracking-widest">
            {showModes ? 'CERRAR' :
              traderMode ? 'TRADER' :
                degenMode ? 'DEGEN' :
                  casinoMode ? 'CASINO' :
                    rataMode ? 'RATA' : 'MODOS'}
          </span>
          {!showModes && !traderMode && !degenMode && !casinoMode && !rataMode && (
            <span className="absolute -top-3 -left-3 bg-red-500 border border-red-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none">
              ¡MÍRAME!
            </span>
          )}
        </button>

        <AnimatePresence>
          {showModes && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="flex flex-col gap-3 items-end mt-1 origin-top-right relative z-50 bg-black/40 p-4 rounded-3xl border border-zinc-500/20 backdrop-blur-xl shadow-2xl"
            >
              <button
                onClick={() => {
                  playClick();
                  triggerHaptic('heavy');
                  setShowChat(true);
                  const antiRoboMsg = "🚨 **ESCÁNER ANTI-ROBO INICIADO.** \n\nSubime ACÁ MISMO (con el iconito verde oscuro de imagen que tenés a la izquierda del texto) la **captura de pantalla** de la aprobación de MetaMask, Phantom o de la Web turbia que estás por firmar.\n\nTe hago una radiografía y te digo si es un Honeypot, un Scam, o si vas a terminar perdiendo la casa.";
                  setChatMessages(prev => prev.some(m => m.text.includes("ESCÁNER ANTI-ROBO")) ? prev : [...prev, { text: antiRoboMsg, role: 'model' }]);
                  setShowModes(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full border bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.8)] hover:shadow-[0_0_50px_rgba(249,115,22,1)] transition-all hover:bg-orange-500/40 font-black animate-pulse"
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest sm:inline">Anti Robo</span>
              </button>

              <button
                onClick={() => { if (!traderMode) playSound('modo_trader.mp3'); else playClick(); setTraderMode(!traderMode); setDegenMode(false); setRataMode(false); setCasinoMode(false); if (!traderMode) setActiveTab('tokens'); setShowModes(false); triggerHaptic('light'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${traderMode
                  ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.8)] scale-105'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  }`}
              >
                <TrendingUp className={`w-4 h-4 ${traderMode ? 'animate-pulse text-indigo-200' : ''}`} />
                <span className="text-xs font-black uppercase tracking-widest text-shadow-sm">TRADER {traderMode ? 'ON' : ''}</span>
              </button>

              <button
                onClick={() => { if (!degenMode) playSound('modo_degen.mp3'); else playClick(); setDegenMode(!degenMode); setTraderMode(false); setRataMode(false); setCasinoMode(false); if (!degenMode) setActiveTab('contracts'); setShowModes(false); triggerHaptic('light'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${degenMode
                  ? 'bg-orange-500/30 border-orange-500 text-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.8)] scale-105'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-orange-500/50 hover:text-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                  }`}
              >
                <Activity className={`w-4 h-4 ${degenMode ? 'animate-bounce text-orange-200' : ''}`} />
                <span className="text-xs font-black uppercase tracking-widest text-shadow-sm">DEGEN {degenMode ? 'ON' : ''}</span>
              </button>

              <button
                onClick={() => { if (!casinoMode) playSound('casino_machine.mp3'); else playClick(); setCasinoMode(!casinoMode); setTraderMode(false); setDegenMode(false); setRataMode(false); if (!casinoMode) setActiveTab('tokens'); setShowModes(false); triggerHaptic('light'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${casinoMode
                  ? 'bg-red-500/30 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-red-500/50 hover:text-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  }`}
              >
                <Flame className={`w-4 h-4 ${casinoMode ? 'animate-pulse text-red-200' : ''}`} />
                <span className="text-xs font-black uppercase tracking-widest text-shadow-sm">CASINO {casinoMode ? 'ON' : ''}</span>
              </button>

              <button
                onClick={() => { if (!rataMode) playSound('modo_rata.mp3'); else playClick(); setRataMode(!rataMode); setTraderMode(false); setDegenMode(false); setCasinoMode(false); if (!rataMode) setActiveTab('airdrops'); setShowModes(false); triggerHaptic('light'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${rataMode
                  ? 'bg-yellow-500/30 border-yellow-500 text-yellow-300 shadow-[0_0_30px_rgba(234,179,8,0.8)] scale-105'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-yellow-500/50 hover:text-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                  }`}
              >
                <Coins className={`w-4 h-4 ${rataMode ? 'animate-bounce text-yellow-200' : ''}`} />
                <span className="text-xs font-black uppercase tracking-widest text-shadow-sm">RATA {rataMode ? 'ON' : ''}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Glow */}
      <div className={`fixed inset-0 overflow-hidden pointer-events-none transition-colors duration-1000 ${rataMode ? 'bg-yellow-500/5' : ''}`}>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        {rataMode && <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] bg-yellow-500/10 blur-[150px] rounded-full" />}
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
            <div className={`absolute inset-0 rounded-full blur-2xl animate-pulse ${casinoMode ? 'bg-red-500/20' : 'bg-emerald-500/20'}`} />
            <div className={`relative w-full h-full rounded-full border-4 overflow-hidden ${casinoMode ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.8)] bg-red-950/50' : 'border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.8)] bg-emerald-950/50'}`}>
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
              <Brain className={`w-8 h-8 ${casinoMode ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
          </motion.div>
          {tgUser && (
            <div className={`flex items-center gap-2 px-4 py-1.5 border font-black uppercase text-[10px] rounded-full mx-auto mb-4 w-fit shadow-[0_0_15px_rgba(59,130,246,0.2)] ${casinoMode ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${casinoMode ? 'bg-red-500' : 'bg-blue-500'}`} />
              🎯 Operando {casinoMode ? 'Casino' : 'Alpha'} como @{tgUser.username || tgUser.first_name}
            </div>
          )}
          <h1 className={`text-4xl md:text-6xl font-black tracking-tight mb-2 bg-clip-text text-transparent uppercase italic transition-all duration-500 ${casinoMode ? 'bg-gradient-to-r from-white via-red-500 to-orange-500' : 'bg-gradient-to-r from-white via-emerald-400 to-blue-500'} ${degenMode ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-105' : ''}`}>
            {casinoMode ? 'TRADE LIKE A DEGEN' : 'TRADE LIKE A WHALE'}
          </h1>
          <p className={`text-xl font-black uppercase tracking-widest mb-2 drop-shadow-md ${casinoMode ? 'text-red-400 shadow-red-500/50' : 'text-emerald-400 shadow-emerald-500/50'}`}>
            {casinoMode ? 'Poné todo al rojo.' : 'Stop being the exit liquidity.'}
          </p>
          <p className="text-zinc-500 text-sm max-w-md font-medium uppercase tracking-wider">
            {casinoMode ? 'La ruleta on-chain donde las ballenas apuestan. Entrá o mirala de afuera.' : 'La IA que trackea el Smart Money antes del pump. Operá con ventaja injusta o seguí perdiendo plata.'}
          </p>
        </header>

        {/* Proof of Alpha Banner */}
        <div className={`mb-8 w-full max-w-3xl mx-auto overflow-hidden rounded-2xl border py-3 px-4 flex items-center gap-3 ${casinoMode ? 'bg-gradient-to-r from-red-500/20 via-zinc-900 to-red-500/20 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-gradient-to-r from-emerald-500/20 via-zinc-900 to-emerald-500/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'}`}>
          <span className="relative flex h-3 w-3 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${casinoMode ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${casinoMode ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          </span>
          <div className={`text-[12px] font-black uppercase tracking-widest flex-1 flex items-center overflow-hidden whitespace-nowrap ${casinoMode ? 'text-red-400' : 'text-emerald-400'}`}>
            <motion.div
              animate={{ x: ["100%", "-100%"] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="flex gap-12"
            >
              <span>{casinoMode ? '🎰 JACKPOT: 0x8aF... acaba de meter un x100 en $PNUT (Apostó $4M)' : '✅ PROOF OF ALPHA: Nuestra IA detectó $PEPE2.0 4hs antes del pump (+3500%)'}</span>
              <span>{casinoMode ? '🔥 HIGH ROLLER: La billetera de jake.eth quemó 50 ETH en un honeypot' : '🔥 SMART MONEY: 0x8aF... acaba de acumular $4M en $PNUT antes del listado en Binance (+1200%)'}</span>
              <span>{casinoMode ? '⚠️ RUGPULL ALERT: El casino cerró las puertas de $SHIBAI, $500k liquidados' : '⚠️ ALERTA RUGPULL: Detectamos honeypot oculto en $SHIBAI salvando $500k de la comunidad'}</span>
            </motion.div>
          </div>
        </div>

        {/* Smart Money Live Feed (Urgency Trigger) */}
        {!selectedCoin && activeTab === 'tokens' && !casinoMode && (
          <div className="mb-12 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-3 max-w-3xl mx-auto shadow-2xl">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-orange-400">Live: Smart Money Tracker</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                Radar Activo
              </span>
            </div>
            <div className="space-y-2 mt-2">
              {[
                { token: 'TRUMP', action: 'ACUMULANDO', amount: '$150K', time: 'hace 2 min', wallet: '0x94f...2a1', isSell: false },
                { token: 'AIX', action: 'COMPRA ROTACIÓN', amount: '$54K', time: 'hace 5 min', wallet: '0x12a...9b4', isSell: false },
                { token: 'PEPE', action: 'DUMPEANDO ALL-IN', amount: '$1.2M', time: 'hace 12 min', wallet: '0x88c...11f', isSell: true },
              ].map((alert, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-black/40 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all hover:scale-[1.01] cursor-pointer group" onClick={() => handleSearch(alert.token)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-inner ${alert.isSell ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                      ${alert.token.substring(0, 3)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">${alert.token}</div>
                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {alert.wallet}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className={`text-[11px] font-black tracking-widest uppercase px-2 py-1 rounded-md mb-1 ${alert.isSell ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {alert.action}
                      </span>
                      <span className="text-sm border-b border-dashed border-zinc-700 font-mono font-black text-white">{alert.amount}</span>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-medium whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {alert.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trader Live Feed (Audio News Trigger) */}
        {!selectedCoin && activeTab === 'tokens' && traderMode && (
          <div className="mb-12 bg-indigo-900/40 border border-indigo-500/30 rounded-3xl p-4 flex flex-col gap-3 max-w-3xl mx-auto shadow-[0_0_30px_rgba(99,102,241,0.15)] relative overflow-hidden">
             <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay pointer-events-none" />
             <div className="flex items-center justify-between px-2 pb-2 border-b border-indigo-500/30 relative z-10">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Terminal Bloomberg Cripto</span>
              </div>
            </div>
            <div className="flex justify-center mt-2 relative z-10 p-2">
                <button
                  onClick={generateTraderNewsAudio}
                  disabled={audioLoading || chatLoading}
                  className="w-full flex justify-center items-center gap-2 px-6 py-4 rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 hover:border-fuchsia-400 text-fuchsia-300 font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50"
                >
                  {audioLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6 animate-pulse" />}
                  <span>Resumen Macro (1 ⚡)</span>
                </button>
            </div>
          </div>
        )}

        {/* Casino Live: Top Memecoins */}
        {!selectedCoin && activeTab === 'tokens' && casinoMode && (
          <div className="mb-12 bg-black/60 border border-red-500/30 rounded-3xl p-4 flex flex-col gap-3 max-w-3xl mx-auto shadow-[0_0_30px_rgba(239,68,68,0.15)] relative overflow-hidden">
             <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay pointer-events-none" />
             <div className="flex items-center justify-between px-2 pb-2 border-b border-red-500/30 relative z-10">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-red-400">Ruleta Memecoin: Top 10</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                Casino Live
              </span>
            </div>
            <div className="space-y-2 mt-2 relative z-10">
              {[
                { token: 'PEPE', name: 'Pepe', network: 'ETH', mcap: '$3.5B', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                { token: 'WIF', name: 'dogwifhat', network: 'SOL', mcap: '$2.1B', style: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                { token: 'DOGE', name: 'Dogecoin', network: 'DOGE', mcap: '$18B', style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                { token: 'SHIB', name: 'Shiba Inu', network: 'ETH', mcap: '$10B', style: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                { token: 'BONK', name: 'Bonk', network: 'SOL', mcap: '$1.2B', style: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                { token: 'FLOKI', name: 'Floki', network: 'BSC', mcap: '$1.5B', style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                { token: 'BOME', name: 'BOOK OF MEME', network: 'SOL', mcap: '$700M', style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                { token: 'POPCAT', name: 'Popcat', network: 'SOL', mcap: '$500M', style: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
                { token: 'MEW', name: 'cat in a dogs world', network: 'SOL', mcap: '$400M', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                { token: 'TRUMP', name: 'MAGA', network: 'ETH', mcap: '$300M', style: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
              ].map((meme, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-900/80 rounded-2xl border border-red-500/20 hover:border-red-500/50 hover:bg-red-950/30 transition-all hover:scale-[1.01] cursor-pointer group" onClick={() => handleSearch(meme.token)}>
                  <div className="flex items-center gap-4">
                    <div className="w-8 flex justify-center text-zinc-600 font-black text-lg italic group-hover:text-red-500/50">
                      #{i + 1}
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-inner border ${meme.style}`}>
                      ${meme.token.substring(0, 4)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white group-hover:text-red-400 transition-colors">${meme.token}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{meme.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-0.5">MCAP</span>
                      <span className="text-xs font-mono font-black text-white">{meme.mcap}</span>
                    </div>
                    <span className="text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {meme.network}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {[
            { id: 'tokens', label: 'Tokens', icon: TrendingUp },
            { id: 'contracts', label: 'Contratos', icon: Activity },
            { id: 'wallets', label: 'Billeteras', icon: User },
            { id: 'academy', label: 'Academia', icon: Brain },
            { id: 'airdrops', label: 'Airdrops', icon: Coins },
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
          {activeTab === 'academy' ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">📚 Academia Degen</h2>
                <p className="text-zinc-400">Todo lo que necesitas saber para que no te arruinen en el mercado libre.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 hover:border-emerald-500/50 transition-colors">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                    <History className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-white mb-2">Stablecoins Fiat (Liquidez Real)</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">Ejemplos: <strong>USDT, USDC</strong>. Son activos colateralizados 1:1 con dólares reales guardados en bancos. Son la base "segura" del mercado crypto, usadas como refugio cuando todo cae.</p>
                  <div className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg inline-block">Riesgo: Bajo</div>
                </div>

                <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 hover:border-rose-500/50 transition-colors">
                  <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-white mb-2">Stablecoins Algorítmicas</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">Ejemplos: <strong>UST (RIP), TUSD, FRAX</strong>. No tienen dólares reales que las respalden. Usan fórmulas matemáticas o colateralización de otras cryptos. Si el algoritmo falla o hay pánico masivo, ocurre un <em>"De-Peg"</em> y se van a CERO.</p>
                  <div className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg inline-block">Riesgo: Extremo</div>
                </div>

                <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 hover:border-blue-500/50 transition-colors">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-white mb-2">LSTs (Liquid Staking Tokens)</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">Ejemplos: <strong>stETH (Lido), JitoSOL</strong>. Simulan que tus monedas originales están bloqueadas generando interés (Staking), pero de forma líquida para que puedas usarlas en DeFi al mismo tiempo. Es básicamente dinero apalancado constructivamente.</p>
                  <div className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg inline-block">Riesgo: Medio (Hackeos al protocolo)</div>
                </div>
              </div>
            </div>
          ) : activeTab === 'airdrops' ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8 relative overflow-hidden">
              {rataMode && <div className="absolute inset-0 bg-yellow-500/5 z-0 pointer-events-none" />}
              <div className="text-center mb-8 relative z-10">
                <h2 className="text-3xl font-black uppercase tracking-tight text-yellow-400 mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">🪂 Cuartel General Rata</h2>
                <p className="text-zinc-400">Guía suprema para farmear dinero del aire (Airdrops) y aplicar estrategias Degen sin morir intentándolo.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {/* Airdrops Locales */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-zinc-900/50 p-6 rounded-2xl border border-yellow-500/30">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Coins className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-yellow-500 mb-2">¿Qué es un Airdrop?</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">Protocolos que recién nacen necesitan probar sus redes (Testnets) o ganar liquidez. A cambio de interactuar repetidamente con ellos, usar puentes o depositar monedas, te recompensan enviándote tokens gratis semanas o meses después. Es dinero "fácil" pero requiere constancia.</p>
                  <ul className="text-xs text-zinc-500 space-y-2 mt-2 list-disc pl-4 font-medium">
                    <li>Usá siempre una "Burner Wallet" (Billetera quemable) secundaria.</li>
                    <li>Ojo con firmar contratos maliciosos buscando airdrops falsos en Twitter.</li>
                  </ul>
                </div>

                {/* Estrategias Degen */}
                <div className="bg-gradient-to-br from-purple-500/10 to-zinc-900/50 p-6 rounded-2xl border border-purple-500/30">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-purple-500 mb-2">Estrategias Degen (Nivel Dios)</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4"><strong>El Looping:</strong> Pones 1 ETH de garantía en un protocolo de préstamos (AAVE, MarginFi), pedís prestado USDC contra tu propio ETH, compras más ETH con ese USDC, y lo volvés a depositar como garantía para pedir más plata. Estás apalancado ganando doble o triple rentabilidad (y doble riesgo de liquidación si el mercado cae).</p>
                  <ul className="text-xs text-zinc-500 space-y-2 mt-2 list-disc pl-4 font-medium">
                    <li>Nunca pases el 60% de LTV (Relación Préstamo-Valor).</li>
                    <li>Aprovechá plataformas nuevas que pagan por usar sus préstamos.</li>
                  </ul>
                </div>
                {/* Airdrop Checker (Gamified) */}
                <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.05)] relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="text-center mb-6">
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Check Airdrop Eligibility <span className="text-yellow-500 text">with AI</span></h3>
                    <p className="text-zinc-500 font-medium max-w-lg mx-auto">Ingresá tu wallet para que WhaleBrain escanee tu actividad on-chain, analice los protocolos que estás usando, y te diga qué airdrops inminentes te estás perdiendo por no farmear como las ballenas.</p>
                  </div>

                  <div className="max-w-xl mx-auto">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Pegá tu Wallet (0x...) para escanear elegibilidad..."
                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl py-5 px-6 pr-32 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all font-mono text-sm placeholder:text-zinc-600"
                      />
                      <button
                        onClick={(e) => {
                          const inputVal = (e.target as any).previousSibling?.value || '0x...';
                          setShowToast(true);
                          setToastMessage("🚀 INTERCEPTO ON-CHAIN INICIADO... ESCANEANDO BILLETERA...");
                          setTimeout(() => setShowToast(false), 3000);
                          // Fake delay logic or just opening chat
                          setTimeout(() => {
                            setShowChat(true);
                            const msg = `Acabo de ingresar mi wallet (${inputVal}) en el Airdrop Checker. Analiza mi actividad reciente y dime qué airdrops top de 2026/2027 me estoy perdiendo y qué 3 tareas baratas puedo hacer HOY para calificar.`;
                            handleSendMessage(msg);
                          }, 1000);
                        }}
                        className="absolute right-2 top-2 bottom-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg shadow-yellow-500/20"
                      >
                        Scanear
                      </button>
                    </div>

                    {/* Hot Airdrops List (Misiones Activas) */}
                    <div className="mt-8 mb-6 text-left relative z-10 bg-black/40 p-5 rounded-3xl border border-yellow-500/20 shadow-inner">
                      <div className="flex items-center gap-2 mb-4 px-2">
                        <Flame className="w-5 h-5 text-yellow-500 animate-pulse" />
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Misiones Activas (Hot)</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { name: 'Solana (SOL)', desc: 'Ecosistema 🔥. Usá Jito o Kamino para farmear puntos.', tag: 'L1', link: 'https://jito.network', color: 'bg-purple-500' },
                          { name: 'BNB Chain', desc: 'Binance Megadrops y farmeos líquidos de bajo costo.', tag: 'L1', link: 'https://megadrop.binance.com', color: 'bg-yellow-500' },
                          { name: 'Ethereum (ETH)', desc: 'Restaking (EigenLayer, ether.fi). Mucha liquidez, alto gas.', tag: 'L1', link: 'https://ether.fi', color: 'bg-blue-600' },
                          { name: 'Monad', desc: 'Testnet activa. Farmeo rápido sin riesgo en la L1 paralela.', tag: 'L1 Hot', link: 'https://testnet.monad.xyz', color: 'bg-indigo-500' },
                          { name: 'Linea', desc: 'Campaña LXP en marcha. Interactuá con dApps.', tag: 'L2 Hot', link: 'https://linea.build', color: 'bg-cyan-500' },
                          { name: 'AAVE (Incentivos)', desc: 'Mercado Lending pagando recompensas extra (Merit) en red Base.', tag: 'Lending', link: 'https://app.aave.com', color: 'bg-violet-500' },
                          { name: 'Pixel Dungeons', desc: 'Farmea $PIXEL en la red de Ronin y acumula recompensas en este frenético juego blockchain.', tag: 'Gaming', link: 'https://pixeldungeons.xyz/', color: 'bg-emerald-500' },
                          { name: 'Ecosistema TON', desc: 'Mini-apps de Telegram. Tap-to-earn y DeFi nativo con bajo gas.', tag: 'SocialFi', link: 'https://ton.org', color: 'bg-sky-500' }
                        ].map((drop, idx) => (
                          <a key={idx} href={drop.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${drop.color} shadow-[0_0_10px_currentColor]`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">{drop.name}</span>
                                <span className="text-[9px] uppercase tracking-wider font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{drop.tag}</span>
                              </div>
                              <p className="text-xs text-zinc-500 font-medium leading-relaxed">{drop.desc}</p>
                            </div>
                            <span className="text-zinc-600 group-hover:text-yellow-400 transition-colors text-lg font-black mt-1">↗</span>
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-zinc-800/50">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-white">42+</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Protocolos Trackeados</span>
                      </div>
                      <div className="w-px h-8 bg-zinc-800" />
                      <div className="flex flex-col items-center">
                        <span className="text-2xl outline-title font-black text-transparent" style={{ WebkitTextStroke: '1px #eab308' }}>$2.5M+</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Farmeados por usuarios</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        triggerHaptic('rigid');
                        const text = encodeURIComponent("Che rata 🐀, a ver??? 👀\n\nVení a escanear tu wallet con esta IA enferma que te canta los Airdrops antes que Crypto Twitter.\n\nVoy a traer a todas las ratitas como el flautista de Hamelín 🎶🐭🚀");

                        // Limpiamos el #tgWebAppData horrible para que quede un link limpio y Telegram pueda armar el "Cartel Hermoso" (OpenGraph)
                        // NOTA: Si este bot tiene un shortname, lo ideal es usar https://t.me/TuBotName/app?startapp=airdrops
                        const cleanUrl = `${window.location.origin}${window.location.pathname}?startapp=airdrops`;
                        const url = encodeURIComponent(cleanUrl);

                        const tg = (window as any).Telegram?.WebApp;
                        if (tg?.openTelegramLink) {
                          tg.openTelegramLink(`https://t.me/share/url?url=${url}&text=${text}`);
                        } else {
                          window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
                        }
                      }}
                      className="w-full mt-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Invitar Ratas & Ganar Multiplicador (Share Alpha)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'compare' ? (
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
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-12 text-center backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Alertas Activas</span>
                </div>
              </div>

              {!portfolioWallet ? (
                <>
                  <Briefcase className="w-16 h-16 text-emerald-500/20 mx-auto mb-6" />
                  <h3 className="text-2xl font-black uppercase italic mb-4">Tu Portfolio WhaleBrain</h3>
                  <p className="text-zinc-500 mb-8 max-w-md mx-auto">Coloca tu wallet principal para mantener un trackeo pasivo y recibir auditorías de riesgo 24/7 sin firmar nada.</p>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
                    <input
                      type="text"
                      placeholder="Dirección 0x..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') savePortfolioWallet(e.currentTarget.value);
                      }}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500/50 transition-all text-lg placeholder:text-zinc-600 font-medium"
                    />
                    <button
                      onClick={(e) => savePortfolioWallet((e.target as any).previousSibling.value)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 whitespace-nowrap"
                    >
                      Guardar
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-left space-y-6">
                  <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full border border-emerald-500/30 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase text-white tracking-widest">Billetera Principal</h3>
                        <p className="text-zinc-500 text-sm font-mono truncate max-w-[200px]">{portfolioWallet}</p>
                      </div>
                    </div>
                    <button onClick={() => savePortfolioWallet('')} className="p-2 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {portfolioAnalysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-black text-zinc-500 tracking-widest uppercase">Score Vulnerabilidad</span>
                          <span className={`text-3xl font-black font-mono ${portfolioAnalysis.score >= 70 ? 'text-emerald-400' :
                            portfolioAnalysis.score >= 40 ? 'text-amber-400' : 'text-rose-400'
                            }`}>{portfolioAnalysis.score}/100</span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed italic border-l-2 border-emerald-500/50 pl-4 py-1">
                          "{portfolioAnalysis.reasoning}"
                        </p>
                      </div>

                      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                        <h4 className="text-xs font-black text-emerald-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4" /> Plan de Acción
                        </h4>
                        <ul className="space-y-3">
                          {portfolioAnalysis.keyFactors.map((factor, i) => (
                            <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm font-medium">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                      <p className="text-zinc-500 font-medium animate-pulse">Analizando vulnerabilidades críticas de tu wallet...</p>
                    </div>
                  )}
                </div>
              )}
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
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-5 pl-12 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-lg placeholder:text-zinc-600 font-medium"
              />

              {/* Quick Paste Button for Mobile */}
              {(!query && navigator.clipboard) && (
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setQuery(text);
                        if (text.length >= 30) handleSearch(text);
                      }
                    } catch (err) {
                      triggerToast("ACTIVA PERMISOS DE PORTAPAPELES. El navegador lo bloqueó.");
                    }
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-400 transition-colors p-2 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95"
                  title="Pegar rápido"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              )}

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

          {/* Quick Trending Coins / Airdrop Pills row */}
          {activeTab === 'tokens' && !query && (
            <div className="mt-4 px-2 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
              {casinoMode ? (
                <>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">🎰 TOP MEMES</span>
                  {[
                    { token: 'PEPE', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
                    { token: 'WIF', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)]' },
                    { token: 'BONK', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.3)]' },
                    { token: 'MOG', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.3)]' },
                    { token: 'BOME', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]' },
                    { token: 'POPCAT', bg: 'bg-yellow-600/10 text-yellow-500 border-yellow-600/30 hover:bg-yellow-600/20 shadow-[0_0_10px_rgba(202,138,4,0.3)]' },
                    { token: 'BRETT', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]' },
                    { token: 'TURBO', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)]' },
                    { token: 'FLOKI', bg: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]' },
                    { token: 'SHIB', bg: 'bg-stone-500/10 text-stone-400 border-stone-500/30 hover:bg-stone-500/20 shadow-[0_0_10px_rgba(120,113,108,0.3)]' }
                  ].map((item) => (
                    <button
                      key={item.token}
                      onClick={() => { setQuery(item.token); handleSearch(item.token); playSound('casino_machine.mp3'); }}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95 animate-pulse ${item.bg}`}
                    >
                      ${item.token}
                    </button>
                  ))}
                </>
              ) : traderMode ? (
                <>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">📰 MACRO</span>
                  {[
                    { token: 'BTC', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20' },
                    { token: 'ETH', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' },
                    { token: 'SOL', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' },
                    { token: 'SUI', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' }
                  ].map((item) => (
                    <button
                      key={item.token}
                      onClick={() => { setQuery(item.token); handleSearch(item.token); }}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95 ${item.bg}`}
                    >
                      ${item.token}
                    </button>
                  ))}
                  <div className="shrink-0 ml-2 pl-4 border-l border-zinc-800 flex items-center gap-2 overflow-hidden w-[200px] md:w-[400px]">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                    <marquee className="text-[10px] font-mono font-black text-rose-400 uppercase tracking-widest" scrollAmount={4}>
                      ÚLTIMO MOMENTO: Powell anunciará recorte de tasas de 50bps || Liquidez récord fluye hacia ETFs de Bitcoin || Ethereum layer-2 gas fees tocan mínimo histórico || Grandes fondos acumulando SOL...
                    </marquee>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">HOT 🔥</span>
                  {[
                    { token: 'PENGU', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' },
                    { token: 'TRUMP', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' },
                    { token: 'CHIPPY', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20' },
                    { token: 'GOAT', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' },
                    { token: 'MOODENG', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' }
                  ].map((item) => (
                    <button
                      key={item.token}
                      onClick={() => { setQuery(item.token); handleSearch(item.token); }}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95 ${item.bg}`}
                    >
                      ${item.token}
                    </button>
                  ))}
                </>
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
                    {coin.thumb ? (
                      <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full bg-zinc-800" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black text-xs uppercase border border-emerald-500/30">
                        {coin.symbol.charAt(0)}
                      </div>
                    )}
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
                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 justify-end">
                      {selectedCoin.chain_id === 'solana' ? (
                        <button
                          onClick={() => window.open(`https://jup.ag/swap/USDC-${selectedCoin.id}`, '_blank')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                        >
                          <Zap className="w-3 h-3" /> Jupiter
                        </button>
                      ) : selectedCoin.chain_id === 'bsc' || selectedCoin.chain_id === 'manta' ? (
                        <button
                          onClick={() => window.open(`https://pancakeswap.finance/swap?outputCurrency=${selectedCoin.id}`, '_blank')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                        >
                          <Zap className="w-3 h-3" /> PancakeSwap
                        </button>
                      ) : null}
                      <button
                        onClick={() => window.open(`https://dexscreener.com/search?q=${selectedCoin.id}`, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                         DexScreener
                      </button>
                      <button
                        onClick={() => window.open(`https://coinhall.org/search?q=${selectedCoin.id}`, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                         Coinhall
                      </button>
                      
                      {(traderMode || true) && (
                        <>
                          <button
                            onClick={() => setShowCalculator(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400/50 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                          >
                            <Calculator className="w-3 h-3" /> TRADER
                          </button>
                        </>
                      )}
                      <button
                        onClick={shareAnalysis}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Compartir
                      </button>
                    </div>
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

              {/* Smart Contract Audit Panel */}
              {!quickMode && analysis.audit && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

                  {/* Header */}
                  <div className="bg-zinc-900/90 px-6 py-4 border-b border-zinc-800 flex flex-wrap gap-4 items-center justify-between relative z-10">
                    <span className="text-zinc-100 font-black uppercase tracking-widest text-sm flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 text-indigo-400" /> Audit
                    </span>
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-inner border ${analysis.audit.isAuditPassed ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                      {analysis.audit.isAuditPassed ? 'No issues' : 'Issues Found'}
                      {analysis.audit.isAuditPassed ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </span>
                  </div>

                  {/* Grid Rows */}
                  <div className="divide-y divide-zinc-800/50 relative z-10">
                    <div className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                      <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Info className="w-4 h-4" /> Peligro Honeypot</span>
                      <span className={`text-sm font-black flex items-center gap-2 ${analysis.audit.isHoneypot ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {analysis.audit.isHoneypot ? 'ALTO' : 'Bajo'} {analysis.audit.isHoneypot ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </span>
                    </div>

                    <div className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                      <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Info className="w-4 h-4" /> Mintable</span>
                      <span className={`text-sm font-black flex items-center gap-2 ${analysis.audit.isMintable ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {analysis.audit.isMintable ? 'Yes' : 'No'} {analysis.audit.isMintable ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </span>
                    </div>

                    <div className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                      <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Info className="w-4 h-4" /> Freezable</span>
                      <span className={`text-sm font-black flex items-center gap-2 ${analysis.audit.isFreezable ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {analysis.audit.isFreezable ? 'Yes' : 'No'} {analysis.audit.isFreezable ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </span>
                    </div>

                    <div className="px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-zinc-800/30 transition-colors bg-black/20">
                      <div className="flex gap-8">
                        <div className="flex flex-col gap-1">
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Buy Tax</span>
                          <span className={`text-lg font-mono font-black ${parseInt(analysis.audit.buyTax) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{analysis.audit.buyTax}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Sell Tax</span>
                          <span className={`text-lg font-mono font-black ${parseInt(analysis.audit.sellTax) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{analysis.audit.sellTax}</span>
                        </div>
                      </div>

                      <div className="flex gap-8 md:text-right">
                        <div className="flex flex-col gap-1">
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">LP Locked</span>
                          <span className={`text-sm font-black ${!analysis.audit.lpLocked ? 'text-rose-400' : 'text-emerald-400'}`}>{analysis.audit.lpLocked ? 'Yes (>6m)' : 'No / Low'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Renounced</span>
                          <span className={`text-sm font-black ${!analysis.audit.renounced ? 'text-rose-400' : 'text-emerald-400'}`}>{analysis.audit.renounced ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                  <div className="bg-black/40 px-6 py-3 border-t border-zinc-800 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <Brain className="w-3 h-3" /> Warning! Audits may not be 100% accurate. AI Generated.
                  </div>
                </motion.div>
              )}

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
                <>
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 overflow-hidden h-[500px]">
                    <iframe
                      src={`https://s.tradingview.com/widgetembed/?symbol=${selectedCoin.symbol.toUpperCase()}USDT&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&wordwrap=1&no_referral_id=1`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                  
                  {/* Heatmap Widget (TradingView) */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 overflow-hidden h-[450px] shadow-2xl relative">
                    <div className="absolute inset-0 bg-fuchsia-500/5 mix-blend-overlay pointer-events-none" />
                    <div className="flex items-center gap-2 mb-4 text-fuchsia-400 font-black uppercase tracking-widest text-sm relative z-10">
                      <Activity className="w-4 h-4" /> Live Heatmap del Mercado
                    </div>
                    <div className="w-full h-full relative z-10 rounded-xl overflow-hidden border border-zinc-800">
                      <iframe 
                        src="https://s.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=es&colorTheme=dark&hasSymbolTooltip=true&isZoomEnabled=true&hasTopBar=false&isDataSetEnabled=false&blockSize=market_cap_calc&blockColor=change"
                        width="100%"
                        height="calc(100% - 32px)"
                        frameBorder="0"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </>
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
                <div className="px-4 py-3 flex gap-2 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-zinc-800 bg-zinc-900/30">
                  {[
                    ...(degenMode ? [
                      { label: 'Simulador All-In', icon: Zap, prompt: 'Haz un simulador de All-In para esta moneda con 1000 USDT.' },
                      { label: 'Pump & Dump?', icon: AlertTriangle, prompt: '¿Esto huele a Pump & Dump coordinado?' },
                    ] : []),
                    { label: '🪂 MODO RATA (Airdrops)', icon: Coins, prompt: 'Soy un Degen sin un peso y quiero farmear airdrops. Dame las 3 mejores testnets incentivadas actuales o protocolos sin token donde pueda calificar gratis o gastando muy poco gas. Rata Mode ON.', colorClass: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30 font-black' },
                    { label: 'Simular Posición', icon: Activity, prompt: 'Si entro con 500 USDT en esta moneda, ¿cuánto puedo perder en el peor caso?' },
                    { label: 'Explicar L2', icon: Info, prompt: 'Explícame qué es un Layer 2 como si tuviera 5 años' },
                    { label: 'Comparar', icon: TrendingUp, prompt: 'Compara esta moneda con su principal competidor' },
                  ].map((action: any, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (soundEnabled && audioRef.current) audioRef.current.pause();
                        setChatInput(action.prompt);
                      }}
                      className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl border transition-colors text-[10px] font-black uppercase tracking-widest ${action.colorClass || 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
                    >
                      <action.icon className={`w-3 h-3 ${action.colorClass ? 'text-inherit' : 'text-emerald-400'}`} />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Premium Verdict Trigger */}
                {chatMessages.length > 0 && (
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/40 flex justify-center">
                    <button
                      onClick={() => generatePremiumVerdict()}
                      disabled={audioLoading || chatLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(audioLoading || chatLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                      {(audioLoading || chatLoading) ? 'Generando Veredicto...' : 'Escuchar Veredicto Premium (Gasta Energía)'}
                    </button>
                  </div>
                )}

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
                          <div>
                            {msg.text && <p className="mb-2">{msg.text}</p>}
                            {msg.image && <img src={msg.image} className="w-full max-h-48 object-cover rounded-xl border border-emerald-400/30 shadow-md" alt="Captured by User" />}
                          </div>
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
      <AnimatePresence>
        {showEnergyStore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowEnergyStore(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#0a0a0a] border border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

              <button
                onClick={() => setShowEnergyStore(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white italic uppercase mb-2">WHALE BATTERY</h2>
                <p className="text-sm text-zinc-400">Recargá tus pilas y seguí escaneando el ecosistema.</p>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Pack 0: Mini */}
                <button
                  onClick={() => handleBuyEnergy(0.19, 15)}
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between hover:border-zinc-500 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-xl">🔋</div>
                    <div className="text-left">
                      <div className="text-white font-bold text-sm">Chispazo Mini</div>
                      <div className="text-[10px] text-zinc-400">+15 Batería</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-sm">0.19 TON</div>
                  </div>
                </button>

                {/* Pack 1 */}
                <button
                  onClick={() => handleBuyEnergy(0.49, 50)}
                  className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">🐟</div>
                    <div className="text-left">
                      <div className="text-white font-bold">Píldora Degen</div>
                      <div className="text-xs text-blue-400 font-bold">+50 Batería</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-lg">0.49 TON</div>
                  </div>
                </button>

                {/* Pack 2: Tanque Tiburón (Eye-catching Glow) */}
                <button
                  onClick={() => handleBuyEnergy(1.49, 200)}
                  className="w-full p-4 rounded-xl border-2 border-orange-500 bg-orange-500/10 flex items-center justify-between hover:bg-orange-500/20 transition-all group relative overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] animate-[pulse_2s_ease-in-out_infinite] hover:animate-none scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 bg-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-lg">Más Popular</div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-3xl drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]">🦈</div>
                    <div className="text-left">
                      <div className="text-white font-black text-lg">Tanque Tiburón</div>
                      <div className="text-xs text-orange-400 font-black uppercase tracking-wider">+200 Batería</div>
                    </div>
                  </div>
                  <div className="text-right relative z-10 mt-2 sm:mt-0">
                    <div className="text-white font-black text-xl">1.49 TON</div>
                  </div>
                </button>

                {/* Pack 3: Cofre Ballena */}
                <button
                  onClick={() => handleBuyEnergy(2.99, 500)}
                  className="w-full p-4 rounded-xl border border-purple-500/50 bg-purple-900/20 flex items-center justify-between hover:border-purple-400 hover:bg-purple-900/40 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]">💎</div>
                    <div className="text-left">
                      <div className="text-white font-bold">Reserva Elite</div>
                      <div className="text-xs text-purple-400 font-bold">+500 Batería</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-lg">2.99 TON</div>
                  </div>
                </button>

                {/* Pack 4: Whale Pass */}
                <button
                  onClick={() => handleBuyEnergy(4.99, 99999)}
                  className="w-full p-4 pl-5 rounded-xl border-2 border-cyan-500/80 bg-cyan-900/30 flex items-center justify-between hover:border-cyan-400 hover:bg-cyan-900/50 transition-all group shadow-[0_0_25px_rgba(6,182,212,0.3)]"
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-4xl drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform">🐋</div>
                    <div className="text-left">
                      <div className="text-cyan-400 font-black text-lg uppercase tracking-wide">Whale Pass</div>
                      <div className="text-[10px] text-cyan-200 font-bold uppercase tracking-widest mt-0.5">Batería Infinita (30 Días)</div>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <div className="text-white font-black text-2xl">4.99 TON</div>
                  </div>
                </button>
              </div>

              <div className="mt-6 border-t border-zinc-800 pt-4 flex flex-col items-center gap-2">
                {!tonConnectUI.connected ? (
                  <p className="text-xs text-zinc-500 text-center mb-2">Debés conectar tu wallet primero.</p>
                ) : null}
                <TonConnectButton className="mx-auto" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Futuros / Spot Calculator Modal */}
      {showCalculator && selectedCoin && (
        <CalculatorModal
          coinName={selectedCoin.name}
          coinSymbol={selectedCoin.symbol}
          currentPrice={selectedCoin.market_data?.current_price?.usd || 0}
          onClose={() => setShowCalculator(false)}
        />
      )}

    </div>
  );
}

// V5 FINAL ELEVENLABS FIX - CACHE BUSTER 00:41
