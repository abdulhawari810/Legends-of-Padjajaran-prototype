import { describe, expect, it } from 'vitest';
import { hashPassword, makeSalt, safeEqual, sha256 } from './sha256';

// Vektor uji resmi FIPS 180-4 / NIST.
describe('sha256 — vektor uji resmi', () => {
  it('string kosong', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('"abc"', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"', () => {
    expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    );
  });

  it('1 juta karakter "a" (multi-block)', () => {
    expect(sha256('a'.repeat(1_000_000))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0'
    );
  });

  it('tepat di batas blok (55/56/64 byte)', () => {
    // 55 byte -> 1 blok setelah padding, 56 byte -> 2 blok
    expect(sha256('a'.repeat(55))).not.toBe(sha256('a'.repeat(56)));
    expect(sha256('a'.repeat(64))).not.toBe(sha256('a'.repeat(65)));
    expect(sha256('a'.repeat(55))).toHaveLength(64);
    expect(sha256('a'.repeat(56))).toHaveLength(64);
  });

  it('karakter non-ASCII (UTF-8)', () => {
    expect(sha256('héllo')).toHaveLength(64);
    expect(sha256('日本語')).not.toBe(sha256('???'));
  });
});

describe('hashPassword', () => {
  it('deterministik untuk input sama', () => {
    expect(hashPassword('rahasia', 'salt1')).toBe(hashPassword('rahasia', 'salt1'));
  });

  it('salt berbeda -> hash berbeda (rainbow tabletak berguna)', () => {
    expect(hashPassword('rahasia', 'salt1')).not.toBe(hashPassword('rahasia', 'salt2'));
  });

  it('password berbeda -> hash berbeda', () => {
    expect(hashPassword('a', 'salt1')).not.toBe(hashPassword('b', 'salt1'));
  });

  it('memang mengiterasi (hash polos tidak sama dengan sha256 langsung)', () => {
    expect(hashPassword('x', 'y', 1)).not.toBe(sha256('1:y:x'));
    expect(hashPassword('x', 'y', 1)).toHaveLength(64);
  });

  it('rounds=0/negatif tetap di-hash (tidak boleh bocorkan teks polos)', () => {
    // regression: loop dengan rounds=0 dilewati sehingga `salt:password`
    // mentah dikembalikan apa adanya.
    expect(hashPassword('rahasia', 'y', 0)).toBe(sha256('0:y:rahasia'));
    expect(hashPassword('rahasia', 'y', -5)).toBe(sha256('0:y:rahasia'));
    expect(hashPassword('rahasia', 'y', 0)).not.toBe('y:rahasia');
  });

  it('rounds=1 sama dengan satu putaran sha256', () => {
    expect(hashPassword('x', 'y', 1)).toBe(sha256('0:y:x'));
  });
});

describe('makeSalt', () => {
  it('panjang hex sesuai permintaan', () => {
    expect(makeSalt(8)).toHaveLength(16);
    expect(makeSalt(16)).toHaveLength(32);
  });

  it('acak (tidak pernah sama dua kali berturut)', () => {
    const salts = new Set(Array.from({ length: 20 }, () => makeSalt()));
    expect(salts.size).toBe(20);
  });
});

describe('safeEqual', () => {
  it('true untuk string identik', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
  });
  it('false untuk string berbeda', () => {
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
    expect(safeEqual('', 'a')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });
});