import { describe, expect, it } from 'vitest';
import {
  canClaim,
  claimReward,
  isQuestDone,
  objectiveText,
  questNeed,
  registerBuy,
  registerDeposit,
  registerGather,
  registerSell
} from './questState';

describe('quest objectives', () => {
  it('need + text per tipe', () => {
    expect(questNeed('q-shop-01')).toBe(1);
    expect(questNeed('q-bank-01')).toBe(50);
    expect(objectiveText({ killTarget: '', killCount: 0, buy: 2 }, 1)).toContain('1/2');
    expect(objectiveText({ killTarget: '', killCount: 0, deposit: 50 }, 20)).toContain('20G/50G');
  });

  it('beli 1x selesaikan q-shop-01', () => {
    registerBuy();
    expect(isQuestDone('q-shop-01')).toBe(true);
    expect(canClaim('q-shop-01')).toBe(true);
  });

  it('jual butuh prasyarat shop dulu', () => {
    // sell sebelum claim shop: progress jalan tapi done tetap butuh unlock? unlock cek done requires
    registerSell();
    // q-sell-01 requires q-shop-01 done (belum, baru done belum tentu) -> cek done
    const r = claimReward('q-shop-01');
    expect(r).not.toBeNull();
    registerSell();
    expect(isQuestDone('q-sell-01')).toBe(true);
  });

  it('deposit akumulasi 50G', () => {
    claimReward('q-sell-01');
    registerDeposit(20);
    expect(isQuestDone('q-bank-01')).toBe(false);
    registerDeposit(30);
    expect(isQuestDone('q-bank-01')).toBe(true);
    const r = claimReward('q-bank-01');
    expect(r?.exp).toBe(20);
  });

  it('gather item spesifik', () => {
    registerGather('iron-ore');
    registerGather('iron-ore');
    registerGather('slime-gel');
    // tidak ada quest gather di chain ini yang terbuka tanpa requires? hanya cek tidak crash
    expect(isQuestDone('q-start-01')).toBe(false);
  });
});
