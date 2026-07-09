'use client';

const DEFAULT_TITLE = 'Bukky Booking System';
const DEFAULT_FAVICON_URL = '/favicon.ico';
const ICON_REL_VALUES = ['icon', 'shortcut icon', 'apple-touch-icon'] as const;

let lastAppliedFaviconSource: string | null = null;
let lastAppliedFaviconVersion: string | null = null;

function normalizeTitle(value: string | undefined | null) {
  const title = value?.trim();
  return title || DEFAULT_TITLE;
}

function normalizeFaviconUrl(value: string | undefined | null) {
  const url = value?.trim();
  return url || DEFAULT_FAVICON_URL;
}

function getOrCreateHeadLinks(rel: (typeof ICON_REL_VALUES)[number]) {
  const elements = Array.from(document.querySelectorAll(`link[rel="${rel}"]`)) as HTMLLinkElement[];

  if (elements.length > 0) {
    return elements;
  }

  const element = document.createElement('link');
  element.rel = rel;
  document.head.appendChild(element);
  return [element];
}

function getCurrentFaviconVersion(rawUrl: string) {
  if (lastAppliedFaviconSource !== rawUrl || !lastAppliedFaviconVersion) {
    lastAppliedFaviconSource = rawUrl;
    lastAppliedFaviconVersion = Date.now().toString();
  }

  return lastAppliedFaviconVersion;
}

function withFaviconVersion(url: string) {
  const version = getCurrentFaviconVersion(url);

  try {
    const nextUrl = new URL(url, window.location.origin);
    nextUrl.searchParams.set('v', version);
    return nextUrl.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }
}

export function readDocumentTitle() {
  if (typeof document === 'undefined') return DEFAULT_TITLE;
  return document.title || DEFAULT_TITLE;
}

export function readDocumentFaviconHref() {
  if (typeof document === 'undefined') return DEFAULT_FAVICON_URL;

  const existing =
    (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ??
    (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null) ??
    (document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null);

  return existing?.href || DEFAULT_FAVICON_URL;
}

export function applyDocumentBranding(input: {
  title?: string | null;
  faviconUrl?: string | null;
}) {
  if (typeof document === 'undefined') return;

  const nextTitle = normalizeTitle(input.title);
  const nextFaviconHref = withFaviconVersion(normalizeFaviconUrl(input.faviconUrl));

  document.title = nextTitle;

  ICON_REL_VALUES.forEach((rel) => {
    const links = getOrCreateHeadLinks(rel);
    links.forEach((link) => {
      link.href = nextFaviconHref;
    });
  });
}
