import { buildWebPageJsonLd, getSeoRoute } from './site';

export default function WebPageJsonLd({ path }) {
  const route = getSeoRoute(path);

  if (!route) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildWebPageJsonLd(route)),
      }}
    />
  );
}
