import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image, ScrollView, StyleSheet, Text,
  TouchableOpacity,
  View
} from "react-native";

export default function HomeScreen() {
  const [resultat, setResultat] = useState(null);
  const [laster, setLaster] = useState(false);
  const [bilde, setBilde] = useState(null);
  const router = useRouter();
  const { analyserer, bilde: bildeFraKamera, resultat: resultatFraGalleri } = useLocalSearchParams();

  const lasterMeldinger = [
    "Arvid justerer brillene...",
    "Arvid slår opp i regelverket...",
    "Arvid kjenner disse skiltene...",
    "Arvid har sett verre enn dette...",
    "Arvid nikker gjenkjennende...",
    "Arvid dobbeltsjekker med kommunen...",
    "Arvid tar seg god tid...",
  ];

  const [meldingIndex, setMeldingIndex] = useState(0);

  useEffect(() => {
    if (!laster) return;
    const intervall = setInterval(() => {
      setMeldingIndex((i) => (i + 1) % lasterMeldinger.length);
    }, 2000);
    return () => clearInterval(intervall);
  }, [laster]);

  useEffect(() => {
    if (!analyserer) return;
    kjørAnalyse();
  }, [analyserer]);
  
  useEffect(() => {
    if (!resultatFraGalleri) return;
    setBilde(bildeFraKamera as string);
    const parsed = JSON.parse(resultatFraGalleri as string);
    setResultat(parsed);
  }, [resultatFraGalleri]);
    
  const kjørAnalyse = async () => {
    setBilde(bildeFraKamera as string);
    setLaster(true);
    const now = new Date();
    const timer = now.getHours();
    const minutter = now.getMinutes();
    const tidspunkt = `${timer}:${minutter}`;
    const dager = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
    const ukedag = dager[now.getDay()];
    
      
      try {
        const response = await fetch(
          "https://arvid-alpha.vercel.app/api/analyze",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ image: analyserer, tidspunkt: tidspunkt, ukedag: ukedag }),
          }
        );
        const data = await response.json();
        const forklaring = data.content?.[0]?.text ?? "Ingen svar";
        const renJSON = forklaring
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(renJSON);
        setResultat(parsed);
      } catch (error) {
        if (error instanceof SyntaxError) {
          setResultat({
            kan_parkere_nå: null,
            forklaring: "Arvid klarte ikke å lese dette som et parkeringsskilt. Prøv å ta bildet nærmere og med godt lys.",
          });
        } else {
          alert("Noe gikk galt: " + error.message);
        }
      } finally {
        setLaster(false);
      }
    };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Du må gi tilgang til kameraet!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ 
      base64: true, 
      quality: 0.3,
      exif: false,
      maxWidth: 1000,
      maxHeight: 1000,
    });

    if (result.canceled || !result.assets[0].base64) return;

    const base64Image = result.assets[0].base64;
    const now = new Date();
    const timer = now.getHours();
    const minutter = now.getMinutes();
    const tidspunkt = `${timer}:${minutter}`;
    const dager = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
    const ukedag = dager[now.getDay()];
    setBilde(result.assets[0].uri);

    try {
      setLaster(true);
      const response = await fetch(
        "https://arvid-alpha.vercel.app/api/analyze",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: base64Image, tidspunkt: tidspunkt, ukedag: ukedag }),
        }
      );
      const data = await response.json();
      const forklaring = data.content?.[0]?.text ?? "Ingen svar";
      const renJSON = forklaring
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(renJSON);
      setResultat(parsed);
      setLaster(false);
    } catch (error) {
      setLaster(false);
      if (error instanceof SyntaxError) {
        setResultat({
          kan_parkere_nå: null,
          forklaring:
            "Arvid klarte ikke å lese dette som et parkeringsskilt. Prøv å ta bildet nærmere og med godt lys.",
        });
      } else {
        alert("Noe gikk galt: " + error.message);
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
    });

    if (result.canceled || !result.assets[0].base64) return;

    const base64Image = result.assets[0].base64;
    const now = new Date();
    const timer = now.getHours();
    const minutter = now.getMinutes();
    const tidspunkt = `${timer}:${minutter}`;
    const dager = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
    const ukedag = dager[now.getDay()];
    setLaster(true);
    setBilde(result.assets[0].uri);

    try {
      setLaster(true);
      const response = await fetch(
        "https://arvid-alpha.vercel.app/api/analyze",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: base64Image, tidspunkt: tidspunkt, ukedag: ukedag }),
        }
      );
      const data = await response.json();
      const forklaring = data.content?.[0]?.text ?? "Ingen svar";
      const renJSON = forklaring
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(renJSON);
      setResultat(parsed);
      setLaster(false);
    } catch (error) {
      setLaster(false);
      if (error instanceof SyntaxError) {
        setResultat({
          kan_parkere_nå: null,
          forklaring:
            "Arvid klarte ikke å lese dette som et parkeringsskilt. Prøv å ta bildet nærmere og med godt lys.",
        });
      } else {
        alert("Noe gikk galt: " + error.message);
      }
    }
  };

  const time = new Date().getHours();
  const hilsen =
    time < 12 ? "God morgen" : time < 18 ? "God ettermiddag" : "God kveld";

  const statusBakgrunnYtre =
    resultat?.kan_parkere_nå === true
      ? "#E8F0EB"
      : resultat?.kan_parkere_nå === false
      ? "#FDF3E3"
      : "#F0F0F0";

  const statusBakgrunnIndre =
    resultat?.kan_parkere_nå === true
      ? "#4A7C59"
      : resultat?.kan_parkere_nå === false
      ? "#D97706"
      : "#B4B2A9";

  const statusIkonFarge =
    resultat?.kan_parkere_nå === true
      ? "#E8F0EB"
      : resultat?.kan_parkere_nå === false
      ? "#FDF3E3"
      : "#F0F0F0";

  const statusIkon =
    resultat?.kan_parkere_nå === true
      ? "✓"
      : resultat?.kan_parkere_nå === false
      ? "✕"
      : "?";

  const statusTekst =
    resultat?.kan_parkere_nå === true
      ? "Du kan parkere her"
      : resultat?.kan_parkere_nå === false
      ? "Du kan ikke parkere her"
      : "Arvid er usikker";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Arvid</Text>
      </View>

      {laster ? (
        <View style={styles.kort}>
          <ActivityIndicator size="large" color="#4A7C59" />
          <Text style={styles.lasterTekst}>
            {lasterMeldinger[meldingIndex]}
          </Text>
        </View>
      ) : resultat ? (
        <ScrollView style={styles.kort}> 
          <View
            style={[styles.statusYtre, { backgroundColor: statusBakgrunnYtre }]}
          >
            <View
              style={[
                styles.statusIndre,
                { backgroundColor: statusBakgrunnIndre },
              ]}
            >
              <Text style={[styles.statusIkon, { color: statusIkonFarge }]}>
                {statusIkon}
              </Text>
            </View>
          </View>
          <Text style={styles.statusTekst}>{statusTekst}</Text>
          {bilde && (
            <Image
              source={{ uri: bilde }}
              style={styles.skiltBilde}
              resizeMode="contain"
            />
          )}
          <View style={styles.forklaringBoks}>
            <Text style={styles.forklaringTittel}>AI Forklaring</Text>
            <Text style={styles.forklaringTekst}>{resultat.forklaring}</Text>
          </View>
          <TouchableOpacity
            style={styles.scanIgjenKnapp}
            onPress={() => {
              setResultat(null);
              router.push("/kamera");
            }}
          >
            <Text style={styles.scanIgjenTekst}>Scan igjen</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.hjemContainer}>
  <View style={styles.velkomstBoks}>
    <Text style={styles.velkomstNavn}>{hilsen}!</Text>
  </View>

  <View style={styles.bunn}>
  <TouchableOpacity style={styles.scanKnapp} onPress={() => router.push("/kamera")}>
    <View style={styles.scanIkonSirkel}>
      <View style={styles.scanIkonIndre}>
        <View style={styles.kameraLinse} />
      </View>
    </View>
    <Text style={styles.scanKnappTekst}>Scan parkeringsskilt</Text>
    <Text style={styles.scanKnappSubtekst}>
      Ta bilde – få svar med én gang
    </Text>
    </TouchableOpacity>
    <View style={styles.tipsBoks}>
    <Text style={styles.tipsTittel}>TIPS</Text>
    <Text style={styles.tipsTekst}>
      Sjekk alltid pilens retning på underskiltet – den viser hvilken
      side forbudet gjelder.
    </Text>
  </View>
        </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F0" },
  header: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  logo: { fontSize: 30, fontWeight: "700", color: "#1A1A1A" },
  hjemContainer: { flex: 1, paddingHorizontal: 24, gap: 16 },
  velkomstBoks: { marginBottom: 8 },
  velkomstNavn: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  scanKnapp: {
    backgroundColor: "#4A7C59",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
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
  kameraLinse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "white",
  },
  scanKnappTekst: { fontSize: 18, fontWeight: "600", color: "white" },
  scanKnappSubtekst: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  galleriKnapp: {
    borderWidth: 1,
    borderColor: "#4A7C59",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  galleriKnappTekst: { color: "#4A7C59", fontSize: 16, fontWeight: "500" },
  tipsBoks: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#E8EDE9",
    marginTop: 17,
  },
  tipsTittel: {
    fontSize: 12,
    color: "#8A9E90",
    letterSpacing: 0.4,
    fontWeight: "500",
    marginBottom: 8,
  },
  tipsTekst: { fontSize: 14, color: "#4A5C4E", lineHeight: 22 },
  kort: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    alignSelf: "center",
    marginTop: 70,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lasterTekst: {
    textAlign: "center",
    color: "#6B6B6B",
    marginTop: 12,
    fontSize: 15,
  },
  scanIgjenKnapp: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#4A7C59",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  scanIgjenTekst: { color: "#4A7C59", fontSize: 16 },
  statusTekst: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  statusYtre: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  statusIndre: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIkon: { fontSize: 28, fontWeight: "900" },
  forklaringTekst: {
    fontSize: 15,
    color: "#6B6B6B",
    lineHeight: 22,
    marginBottom: 8,
  },
  skiltBilde: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  forklaringBoks: {
    backgroundColor: "#F5F5F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  forklaringTittel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  bunn: {
    marginTop: 'auto',
    paddingBottom: 50,
  },
});
