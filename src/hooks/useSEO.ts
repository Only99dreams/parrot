/**
 * Centralised SEO helper hook.
 * Uses react-helmet-async under the hood so any component can call it safely.
 *
 * Usage:
 *   useSEO({ title: "Article title", description: "...", ogImage: "..." })
 */
import { useEffect } from "react";

const BASE_TITLE = "ParrotNG — What Nigerians Really Think";
const BASE_DESC =
  "Vote, debate, and discover what millions of Nigerians really think about the issues that matter. News, polls, and real-time sentiment from Nigeria.";
const BASE_URL = "https://parrot.com.ng";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.svg`;

export interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  /** Full canonical URL (e.g. https://parrot.com.ng/news/abc123) */
  canonicalUrl?: string;
  /** ISO date string for article published date */
  publishedTime?: string;
  /** Article section / category */
  articleSection?: string;
  /** JSON-LD object(s) to inject — pass null to skip */
  jsonLd?: object | null;
}

/**
 * Imperatively update <head> tags — works in every page without HelmetProvider.
 * On unmount, the original values are NOT restored intentionally (next page sets its own).
 */
export function useSEO({
  title,
  description,
  ogImage,
  ogType = "website",
  canonicalUrl,
  publishedTime,
  articleSection,
  jsonLd,
}: SEOOptions) {
  const fullTitle = title ? `${title} — ParrotNG` : BASE_TITLE;
  const metaDesc = description || BASE_DESC;
  const imageUrl = ogImage || DEFAULT_OG_IMAGE;
  const canonical = canonicalUrl || BASE_URL;

  useEffect(() => {
    // ── Basic ──
    document.title = fullTitle;
    setMeta("name", "description", metaDesc);

    // ── Canonical ──
    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    // ── Open Graph ──
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", metaDesc);
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", ogType);
    if (publishedTime) setMeta("property", "article:published_time", publishedTime);
    if (articleSection) setMeta("property", "article:section", articleSection);

    // ── Twitter Card ──
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", metaDesc);
    setMeta("name", "twitter:image", imageUrl);

    // ── JSON-LD ──
    const existingLd = document.getElementById("json-ld-seo");
    if (jsonLd !== null) {
      const ld = existingLd || document.createElement("script");
      ld.id = "json-ld-seo";
      (ld as HTMLScriptElement).type = "application/ld+json";
      ld.textContent = JSON.stringify(jsonLd);
      if (!existingLd) document.head.appendChild(ld);
    } else if (existingLd) {
      existingLd.remove();
    }
  }, [fullTitle, metaDesc, imageUrl, canonical, ogType, publishedTime, articleSection, jsonLd]);
}

function setMeta(attr: "name" | "property", value: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.content = content;
}
