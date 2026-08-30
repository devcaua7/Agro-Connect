/**
 * ZONE HIGHLIGHTS — Resumo das zonas rurais na home
 *
 * Mostra os destaques produtivos (ex: "Boa Paz produz mais mandioca")
 * combinando a base curada com os anúncios reais, e leva para a página
 * completa de Zonas Rurais.
 */

import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useZoneStats } from "@/hooks/useZoneStats";

const ZoneHighlights = () => {
  const { data: zones } = useZoneStats();
  const highlights = (zones ?? [])
    .filter((z) => z.topProduct)
    .sort((a, b) => (b.topProduct?.index ?? 0) - (a.topProduct?.index ?? 0))
    .slice(0, 4);

  if (!highlights.length) return null;

  return (
    <section className="px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" />
          O que cada zona rural mais produz
        </h2>
        <Link
          to="/zonas-rurais"
          className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Ver todas
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {highlights.map((zone) => (
          <Link
            key={zone.id}
            to="/zonas-rurais"
            className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/50 transition-all"
          >
            <Badge variant="secondary" className="mb-2">
              {zone.topProduct!.name}
            </Badge>
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {zone.name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3" />
              {zone.city} — {zone.state}
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${zone.topProduct!.index}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ZoneHighlights;
