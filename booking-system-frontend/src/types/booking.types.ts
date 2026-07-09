import type { Employee } from './employee.types';

export type BookingStatus =
  'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type BookingSource = 'ADMIN' | 'WEB' | 'API' | 'MANUAL';

export type BookingItem = {
  id: string;
  created_at: string;
  updated_at: string;
  booking_id: string;
  service_id: string;
  service_name_snapshot: string;
  duration_minutes_snapshot: number;
  buffer_before_minutes_snapshot: number;
  buffer_after_minutes_snapshot: number;
  price_snapshot: string;
  pricing_model_snapshot: 'FLAT' | 'PER_PERSON';
  unit_price_snapshot: string;
  quantity_snapshot: number;
  line_total_snapshot: string;
  currency_snapshot: string;
  instructions_snapshot: string | null;
  sort_order: number;
};

export type Booking = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  employee_id: string;
  start_at_utc: string;
  end_at_utc: string;
  status: BookingStatus;
  completed_at_utc: string | null;
  completed_by_user_id: string | null;
  cancelled_at_utc: string | null;
  cancelled_by_user_id: string | null;
  cancellation_reason: string | null;
  total_duration_minutes: number;
  party_size: number;
  total_price: string;
  currency: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_phone_country_iso2: string | null;
  customer_phone_national_number: string | null;
  customer_phone_e164: string | null;
  notes: string | null;
  source: BookingSource;
  created_by_user_id: string | null;
  employee: Employee;
  items: BookingItem[];
};

export type BookingSlot = {
  start_at_utc: string;
  end_at_utc: string;
  slot_capacity: number;
  occupied_capacity: number;
  available_capacity: number;
  requested_party_size: number;
};

export type PublicBookingEmployee = {
  id: string;
  name: string;
  avatar_url?: string | null;
  working_days: number[];
};

export type PublicBookingService = {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number;
  capacity: number;
  min_capacity: number;
  max_capacity: number;
  min_party_size: number;
  max_party_size: number;
  slot_capacity: number;
  pricing_model: 'FLAT' | 'PER_PERSON';
  requires_confirmation: boolean;
  price: string;
  currency: string;
  is_active: boolean;
  employees: PublicBookingEmployee[];
};

export type PublicBookingItem = {
  id: string;
  service_id: string;
  service_name_snapshot: string;
  duration_minutes_snapshot: number;
  price_snapshot: string;
  pricing_model_snapshot: 'FLAT' | 'PER_PERSON';
  unit_price_snapshot: string;
  quantity_snapshot: number;
  line_total_snapshot: string;
  currency_snapshot: string;
  instructions_snapshot?: string | null;
  sort_order: number;
};

export type PublicBookingConfirmation = {
  id: string;
  status: BookingStatus;
  start_at_utc: string;
  end_at_utc: string;
  total_duration_minutes: number;
  party_size: number;
  total_price: string;
  currency: string;
  customer_name: string;
  employee: PublicBookingEmployee | null;
  items: PublicBookingItem[];
};

export type PublicBookingManagement = PublicBookingConfirmation & {
  can_reschedule: boolean;
};

export type AvailabilityResponse = {
  employee_id: string;
  date: string;
  timezone: string;
  slot_interval_minutes: number;
  required_duration_minutes: number;
  service_ids: string[];
  slots: BookingSlot[];
};

export type ScheduleIntervalPayload = {
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
};

export type SetEmployeeSchedulePayload = {
  schedule_timezone?: string;
  working_hours: ScheduleIntervalPayload[];
  breaks?: ScheduleIntervalPayload[];
};

export type EmployeeScheduleRuleRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  employee_id: string;
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
  is_active: boolean;
};

export type EmployeeTimeOffRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  employee_id: string;
  start_at_utc: string;
  end_at_utc: string;
  reason: string | null;
  is_active: boolean;
};

export type EmployeeScheduleResponse = {
  employee_id: string;
  schedule_timezone: string;
  slot_interval_minutes: number;
  working_hours: EmployeeScheduleRuleRecord[];
  breaks: EmployeeScheduleRuleRecord[];
  active_time_off: EmployeeTimeOffRecord[];
};

export type CreateEmployeeTimeOffPayload = {
  start_at_utc: string;
  end_at_utc: string;
  reason?: string;
};

export type EligibleEmployeesQuery = {
  service_ids: string[];
};

export type AvailabilityQuery = {
  employee_id: string;
  service_ids: string[];
  date: string;
  timezone?: string;
  party_size?: number;
};

export type ListBookingsQuery = {
  employee_id?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  timezone?: string;
  status?: BookingStatus;
  q?: string;
  sort?: 'created_desc' | 'start_asc';
  page?: number;
  limit?: number;
};

export type ListBookingsResponse = {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: {
    today_count: number;
  };
};

export type CreateBookingPayload = {
  employee_id: string;
  service_ids: string[];
  start_at_utc: string;
  party_size?: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string | null;
  customer_phone_country_iso2?: string | null;
  customer_phone_national_number?: string | null;
  notes?: string;
  source?: BookingSource;
  status?: BookingStatus;
  cancellation_reason?: string;
  allow_overlap?: boolean;
  captcha_token?: string;
};

export type UpdateBookingStatusPayload = {
  status: BookingStatus;
  cancellation_reason?: string;
};

export type RescheduleBookingPayload = {
  start_at_utc: string;
  timezone?: string;
};

export type ReschedulePublicBookingPayload = RescheduleBookingPayload & {
  captcha_token?: string;
};
