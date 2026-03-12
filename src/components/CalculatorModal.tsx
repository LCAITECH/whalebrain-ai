import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

interface CalculatorModalProps {
    coinName: string;
    coinSymbol: string;
    currentPrice: number;
    onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ coinName, coinSymbol, currentPrice, onClose }) => {
    const [type, setType] = useState<'Long' | 'Short'>('Long');
    const [margin, setMargin] = useState<number>(100);
    const [leverage, setLeverage] = useState<number>(10);
    const [entryPrice, setEntryPrice] = useState<number>(currentPrice || 0);
    const [targetPrice, setTargetPrice] = useState<number>(currentPrice ? currentPrice * (type === 'Long' ? 1.05 : 0.95) : 0);

    // Auto-adjust target preview when switching type if untouched
    useEffect(() => {
        if (entryPrice > 0) {
            setTargetPrice(entryPrice * (type === 'Long' ? 1.05 : 0.95));
        }
    }, [type, entryPrice]);

    const isLong = type === 'Long';
    const positionSize = margin * leverage;

    let pnl = 0;
    if (entryPrice > 0) {
        if (isLong) {
            pnl = positionSize * (targetPrice / entryPrice - 1);
        } else {
            pnl = positionSize * (1 - targetPrice / entryPrice);
        }
    }
    const roe = margin > 0 ? (pnl / margin) * 100 : 0;

    let liqPrice = 0;
    const mmr = 0.004; // 0.4% maintenance margin
    if (entryPrice > 0 && leverage > 0) {
        if (isLong) {
            liqPrice = entryPrice * (1 - (1 / leverage) + mmr);
        } else {
            liqPrice = entryPrice * (1 + (1 / leverage) - mmr);
        }
        // Prevenir liqPrice negativo
        if (liqPrice < 0) liqPrice = 0;
    }

    const formatCurrency = (val: number) => {
        if (val < 0.0001) return val.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
        if (val < 1) return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <DollarSign className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg leading-tight uppercase tracking-wide">Calculadora</h3>
                            <p className="text-zinc-400 text-xs font-bold uppercase">{coinName} ({coinSymbol.toUpperCase()})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto hide-scrollbar max-h-[80vh]">
                    {/* Long/Short Tabs */}
                    <div className="flex bg-zinc-950 rounded-xl p-1 border border-zinc-800">
                        <button
                            onClick={() => setType('Long')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${isLong ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-400'}`}
                        >
                            <TrendingUp className="w-4 h-4" /> LONG
                        </button>
                        <button
                            onClick={() => setType('Short')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${!isLong ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)] border border-rose-500/30' : 'text-zinc-500 hover:text-zinc-400'}`}
                        >
                            <TrendingDown className="w-4 h-4" /> SHORT
                        </button>
                    </div>

                    {/* Inputs Grid */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Apalancamiento</label>
                                <div className="relative">
                                    <input type="number" min="1" max="150" value={leverage} onChange={e => setLeverage(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xs">x</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Margen (USDT)</label>
                                <div className="relative">
                                    <input type="number" min="1" value={margin} onChange={e => setMargin(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xs">$</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Precio de Entrada</label>
                            <div className="relative">
                                <input type="number" value={entryPrice} onChange={e => setEntryPrice(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Precio Objetivo (Target)</label>
                            <div className="relative">
                                <input type="number" value={targetPrice} onChange={e => setTargetPrice(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Tamaño de Posición</label>
                            <div className="bg-zinc-800/30 border border-zinc-800/50 rounded-xl py-2.5 px-3 text-sm font-bold text-zinc-300">
                                {formatCurrency(positionSize)} USDT
                            </div>
                        </div>
                    </div>

                    {/* Results Block */}
                    <div className="bg-zinc-950 rounded-2xl p-5 border border-zinc-800/80 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 p-full h-full bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent"></div>

                        <h4 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-center mb-2">Resultados Estimados</h4>

                        <div className="flex justify-between items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-zinc-400 shrink-0">Rentabilidad (ROE)</span>
                            <span className={`text-base sm:text-lg font-black break-all text-right ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {pnl > 0 ? '+' : ''}{roe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </span>
                        </div>

                        <div className="flex justify-between items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-zinc-400 shrink-0">Ganancia/Pérdida (PnL)</span>
                            <span className={`text-base sm:text-lg font-black break-all text-right ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {pnl > 0 ? '+' : ''}{formatCurrency(pnl)} USDT
                            </span>
                        </div>

                        <div className="pt-3 border-t border-zinc-800 flex justify-between items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-amber-500/80 flex items-center gap-1 shrink-0">
                                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" /> Liquidación
                            </span>
                            <span className="text-sm sm:text-md font-black text-amber-400 break-all text-right">
                                {formatCurrency(liqPrice)} USDT
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
