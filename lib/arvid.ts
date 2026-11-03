import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { z } from "zod";

// På nettsiden ligger API-et på samme adresse som siden, så en relativ sti holder.
// Kjører du appen på telefon med Expo Go, sett EXPO_PUBLIC_API_URL i en .env-fil.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "/api/analyze";

// Bilder bredere enn dette skaleres ned før de sendes.
// Et skilt er lesbart i 1200 px, og et mobilbilde i full oppløsning er for stort for Vercel.
const MAKS_BREDDE = 1200;

const ArvidSvarSchema = z.object({
  kanParkere: z.boolean().nullable(),
  forklaring: z.string(),
});

const FeilSchema = z.object({ feil: z.string() });

export type ArvidSvar = z.infer<typeof ArvidSvarSchema>;

export type Bilde = {
  uri: string;
  base64: string;
};

export type Kilde = "kamera" | "galleri";

/**
 * Åpner kameraet eller bildegalleriet og gjør bildet klart til sending.
 * Returnerer null hvis brukeren avbryter.
 * På nettsiden åpner "kamera" telefonens vanlige kamera-app via filvelgeren.
 */
export async function velgBilde(kilde: Kilde): Promise<Bilde | null> {
  if (kilde === "kamera" && Platform.OS !== "web") {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      throw new Error("Arvid trenger tilgang til kameraet for å se skiltet.");
    }
  }

  const valg: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const resultat =
    kilde === "kamera"
      ? await ImagePicker.launchCameraAsync({ ...valg, cameraType: ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync(valg);

  if (resultat.canceled) return null;
  const asset = resultat.assets[0];

  // Skalerer ned og gjør om til JPEG. Det løser også iPhone-bilder i HEIC,
  // som Anthropic ikke tar imot.
  const handlinger = asset.width > MAKS_BREDDE ? [{ resize: { width: MAKS_BREDDE } }] : [];
  const ferdig = await ImageManipulator.manipulateAsync(asset.uri, handlinger, {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  if (!ferdig.base64) {
    throw new Error("Klarte ikke å lese bildet. Prøv et annet.");
  }
  return { uri: ferdig.uri, base64: ferdig.base64 };
}

/** Sender bildet til Arvid og returnerer et validert svar, eller kaster en feil med lesbar melding. */
export async function analyserSkilt(bilde: Bilde): Promise<ArvidSvar> {
  let respons: Response;
  try {
    respons = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: bilde.base64, mimeType: "image/jpeg" }),
    });
  } catch {
    throw new Error("Fikk ikke kontakt med Arvid. Sjekk at du er på nett.");
  }

  const data: unknown = await respons.json().catch(() => null);

  if (!respons.ok) {
    const feil = FeilSchema.safeParse(data);
    throw new Error(feil.success ? feil.data.feil : "Noe gikk galt hos Arvid. Prøv igjen.");
  }

  const svar = ArvidSvarSchema.safeParse(data);
  if (!svar.success) {
    throw new Error("Arvid svarte noe rart. Prøv igjen.");
  }
  return svar.data;
}

/** Henter en lesbar melding fra hva som helst som ble kastet. */
export function feilmelding(error: unknown): string {
  return error instanceof Error ? error.message : "Noe gikk galt. Prøv igjen.";
}
