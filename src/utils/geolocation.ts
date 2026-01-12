import { GeoLocationData } from "@/types/database";

const GEO_CACHE_KEY = "geo_location_cache";
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000;

interface CachedGeoData {
  data: GeoLocationData;
  timestamp: number;
}

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function getIpAddress(): Promise<string> {
  try {
    const response = await fetchWithTimeout("https://api.ipify.org?format=json", 5000);
    const data = await response.json();
    return data.ip || "unknown";
  } catch (error) {
    console.warn("Erro ao obter IP:", error);
    return "unknown";
  }
}

export async function getGeolocation(ip: string): Promise<GeoLocationData> {
  if (ip === "unknown") {
    return { ip, country: null, city: null };
  }

  const cached = getCachedGeoData();
  if (cached && cached.data.ip === ip) {
    return cached.data;
  }

  try {
    const response = await fetchWithTimeout(`https://ipapi.co/${ip}/json/`, 5000);
    
    if (!response.ok) {
      throw new Error("Falha na requisição de geolocalização");
    }

    const data = await response.json();
    
    const geoData: GeoLocationData = {
      ip,
      country: data.country_name || null,
      city: data.city || null,
    };

    cacheGeoData(geoData);
    return geoData;
  } catch (error) {
    console.warn("Erro ao obter geolocalização:", error);
    return { ip, country: null, city: null };
  }
}

export async function getIpAndGeolocation(): Promise<GeoLocationData> {
  const ip = await getIpAddress();
  return await getGeolocation(ip);
}

function getCachedGeoData(): CachedGeoData | null {
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (!cached) return null;

    const parsedCache: CachedGeoData = JSON.parse(cached);
    const now = Date.now();

    if (now - parsedCache.timestamp > GEO_CACHE_DURATION) {
      localStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }

    return parsedCache;
  } catch (error) {
    console.warn("Erro ao ler cache de geolocalização:", error);
    return null;
  }
}

function cacheGeoData(data: GeoLocationData): void {
  try {
    const cacheData: CachedGeoData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Erro ao salvar cache de geolocalização:", error);
  }
}
