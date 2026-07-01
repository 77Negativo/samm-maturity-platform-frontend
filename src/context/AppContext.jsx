import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { apiRequest, storeCsrfToken } from '../api.js';

const AppContext = createContext();

const initialState = {
  token: null,
  user: null,
  login_policy: {
    idle_timeout_minutes: 10,
    refresh_interval_minutes: 5
  },
  assessments: [],
  auth_loading: true
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        login_policy: action.payload.login_policy || state.login_policy
      };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'LOGOUT':
      return { ...initialState, auth_loading: false };
    case 'SET_ASSESSMENTS':
      return { ...state, assessments: action.payload };
    case 'SET_AUTH_LOADING':
      return { ...state, auth_loading: Boolean(action.payload) };
    case 'SET_LOGIN_POLICY':
      return { ...state, login_policy: { ...state.login_policy, ...(action.payload || {}) } };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());
  const logoutRunningRef = useRef(false);
  const previousTokenRef = useRef(initialState.token);

  useEffect(() => {
    const previousToken = previousTokenRef.current;
    if (previousToken && !state.token) {
      storeCsrfToken(null);
    }
    previousTokenRef.current = state.token;
  }, [state.token]);

  useEffect(() => {
    let active = true;
    const bootstrapAuth = async () => {
      try {
        const data = await apiRequest('/auth/refresh', { method: 'POST' });
        if (!active) return;
        dispatch({ type: 'LOGIN', payload: data });
      } catch {
      } finally {
        if (active) dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    };
    bootstrapAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state.token) return undefined;

    const idleMs = Math.max(5, Number(state.login_policy?.idle_timeout_minutes || 10)) * 60 * 1000;
    const configuredRefreshMinutes = Math.max(1, Number(state.login_policy?.refresh_interval_minutes || 5));
    const role = state.user?.role;
    const refreshMinutes = role === 'member'
      ? Math.max(10, configuredRefreshMinutes)
      : Math.min(5, configuredRefreshMinutes);
    const refreshMs = refreshMinutes * 60 * 1000;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const tick = async () => {
      if (logoutRunningRef.current) return;
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor >= idleMs) {
        logoutRunningRef.current = true;
        try {
          await apiRequest('/auth/logout', { method: 'POST', token: state.token });
        } catch {
        } finally {
          dispatch({ type: 'LOGOUT' });
          logoutRunningRef.current = false;
        }
        return;
      }

      const sinceRefresh = now - lastRefreshRef.current;
      if (sinceRefresh < refreshMs) return;

      try {
        const data = await apiRequest('/auth/refresh', { method: 'POST' });
        lastRefreshRef.current = Date.now();
        dispatch({ type: 'LOGIN', payload: data });
      } catch {
        dispatch({ type: 'LOGOUT' });
      }
    };

    markActivity();
    lastRefreshRef.current = Date.now();
    const interval = window.setInterval(() => { void tick(); }, 30000);
    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [state.token, state.user?.role, state.login_policy?.idle_timeout_minutes, state.login_policy?.refresh_interval_minutes]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
