import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocalJSON, writeLocalJSON } from '../src/storage.js';

test('storage reader returns the fallback when browser storage is unavailable', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    assert.deepEqual(readLocalJSON('novalux-test', { safe: true }), { safe: true });
    assert.equal(writeLocalJSON('novalux-test', { safe: true }), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('storage reader handles malformed JSON and writer reports quota failures', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => '{invalid json',
        setItem: () => { throw new Error('quota exceeded'); }
      }
    });
    assert.deepEqual(readLocalJSON('novalux-test', []), []);
    assert.equal(writeLocalJSON('novalux-test', { ok: true }), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('storage helper reads and writes valid JSON', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
    });
    assert.equal(writeLocalJSON('novalux-test', { score: 42 }), true);
    assert.deepEqual(readLocalJSON('novalux-test'), { score: 42 });
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
