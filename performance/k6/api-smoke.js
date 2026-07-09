import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001/api';
const TENANT_SLUG = __ENV.TENANT_SLUG || 'barberia-demo-wegox';
const EMPLOYEE_ID = __ENV.EMPLOYEE_ID || '';
const SERVICE_IDS = (__ENV.SERVICE_IDS || '').split(',').filter(Boolean);
const BOOKING_DATE = __ENV.BOOKING_DATE || '2026-07-23';
const TIMEZONE = __ENV.TIMEZONE || 'America/Caracas';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  vus: Number(__ENV.VUS || 3),
  duration: __ENV.DURATION || '45s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

function query(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function authHeaders() {
  return AUTH_TOKEN
    ? {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      }
    : {};
}

export default function () {
  const publicServices = http.get(
    `${API_BASE_URL}/public/tenants/${encodeURIComponent(TENANT_SLUG)}/bookings/services`,
  );
  check(publicServices, {
    'public services status is 200': (response) => response.status === 200,
  });

  if (SERVICE_IDS.length > 0) {
    const eligibleEmployeesUrl = `${API_BASE_URL}/public/tenants/${encodeURIComponent(
      TENANT_SLUG,
    )}/bookings/eligible-employees?${query({ service_ids: SERVICE_IDS.join(',') })}`;
    const eligibleEmployees = http.get(eligibleEmployeesUrl);
    check(eligibleEmployees, {
      'eligible employees status is 200': (response) => response.status === 200,
    });
  }

  if (EMPLOYEE_ID && SERVICE_IDS.length > 0) {
    const availabilityUrl = `${API_BASE_URL}/public/tenants/${encodeURIComponent(
      TENANT_SLUG,
    )}/bookings/availability?${query({
      employee_id: EMPLOYEE_ID,
      service_ids: SERVICE_IDS.join(','),
      date: BOOKING_DATE,
      timezone: TIMEZONE,
      party_size: 1,
    })}`;
    const availability = http.get(availabilityUrl);
    check(availability, {
      'public availability status is 200': (response) => response.status === 200,
      'public availability has slots array': (response) => {
        try {
          return Array.isArray(response.json('slots'));
        } catch {
          return false;
        }
      },
    });
  }

  if (AUTH_TOKEN) {
    const dashboard = http.get(`${API_BASE_URL}/dashboard`, {
      headers: authHeaders(),
    });
    check(dashboard, {
      'dashboard is authenticated or available': (response) =>
        response.status === 200 || response.status === 404,
    });

    const bookings = http.get(
      `${API_BASE_URL}/bookings?${query({
        date_from: BOOKING_DATE,
        date_to: BOOKING_DATE,
        timezone: TIMEZONE,
        limit: 25,
      })}`,
      { headers: authHeaders() },
    );
    check(bookings, {
      'bookings list status is 200': (response) => response.status === 200,
    });
  }

  sleep(1);
}
