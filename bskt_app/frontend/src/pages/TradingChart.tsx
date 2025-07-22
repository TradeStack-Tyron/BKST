import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import type { CandlestickData, Time } from 'lightweight-charts';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
} from 'lucide-react';

interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  starting_capital: number;
  result: number | null;
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

const TradingChart: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [position, setPosition] = useState<Position>({
    quantity: 0,
    averagePrice: 0,
    unrealizedPnL: 0,
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const generateFakeData = (): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    let currentDate = new Date(startDate);
    let basePrice = 150; // Starting price

    while (currentDate <= endDate) {
      const timestamp = Math.floor(currentDate.getTime() / 1000) as Time;

      // Generate realistic price movement
      const volatility = 0.02; // 2% volatility
      const trend = (Math.random() - 0.5) * 0.001; // Small trend component
      const change = (Math.random() - 0.5) * volatility + trend;

      const open = basePrice;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);

      data.push({
        time: timestamp,
        open,
        high,
        low,
        close,
      });

      basePrice = close;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  };

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(
          `http://localhost:8000/sessions/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const sessionData = await response.json();
          setSession(sessionData);
          setBalance(sessionData.starting_capital);
        } else {
          console.error('Failed to fetch session');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, navigate]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || loading) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#D1D5DB',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#6B7280',
      },
      timeScale: {
        borderColor: '#6B7280',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderDownColor: '#EF4444',
      borderUpColor: '#10B981',
      wickDownColor: '#EF4444',
      wickUpColor: '#10B981',
    });

    const fakeData = generateFakeData();
    candlestickSeries.setData(fakeData);

    // Set current price to the last candle's close price
    if (fakeData.length > 0) {
      setCurrentPrice(fakeData[fakeData.length - 1].close);
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [loading]);

  // Calculate unrealized P&L
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
      // Update position
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
      // SELL
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

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading trading session...</div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <div className="relative px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{session?.name}</h1>
              <p className="text-gray-400">
                Trading Session •{' '}
                {new Date(session?.start_date || '').toLocaleDateString()} -{' '}
                {new Date(session?.end_date || '').toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">Current Price</p>
              <p className="text-xl font-bold text-white">
                ${currentPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Chart Area */}
          <div className="col-span-9">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div ref={chartContainerRef} className="w-full" />
            </div>
          </div>

          {/* Trading Panel */}
          <div className="col-span-3 space-y-4">
            {/* Portfolio Stats */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Portfolio
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cash Balance</span>
                  <span className="text-white">${balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Position Value</span>
                  <span className="text-white">
                    ${(position.quantity * currentPrice).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value</span>
                  <span className="text-white font-bold">
                    ${totalPortfolioValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">P&L</span>
                  <span
                    className={`font-bold ${
                      totalPortfolioValue - (session?.starting_capital || 0) >=
                      0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                    $
                    {(
                      totalPortfolioValue - (session?.starting_capital || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Position */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Position
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity</span>
                  <span className="text-white">
                    {position.quantity.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Price</span>
                  <span className="text-white">
                    ${position.averagePrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unrealized P&L</span>
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

            {/* Trading Controls */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Place Trade
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={tradeQuantity}
                    onChange={(e) => setTradeQuantity(Number(e.target.value))}
                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => executeTrade('BUY')}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <TrendingUp size={16} />
                    <span>BUY</span>
                  </button>
                  <button
                    onClick={() => executeTrade('SELL')}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <TrendingDown size={16} />
                    <span>SELL</span>
                  </button>
                </div>

                <div className="text-xs text-gray-400">
                  Trade Value: ${(currentPrice * tradeQuantity).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Trades
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {trades.length === 0 ? (
                  <p className="text-gray-400 text-sm">No trades yet</p>
                ) : (
                  trades.slice(0, 10).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex justify-between items-center py-2 border-b border-gray-800">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            trade.type === 'BUY'
                              ? 'bg-green-900 text-green-300'
                              : 'bg-red-900 text-red-300'
                          }`}>
                          {trade.type}
                        </span>
                        <span className="text-white text-sm">
                          {trade.quantity}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">
                          ${trade.price.toFixed(2)}
                        </p>
                        {trade.profit !== undefined && (
                          <p
                            className={`text-xs ${
                              trade.profit >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                            {trade.profit >= 0 ? '+' : ''}$
                            {trade.profit.toFixed(2)}
                          </p>
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
    </div>
  );
};

export default TradingChart;
