/**
 * useZoneStats — DADOS HÍBRIDOS DE PRODUÇÃO POR ZONA RURAL
 *
 * Combina duas fontes:
 * 1) Base curada (src/data/ruralZones.ts) — referência de vocação produtiva.
 * 2) Anúncios reais cadastrados no app (tabela "products") — agrupados pela
 *    cidade informada pelo produtor.
 *
 * Regra de mesclagem:
 * - Produto que existe na base curada e também tem anúncios → índice curado
 *   recebe um reforço proporcional ao número de anúncios (máx. 100).
 * - Produto que só aparece nos anúncios reais → entra na zona com índice
 *   calculado a partir da quantidade de anúncios.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ruralZones, type RuralZone, type ZoneProduct } from "@/data/ruralZones";

export type ZoneStatProduct = ZoneProduct & {
  /** Quantos anúncios reais existem hoje para esse produto na zona */
  listings: number;
  source: "curada" | "real" | "ambos";
};

export type ZoneStats = Omit<RuralZone, "products"> & {
  products: ZoneStatProduct[];
  realListings: number;
  /** Produto de maior índice da zona */
  topProduct: ZoneStatProduct | undefined;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchesZone = (city: string | null, zone: RuralZone) => {
  if (!city) return false;
  const c = normalize(city);
  return c.includes(normalize(zone.city)) || normalize(zone.name).includes(c);
};

const buildStats = (
  realProducts: { name: string; category: string; city: string | null }[]
): ZoneStats[] => {
  const stats = ruralZones.map((zone) => {
    const zoneListings = realProducts.filter((p) => matchesZone(p.city, zone));

    // Conta anúncios por nome de produto (normalizado)
    const counts = new Map<string, { count: number; name: string; category: string }>();
    zoneListings.forEach((p) => {
      const key = normalize(p.name);
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { count: 1, name: p.name, category: p.category });
    });

    const products: ZoneStatProduct[] = zone.products.map((p) => {
      // Casa por nome curado contido no nome do anúncio (ex: "Mandioca" ~ "Mandioca fresca")
      let listings = 0;
      counts.forEach((v, key) => {
        if (key.includes(normalize(p.name)) || normalize(p.name).includes(key)) {
          listings += v.count;
        }
      });
      return {
        ...p,
        listings,
        index: Math.min(100, p.index + listings * 3),
        source: listings > 0 ? "ambos" : "curada",
      };
    });

    // Produtos que só existem nos anúncios reais
    counts.forEach((v) => {
      const alreadyCovered = zone.products.some(
        (p) => normalize(v.name).includes(normalize(p.name)) || normalize(p.name).includes(normalize(v.name))
      );
      if (!alreadyCovered) {
        products.push({
          name: v.name,
          category: v.category,
          index: Math.min(100, 20 + v.count * 8),
          season: "Anúncios ativos",
          listings: v.count,
          source: "real",
        });
      }
    });

    products.sort((a, b) => b.index - a.index);

    return {
      ...zone,
      products,
      realListings: zoneListings.length,
      topProduct: products[0],
    };
  });

  return stats;
};

export const useZoneStats = () => {
  return useQuery({
    queryKey: ["zone-stats"],
    queryFn: async (): Promise<ZoneStats[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("name, category, city")
        .eq("is_active", true);

      if (error) {
        // Sem backend disponível, usa apenas a base curada
        return buildStats([]);
      }
      return buildStats(data ?? []);
    },
    staleTime: 1000 * 60 * 5,
  });
};

/** Ranking de zonas para um produto específico */
export const rankZonesByProduct = (zones: ZoneStats[], productName: string) => {
  const target = normalize(productName);
  return zones
    .map((zone) => {
      const match = zone.products.find(
        (p) => normalize(p.name).includes(target) || target.includes(normalize(p.name))
      );
      return match ? { zone, product: match } : null;
    })
    .filter((v): v is { zone: ZoneStats; product: ZoneStatProduct } => v !== null)
    .sort((a, b) => b.product.index - a.product.index);
};
