import { getItem } from './items';
import { addItem, getCount, removeItem } from './inventory';
import { addGold, getGold, spendGold } from './currency';

// Batch D: shop Tetua Greenfield. Gold sink (beli potion) + jual drop.
export interface ShopBuy {
  id: string;
  price: number;
}

export interface ShopSell {
  id: string;
  price: number;
}

export const SHOP_BUY: ShopBuy[] = [{ id: 'potion-s', price: 20 }];

export const SHOP_SELL: ShopSell[] = [
  { id: 'slime-gel', price: 5 },
  { id: 'armor-chain', price: 30 },
  { id: 'armor-bone', price: 35 }
];

export function buyItem(itemId: string): { ok: boolean; reason?: string } {
  const entry = SHOP_BUY.find((s) => s.id === itemId);
  if (!entry) return { ok: false, reason: 'Tidak dijual' };
  const def = getItem(itemId);
  if (!def) return { ok: false, reason: 'Item tidak dikenal' };
  if (getGold() < entry.price) return { ok: false, reason: `Butuh ${entry.price}G` };
  if (!spendGold(entry.price)) return { ok: false, reason: 'Gold kurang' };
  addItem(itemId, 1);
  return { ok: true };
}

export function sellItem(itemId: string): { ok: boolean; reason?: string } {
  const entry = SHOP_SELL.find((s) => s.id === itemId);
  if (!entry) return { ok: false, reason: 'Tidak dibeli' };
  if (getCount(itemId) <= 0) return { ok: false, reason: 'Tidak punya' };
  if (!removeItem(itemId, 1)) return { ok: false, reason: 'Gagal jual' };
  addGold(entry.price);
  return { ok: true };
}
