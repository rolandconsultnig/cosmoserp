import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getSiteUrl, absoluteUrl } from '../lib/siteConfig';

const DEFAULT_TITLE = 'Mixio Marketplace — Buy from Nigerian Businesses';
const DEFAULT_DESC =
  'Discover and buy from verified Nigerian businesses on Mixio Marketplace. Secure escrow payments, nationwide delivery, and NRS-compliant tax receipts.';

/**
 * @param {object} props
 * @param {string} [props.title] - Page title (suffix " | Mixio Marketplace" added unless fullTitle)
 * @param {string} [props.fullTitle] - Exact document title (no suffix)
 * @param {string} [props.description]
 * @param {string} [props.canonicalPath] - Path only, e.g. /products/abc — defaults to current location
 * @param {string} [props.imageUrl] - og:image (relative OK)
 * @param {'website'|'article'|'product'} [props.type]
 * @param {object|object[]} [props.jsonLd] - schema.org object(s) for JSON-LD script tag(s)
 * @param {boolean} [props.noindex]
 */
export default function Seo({
  title,
  fullTitle,
  description = DEFAULT_DESC,
  canonicalPath,
  imageUrl,
  type = 'website',
  jsonLd,
  noindex = false,
}) {
  const { pathname, search } = useLocation();
  const site = getSiteUrl();
  const path = canonicalPath != null ? canonicalPath : `${pathname}${search}`;
  const canonical = site ? `${site}${path.startsWith('/') ? path : `/${path}`}` : '';

  const documentTitle = fullTitle || (title ? `${title} | Mixio Marketplace` : DEFAULT_TITLE);
  const ogImage = imageUrl ? absoluteUrl(imageUrl) : site ? `${site}/mixtio-logo.png` : '';

  const ldNodes = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))
    : null;

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{documentTitle}</title>
      <meta name="description" content={description.slice(0, 320)} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Mixio Marketplace" />
      <meta property="og:title" content={documentTitle} />
      <meta property="og:description" content={description.slice(0, 300)} />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      <meta property="og:locale" content="en_NG" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={documentTitle} />
      <meta name="twitter:description" content={description.slice(0, 200)} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

      {ldNodes}
    </Helmet>
  );
}
