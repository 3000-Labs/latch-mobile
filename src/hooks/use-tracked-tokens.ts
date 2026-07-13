import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { TRACKED_TOKENS_STORAGE_KEY, type TokenConfig } from '../constants/known-tokens';

/** Stable identity key for a token — works for both G-address and C-address tokens. */
function tokenKey(t: TokenConfig): string {
  return t.sacContractId ?? `${t.code}:${t.issuer}`;
}

export function useTrackedTokens() {
  const [tokens, setTokens] = useState<TokenConfig[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TRACKED_TOKENS_STORAGE_KEY).then((stored) => {
      if (stored) {
        try { setTokens(JSON.parse(stored)); } catch { setTokens([]); }
      }
      setLoaded(true);
    });
  }, []);

  const addToken = async (token: TokenConfig) => {
    setTokens((prev) => {
      const key = tokenKey(token);
      const filtered = prev.filter((t) => tokenKey(t) !== key);
      const next = [...filtered, token];
      AsyncStorage.setItem(TRACKED_TOKENS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeToken = async (token: TokenConfig) => {
    setTokens((prev) => {
      const key = tokenKey(token);
      const next = prev.filter((t) => tokenKey(t) !== key);
      AsyncStorage.setItem(TRACKED_TOKENS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isTracked = (token: TokenConfig) =>
    tokens.some((t) => tokenKey(t) === tokenKey(token));

  return { tokens, addToken, removeToken, isTracked, loaded };
}
