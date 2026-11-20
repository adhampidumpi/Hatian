import type { MetadataRoute } from "next";

/** Only the sign-in page is public; everything else is someone's money. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/login"],
      disallow: [
        "/groups",
        "/activity",
        "/account",
        "/expenses",
        "/invite",
        "/api",
      ],
    },
  };
}
