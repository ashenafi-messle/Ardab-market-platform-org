/**
 * Ardab Market Centralized Business Constants
 * Avoids hard-coding business values across multiple UI components.
 */

// Fleet and Logistics Configuration
export const STANDARD_FLEET_CAPACITY_KG = 5000;
export const MAX_FLEET_TRIP_WEIGHT_KG = 5000;

// Multi-City Operational Hubs
export const OPERATIONAL_CITIES = ['Gondar', 'Bahir Dar', 'Addis Ababa'] as const;
export type OperationalCity = (typeof OPERATIONAL_CITIES)[number];

// Standard Table & Data Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Currency and Units
export const PLATFORM_CURRENCY = 'ETB';
export const STANDARD_WEIGHT_UNIT = 'KG';

// Network & Request Resilience
export const API_TIMEOUT_MS = 15000;
export const MAX_RETRY_ATTEMPTS = 2;
export const SEARCH_DEBOUNCE_MS = 300;
