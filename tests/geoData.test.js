import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllCountries,
  getCountriesByRegion,
  getCountryByCode,
  getCountryByName,
  getAllRegions,
  searchCountries
} from '../server/services/geoData.js';

test('getCountryByCode resolves a known code', () => {
  const us = getCountryByCode('US');
  assert.equal(us.name, 'United States');
  assert.equal(us.region, 'North America');
});

test('getCountryByCode returns undefined for an unknown code', () => {
  assert.equal(getCountryByCode('ZZ'), undefined);
});

test('getCountryByName is case-insensitive (voice agent sends free text)', () => {
  assert.equal(getCountryByName('united states').code, 'US');
  assert.equal(getCountryByName('FRANCE').code, 'FR');
});

test('searchCountries matches by name fragment and by code', () => {
  const codes = searchCountries('united').map(c => c.code).sort();
  // United States, United Kingdom, United Arab Emirates
  assert.deepEqual(codes, ['AE', 'GB', 'US']);

  const byCode = searchCountries('jp');
  assert.equal(byCode.length, 1);
  assert.equal(byCode[0].name, 'Japan');
});

test('getCountriesByRegion filters to a single region', () => {
  const na = getCountriesByRegion('North America').map(c => c.code).sort();
  assert.deepEqual(na, ['CA', 'MX', 'US']);
});

test('getAllRegions is unique and non-empty', () => {
  const regions = getAllRegions();
  assert.equal(regions.length, new Set(regions).size);
  assert.ok(regions.includes('Europe'));
});

test('every country has the fields the writer/transform depend on', () => {
  for (const c of getAllCountries()) {
    for (const field of ['code', 'name', 'lat', 'lon', 'region']) {
      assert.ok(c[field] !== undefined, `${c.code || c.name} missing ${field}`);
    }
  }
});
