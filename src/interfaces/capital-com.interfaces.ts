
export interface CapComEncryptionKey {
  encryptionKey: string;
  timestamp: number;
}

export interface SessionKeys {
  CST: string;
  X_SECURITY_TOKEN: string;
}

export interface CapComPrice {
  bid: number;
  ask: number;
}

export interface CapComMarketData {
  prices: {
    snapshotTime: string;
    snapshotTimeUTC: string;
    openPrice: CapComPrice;
    closePrice: CapComPrice;
    highPrice: CapComPrice;
    lowPrice: CapComPrice;
    lastTradedVolume: number;
  }[];
  instrumentType: string;
}
