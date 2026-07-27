import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoStart } from '../src/js/ui/tutorial.js';

test('auto-starts on a clean first visit', () => {
  assert.equal(shouldAutoStart({ seen: false, hasParams: false }), true);
});

test('does not auto-start once seen', () => {
  assert.equal(shouldAutoStart({ seen: true, hasParams: false }), false);
});

test('does not auto-start when arriving via a shared permalink', () => {
  assert.equal(shouldAutoStart({ seen: false, hasParams: true }), false);
});

test('stays off when both seen and params present', () => {
  assert.equal(shouldAutoStart({ seen: true, hasParams: true }), false);
});
