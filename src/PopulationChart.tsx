import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import './PopulationChart.css';

interface PopulationChartProps {
  isExpanded: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  embedded?: boolean; // New prop to indicate if chart is embedded in expansion area
}

interface PopulationDataPoint {
  year: number;
  population: number;
}

// Global chart manager - persists across component re-renders
class ChartDataManager {
  private static data: PopulationDataPoint[] = [];
  private static loaded = false;
  private static loading = false;

  static isLoaded(): boolean {
    return this.loaded;
  }

  static isLoading(): boolean {
    return this.loading;
  }

  static getData(): PopulationDataPoint[] {
    return this.data;
  }

  static async loadData(): Promise<PopulationDataPoint[]> {
    if (this.loaded) {
      return this.data;
    }

    if (this.loading) {
      // Wait for existing load to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.data;
    }

    this.loading = true;

    try {
      const keyPeriods = [
        -400000, -350000, -300000, -250000, -200000, -150000, -100000,
        -80000, -60000, -40000, -20000, -15000, -12000, -10000,
        -8000, -6000, -4000, -3000, -2000, -1000, -500, 0,
        500, 1000, 1200, 1400, 1600, 1700, 1800, 1850, 1900, 1920,
        1940, 1960, 1980, 1990, 2000, 2010, 2020, 2024
      ];

      console.log(`Loading chart data: ${keyPeriods.length} points`);

      const promises = keyPeriods.map(async (year) => {
        try {
          const response = await fetch(`/api/global-population?year=${year}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          return { year, population: data.population || 0 };
        } catch (error) {
          console.warn(`Failed for year ${year}:`, error);
          return { year, population: 0 };
        }
      });

      const results = await Promise.all(promises);
      this.data = results
        .filter(point => point.population >= 0)
        .sort((a, b) => a.year - b.year);

      this.loaded = true;
      console.log(`Chart data loaded: ${this.data.length} points`);
      return this.data;

    } catch (error) {
      console.error('Failed to load chart data:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }
}

const PopulationChart: React.FC<PopulationChartProps> = ({
  isExpanded,
  onClose,
  anchorRef,
  embedded = false
}) => {
  const [chartData, setChartData] = useState<PopulationDataPoint[]>(ChartDataManager.getData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chartComponentRef = useRef<ReactECharts | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);


  // Fetch historical population data - ONLY ONCE
  useEffect(() => {
    console.log('PopulationChart useEffect triggered, isExpanded:', isExpanded);
    
    if (!isExpanded) return;
    
    const loadData = async () => {
      console.log('Starting to load data...');
      
      if (ChartDataManager.isLoaded()) {
        console.log('Data already loaded, using cached data');
        setChartData(ChartDataManager.getData());
        return;
      }

      console.log('Loading fresh data...');
      setLoading(true);
      setError(null);
      
      try {
        const data = await ChartDataManager.loadData();
        console.log('Data loaded successfully:', data.length, 'points');
        setChartData(data);
      } catch (error) {
        console.error('Failed to load population data:', error);
        setError('Failed to load population data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isExpanded]); // Only depend on isExpanded - data is cached globally

  // Handle click outside to close - only for dropdown mode, not embedded
  useEffect(() => {
    if (!isExpanded || embedded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Add event listener after a short delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, onClose, anchorRef, embedded]);

  // Handle escape key to close - only for dropdown mode, not embedded
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded && !embedded) {
        onClose();
      }
    };

    if (isExpanded && !embedded) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isExpanded, onClose, embedded]);

  const formatYear = useCallback((year: number): string => {
    if (year < 0) {
      const absYear = Math.abs(year);
      if (absYear >= 1000) {
        return `${Math.round(absYear / 1000)}k BCE`;
      }
      return `${absYear} BCE`;
    } else {
      if (year >= 1000) {
        return `${Math.round(year / 1000)}k CE`;
      }
      return `${year} CE`;
    }
  }, []);

  const formatPopulation = useCallback((value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  }, []);

  // Memoize chart options to prevent unnecessary re-creation
  const chartOptions = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#ffd700',
      borderWidth: 1,
      textStyle: { color: '#ffffff' },
      formatter: (params: Array<{axisValue: number, value: number}>) => {
        const data = params[0];
        const year = data.axisValue;
        const pop = Number(data.value).toLocaleString();
        const era = year < 0 ? `${Math.abs(year).toLocaleString()} BCE` : `${year.toLocaleString()} CE`;
        return `<strong>${era}</strong><br/>Population: ${pop}`;
      }
    },
    grid: {
      left: '8%',
      right: '8%',
      bottom: '12%',
      top: '20%'
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100,
        height: 20,
        bottom: '5%'
      }
    ],
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.year),
      axisLabel: { 
        color: '#cccccc',
        fontSize: 9,
        formatter: formatYear,
        rotate: 45
      },
      axisLine: { lineStyle: { color: '#666666' } },
      axisTick: { lineStyle: { color: '#666666' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { 
        color: '#cccccc',
        fontSize: 9,
        formatter: formatPopulation
      },
      axisLine: { lineStyle: { color: '#666666' } },
      axisTick: { lineStyle: { color: '#666666' } },
      splitLine: { 
        lineStyle: { 
          color: '#333333',
          type: 'dashed'
        }
      }
    },
    series: [{
      data: chartData.map(d => d.population),
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { 
        color: '#ffd700', 
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 215, 0, 0.3)' },
            { offset: 1, color: 'rgba(255, 215, 0, 0.05)' }
          ]
        }
      }
    }]
  }), [chartData, formatYear, formatPopulation]); // Only recreate when data or formatters change

  // Handle chart ready event to preserve reference
  const onChartReady = useCallback((chartInstance: echarts.ECharts) => {
    chartInstanceRef.current = chartInstance;
  }, []);

  if (!isExpanded) return null;

  // If embedded, render without dropdown wrapper
  if (embedded) {
    return (
      <div className="embedded-chart">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading data...</span>
          </div>
        ) : error ? (
          <div className="error">
            <span>{error}</span>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : chartData.length > 0 ? (
          <>
            <ReactECharts 
              ref={chartComponentRef}
              option={chartOptions} 
              style={{ height: '300px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              onChartReady={onChartReady}
            />
            <div className="chart-info">
              <small>Scroll to zoom • Drag to pan • {chartData.length} data points</small>
            </div>
          </>
        ) : (
          <div className="no-data">
            <span>No data available</span>
          </div>
        )}
      </div>
    );
  }

  // Original dropdown mode
  return (
    <div className="population-chart-dropdown" ref={dropdownRef}>
      <div className="dropdown-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading data...</span>
          </div>
        ) : error ? (
          <div className="error">
            <span>{error}</span>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : chartData.length > 0 ? (
          <>
            <ReactECharts 
              ref={chartComponentRef}
              option={chartOptions} 
              style={{ height: '300px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              onChartReady={onChartReady}
            />
            <div className="chart-info">
              <small>Scroll to zoom • Drag to pan • {chartData.length} data points</small>
            </div>
          </>
        ) : (
          <div className="no-data">
            <span>No data available</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedPopulationChart = React.memo(PopulationChart, (prevProps, nextProps) => {
  // Only re-render if isExpanded or embedded actually changes
  // onClose and anchorRef should be stable now, but we'll ignore them in comparison
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.embedded === nextProps.embedded
  );
});

export default MemoizedPopulationChart;


