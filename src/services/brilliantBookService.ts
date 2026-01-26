import type { BrilliantBookStats } from '../types/brilliant-book';

const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api';

class BrilliantBookService {
  async getStats(fen: string): Promise<BrilliantBookStats> {
    const response = await fetch(`${API_URL}/brilliant-book/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ fen }),
    });
    
    if (!response.ok) {
      throw new Error(`BrilliantBook API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const brilliantBookService = new BrilliantBookService();
