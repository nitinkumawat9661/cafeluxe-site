import type { MetadataRoute } from "next";

const SITE_URL = "https://cafeluxesite.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/app", "/about", "/contact", "/terms", "/privacy"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
