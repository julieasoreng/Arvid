# Arvid

Ta bilde av et parkeringsskilt, så forteller Arvid deg om du kan parkere. Han er en gretten gammel mann som synes du burde kunne dette selv, men han har alltid rett.

Arvid er en nettside. Du trenger ikke laste ned noe: åpne siden på mobilen, trykk på knappen, og telefonens kamera åpner seg.

## Hvordan det henger sammen

```
Nettleser (Expo / React Native Web)
  │  bildet skaleres ned til 1200 px og gjøres om til JPEG
  ▼
/api/analyze  (Vercel-funksjon)
  │  sjekker størrelse og format, begrenser antall kall per IP,
  │  legger til norsk dato og klokkeslett
  ▼
Claude (Anthropic API)
  │  svarer via et verktøy med fast format: { kanParkere, forklaring }
  ▼
Svaret valideres med zod på serveren og i nettleseren
```

- `app/index.tsx`: hele siden, med fire tilstander (start, laster, ferdig, feil)
- `lib/arvid.ts`: velge bilde, gjøre det klart og sende det til API-et
- `api/analyze.js`: serverfunksjonen som snakker med Claude. API-nøkkelen ligger bare her
- `vercel.json`: forteller Vercel at nettsiden bygges med `expo export` og ligger i `dist`

## Kjøre lokalt

```bash
npm install
npx vercel dev        # nettside og API sammen på http://localhost:3000
```

`vercel dev` krever at prosjektet er koblet til Vercel (`npx vercel link`) og at `ANTHROPIC_API_KEY` finnes der.

Vil du bare jobbe med utseendet, kan du kjøre `npx expo start --web` og peke på API-et i produksjon med en `.env.local`:

```
EXPO_PUBLIC_API_URL=https://arvid-alpha.vercel.app/api/analyze
```

## Miljøvariabler (Vercel)

| Navn | Påkrevd | Hva |
|---|---|---|
| `ANTHROPIC_API_KEY` | ja | Nøkkelen til Anthropic |
| `ARVID_MODEL` | nei | Overstyrer modellen. Standard er `claude-sonnet-4-6` |

## Kostnad og sikkerhet

API-et tar maks 20 analyser per IP-adresse i timen og avviser bilder over ca. 2 MB. Grensen ligger i minnet til funksjonen, så den er et fartshump og ikke en mur. Sett derfor også en månedlig utgiftsgrense i Anthropic Console.

## Sjekker

```bash
npm run typecheck
npm run lint
npm run build
```
