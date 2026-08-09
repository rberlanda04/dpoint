/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDatabase } from '../types';

const DB_KEY = 'ponto_campo_db';

export function loadDatabase(): AppDatabase | null {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppDatabase;
  } catch {
    return null;
  }
}

export function saveDatabase(db: AppDatabase): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function clearDatabase(): void {
  localStorage.removeItem(DB_KEY);
}
