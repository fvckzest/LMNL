import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPassAuxiliaryFields } from '../api/_lib/services/passkit.js';

test('buildPassAuxiliaryFields keeps location unchanged and adds entry coordinates when present', () => {
  const fields = buildPassAuxiliaryFields(
    { customer_name: 'Alex Example' },
    {
      locationValue: 'LMNL COMPOUND',
      entranceCoordinatesLabel: 'COORDS',
      entranceCoordinatesValue: '34.052235, -118.243683',
    },
  );

  assert.deepEqual(fields, [
    { key: 'location', label: 'LOCATION', value: 'LMNL COMPOUND' },
    { key: 'entry', label: 'COORDS', value: '34.052235, -118.243683' },
  ]);
});

test('buildPassAuxiliaryFields preserves location and entry when no entrance coordinates exist', () => {
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

  assert.deepEqual(fields, []);
});
