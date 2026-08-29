/**
 * ZONAS RURAIS — Painel de dados de produção por zona rural
 *
 * Mostra, para a localização escolhida, quais zonas rurais mais produzem
 * cada produto. Os dados são híbridos: base curada + anúncios reais.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Sprout, TrendingUp, Users, Search } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { zoneProductNames, zoneStates } from "@/data/ruralZones";
import { rankZonesByProduct, useZoneStats, type ZoneStats } from "@/hooks/useZoneStats";

const ZonasRurais = () => {
  const navigate = useNavigate();
  const { data: zones, isLoading } = useZoneStats();
  const [state, setState] = useState<string>("todos");
  const [productQuery, setProductQuery] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const filteredZones: ZoneStats[] = useMemo(() => {
    if (!zones) return [];
    return state === "todos" ? zones : zones.filter((z) => z.state === state);
  }, [zones, state]);

  const productRanking = useMemo(() => {
    if (!productQuery.trim() || !filteredZones.length) return [];
    return rankZonesByProduct(filteredZones, productQuery.trim()).slice(0, 6);
  }, [filteredZones, productQuery]);

  const selectedZone =
    filteredZones.find((z) => z.id === selectedZoneId) ?? filteredZones[0];

  const chartData = (selectedZone?.products ?? []).slice(0, 6).map((p) => ({
    name: p.name,
    indice: p.index,
    anuncios: p.listings,
  }));

  return (
    <Layout>
      <div className="px-4 md:px-8 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Sprout className="w-7 h-7 text-primary" />
            Zonas Rurais e Produção
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Descubra quais zonas rurais mais produzem cada alimento. Os índices combinam a base
            de referência do projeto com os anúncios ativos dos produtores no AgroConnect.
          </p>
        </header>

        {/* Filtros */}
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Select value={state} onValueChange={setState}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {zoneStates.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Buscar produto (ex: mandioca, queijo, açaí)"
              className="pl-9"
              list="zone-products"
            />
            <datalist id="zone-products">
              {zoneProductNames.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Ranking por produto pesquisado */}
        {!isLoading && productQuery.trim() && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Zonas que mais produzem "{productQuery.trim()}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {productRanking.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma zona rural registrada para esse produto nos filtros atuais.
                </p>
              )}
              {productRanking.map(({ zone, product }, i) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {i + 1}º · {zone.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {zone.city} — {zone.state} · safra {product.season}
                      </p>
                    </div>
                    <Badge variant="secondary">{product.index} pts</Badge>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${product.index}%` }}
                    />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Lista de zonas */}
        {!isLoading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredZones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setSelectedZoneId(zone.id)}
                className={`text-left rounded-xl border p-4 bg-card transition-all hover:shadow-md ${
                  selectedZone?.id === zone.id ? "border-primary shadow-sm" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{zone.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {zone.city} — {zone.state}
                    </p>
                  </div>
                  <Badge className="shrink-0">{zone.topProduct?.name}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{zone.summary}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {zone.producers} produtores
                  </span>
                  <span className="flex items-center gap-1">
                    <Sprout className="w-3 h-3" /> {zone.realListings} anúncios ativos
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detalhe da zona selecionada */}
        {!isLoading && selectedZone && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Produção da {selectedZone.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{selectedZone.summary}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 16 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--secondary))" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number, key) =>
                        key === "indice" ? [`${value} pts`, "Índice de produção"] : [value, "Anúncios"]
                      }
                    />
                    <Bar dataKey="indice" radius={[0, 6, 6, 0]} barSize={18}>
                      {chartData.map((entry, i) => (
                        <Cell key={entry.name} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-2">
                {selectedZone.products.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.category} · safra {p.season}
                        {p.listings > 0 && ` · ${p.listings} anúncio(s) no app`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={p.source === "real" ? "outline" : "secondary"}>
                        {p.source === "real" ? "dado real" : p.source === "ambos" ? "curada + real" : "referência"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/buscar?q=${encodeURIComponent(p.name)}`)}
                      >
                        Ver ofertas
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ZonasRurais;
