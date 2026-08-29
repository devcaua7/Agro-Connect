/**
 * BASE CURADA DE ZONAS RURAIS
 *
 * Cada zona rural pertence a um município/estado e possui uma lista de
 * produtos com um "índice de produção" (0-100) que representa o quanto
 * aquela zona se destaca naquele produto.
 *
 * Esses dados servem como referência do TCC. No app eles são combinados
 * (modo híbrido) com os anúncios reais cadastrados pelos produtores.
 */

export type ZoneProduct = {
  /** Nome do produto, ex: "Mandioca" */
  name: string;
  /** Categoria correspondente às categorias do marketplace */
  category: string;
  /** Índice de produção 0-100 (quanto maior, mais aquela zona produz) */
  index: number;
  /** Meses de melhor safra */
  season: string;
};

export type RuralZone = {
  id: string;
  /** Nome da zona rural, ex: "Zona Rural da Boa Paz" */
  name: string;
  city: string;
  state: string;
  /** Número aproximado de produtores familiares na zona */
  producers: number;
  /** Descrição curta da vocação produtiva */
  summary: string;
  products: ZoneProduct[];
};

export const ruralZones: RuralZone[] = [
  {
    id: "boa-paz",
    name: "Zona Rural da Boa Paz",
    city: "Campina Grande",
    state: "PB",
    producers: 128,
    summary: "Referência regional em raízes e tubérculos, com forte produção de mandioca e farinha artesanal.",
    products: [
      { name: "Mandioca", category: "Legumes", index: 94, season: "Mar a Set" },
      { name: "Batata-doce", category: "Legumes", index: 71, season: "Abr a Ago" },
      { name: "Feijão Macassar", category: "Arroz e Feijão", index: 58, season: "Jun a Set" },
      { name: "Milho Verde", category: "Arroz e Feijão", index: 47, season: "Mai a Jul" },
      { name: "Ovos Caipira", category: "Ovos", index: 33, season: "Ano todo" },
    ],
  },
  {
    id: "serra-do-mel",
    name: "Zona Rural da Serra do Mel",
    city: "Mossoró",
    state: "RN",
    producers: 96,
    summary: "Polo de fruticultura irrigada, com destaque para castanha de caju e melão.",
    products: [
      { name: "Castanha de Caju", category: "Castanhas e Frutas Secas", index: 91, season: "Set a Jan" },
      { name: "Melão", category: "Frutas", index: 84, season: "Ago a Dez" },
      { name: "Manga", category: "Frutas", index: 62, season: "Out a Fev" },
      { name: "Mel", category: "Condimentos e Molhos", index: 55, season: "Ano todo" },
      { name: "Mandioca", category: "Legumes", index: 29, season: "Mar a Set" },
    ],
  },
  {
    id: "vale-verde",
    name: "Zona Rural do Vale Verde",
    city: "Atibaia",
    state: "SP",
    producers: 143,
    summary: "Cinturão de hortaliças e morangos que abastece a região metropolitana.",
    products: [
      { name: "Morango", category: "Frutas", index: 96, season: "Jun a Nov" },
      { name: "Alface", category: "Verduras e Temperos", index: 88, season: "Ano todo" },
      { name: "Tomate", category: "Legumes", index: 74, season: "Ano todo" },
      { name: "Cogumelo Shiitake", category: "Cogumelos", index: 52, season: "Mar a Set" },
      { name: "Ovos Caipira", category: "Ovos", index: 41, season: "Ano todo" },
    ],
  },
  {
    id: "canastra",
    name: "Zona Rural da Serra da Canastra",
    city: "São Roque de Minas",
    state: "MG",
    producers: 87,
    summary: "Tradição em queijo artesanal e derivados do leite com denominação de origem.",
    products: [
      { name: "Queijo Minas Artesanal", category: "Queijos e Laticínios", index: 98, season: "Ano todo" },
      { name: "Leite", category: "Iogurtes e Leites", index: 82, season: "Ano todo" },
      { name: "Iogurte Natural", category: "Iogurtes e Leites", index: 64, season: "Ano todo" },
      { name: "Café", category: "Condimentos e Molhos", index: 45, season: "Mai a Ago" },
      { name: "Milho Verde", category: "Arroz e Feijão", index: 31, season: "Mai a Jul" },
    ],
  },
  {
    id: "chapada",
    name: "Zona Rural da Chapada dos Veadeiros",
    city: "Alto Paraíso",
    state: "GO",
    producers: 64,
    summary: "Agricultura agroecológica com temperos, pimentas e produtos artesanais.",
    products: [
      { name: "Pimenta Artesanal", category: "Condimentos e Molhos", index: 89, season: "Ano todo" },
      { name: "Banana", category: "Frutas", index: 70, season: "Ano todo" },
      { name: "Mandioca", category: "Legumes", index: 66, season: "Mar a Set" },
      { name: "Frango Caipira", category: "Frangos", index: 48, season: "Ano todo" },
      { name: "Abóbora", category: "Legumes", index: 39, season: "Fev a Jun" },
    ],
  },
  {
    id: "baixo-tocantins",
    name: "Zona Rural do Baixo Tocantins",
    city: "Cametá",
    state: "PA",
    producers: 112,
    summary: "Extrativismo familiar de açaí, castanha e farinha d'água.",
    products: [
      { name: "Açaí", category: "Frutas", index: 97, season: "Ago a Dez" },
      { name: "Castanha-do-Pará", category: "Castanhas e Frutas Secas", index: 86, season: "Dez a Mar" },
      { name: "Mandioca", category: "Legumes", index: 79, season: "Ano todo" },
      { name: "Cupuaçu", category: "Frutas", index: 61, season: "Jan a Abr" },
      { name: "Pimenta-de-cheiro", category: "Condimentos e Molhos", index: 44, season: "Ano todo" },
    ],
  },
  {
    id: "vale-do-cafe",
    name: "Zona Rural do Vale do Café",
    city: "Piracicaba",
    state: "SP",
    producers: 105,
    summary: "Produção de grãos e cereais em pequenas propriedades familiares.",
    products: [
      { name: "Milho Verde", category: "Arroz e Feijão", index: 90, season: "Mai a Jul" },
      { name: "Feijão Carioca", category: "Arroz e Feijão", index: 77, season: "Jun a Set" },
      { name: "Arroz Integral", category: "Arroz e Feijão", index: 59, season: "Fev a Mai" },
      { name: "Pão Caseiro", category: "Pães e Massas", index: 46, season: "Ano todo" },
      { name: "Ovos Caipira", category: "Ovos", index: 37, season: "Ano todo" },
    ],
  },
  {
    id: "agreste-sul",
    name: "Zona Rural do Agreste Sul",
    city: "Garanhuns",
    state: "PE",
    producers: 91,
    summary: "Bacia leiteira com forte produção de derivados e hortaliças de clima ameno.",
    products: [
      { name: "Leite", category: "Iogurtes e Leites", index: 92, season: "Ano todo" },
      { name: "Queijo Coalho", category: "Queijos e Laticínios", index: 80, season: "Ano todo" },
      { name: "Batata", category: "Legumes", index: 63, season: "Abr a Ago" },
      { name: "Cenoura", category: "Legumes", index: 54, season: "Mar a Jul" },
      { name: "Mandioca", category: "Legumes", index: 42, season: "Mar a Set" },
    ],
  },
];

/** Lista de estados presentes na base curada */
export const zoneStates = Array.from(new Set(ruralZones.map((z) => z.state))).sort();

/** Todos os produtos citados na base curada (sem repetição) */
export const zoneProductNames = Array.from(
  new Set(ruralZones.flatMap((z) => z.products.map((p) => p.name)))
).sort((a, b) => a.localeCompare(b, "pt-BR"));
