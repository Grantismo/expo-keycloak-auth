import { createContext } from 'react';
import { KC_INITIAL_VALUE } from './const';

interface KcContext {
  ready: boolean
  isLoggedIn: boolean
  login: () => void
  logout: () => void
  tokens: null
}

export const KeycloakContext = createContext<KcContext>(KC_INITIAL_VALUE);
