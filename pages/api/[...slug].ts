import type { NextApiRequest, NextApiResponse } from "next";

// const API_URL = "http://localhost:3456";
const API_URL = "https://croissant-api.fr/api";

export const config = {
  api: {
    bodyParser: false, // Permet de forwarder les bodies bruts (utile pour fichiers, etc.)
  },
};

function filterHeaders(headers: Record<string, any>) {
  // Supprime les headers qui posent problème
  const excluded = ["host", "connection", "content-length", "accept-encoding"];
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!excluded.includes(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

function getRealIP(req: NextApiRequest): string {
  const headers = req.headers;

  // Apache avec mod_remoteip peut modifier REMOTE_ADDR
  // Essayons d'abord les headers standards
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      .split(",")
      .map((ip) => ip.trim());

    // Prendre la première IP non-locale
    for (const ip of ips) {
      if (ip && !isLocalIP(ip)) {
        console.log("Using x-forwarded-for IP:", ip);
        return ip;
      }
    }
  }

  // Autres headers
  const realIp = headers["x-real-ip"];
  if (realIp && !isLocalIP(realIp as string)) {
    console.log("Using x-real-ip:", realIp);
    return realIp as string;
  }

  // Si tout le reste échoue, on peut essayer de récupérer l'IP depuis connection info
  const connection = (req as any).connection;
  if (
    connection &&
    connection.remoteAddress &&
    !isLocalIP(connection.remoteAddress)
  ) {
    console.log("Using connection.remoteAddress:", connection.remoteAddress);
    return connection.remoteAddress;
  }

  return "unknown";
}

function isLocalIP(ip: string): boolean {
  const localPatterns = [
    /^127\./, // 127.x.x.x
    /^10\./, // 10.x.x.x
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.x.x - 172.31.x.x
    /^192\.168\./, // 192.168.x.x
    /^::1$/, // IPv6 loopback
    /^::ffff:127\./, // IPv6-mapped IPv4 loopback
    /^fc00:/, // IPv6 unique local
    /^fe80:/, // IPv6 link-local
  ];

  return localPatterns.some((pattern) => pattern.test(ip));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug = [], ...query } = req.query;
  let url = `${API_URL}/${Array.isArray(slug) ? slug.join("/") : slug}`;

  // Ajoute les query params à l'URL
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else {
      searchParams.append(key, value as string);
    }
  }
  if ([...searchParams].length > 0) {
    url += `?${searchParams.toString()}`;
  }

  // Récupère le body brut (pour POST/PUT/PATCH/DELETE)
  let body: any = undefined;
  if (!["GET", "HEAD"].includes(req.method || "")) {
    body = await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers: {
      ...filterHeaders(req.headers as Record<string, any>),
      "x-forwarded-for": getRealIP(req),
      "x-real-ip": getRealIP(req),
    },
    body: body && body.length > 0 ? body : undefined,
    // Pas de redirect automatique
  };

  // Forward la requête
  const apiRes = await fetch(url, fetchOptions);

  // Forward le status et les headers
  res.status(apiRes.status);
  apiRes.headers.forEach((value, key) => {
    // Certains headers sont interdits par Next.js (ex: transfer-encoding)
    if (
      ![
        "transfer-encoding",
        "content-encoding",
        "content-length",
        "connection",
      ].includes(key.toLowerCase())
    ) {
      res.setHeader(key, value);
    }
  });

  // Stream la réponse
  const buffer = await apiRes.arrayBuffer();
  res.send(Buffer.from(buffer));
}
