import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
export function publicIP(address) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (version === 6) {
    const s = address.toLowerCase();
    const secondGroup = parseInt(s.split(":")[1] || "0", 16);
    return (
      /^[23]/.test(s) &&
      !(s.startsWith("2001:") && secondGroup < 0x200) &&
      !s.startsWith("2001:db8") &&
      !s.startsWith("2002:") &&
      !s.startsWith("3fff:")
    );
  }
  return false;
}
export async function validateURL(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw Error("Inserisci un link HTTPS valido.");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !u.hostname.includes(".") ||
    u.hostname.endsWith(".local") ||
    u.hostname.endsWith(".internal") ||
    isIP(u.hostname.replace(/[\[\]]/g, ""))
  )
    throw Error("Sono supportati solo link HTTPS a negozi pubblici.");
  const addresses = await lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicIP(a.address)))
    throw Error("Questo indirizzo non è un negozio pubblico supportato.");
  return { u, address: addresses.find((a) => a.family === 4) || addresses[0] };
}
async function fetchPage(value, redirects = 0) {
  const { u, address } = await validateURL(value);
  return new Promise((resolve, reject) => {
    const req = https.request(
      u,
      {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "VYRA/2.0 ProductPreview",
          Accept: "text/html,application/xhtml+xml",
        },
        lookup: (hostname, options, callback) => {
          if (options.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          if (redirects >= 3 || !res.headers.location)
            return reject(
              Error(
                "Troppi reindirizzamenti: inserisci il link diretto del prodotto.",
              ),
            );
          fetchPage(new URL(res.headers.location, u).href, redirects + 1).then(
            resolve,
            reject,
          );
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(
            Error(
              "Il negozio blocca l’anteprima. Inserisci i dettagli a mano.",
            ),
          );
        }
        if (
          !/text\/html|application\/xhtml\+xml/.test(
            res.headers["content-type"] || "",
          )
        ) {
          res.resume();
          return reject(Error("Questo link non contiene una pagina prodotto."));
        }
        let size = 0;
        const parts = [];
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 1e6) {
            req.destroy();
            reject(
              Error("La pagina è troppo grande. Inserisci i dettagli a mano."),
            );
          } else parts.push(chunk);
        });
        res.on("end", () =>
          resolve({ html: Buffer.concat(parts).toString("utf8"), url: u.href }),
        );
        res.on("error", reject);
      },
    );
    req.setTimeout(8000, () =>
      req.destroy(
        Error("Il negozio non risponde: inserisci i dettagli a mano."),
      ),
    );
    req.on("error", reject);
    req.end();
  });
}
function decode(s = "") {
  return String(s)
    .replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (x) => {
      const named = {
        "&amp;": "&",
        "&quot;": '"',
        "&apos;": "'",
        "&lt;": "<",
        "&gt;": ">",
      };
      if (named[x]) return named[x];
      const n = x.startsWith("&#x")
        ? parseInt(x.slice(3), 16)
        : parseInt(x.slice(2));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(/<[^>]*>/g, "")
    .trim();
}
function cleanURL(value, base) {
  try {
    const u = new URL(value, base);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
export function metadata(html, url) {
  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
      attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3]);
    const name = attrs.property || attrs.name;
    if (name && attrs.content) meta[name.toLowerCase()] = attrs.content;
  }
  let product;
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (
      value["@type"] === "Product" ||
      (Array.isArray(value["@type"]) && value["@type"].includes("Product"))
    )
      product = value;
    if (value["@graph"]) walk(value["@graph"]);
  };
  for (const script of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      walk(JSON.parse(script[1]));
    } catch {}
  }
  const offer = Array.isArray(product?.offers)
      ? product.offers[0]
      : product?.offers,
    image = Array.isArray(product?.image) ? product.image[0] : product?.image;
  const priceValue =
    offer?.price ??
    offer?.lowPrice ??
    meta["product:price:amount"] ??
    meta["og:price:amount"];
  const parsed =
    typeof priceValue === "number"
      ? priceValue
      : Number(String(priceValue ?? "").replace(",", "."));
  const currency =
    offer?.priceCurrency ||
    meta["product:price:currency"] ||
    meta["og:price:currency"] ||
    "";
  const name = decode(
    product?.name ||
      meta["og:title"] ||
      meta["twitter:title"] ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      "",
  ).slice(0, 180);
  return {
    name,
    price:
      priceValue !== undefined &&
      ["EUR", "USD", "GBP"].includes(currency) &&
      Number.isFinite(parsed) &&
      parsed >= 0
        ? parsed
        : null,
    currency: ["EUR", "USD", "GBP"].includes(currency) ? currency : "EUR",
    image: cleanURL(
      typeof image === "string"
        ? image
        : image?.url || meta["og:image"] || meta["twitter:image"] || "",
      url,
    ),
  };
}
export async function productPreview(url) {
  const page = await fetchPage(url);
  const result = metadata(page.html, page.url);
  if (!result.name)
    throw Error("Il negozio non espone i dettagli. Puoi inserirli a mano.");
  return result;
}
