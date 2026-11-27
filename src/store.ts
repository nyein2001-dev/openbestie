export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  FEEDBACK_LIMIT: RateLimit;
  STAGE: "local" | "preview" | "production";
  PUBLIC_URL?: string;
  SELLER_NAME?: string;
  SUPPORT_EMAIL?: string;
  ADMIN_HOST?: string;
  ACCESS_ISSUER?: string;
  ACCESS_AUDIENCE?: string;
  OWNER_EMAIL?: string;
  GUMROAD_HOST?: string;
  PLAUSIBLE_SCRIPT_URL?: string;
}

type FieldSpec = readonly [key: string, label: string, max: number, kind?: string];
export const groups = [
  [
    "Listing",
    [
      ["slug", "Slug", 70],
      ["name", "Character name", 80],
      ["role", "Role", 90],
      ["summary", "Summary", 400, "textarea"],
      ["displayOrder", "Display order", 5, "number"],
      ["price", "USD cents", 6, "number"],
      ["saleMode", "Sale mode", 6, "sale"],
      ["productId", "Gumroad product ID", 160],
      ["checkoutUrl", "Gumroad checkout URL", 500, "url"],
      ["editUrl", "Gumroad product edit URL", 500, "url"],
    ],
  ],
  [
    "Preview media",
    [
      ["shot1", "Shot 1 image key", 240],
      ["shot1Alt", "Shot 1 alt text", 240],
      ["setting1", "Shot 1 setting", 90],
      ["shot2", "Shot 2 image key", 240],
      ["shot2Alt", "Shot 2 alt text", 240],
      ["setting2", "Shot 2 setting", 90],
      ["clip", "Clip key", 240],
      ["captions", "WebVTT captions key (optional)", 240],
      ["clipDescription", "Clip description", 500, "textarea"],
      ["drift", "Visible drift", 500, "textarea"],
      ["crop", "Reference crop key", 240],
      ["cropAlt", "Reference crop alt text", 240],
      ["social", "Social JPG key", 240],
      ["socialAlt", "Social image alt text", 240],
    ],
  ],
  [
    "Kling workflow and pack",
    [
      ["model", "Kling model", 80],
      ["mode", "Kling mode", 80],
      ["plan", "Paid Kling plan", 80],
      ["tested", "Workflow test date", 10, "date"],
      ["constant", "What stayed constant", 400, "textarea"],
      ["changed", "What changed", 400, "textarea"],
      ["limitation", "Observed limitation", 400, "textarea"],
      ["prompt1", "Shot 1 prompt purpose", 220],
      ["prompt2", "Shot 2 prompt purpose", 220],
      ["mapping", "Reference-to-input mapping", 800, "textarea"],
      ["zipVersion", "ZIP version", 40],
      ["zipSize", "ZIP size in bytes", 10, "number"],
      ["licenseVersion", "License version", 12],
      ["front", "Front PNG filename", 100],
      ["frontWidth", "Front width in pixels", 5, "number"],
      ["frontHeight", "Front height in pixels", 5, "number"],
      ["side", "Side PNG filename", 100],
      ["sideWidth", "Side width in pixels", 5, "number"],
      ["sideHeight", "Side height in pixels", 5, "number"],
      ["threeQuarter", "Three-quarter PNG filename", 100],
      ["threeQuarterWidth", "Three-quarter width in pixels", 5, "number"],
      ["threeQuarterHeight", "Three-quarter height in pixels", 5, "number"],
      ["promptsFile", "Two copyable prompts filename", 100],
      ["quickStartFile", "Quick-start filename", 100],
      ["licenseFile", "License filename", 100],
    ],
  ],
  [
    "Private publication checks",
    [
      ["rightsRef", "Rights evidence reference", 240],
      ["rightsDate", "Rights check date", 10, "date"],
      ["reproductionDate", "Independent reproduction date", 10, "date"],
      ["priceDate", "Price confirmation date", 10, "date"],
      ["purchaseDate", "Native test purchase date", 10, "date"],
    ],
  ],
] as const satisfies readonly (readonly [string, readonly FieldSpec[]])[];
export const fields: readonly FieldSpec[] = groups.flatMap(([, entries]) => Array.from<FieldSpec>(entries));
export type Details = Partial<Record<(typeof groups)[number][1][number][0], string>>;
export type Values = Record<string, string | undefined>;
export type Errors = Record<string, string>;
export interface Character {
  id: number;
  slug: string;
  status: "draft" | "published" | "hidden";
  display_order: number;
  price: number;
  sale_mode: "buy" | "notify";
  product_id: string | null;
  details: Details;
  revision: number;
  first_published: string | null;
}
type StoredCharacter = Omit<Character, "details"> & { details: string };
export const defaultOffer = { offer_on: 0, offer_price: 1900, offer_cap: 10 };
export type Offer = typeof defaultOffer;
export const licenseVersion = "1.0";

export const contexts = {
  before: "Before purchase",
  after: "After use",
  support: "Support",
  notify: "Notify me",
};
export const outcomes = { yes: "Yes", no: "No", untried: "Haven't tried" };
export const blockers = {
  price: "Price",
  fit: "Character fit",
  proof: "Proof",
  tool: "Tool access",
  license: "License",
  delivery: "Delivery",
  result: "Generation result",
  other: "Other",
};
export const feedbackStatuses = { new: "New", reviewed: "Reviewed", closed: "Closed" };
export type Feedback = {
  id: number;
  character_id: number | null;
  character_name: string | null;
  context: keyof typeof contexts;
  outcome: keyof typeof outcomes | null;
  blocker: keyof typeof blockers | null;
  status: keyof typeof feedbackStatuses;
  message: string | null;
  email: string | null;
  reply: number;
  research: number;
  notify: number;
  reply_date: string | null;
  resolution: string | null;
  note: string | null;
  order_ref: string | null;
  created_at: string;
};

export const mediaTypes: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  vtt: "text/vtt",
};
export const mediaFields = {
  shot1: ["webp", "avif", "jpg"],
  shot2: ["webp", "avif", "jpg"],
  crop: ["webp", "avif", "jpg"],
  clip: ["mp4", "webm"],
  social: ["jpg"],
  captions: ["vtt"],
};
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isEmail = (value: string) =>
  value.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value);
export const mailto = (value: string) => `mailto:${encodeURIComponent(value).replace("%40", "@")}`;

export function extension(key: string) {
  return key.split(".").at(-1) ?? "";
}

export function validMediaKey(key: string) {
  return (
    key.length <= 240 &&
    /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.[a-z0-9]+$/.test(key) &&
    Object.hasOwn(mediaTypes, extension(key))
  );
}

export async function previewType(bucket: R2Bucket, key: string, object: R2Object) {
  const ext = extension(key);
  if (
    !object.size ||
    (object.httpMetadata?.contentType && object.httpMetadata.contentType !== mediaTypes[ext])
  )
    return false;
  const sample = await bucket.get(key, {
    range: { offset: 0, length: Math.min(32, object.size) },
    onlyIf: { etagMatches: object.etag },
  });
  if (!sample || !("body" in sample)) return false;
  const bytes = new Uint8Array(await sample.arrayBuffer());
  const text = String.fromCharCode(...bytes);
  switch (ext) {
    case "jpg":
      return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case "webp":
      return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
    case "avif":
      return text.slice(4, 8) === "ftyp" && /avif|avis/.test(text.slice(8));
    case "mp4":
      return text.slice(4, 8) === "ftyp";
    case "webm":
      return bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163;
    case "vtt":
      return new TextDecoder().decode(bytes).startsWith("WEBVTT");
    default:
      return false;
  }
}

export function httpsUrl(value?: string) {
  if (!value || !/^https:\/\/[a-z0-9]/i.test(value) || /[\\\s]/.test(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port) return url;
  } catch {
    return;
  }
}

export function checkout(env: Env, value?: string) {
  const url = httpsUrl(value);
  const host = env.GUMROAD_HOST?.toLowerCase();
  if (
    !url ||
    !host ||
    url.hostname !== host ||
    (host !== "gumroad.com" && !/^[a-z0-9-]+\.gumroad\.com$/.test(host)) ||
    !/^\/l\/[a-z0-9_-]+\/?$/i.test(url.pathname) ||
    url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "wanted")
  )
    return;
  url.searchParams.set("wanted", "true");
  return url.href;
}

export function productEdit(value?: string) {
  const url = httpsUrl(value);
  if (
    url &&
    ["gumroad.com", "app.gumroad.com"].includes(url.hostname) &&
    /^\/products\/[a-z0-9_-]+\/edit\/?$/i.test(url.pathname) &&
    !url.search &&
    !url.hash
  )
    return url.href;
}

export function validDate(value: string) {
  const time = Date.parse(value);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === value &&
    value <= new Date(Date.now() + 25200000).toISOString().slice(0, 10)
  );
}

export function integer(value: string, min: number, max: number) {
  const number = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(number) && number >= min && number <= max
    ? number
    : null;
}

export function listing(row: StoredCharacter): Character {
  return { ...row, details: JSON.parse(row.details) as Details };
}

export async function catalog(db: D1Database, owner = false) {
  const sql = owner
    ? "SELECT * FROM characters ORDER BY display_order, id"
    : "SELECT * FROM characters WHERE status = 'published' ORDER BY display_order, id";
  return (await db.prepare(sql).all<StoredCharacter>()).results.map(listing);
}

export async function bySlug(db: D1Database, slug: string) {
  const row = await db
    .prepare("SELECT * FROM characters WHERE slug = ? AND status = 'published'")
    .bind(slug)
    .first<StoredCharacter>();
  return row ? listing(row) : null;
}

export async function byId(db: D1Database, id: string) {
  const row = await db.prepare("SELECT * FROM characters WHERE id = ?").bind(id).first<StoredCharacter>();
  return row ? listing(row) : null;
}

export async function getOffer(db: D1Database) {
  return (
    (await db.prepare("SELECT offer_on, offer_price, offer_cap FROM settings WHERE id = 1").first<Offer>()) ??
    defaultOffer
  );
}

export function usd(cents: number) {
  return `USD ${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

export function offerText(price: number, offer: Offer) {
  return offer.offer_on && price === 2900
    ? `${usd(price)} per pack. First ${offer.offer_cap} packs ${usd(offer.offer_price)} at checkout, while available.`
    : usd(price);
}

export async function validateListing(env: Env, values: Values, publish: boolean, current: Character | null) {
  const errors: Errors = {};
  for (const [key, label, max, kind] of fields) {
    const value = values[key] ?? "";
    const required =
      publish && !["productId", "checkoutUrl", "editUrl", "purchaseDate", "captions"].includes(key);
    if ((required || key === "slug") && !value) errors[key] = `Enter ${label.toLowerCase()}.`;
    else if (value.length > max) errors[key] = `Use ${max} characters or fewer.`;
    else if (value && kind === "date" && !validDate(value))
      errors[key] = "Enter a valid date on or before today.";
  }
  const slug = values.slug ?? "";
  const displayOrder = integer(values.displayOrder ?? "", 0, 99999);
  const price = integer(values.price ?? "", 1, 100000);
  const saleMode = values.saleMode === "buy" ? "buy" : "notify";
  const productId = values.productId || null;
  if (!slugPattern.test(slug) || slug.length > 70)
    errors.slug = "Use lowercase letters, numbers and single hyphens.";
  if (current?.first_published && current.slug !== slug) errors.slug = "The published slug is permanent.";
  if (displayOrder === null) errors.displayOrder = "Enter a whole number from 0 to 99999.";
  if (price === null) errors.price = "Enter a whole number from 1 to 100000 cents.";
  if (values.saleMode !== "buy" && values.saleMode !== "notify") errors.saleMode = "Choose a sale mode.";
  if (productId && !/^[a-z0-9_+=-]{1,160}$/i.test(productId))
    errors.productId = "Enter the native product ID.";
  if ((publish && saleMode === "buy") || values.checkoutUrl) {
    if (!checkout(env, values.checkoutUrl))
      errors.checkoutUrl = "Enter a product URL on the configured Gumroad host.";
  }
  if (values.editUrl && !productEdit(values.editUrl))
    errors.editUrl = "Enter the authenticated Gumroad product edit URL.";
  if (publish && saleMode === "buy") {
    if (!productId) errors.productId = "Enter the purchased product's native ID.";
    if (!values.purchaseDate) errors.purchaseDate = "Record the native test purchase date.";
    if (!values.editUrl) errors.editUrl = "Enter the Gumroad product edit URL.";
  }
  if (values.licenseVersion && values.licenseVersion !== licenseVersion)
    errors.licenseVersion = "Choose an existing license version.";
  if (values.zipSize && integer(values.zipSize, 1, 9999999999) === null)
    errors.zipSize = "Enter the ZIP size in bytes.";
  const fileFields = ["front", "side", "threeQuarter", "promptsFile", "quickStartFile", "licenseFile"];
  const usedFiles = new Set<string>();
  for (const [index, key] of fileFields.entries()) {
    const file = values[key];
    if (!file) continue;
    const pattern = index < 3 ? /\.png$/i : index === 3 ? /\.(txt|md)$/i : /\.(txt|md|pdf)$/i;
    if (!/^[a-z0-9][a-z0-9 _.-]*$/i.test(file) || !pattern.test(file) || usedFiles.has(file.toLowerCase())) {
      errors[key] =
        index < 3 ? "Enter a distinct PNG filename." : "Enter a distinct filename in a supported format.";
    }
    usedFiles.add(file.toLowerCase());
  }
  for (const key of [
    "frontWidth",
    "frontHeight",
    "sideWidth",
    "sideHeight",
    "threeQuarterWidth",
    "threeQuarterHeight",
  ]) {
    if (values[key] && integer(values[key], 1, 24000) === null)
      errors[key] = "Enter pixel dimensions between 1 and 24000.";
  }
  const publishedMedia = new Map<string, string>();
  const stillSizes = new Map<string, number>();
  await Promise.all(
    Object.entries(mediaFields).map(async ([field, allowed]) => {
      const key = values[field];
      if (!key) return;
      if (!validMediaKey(key) || !allowed.includes(extension(key)))
        errors[field] = `Enter an R2 key ending in ${allowed.join(", ")}.`;
      else if (publish) {
        const object = await env.MEDIA.head(key);
        if (!object || !(await previewType(env.MEDIA, key, object))) {
          errors[field] = "Upload a nonempty preview to R2 with the matching content type.";
        } else if ((field === "shot1" || field === "shot2") && object.size > 150000) {
          errors[field] = "Compress the still to 150 KB or less.";
        } else {
          publishedMedia.set(key, object.etag);
          if (field === "shot1" || field === "shot2") stillSizes.set(field, object.size);
        }
      }
    }),
  );
  if ((stillSizes.get("shot1") ?? 0) + (stillSizes.get("shot2") ?? 0) > 250000)
    errors.shot2 = "Compress both stills to a combined size of 250 KB or less.";
  if (publish && values.shot1 && values.shot1 === values.shot2)
    errors.shot2 = "Choose a different still for Shot 2.";
  if (publish && values.confirm !== "on")
    errors.confirm = "Confirm you compared the preview, price and manifest.";
  const id = current?.id ?? 0;
  if (
    !errors.slug &&
    (await env.DB.prepare("SELECT id FROM characters WHERE slug = ? AND id <> ?").bind(slug, id).first())
  ) {
    errors.slug = "This slug is already in use.";
  }
  if (
    productId &&
    !errors.productId &&
    (await env.DB.prepare("SELECT id FROM characters WHERE product_id = ? AND id <> ?")
      .bind(productId, id)
      .first())
  ) {
    errors.productId = "This product ID is already in use.";
  }
  const columnFields = new Set(["slug", "displayOrder", "price", "saleMode", "productId"]);
  const details = Object.fromEntries(
    fields.filter(([key]) => !columnFields.has(key)).map(([key]) => [key, values[key] ?? ""]),
  );
  return { errors, slug, displayOrder, price, saleMode, productId, details, publishedMedia };
}
