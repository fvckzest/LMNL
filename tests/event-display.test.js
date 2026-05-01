import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEventDate, formatEventTime } from '../src/utils/eventDisplay.js';

test('formatEventDate preserves yyyy-mm-dd values as m.d.yy without timezone drift', () => {
  assert.equal(formatEventDate('2026-08-03'), '8.3.26');
});

test('formatEventDate falls back cleanly when the value is missing', () => {
  assert.equal(formatEventDate(''), 'TBA');
});

test('formatEventTime converts 24-hour admin values into readable local-style times', () => {
  assert.equal(formatEventTime('13:00'), '1:00 PM');
  assert.equal(formatEventTime('21:30'), '9:30 PM');
});

test('formatEventTime leaves already formatted times alone', () => {
  assert.equal(formatEventTime('9:00 PM'), '9:00 PM');
});
