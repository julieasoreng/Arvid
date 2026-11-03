import { z } from "zod";

// Hvilken modell Arvid bruker. Kan overstyres med miljøvariabelen ARVID_MODEL i Vercel.
const MODELL = process.env.ARVID_MODEL || "claude-sonnet-4-6";

// Base64 gjør filer ca. 33 % større. 3 millioner tegn er rundt 2,2 MB bilde,
// godt under Vercels grense på 4,5 MB per forespørsel.
const MAKS_BASE64_TEGN = 3_000_000;

// Maks antall analyser per IP-adresse per time.
const MAKS_PER_TIME = 20;
const EN_TIME_MS = 60 * 60 * 1000;

// Holder styr på hvor mange ganger hver IP har spurt. Ligger i minnet til
// funksjonen, så den nullstilles når Vercel starter en ny instans.
// Det stopper én ivrig bruker eller et enkelt skript, men ikke et angrep
// fra mange IP-er. Den egentlige sikringen er utgiftsgrensen i Anthropic Console.
const forespørsler = new Map();

function erOverGrensen(ip) {
  const nå = Date.now();
  const tidligere = (forespørsler.get(ip) ?? []).filter((t) => nå - t < EN_TIME_MS);
  if (tidligere.length >= MAKS_PER_TIME) {
    forespørsler.set(ip, tidligere);
    return true;
  }
  tidligere.push(nå);
  forespørsler.set(ip, tidligere);
  return false;
}

const ForespørselSchema = z.object({
  image: z.string().min(100).max(MAKS_BASE64_TEGN),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
});

const SvarSchema = z.object({
  kanParkere: z.boolean().nullable(),
  forklaring: z.string().min(1),
});

// Tiden regnes ut her, i norsk tid, og ikke på telefonen.
// Vercel kjører i UTC, så uten timeZone ville Arvid vært en time feil om vinteren.
function tidINorge() {
  const nå = new Date();
  const dato = new Intl.DateTimeFormat("nb-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(nå);
  const klokke = new Intl.DateTimeFormat("nb-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(nå);
  return `${dato}, klokken ${klokke}`;
}

const PERSONLIGHET = `Du er Arvid. Du skal alltid gi korrekte instrukser på om brukeren kan parkere eller ikke basert på parkeringsskiltet den sender inn. Han er en sur, gammel gretten mann som er irritert på deg som alltid må spørre om hjelp til parkeringsskilter. Han har oversikt over alle skilt og hjelper deg alltid, men med en god dose tøff kjærlighet og han kan skjelle deg ut. Han minner om en Atle Antonsen type. Bruk gjerne begreper som brukes i Ut i vår hage eller Team Antonsen. Eksempler på hvordan Arvid snakker: NEI NEI NEI NEI! Ikke parker her med mindre du vil betale halve lønnen din til de jævlige gjerrigknarkene i kommunen. Se på skiltet. Det står klart og tydelig at du ikke kan parkere her fordi bla bla bla. Få det inn i knotten din din dumrian. Eller Okei din dumrian, det er tredje gangen du spør om denne typen parkeringsskilt, men jeg skal fortelle deg hva det betyr igjen fordi du tydeligvis trenger å få det inn med teskje. Dette skiltet sier at du kan parkere her bla bla bla... Nå bør du få det inn i den tette pappen din en gang for alle.

Korrekthet går foran personlighet. Er du usikker på hva skiltet betyr, eller er bildet for uklart, sett kanParkere til null og si det rett ut.

Hvis det IKKE er et parkeringsskilt: sett kanParkere til null og skriv en kort, sint og morsom Arvid-forklaring, for eksempel "Dette er en koffert, din tosk. Ta bilde av skiltet, ikke bagasjen din."

Svar alltid ved å bruke verktøyet gi_svar.`;

// Verktøyet tvinger modellen til å svare i et fast format.
// Da slipper vi å vaske bort ```json og håpe at teksten er gyldig JSON.
const SVARVERKTØY = {
  name: "gi_svar",
  description: "Gir brukeren Arvids svar om parkeringsskiltet.",
  input_schema: {
    type: "object",
    properties: {
      kanParkere: {
        type: ["boolean", "null"],
        description: "true hvis brukeren kan parkere nå, false hvis ikke, null hvis det er uklart eller ikke et parkeringsskilt.",
      },
      forklaring: {
        type: "string",
        description: "Arvids forklaring, med hans personlighet.",
      },
    },
    required: ["kanParkere", "forklaring"],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ feil: "Bare POST er tillatt." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY mangler");
    return res.status(500).json({ feil: "Arvid er ikke satt opp riktig." });
  }

  const ip = String(req.headers["x-forwarded-for"] ?? "ukjent").split(",")[0].trim();
  if (erOverGrensen(ip)) {
    return res.status(429).json({ feil: "Du har spurt Arvid for mange ganger. Prøv igjen om en time." });
  }

  const forespørsel = ForespørselSchema.safeParse(req.body);
  if (!forespørsel.success) {
    const forStort = forespørsel.error.issues.some((i) => i.code === "too_big");
    return res
      .status(forStort ? 413 : 400)
      .json({ feil: forStort ? "Bildet er for stort." : "Mangler bilde, eller bildet har feil format." });
  }

  const { image, mimeType } = forespørsel.data;
  const tidspunkt = tidINorge();

  let anthropicSvar;
  try {
    anthropicSvar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      // Avbryt hvis Anthropic bruker mer enn 25 sekunder, før Vercel selv dreper funksjonen.
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: MODELL,
        max_tokens: 1024,
        system: PERSONLIGHET,
        tools: [SVARVERKTØY],
        tool_choice: { type: "tool", name: "gi_svar" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: image } },
              {
                type: "text",
                text: `Tidspunkt nå i Norge: ${tidspunkt}. Hvis det er tidsbegrenset parkering, regn ut nøyaktig når restriksjonene slutter og si det i forklaringen.`,
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Fikk ikke kontakt med Anthropic:", error);
    return res.status(504).json({ feil: "Arvid brukte for lang tid. Prøv igjen." });
  }

  if (!anthropicSvar.ok) {
    console.error("Anthropic svarte med feil:", anthropicSvar.status, await anthropicSvar.text());
    return res.status(502).json({ feil: "Arvid fikk ikke svar fra hjernen sin. Prøv igjen om litt." });
  }

  const data = await anthropicSvar.json();
  const verktøykall = data.content?.find((blokk) => blokk.type === "tool_use");
  const svar = SvarSchema.safeParse(verktøykall?.input);

  if (!svar.success) {
    console.error("Uventet svar fra modellen:", JSON.stringify(data));
    return res.status(502).json({ feil: "Arvid mumlet noe uforståelig. Prøv igjen." });
  }

  console.log("Analyse ferdig", { modell: MODELL, kanParkere: svar.data.kanParkere, tidspunkt });
  return res.status(200).json(svar.data);
}
