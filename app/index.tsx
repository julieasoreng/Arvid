import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Head from "expo-router/head";

import { analyserSkilt, feilmelding, velgBilde, type ArvidSvar, type Kilde } from "@/lib/arvid";

// Skjermen er alltid i nøyaktig én av disse tilstandene.
// TypeScript vet da at `svar` bare finnes når status er "ferdig", osv.
type Tilstand =
  | { status: "start" }
  | { status: "laster"; bildeUri: string }
  | { status: "ferdig"; bildeUri: string; svar: ArvidSvar }
  | { status: "feil"; melding: string };

const LASTEMELDINGER = [
  "Arvid justerer brillene...",
  "Arvid slår opp i regelverket...",
  "Arvid kjenner disse skiltene...",
  "Arvid har sett verre enn dette...",
  "Arvid nikker gjenkjennende...",
  "Arvid dobbeltsjekker med kommunen...",
  "Arvid tar seg god tid...",
];

const STATUS = {
  ja: { ytre: "#E8F0EB", indre: "#4A7C59", ikon: "✓", tekst: "Du kan parkere her" },
  nei: { ytre: "#FDF3E3", indre: "#B45309", ikon: "✕", tekst: "Du kan ikke parkere her" },
  usikker: { ytre: "#F0F0F0", indre: "#6B6A63", ikon: "?", tekst: "Arvid er usikker" },
} as const;

function statusFor(kanParkere: boolean | null) {
  if (kanParkere === true) return STATUS.ja;
  if (kanParkere === false) return STATUS.nei;
  return STATUS.usikker;
}

function lagHilsen(time: number) {
  if (time < 12) return "God morgen!";
  if (time < 18) return "God ettermiddag!";
  return "God kveld!";
}

export default function Arvid() {
  const [tilstand, setTilstand] = useState<Tilstand>({ status: "start" });
  const [meldingIndex, setMeldingIndex] = useState(0);
  // Settes etter at siden er lastet. Ellers ville hilsenen blitt låst til
  // tidspunktet nettsiden ble bygget, siden HTML-en lages på forhånd.
  const [hilsen, setHilsen] = useState("Hei!");

  useEffect(() => {
    setHilsen(lagHilsen(new Date().getHours()));
  }, []);

  const laster = tilstand.status === "laster";
  useEffect(() => {
    if (!laster) return;
    setMeldingIndex(0);
    const intervall = setInterval(() => {
      setMeldingIndex((i) => (i + 1) % LASTEMELDINGER.length);
    }, 2000);
    return () => clearInterval(intervall);
  }, [laster]);

  async function scan(kilde: Kilde) {
    try {
      const bilde = await velgBilde(kilde);
      if (!bilde) return;
      setTilstand({ status: "laster", bildeUri: bilde.uri });
      const svar = await analyserSkilt(bilde);
      setTilstand({ status: "ferdig", bildeUri: bilde.uri, svar });
    } catch (error: unknown) {
      setTilstand({ status: "feil", melding: feilmelding(error) });
    }
  }

  const tilbake = () => setTilstand({ status: "start" });

  return (
    <ScrollView style={styles.side} contentContainerStyle={styles.innhold}>
      <Head>
        <title>Arvid: kan jeg parkere her?</title>
      </Head>
      <View style={styles.kolonne}>
        <Text style={styles.logo} role="heading" aria-level={1}>
          Arvid
        </Text>

        {/* aria-live gjør at skjermlesere leser opp svaret når det kommer */}
        <View aria-live="polite">
          {tilstand.status === "start" && (
            <View style={styles.start}>
              <Text style={styles.hilsen}>{hilsen}</Text>
              <Text style={styles.ingress}>
                Ta bilde av et parkeringsskilt, så forteller Arvid deg om du kan parkere. Han er ikke
                blid, men han har alltid rett.
              </Text>

              <Pressable
                style={({ pressed }) => [styles.scanKnapp, pressed && styles.trykket]}
                onPress={() => scan("kamera")}
                role="button"
                aria-label="Ta bilde av parkeringsskilt"
              >
                <View style={styles.scanIkonSirkel}>
                  <View style={styles.scanIkonIndre}>
                    <View style={styles.kameraLinse} />
                  </View>
                </View>
                <Text style={styles.scanKnappTekst}>Scan parkeringsskilt</Text>
                <Text style={styles.scanKnappSubtekst}>Ta bilde, få svar med én gang</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.sekundærKnapp, pressed && styles.trykket]}
                onPress={() => scan("galleri")}
                role="button"
              >
                <Text style={styles.sekundærTekst}>Velg et bilde du allerede har tatt</Text>
              </Pressable>

              <View style={styles.tipsBoks}>
                <Text style={styles.tipsTittel}>TIPS</Text>
                <Text style={styles.tipsTekst}>
                  Sjekk alltid pilens retning på underskiltet. Den viser hvilken side forbudet
                  gjelder.
                </Text>
              </View>
            </View>
          )}

          {tilstand.status === "laster" && (
            <View style={styles.kort}>
              <Image source={{ uri: tilstand.bildeUri }} style={styles.skiltBilde} resizeMode="contain" alt="Bildet du sendte" />
              <ActivityIndicator size="large" color="#4A7C59" />
              <Text style={styles.lasterTekst}>{LASTEMELDINGER[meldingIndex]}</Text>
            </View>
          )}

          {tilstand.status === "ferdig" && (
            <Resultat bildeUri={tilstand.bildeUri} svar={tilstand.svar} onIgjen={tilbake} />
          )}

          {tilstand.status === "feil" && (
            <View style={styles.kort} role="alert">
              <Text style={styles.statusTekst}>Det gikk ikke</Text>
              <Text style={[styles.forklaringTekst, { marginBottom: 16 }]}>{tilstand.melding}</Text>
              <Pressable style={styles.scanIgjenKnapp} onPress={tilbake} role="button">
                <Text style={styles.scanIgjenTekst}>Prøv igjen</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.fotnote}>
          Arvid er en AI og kan ta feil. Les alltid skiltet selv før du går fra bilen.
        </Text>
      </View>
    </ScrollView>
  );
}

function Resultat({ bildeUri, svar, onIgjen }: { bildeUri: string; svar: ArvidSvar; onIgjen: () => void }) {
  const status = statusFor(svar.kanParkere);
  return (
    <View style={styles.kort}>
      <View style={[styles.statusYtre, { backgroundColor: status.ytre }]}>
        <View style={[styles.statusIndre, { backgroundColor: status.indre }]}>
          <Text style={[styles.statusIkon, { color: status.ytre }]} aria-hidden>
            {status.ikon}
          </Text>
        </View>
      </View>
      <Text style={styles.statusTekst} role="heading" aria-level={2}>
        {status.tekst}
      </Text>
      <Image source={{ uri: bildeUri }} style={styles.skiltBilde} resizeMode="contain" alt="Skiltet du tok bilde av" />
      <View style={styles.forklaringBoks}>
        <Text style={styles.forklaringTittel}>Arvid sier</Text>
        <Text style={styles.forklaringTekst}>{svar.forklaring}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.scanIgjenKnapp, pressed && styles.trykket]}
        onPress={onIgjen}
        role="button"
      >
        <Text style={styles.scanIgjenTekst}>Scan et nytt skilt</Text>
      </Pressable>
    </View>
  );
}

const GRØNN = "#4A7C59";

const styles = StyleSheet.create({
  side: { flex: 1, backgroundColor: "#F5F5F0" },
  innhold: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  // Holder innholdet smalt og sentrert når siden åpnes på en stor skjerm.
  kolonne: { width: "100%", maxWidth: 480, alignSelf: "center", flex: 1 },
  logo: { fontSize: 30, fontWeight: "700", color: "#1A1A1A", marginBottom: 24 },
  start: { gap: 16 },
  hilsen: { fontSize: 32, fontWeight: "700", color: "#1A1A1A", letterSpacing: -0.5 },
  ingress: { fontSize: 16, color: "#4A4A45", lineHeight: 24, marginBottom: 8 },
  scanKnapp: {
    backgroundColor: GRØNN,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  trykket: { opacity: 0.85 },
  scanIkonSirkel: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  scanIkonIndre: {
    width: 36,
    height: 28,
    borderRadius: 4,
    borderWidth: 2.5,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  kameraLinse: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "white" },
  scanKnappTekst: { fontSize: 18, fontWeight: "600", color: "white" },
  scanKnappSubtekst: { fontSize: 14, color: "rgba(255,255,255,0.9)" },
  sekundærKnapp: {
    borderWidth: 1,
    borderColor: GRØNN,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  sekundærTekst: { color: GRØNN, fontSize: 16, fontWeight: "500" },
  tipsBoks: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8EDE9",
    marginTop: 8,
  },
  tipsTittel: { fontSize: 12, color: "#56695C", letterSpacing: 0.4, fontWeight: "600", marginBottom: 8 },
  tipsTekst: { fontSize: 14, color: "#4A5C4E", lineHeight: 22 },
  kort: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lasterTekst: { textAlign: "center", color: "#5C5C5C", marginTop: 12, fontSize: 15 },
  statusYtre: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  statusIndre: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  statusIkon: { fontSize: 28, fontWeight: "900" },
  statusTekst: { fontSize: 26, fontWeight: "700", textAlign: "center", color: "#1A1A1A", marginBottom: 16 },
  skiltBilde: { width: "100%", height: 200, borderRadius: 12, marginBottom: 16 },
  forklaringBoks: { backgroundColor: "#F5F5F0", borderRadius: 12, padding: 16, marginBottom: 16 },
  forklaringTittel: { fontSize: 13, fontWeight: "600", color: "#1A1A1A", marginBottom: 6 },
  forklaringTekst: { fontSize: 15, color: "#4A4A45", lineHeight: 22 },
  scanIgjenKnapp: {
    borderWidth: 1,
    borderColor: GRØNN,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  scanIgjenTekst: { color: GRØNN, fontSize: 16 },
  fotnote: { fontSize: 13, color: "#5C5C5C", textAlign: "center", marginTop: 32 },
});
