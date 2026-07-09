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
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      vus: Number(__ENV.WARMUP_VUS || 1),
      duration: __ENV.WARMUP_DURATION || '10s',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Number(__ENV.TARGET_VUS || 10) },
        { duration: __ENV.DURATION || '2m', target: Number(__ENV.TARGET_VUS || 10) },
        { duration: '30s', target: 0 },
      ],
      startTime: __ENV.WARMUP_DURATION || '10s',
    },
  },
  thresholds: {
    http_req_failed: [`rate<${__ENV.MAX_ERROR_RATE || '0.02'}`],
    http_req_duration: ['avg<300', 'p(95)<750', 'p(99)<1500'],
    'http_req_duration{endpoint:availability}': ['p(95)<750', 'p(99)<1500'],
  },
};

function requireEnv() {
  if (!EMPLOYEE_ID) {
    throw new Error('EMPLOYEE_ID es requerido para medir availability.');
  }

  if (SERVICE_IDS.length === 0) {
    throw new Error('SERVICE_IDS es requerido para medir availability.');
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
      endpoint: 'availability',
    },
  });

  check(response, {
    'availability status is 200': (res) => res.status === 200,
    'availability returns slots': (res) => {
      try {
        return Array.isArray(res.json('slots'));
      } catch {
        return false;
      }
    },
  });

  sleep(Number(__ENV.SLEEP_SECONDS || 0.5));
}
