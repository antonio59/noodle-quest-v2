import { useContext } from 'react';
import { Ctx } from './auth-types';

export const useAuth = () => useContext(Ctx);
