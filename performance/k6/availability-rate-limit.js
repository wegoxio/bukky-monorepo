import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001/api';
const TENANT_SLUG = __ENV.TENANT_SLUG || 'barberia-demo-wegox';
const EMPLOYEE_ID = __ENV.EMPLOYEE_ID;
const SERVICE_IDS = (__ENV.SERVICE_IDS || '').split(',').filter(Boolean);
const BOOKING_DATE = __ENV.BOOKING_DATE || '2026-07-23';
const TIMEZONE = __ENV.TIMEZONE || 'America/Caracas';
const PARTY_SIZE = Number(__ENV.PARTY_SIZE || 1);

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

function requireEnv() {
  if (!EMPLOYEE_ID) {
    throw new Error('EMPLOYEE_ID es requerido.');
  }

  if (SERVICE_IDS.length === 0) {
    throw new Error('SERVICE_IDS es requerido.');
  }
}

function query(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export default function () {
  requireEnv();

  const url = `${API_BASE_URL}/public/tenants/${encodeURIComponent(
    TENANT_SLUG,
  )}/bookings/availability?${query({
    employee_id: EMPLOYEE_ID,
    service_ids: SERVICE_IDS.join(','),
    date: BOOKING_DATE,
    timezone: TIMEZONE,
    party_size: PARTY_SIZE,
  })}`;

  const response = http.get(url, {
    tags: {
      endpoint: 'availability-rate-limit',
    },
  });

  check(response, {
    'availability is 200 or rate limited': (res) => res.status === 200 || res.status === 429,
    'rate limit eventually appears': (res) => res.status === 429 || res.status === 200,
  });

  sleep(Number(__ENV.SLEEP_SECONDS || 0.1));
}
