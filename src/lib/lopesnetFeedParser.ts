import { XMLParser } from 'fast-xml-parser';
import { ParsedXMLProperty, normalizeCategory } from './xmlPropertyParser.js';

/**
 * Parser for the real Lopesnet "ListingDataFeed" XML export (the same feed the official
 * Lopesnet portal already sends to ZAP/VivaReal every morning) — a different, more deeply
 * nested schema than the simpler flat XML the manual-upload importer (xmlPropertyParser.ts)
 * was built for. This runs on the backend (Node), so it uses fast-xml-parser instead of the
 * browser's DOMParser.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  isArray: (name) => ['Listing', 'Item', 'Feature'].includes(name)
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(node: any): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && '__cdata' in node) return String(node.__cdata || '');
  if (typeof node === 'object' && '#text' in node) return String(node['#text'] ?? '');
  return '';
}

function numberOf(node: any): number {
  const t = textOf(node);
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

/**
 * Best-effort extraction of the responsible captador's name from the free-text description.
 * The feed's own <AgentInfo> field is empty on every listing in this feed (confirmed by
 * inspection), so this is the only signal available — it is NOT reliable (not every listing
 * mentions a name, and formatting varies), which is why the import flow still lets a captador
 * be reassigned manually afterward rather than treating this as authoritative.
 *
 * Patterns handled, in order of how distinctive (and therefore trustworthy) the signal is:
 *   1. "Para mais/maiores informações: Nome Sobrenome"
 *   2. "Nome Sobrenome - (92) 98157-9142" (name immediately followed by a phone number)
 *   3. "Nome Sobrenome CRECI 1234" (name immediately followed by a CRECI number)
 */
function extractCaptadorName(description: string): string | undefined {
  const namePattern = '[A-ZÀ-Ú][a-zà-ú]+(?:\\s+(?:d[ae]s?|[A-ZÀ-Ú][a-zà-ú]+)){1,3}';

  const afterInfoLabel = new RegExp(`Para\\s+mai(?:s|ores)\\s+informa[çc][õo]es[:!]?\\s*(${namePattern})`, 'i');
  const beforePhone = new RegExp(`(${namePattern})\\s*[-–]\\s*\\(?\\s*\\d(?:[\\s()–-]*\\d){6,}`, '');
  const beforeCreci = new RegExp(`(${namePattern})\\s+CRECI`, 'i');

  const match = description.match(afterInfoLabel) || description.match(beforePhone) || description.match(beforeCreci);
  if (!match) return undefined;

  const name = match[1].trim().replace(/\s+/g, ' ');
  // Guards against the regex accidentally grabbing a property/condo name that happens to
  // precede a phone-like number for unrelated reasons.
  if (name.length < 5 || name.length > 40) return undefined;
  return name;
}

function mapTransactionType(t: string): 'Venda' | 'Locação' | 'Venda e Locação' {
  const v = (t || '').toLowerCase();
  if (v.includes('sale/rent') || v.includes('sale-rent')) return 'Venda e Locação';
  if (v.includes('rent')) return 'Locação';
  return 'Venda';
}

export function parseLopesnetFeedXML(xmlString: string): ParsedXMLProperty[] {
  const parsed = parser.parse(xmlString);
  const listings = asArray(parsed?.ListingDataFeed?.Listings?.Listing);
  const results: ParsedXMLProperty[] = [];

  for (const listing of listings) {
    const code = textOf(listing.ListingID);
    if (!code) continue; // a listing with no ID can't be safely deduplicated later — skip it

    const details = listing.Details || {};
    const location = listing.Location || {};
    const description = textOf(details.Description);

    const salePrice = numberOf(details.ListPrice);
    const rentPrice = numberOf(details.RentalPrice);
    const purpose = mapTransactionType(textOf(listing.TransactionType));

    const images = asArray(listing?.Media?.Item)
      .map((item: any) => ({ url: textOf(item), primary: item?.['@_primary'] === 'true' || item?.['@_primary'] === true }))
      .filter(img => img.url)
      .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .map(img => img.url);

    const features = asArray(details?.Features?.Feature).map(f => textOf(f)).filter(Boolean);

    const broker_name = extractCaptadorName(description);

    const address = [textOf(location.Address), textOf(location.StreetNumber)].filter(Boolean).join(', ');

    results.push({
      code,
      external_id: code,
      title: textOf(listing.Title) || 'Imóvel sem título',
      description,
      category: normalizeCategory(textOf(details.PropertyType)),
      purpose,
      status: 'Disponível',
      price: salePrice,
      rent_price: rentPrice || undefined,
      condo_fee: numberOf(details.PropertyAdministrationFee),
      iptu: numberOf(details.YearlyTax),
      neighborhood: textOf(location.Neighborhood),
      city: textOf(location.City) || 'Manaus',
      state: textOf(location?.State?.['@_abbreviation'] ?? location.State) || 'AM',
      address,
      total_area: numberOf(details.LotArea) || numberOf(details.LivingArea),
      built_area: numberOf(details.LivingArea),
      bedrooms: numberOf(details.Bedrooms),
      suites: numberOf(details.Suites),
      bathrooms: numberOf(details.Bathrooms),
      parking_spaces: numberOf(details.Garage),
      features,
      images,
      main_image: images[0] || '',
      broker_name
    });
  }

  return results;
}
