import type { Env } from "../src/store";
import { fixtureAuth, fixtureEnv, mediaFixtures } from "./fixture";

const identity = fixtureAuth();
export default {
  async fetch(request: Request, base: Env) {
    const url = new URL(request.url);
    const auth = await identity;
    if (url.pathname === "/_local-fixture/reset" && request.method === "POST") {
      await base.DB.batch([
        base.DB.prepare("DELETE FROM feedback"),
        base.DB.prepare("DELETE FROM character_media"),
        base.DB.prepare("DELETE FROM characters"),
        base.DB.prepare("UPDATE settings SET offer_on=0, offer_price=1900, offer_cap=10"),
      ]);
      return new Response(await auth.sign());
    }
    if (url.pathname === "/_local-fixture/media" && request.method === "POST") {
      const key = url.searchParams.get("key") as keyof typeof mediaFixtures;
      if (!Object.hasOwn(mediaFixtures, key)) return new Response(null, { status: 400 });
      await base.MEDIA.put(key, request.body, { httpMetadata: { contentType: mediaFixtures[key] } });
      return new Response(null, { status: 204 });
    }
    const bindings = { ...base, ...fixtureEnv, PUBLIC_URL: url.origin, ADMIN_HOST: url.host };
    if (url.pathname === "/fixture-storage-error") {
      return auth.app.fetch(new Request(new URL("/", url)), {
        ...bindings,
        DB: {
          prepare: () => {
            throw new Error("Local test storage offline");
          },
        } as unknown as D1Database,
      });
    }
    return auth.app.fetch(request, bindings);
  },
};
