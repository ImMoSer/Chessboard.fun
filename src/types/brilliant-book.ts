export interface BrilliantBookMove {
  san: string;
  uci: string;
  total: number;
  w_cnt: number;
  b_cnt: number;
  w_pct: number;
  b_pct: number;
  w_rate: number;
  b_rate: number;
  nag: number;
  nag_str: string;
}

export interface BrilliantBookStats {
  moves: BrilliantBookMove[];
}
