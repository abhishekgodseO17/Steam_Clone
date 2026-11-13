import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, kind = 'ok') => {
    const id = Date.now() + Math.random();
    setToast({ msg, kind, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3000);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) { setUser(null); setCartCount(0); return; }
    try {
      const [me, cart] = await Promise.all([api.get('/auth/me'), api.get('/cart')]);
      setUser(me);
      setCartCount(cart.items.length);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => { refreshUser().finally(() => setReady(true)); }, [refreshUser]);

  const login = async (username, password) => {
    const { token } = await api.post('/auth/login', { username, password });
    setToken(token);
    await refreshUser();
  };
  const register = async (form) => {
    const { token } = await api.post('/auth/register', form);
    setToken(token);
    await refreshUser();
  };
  const logout = () => { setToken(null); setUser(null); setCartCount(0); };

  return (
    <Ctx.Provider value={{ user, ready, cartCount, refreshUser, login, register, logout, notify }}>
      {children}
      {toast && <div className={`toast ${toast.kind}`} key={toast.id}>{toast.msg}</div>}
    </Ctx.Provider>
  );
}
