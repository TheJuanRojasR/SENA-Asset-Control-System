import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashPassword = async (password) => bcrypt.hash(password, env.BCRYPT_ROUNDS);
export const comparePassword = async (password, hash) => bcrypt.compare(password, hash);
