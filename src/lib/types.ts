export type Category = 'slots' | 'table' | 'live';
export type Tag = 'new' | 'hot' | 'jackpot' | 'classic' | 'ways' | 'high-limit';
export type SortKey = 'trend' | 'new' | 'rtp';

export type Game = {
  id: string;
  title: string;
  providerId: string;
  provider: string;
  category: Category;
  tags: Tag[];
  rtp: number;
  minBet: number;
  maxBet: number;
  trend: number;
  releasedAt: string;
  playable: boolean;
};

export type PromoId = 'calder' | 'pit' | 'salon' | 'tuesday' | 'ferry';

export type TxnKind = 'deposit' | 'stake' | 'win';

export type Txn = {
  id: string;
  kind: TxnKind;
  cents: number;
  createdAt: string;
  note: string;
  status: 'pending' | 'posted';
};

export type WalletSnapshot = {
  currency: 'USD';
  balanceCents: number;
  transactions: Txn[];
};

export type LobbyQuery = {
  cat: Category | 'all';
  providers: string[];
  tag: Tag | null;
  q: string;
  sort: SortKey;
};
