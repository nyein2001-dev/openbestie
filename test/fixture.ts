import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createApp } from "../src/index";
import type { Env } from "../src/store";

export const fixtureSlug = "fixture-clockwork";
export const fixtureName = "Clockwork · Local test fixture";
export const scriptUrl = "https://plausible.io/js/pa-local-test.js";
export const ownerEmail = "owner@fixture.invalid";
export const fixtureEnv = {
  STAGE: "production",
  PUBLIC_URL: "https://store.fixture.invalid",
  SELLER_NAME: "Local Test Identity",
  SUPPORT_EMAIL: "support@fixture.invalid",
  ADMIN_HOST: "owner.fixture.invalid",
  ACCESS_ISSUER: "https://local-fixture.cloudflareaccess.com",
  ACCESS_AUDIENCE: "local-fixture-audience",
  OWNER_EMAIL: ownerEmail,
  GUMROAD_HOST: "fixture.gumroad.com",
  PLAUSIBLE_SCRIPT_URL: scriptUrl,
} as const satisfies Partial<Env>;

export const fixtureValues = {
  slug: fixtureSlug,
  name: fixtureName,
  role: "A geometric robot",
  summary: "Fictional test content for layout and form verification.",
  displayOrder: "4",
  price: "2900",
  saleMode: "buy",
  productId: "fixture-id",
  checkoutUrl: "https://fixture.gumroad.com/l/local-only",
  editUrl: "https://gumroad.com/products/fixture-id/edit",
  shot1: "fixture/shot1.webp",
  shot1Alt: "Mint geometric robot with two circular eyes",
  setting1: "Mint stage",
  shot2: "fixture/shot2.webp",
  shot2Alt: "Lavender geometric robot centered on the stage",
  setting2: "Lavender stage",
  clip: "fixture/proof.webm",
  clipDescription: "The geometric robot moves to the right as the backdrop changes color.",
  drift: "The body and background change color between the two stills.",
  crop: "fixture/crop.webp",
  cropAlt: "Cropped shape of the robot",
  social: "fixture/social.jpg",
  socialAlt: "Robot test fixture",
  model: "Fixture model",
  mode: "Fixture mode",
  plan: "Fixture plan",
  tested: "2025-01-02",
  constant: "The outline and eyes stay constant.",
  changed: "Background color and horizontal placement change.",
  limitation: "The body color changes.",
  prompt1: "Establish the robot silhouette.",
  prompt2: "Move the subject into a second setting.",
  mapping: "Front reference first. Side and three-quarter references as additional inputs.",
  zipVersion: "1.0",
  zipSize: "22140",
  licenseVersion: "1.0",
  front: "front.png",
  frontWidth: "1024",
  frontHeight: "1024",
  side: "side.png",
  sideWidth: "1024",
  sideHeight: "1024",
  threeQuarter: "three-quarter.png",
  threeQuarterWidth: "1024",
  threeQuarterHeight: "1024",
  promptsFile: "prompts.txt",
  quickStartFile: "quick-start.md",
  licenseFile: "license.txt",
  rightsRef: "Synthetic fixture record 01",
  rightsDate: "2025-01-01",
  reproductionDate: "2025-01-03",
  priceDate: "2025-01-04",
  purchaseDate: "2025-01-04",
};

export const mediaFixtures = {
  "fixture/shot1.webp": "image/webp",
  "fixture/shot2.webp": "image/webp",
  "fixture/crop.webp": "image/webp",
  "fixture/proof.webm": "video/webm",
  "fixture/social.jpg": "image/jpeg",
  "fixture/notes.vtt": "text/vtt",
};

export async function fixtureAuth() {
  const signing = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(signing.publicKey)), kid: "local-fixture-key", alg: "RS256" };
  const app = createApp(() => createLocalJWKSet({ keys: [jwk] }));
  function sign(
    claims: { email?: string; iss?: string; aud?: string; exp?: number } = {},
    key = signing.privateKey,
  ) {
    return new SignJWT({ email: ownerEmail, ...claims })
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setSubject("local-test-identity")
      .setIssuer(claims.iss ?? fixtureEnv.ACCESS_ISSUER)
      .setAudience(claims.aud ?? fixtureEnv.ACCESS_AUDIENCE)
      .setExpirationTime(claims.exp ?? "1h")
      .sign(key);
  }
  return { app, sign };
}
