import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashPassword = async (plain) =>
  bcrypt.hash(plain, env.BCRYPT_ROUNDS);

export const comparePassword = async (plain, hash) =>
  bcrypt.compare(plain, hash);
