export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: {
    large: string;
    small: string;
    thumb: string;
  };
  market_data: {
    current_price: { [key: string]: number };
    market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    ath: { [key: string]: number };
    atl: { [key: string]: number };
    circulating_supply: number;
    total_supply: number;
    sparkline_7d: {
      price: number[];
    };
  };
}

export interface SearchResult {
  id: string;
  name: string;
  api_symbol: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
}

export interface AnalysisResult {
  recommendation: 'SAFE' | 'WAIT' | 'CAUTION';
  score: number; // 0-100
  reasoning: string;
  keyFactors: string[];
  catchphrase: string; // Humorous/direct warning or encouragement
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}
