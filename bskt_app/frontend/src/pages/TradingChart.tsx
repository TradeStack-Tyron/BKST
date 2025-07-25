import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from 'lightweight-charts';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Maximize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Minus,
  Square,
  TrendingDownIcon as TrendLine,
  Move,
} from 'lucide-react';
import { debounce } from 'lodash';

// Updated Session interface to handle string values from the API for Decimal types
interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  starting_capital: number | string;
  result: number | string | null;
  current_candle_index: number;
  current_balance: number | string | null;
  position_quantity: number | string;
  position_avg_price: number | string;
  trades_data: string | null;
  timeframe: TimeFrame;
  is_completed: boolean;
}

interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: string;
  profit?: number;
}

interface Position {
  quantity: number;
  averagePrice: number;
  unrealizedPnL: number;
}

interface DrawingTool {
  id: string;
  type: 'horizontal_line' | 'trend_line' | 'rectangle';
  active: boolean;
}

type TimeFrame =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '12h'
  | '1D'
  | '1W';

const TradingChart: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('15m');
  const [position, setPosition] = useState<Position>({
    quantity: 0,
    averagePrice: 0,
    unrealizedPnL: 0,
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Replay functionality
  const [allCandles, setAllCandles] = useState<CandlestickData[]>([]);
  const [visibleCandles, setVisibleCandles] = useState<CandlestickData[]>([]);
  const [currentCandleIndex, setCurrentCandleIndex] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);

  // Drawing tools
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(
    null
  );
  const [drawnLines, setDrawnLines] = useState<any[]>([]);

  const saveSessionState = async (currentState: any) => {
    const token = localStorage.getItem('access_token');
    if (!token || !sessionId) return;

    try {
      await fetch(`http://localhost:8000/sessions/${sessionId}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(currentState),
      });
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  };

  const debouncedSave = useCallback(debounce(saveSessionState, 2000), [
    sessionId,
  ]);

  useEffect(() => {
    if (loading || !session) return;

    const currentState = {
      current_candle_index: currentCandleIndex,
      current_balance: balance,
      position_quantity: position.quantity,
      position_avg_price: position.averagePrice,
      trades_data: trades,
      timeframe: selectedTimeframe,
    };
    debouncedSave(currentState);
  }, [
    currentCandleIndex,
    balance,
    position,
    trades,
    selectedTimeframe,
    loading,
    session,
    debouncedSave,
  ]);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(
          `http://localhost:8000/sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const sessionData: Session = await response.json();
          setSession(sessionData);

          // --- FIX: Parse string values from API to numbers ---
          const initialBalance =
            sessionData.current_balance != null
              ? parseFloat(sessionData.current_balance as string)
              : parseFloat(sessionData.starting_capital as string);
          setBalance(initialBalance);

          setPosition({
            quantity: parseFloat(sessionData.position_quantity as string),
            averagePrice: parseFloat(sessionData.position_avg_price as string),
            unrealizedPnL: 0, // Will be recalculated
          });

          setCurrentCandleIndex(sessionData.current_candle_index);
          setSelectedTimeframe(sessionData.timeframe);

          try {
            setTrades(
              sessionData.trades_data ? JSON.parse(sessionData.trades_data) : []
            );
          } catch (e) {
            console.error('Failed to parse trades data', e);
            setTrades([]);
          }
        } else {
          console.error('Failed to fetch session');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigate]);

  // The rest of your component logic remains largely the same.
  // I'm including the full component for completeness.

  const timeframes: { value: TimeFrame; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1H' },
    { value: '2h', label: '2H' },
    { value: '4h', label: '4H' },
    { value: '6h', label: '6H' },
    { value: '12h', label: '12H' },
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
  ];

  const drawingTools: DrawingTool[] = [
    { id: 'horizontal_line', type: 'horizontal_line', active: false },
    { id: 'trend_line', type: 'trend_line', active: false },
    { id: 'rectangle', type: 'rectangle', active: false },
  ];

  const generateFakeData = (timeframe: TimeFrame): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const startDate = new Date('2024-01-01');
    let currentDate = new Date(startDate);
    let basePrice = 150;

    const intervalMinutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '4h': 240,
      '6h': 360,
      '12h': 720,
      '1D': 1440,
      '1W': 10080,
    }[timeframe];

    const dataPoints = 200;

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = Math.floor(currentDate.getTime() / 1000) as Time;
      const volatilityMultiplier = 0.015;
      const trend = (Math.random() - 0.5) * 0.0005;
      const change = (Math.random() - 0.5) * volatilityMultiplier + trend;

      const open = basePrice;
      const close = open * (1 + change);
      const high =
        Math.max(open, close) *
        (1 + Math.random() * volatilityMultiplier * 0.5);
      const low =
        Math.min(open, close) *
        (1 - Math.random() * volatilityMultiplier * 0.5);

      data.push({
        time: timestamp,
        open: Number(open.toFixed(4)),
        high: Number(high.toFixed(4)),
        low: Number(low.toFixed(4)),
        close: Number(close.toFixed(4)),
      });

      basePrice = close;
      currentDate = new Date(
        currentDate.getTime() + intervalMinutes * 60 * 1000
      );
    }
    return data;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentCandleIndex < allCandles.length - 1) {
      interval = setInterval(() => {
        setCurrentCandleIndex((prev) => {
          if (prev >= allCandles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentCandleIndex, allCandles.length, playSpeed]);

  useEffect(() => {
    if (allCandles.length > 0) {
      const newVisibleCandles = allCandles.slice(0, currentCandleIndex + 1);
      setVisibleCandles(newVisibleCandles);

      if (seriesRef.current) {
        seriesRef.current.setData(newVisibleCandles);
      }

      if (newVisibleCandles.length > 0) {
        const lastCandle = newVisibleCandles[newVisibleCandles.length - 1];
        setCurrentPrice(lastCandle.close);

        if (newVisibleCandles.length > 1) {
          const firstCandle = newVisibleCandles[0];
          const change = lastCandle.close - firstCandle.open;
          const changePercent = (change / firstCandle.open) * 100;
          setPriceChange(change);
          setPriceChangePercent(changePercent);
        }
      }
    }
  }, [currentCandleIndex, allCandles]);

  const handleBackToDashboard = () => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      navigate(`/dashboard/${userId}`);
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current || loading) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 600,
        layout: {
          background: { type: ColorType.Solid, color: '#000000' },
          textColor: '#d1d4dc',
        },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: {
          mode: 1,
          vertLine: { color: '#9089fc', width: 1, style: 2 },
          horzLine: { color: '#9089fc', width: 1, style: 2 },
        },
        rightPriceScale: { borderColor: '#2a2e39', textColor: '#d1d4dc' },
        timeScale: {
          borderColor: '#2a2e39',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      const fakeData = generateFakeData(selectedTimeframe);
      setAllCandles(fakeData);

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  }, [loading, selectedTimeframe]);

  const handleDrawingToolSelect = (toolId: string) => {
    setActiveDrawingTool(activeDrawingTool === toolId ? null : toolId);
  };

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleStepForward = () => {
    if (currentCandleIndex < allCandles.length - 1)
      setCurrentCandleIndex((prev) => prev + 1);
  };
  const handleStepBack = () => {
    if (currentCandleIndex > 0) setCurrentCandleIndex((prev) => prev - 1);
  };

  const handleTimeframeChange = (timeframe: TimeFrame) => {
    setSelectedTimeframe(timeframe);
    setIsPlaying(false);
    setCurrentCandleIndex(20);
  };

  useEffect(() => {
    if (position.quantity !== 0 && currentPrice > 0) {
      const unrealizedPnL =
        (currentPrice - position.averagePrice) * position.quantity;
      setPosition((prev) => ({ ...prev, unrealizedPnL }));
    }
  }, [currentPrice, position.quantity, position.averagePrice]);

  const executeTrade = (type: 'BUY' | 'SELL') => {
    if (!currentPrice || tradeQuantity <= 0) return;
    const cost = currentPrice * tradeQuantity;

    if (type === 'BUY' && cost > balance) {
      alert('Insufficient balance for this trade');
      return;
    }
    if (type === 'SELL' && tradeQuantity > position.quantity) {
      alert('Insufficient position to sell');
      return;
    }

    const trade: Trade = {
      id: Date.now().toString(),
      type,
      price: currentPrice,
      quantity: tradeQuantity,
      timestamp: new Date().toISOString(),
    };

    setTrades((prev) => [trade, ...prev]);

    if (type === 'BUY') {
      const newQuantity = position.quantity + tradeQuantity;
      const newAveragePrice =
        newQuantity > 0
          ? (position.averagePrice * position.quantity +
              currentPrice * tradeQuantity) /
            newQuantity
          : 0;
      setPosition({
        quantity: newQuantity,
        averagePrice: newAveragePrice,
        unrealizedPnL: 0,
      });
      setBalance((prev) => prev - cost);
    } else {
      const newQuantity = position.quantity - tradeQuantity;
      const profit = (currentPrice - position.averagePrice) * tradeQuantity;
      setPosition((prev) => ({
        quantity: newQuantity,
        averagePrice: newQuantity > 0 ? prev.averagePrice : 0,
        unrealizedPnL: 0,
      }));
      setBalance((prev) => prev + cost);
      trade.profit = profit;
    }
  };

  const totalPortfolioValue = balance + position.quantity * currentPrice;
  const startingCapital = session
    ? parseFloat(session.starting_capital as string)
    : 0;

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-purple-200 text-xl">
          Loading trading session...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Top Navigation */}
      <div className="border-b border-purple-900/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="text-purple-200 hover:text-white transition-colors p-2 rounded hover:bg-purple-900/20">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center space-x-3">
              <BarChart3 size={20} className="text-purple-400" />
              <h1 className="text-xl font-semibold text-purple-200">
                {session?.name || 'Trading Session'}
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-purple-200">
                  {currentPrice.toFixed(4)}
                </span>
                <span
                  className={`text-sm ${
                    priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {priceChange >= 0 ? '+' : ''}
                  {priceChange.toFixed(4)} ({priceChangePercent >= 0 ? '+' : ''}
                  {priceChangePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="text-xs text-purple-300">
                Candle {currentCandleIndex + 1} of {allCandles.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Controls & Drawing Tools */}
      <div className="border-b border-purple-900/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedTimeframe === tf.value
                    ? 'bg-gradient-to-r from-[#ff80b5] to-[#9089fc] text-white'
                    : 'text-purple-200 hover:text-white hover:bg-purple-900/20'
                }`}>
                {tf.label}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 border-r border-purple-900/30 pr-4">
              <button
                onClick={() => handleDrawingToolSelect('horizontal_line')}
                className={`p-2 rounded transition-colors ${
                  activeDrawingTool === 'horizontal_line'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-purple-900/20'
                }`}
                title="Horizontal Line">
                <Minus size={16} />
              </button>
              <button
                onClick={() => handleDrawingToolSelect('trend_line')}
                className={`p-2 rounded transition-colors ${
                  activeDrawingTool === 'trend_line'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-purple-900/20'
                }`}
                title="Trend Line">
                <TrendLine size={16} />
              </button>
              <button
                onClick={() => handleDrawingToolSelect('rectangle')}
                className={`p-2 rounded transition-colors ${
                  activeDrawingTool === 'rectangle'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-purple-900/20'
                }`}
                title="Rectangle">
                <Square size={16} />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleStepBack}
                disabled={currentCandleIndex <= 0}
                className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                <SkipBack size={16} />
              </button>
              <button
                onClick={handlePlay}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={handleStepForward}
                disabled={currentCandleIndex >= allCandles.length - 1}
                className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                <SkipForward size={16} />
              </button>
            </div>
            <div className="flex items-center space-x-2 border-l border-purple-900/30 pl-4">
              <button className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/20 rounded">
                <Settings size={16} />
              </button>
              <button className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/20 rounded">
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <div className="bg-black rounded border border-purple-900/30 flex justify-center items-center relative">
            <div ref={chartContainerRef} className="w-full" />
            {activeDrawingTool && (
              <div className="absolute top-4 left-4 bg-purple-900/80 text-purple-200 px-3 py-1 rounded text-sm">
                Drawing: {activeDrawingTool.replace('_', ' ')} - Click and drag
                on chart
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-black rounded-lg p-4 border border-purple-900/30">
            <h3 className="text-lg font-semibold mb-4 text-purple-200">
              Portfolio
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-purple-300">Cash Balance</span>
                <span className="text-purple-200">${balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Position Value</span>
                <span className="text-purple-200">
                  ${(position.quantity * currentPrice).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Total Value</span>
                <span className="font-bold text-purple-200">
                  ${totalPortfolioValue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">P&L</span>
                <span
                  className={`font-bold ${
                    totalPortfolioValue - startingCapital >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                  ${(totalPortfolioValue - startingCapital).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-black rounded-lg p-4 border border-purple-900/30">
            <h3 className="text-lg font-semibold mb-4 text-purple-200">
              Position
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-purple-300">Quantity</span>
                <span className="text-purple-200">
                  {position.quantity.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Avg Price</span>
                <span className="text-purple-200">
                  ${position.averagePrice.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300">Unrealized P&L</span>
                <span
                  className={`font-bold ${
                    position.unrealizedPnL >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                  ${position.unrealizedPnL.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-black rounded-lg p-4 border border-purple-900/30">
            <h3 className="text-lg font-semibold mb-4 text-purple-200">
              Place Trade
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(Number(e.target.value))}
                className="w-full bg-purple-900/20 border border-purple-700/50 rounded px-3 py-2 text-purple-200 placeholder-purple-300"
                placeholder="Quantity"
                min="0.01"
                step="0.01"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => executeTrade('BUY')}
                  className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded font-medium transition-colors flex items-center justify-center space-x-2">
                  <TrendingUp size={16} />
                  <span>BUY</span>
                </button>
                <button
                  onClick={() => executeTrade('SELL')}
                  className="bg-red-600 hover:bg-red-700 text-white py-2.5 rounded font-medium transition-colors flex items-center justify-center space-x-2">
                  <TrendingDown size={16} />
                  <span>SELL</span>
                </button>
              </div>
              <div className="text-xs text-purple-300">
                Trade Value: ${(currentPrice * tradeQuantity).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="bg-black rounded-lg p-4 border border-purple-900/30">
            <h3 className="text-lg font-semibold mb-4 text-purple-200">
              Recent Trades
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trades.length === 0 ? (
                <p className="text-purple-300 text-sm col-span-full">
                  No trades yet
                </p>
              ) : (
                trades.slice(0, 8).map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-purple-900/10 rounded-lg p-3 border border-purple-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.type === 'BUY'
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                        {trade.type}
                      </span>
                      <span className="text-sm text-purple-200">
                        {trade.quantity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-200">
                        ${trade.price.toFixed(4)}
                      </span>
                      {trade.profit !== undefined && (
                        <span
                          className={`text-xs font-medium ${
                            trade.profit >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                          {trade.profit >= 0 ? '+' : ''}$
                          {trade.profit.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
