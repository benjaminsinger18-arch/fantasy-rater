import React, { createContext, useContext, useState, useEffect } from 'react';
import type { LeagueConfig, Sport } from '../types/index.ts';

const DEFAULT_CONFIG: LeagueConfig = {
  sport: 'nfl',
  platform: 'sleeper',
  leagueId: '',
  scoringFormat: 'PPR',
  leagueSize: 12,
  weeksRemaining: 10,
  currentWeek: 1,
};

interface LeagueContextType {
  config: LeagueConfig;
  setConfig: (c: Partial<LeagueConfig>) => void;
  setSport: (s: Sport) => void;
}

const LeagueContext = createContext<LeagueContextType>({
  config: DEFAULT_CONFIG,
  setConfig: () => {},
  setSport: () => {},
});

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<LeagueConfig>(() => {
    try {
      const stored = localStorage.getItem('fantasy-rater-league');
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  useEffect(() => {
    localStorage.setItem('fantasy-rater-league', JSON.stringify(config));
  }, [config]);

  // Auto-populate leagueId from saved primary league if not set
  useEffect(() => {
    if (config.leagueId) return;
    const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
    // Use native fetch to bypass axios interceptors (avoid triggering login modal)
    fetch(`${apiBase}/leagues`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then((leagues: Array<{ league_id: string; roster_id?: string; platform?: string; sport?: string; scoring_format?: string; league_size?: number; is_primary?: number }> | null) => {
        if (!leagues) return;
        const primary = leagues.find(l => l.is_primary === 1) ?? leagues[0];
        if (primary?.league_id) {
          setConfigState(prev => ({
            ...prev,
            leagueId: prev.leagueId || primary.league_id,
            myRosterId: prev.myRosterId || primary.roster_id,
          }));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up Yahoo session from URL on redirect back from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yahooSession = params.get('yahoo_session');
    if (yahooSession) {
      setConfigState(prev => ({ ...prev, yahooSessionId: yahooSession }));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const setConfig = (partial: Partial<LeagueConfig>) => {
    setConfigState(prev => ({ ...prev, ...partial }));
  };

  const setSport = (sport: Sport) => {
    const formatMap: Record<Sport, LeagueConfig['scoringFormat']> = {
      nfl: 'PPR',
      mlb: 'H2H Points',
      fpl: 'FPL Standard',
      ipl: 'Dream11 Points',
    };
    const platformMap: Record<Sport, LeagueConfig['platform']> = {
      nfl: 'sleeper',
      mlb: 'espn',
      fpl: 'fpl',
      ipl: 'ipl',
    };
    setConfigState(prev => ({
      ...prev,
      sport,
      scoringFormat: formatMap[sport],
      platform: platformMap[sport],
      leagueId: '',
      myRosterId: undefined,
      fplManagerId: undefined,
      currentWeek: sport === 'fpl' ? prev.currentWeek : 1,
    }));
    if (sport === 'fpl') {
      const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
      fetch(`${apiBase}/players/gameweek?sport=fpl`)
        .then(r => r.json())
        .then(({ currentWeek }) => {
          if (currentWeek) setConfigState(prev => ({ ...prev, currentWeek }));
        })
        .catch(() => {});
    }
  };

  return (
    <LeagueContext.Provider value={{ config, setConfig, setSport }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
}
