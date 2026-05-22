import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPassAuxiliaryFields } from '../api/_lib/services/passkit.js';

test('buildPassAuxiliaryFields keeps location unchanged and adds entry coordinates when present', () => {
  const fields = buildPassAuxiliaryFields(
    { customer_name: 'Alex Example' },
    {
      locationValue: 'LMNL COMPOUND',
      entranceCoordinatesLabel: 'ENTRY',
      entranceCoordinatesValue: '34.052235, -118.243683',
    },
  );

  assert.deepEqual(fields, [
    { key: 'location', label: 'LOCATION', value: 'LMNL COMPOUND' },
    { key: 'entry', label: 'ENTRY', value: '34.052235, -118.243683' },
    { key: 'guest', label: 'GUEST', value: 'Alex Example' },
  ]);
});

test('buildPassAuxiliaryFields preserves current layout when no entrance coordinates exist', () => {
  const fields = buildPassAuxiliaryFields(
    { customer_name: 'Alex Example' },
    {
      locationValue: 'LMNL COMPOUND',
      entranceCoordinatesLabel: '',
      entranceCoordinatesValue: '123 Main St, Los Angeles, CA 90012',
      entranceValueLabel: 'ADDRESS',
    },
  );

  assert.deepEqual(fields, [
    { key: 'location', label: 'LOCATION', value: 'LMNL COMPOUND' },
    { key: 'entry', label: 'ADDRESS', value: '123 Main St, Los Angeles, CA 90012' },
    { key: 'guest', label: 'GUEST', value: 'Alex Example' },
  ]);
});

test('buildPassAuxiliaryFields hides location when no address or override exists', () => {
  const fields = buildPassAuxiliaryFields(
    { customer_name: 'Alex Example' },
    {
      locationValue: '',
      entranceCoordinatesLabel: '',
      entranceCoordinatesValue: '',
    },
  );

  assert.deepEqual(fields, [
    { key: 'guest', label: 'GUEST', value: 'Alex Example' },
  ]);
});
