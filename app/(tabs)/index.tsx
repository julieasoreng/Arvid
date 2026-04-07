import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [resultat, setResultat] = useState(null);
  const [laster, setLaster] = useState(false);
  const [bilde, setBilde] = useState(null);
  const [navn, setNavn] = useState(null);
  const [navnInput, setNavnInput] = useState('');

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
    const hentNavn = async () => {
      const lagretNavn = await AsyncStorage.getItem('brukernavn');
      if (lagretNavn) setNavn(lagretNavn);
      else setNavn('');
    };
    hentNavn();
  }, []);

  useEffect(() => {
    if (!laster) return;
    const intervall = setInterval(() => {
      setMeldingIndex(i => (i + 1) % lasterMeldinger.length);
    }, 2000);
    return () => clearInterval(intervall);
  }, [laster]);

  const lagreNavn = async () => {
    if (!navnInput.trim()) return;
    await AsyncStorage.setItem('brukernavn', navnInput.trim());
    setNavn(navnInput.trim());
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Du må gi tilgang til kameraet!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
    });

    if (result.canceled || !result.assets[0].base64) return;

    const base64Image = result.assets[0].base64;
    setBilde(result.assets[0].uri);

    try {
      setLaster(true);
      await fetch('https://arvid.vercel.app/api/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: `Dette er et norskt parkeringsskilt, se på tidspunktet brukeren sender inn og svar i JSON med feltene. Svar kun med rå JSON. Ingen markdown, ingen kodeblokker, ingen backticks. Hvis kan_parkere_nå= true si "Du kan parkere her nå". Hvis kan_parkere_nå = false si "Du kan ikke parkere her nå". Bruk ${new Date().toLocaleString('no-NO')} for å hente tidspunktet fra brukeren. Svar kun med JSON, ingen annen tekst. Bruk disse feltene: kan_parkere_nå, forklaring`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const forklaring = data.content?.[0]?.text ?? 'Ingen svar';
      const renJSON = forklaring.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(renJSON);
      setResultat(parsed);
      setLaster(false);
    } catch (error) {
      setLaster(false);
      if (error instanceof SyntaxError) {
        setResultat({
          kan_parkere_nå: null,
          forklaring: 'Arvid klarte ikke å lese dette som et parkeringsskilt. Prøv å ta bildet nærmere og med godt lys.',
        });
      } else {
        alert('Noe gikk galt: ' + error.message);
      }
    }
  };

  if (navn === null) return null;

  if (navn === '') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.navnContainer}>
          <Text style={styles.navnTittel}>Hei!</Text>
          <Text style={styles.navnSubtittel}>Hva heter du?</Text>
          <TextInput
            style={styles.navnInput}
            placeholder="Skriv navnet ditt..."
            placeholderTextColor="#A0A89E"
            value={navnInput}
            onChangeText={setNavnInput}
            autoFocus
          />
          <TouchableOpacity style={styles.navnKnapp} onPress={lagreNavn}>
            <Text style={styles.navnKnappTekst}>Kom i gang</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const time = new Date().getHours();
  const hilsen = time < 12 ? 'God morgen' : time < 18 ? 'God ettermiddag' : 'God kveld';

  // bestemmer farge og ikon basert på null/true/false
  const statusBakgrunnYtre =
    resultat?.kan_parkere_nå === true ? '#E8F0EB' :
    resultat?.kan_parkere_nå === false ? '#FDF3E3' : '#F0F0F0';

  const statusBakgrunnIndre =
    resultat?.kan_parkere_nå === true ? '#4A7C59' :
    resultat?.kan_parkere_nå === false ? '#D97706' : '#B4B2A9';

  const statusIkonFarge =
    resultat?.kan_parkere_nå === true ? '#E8F0EB' :
    resultat?.kan_parkere_nå === false ? '#FDF3E3' : '#F0F0F0';

  const statusIkon =
    resultat?.kan_parkere_nå === true ? '✓' :
    resultat?.kan_parkere_nå === false ? '✕' : '?';

  const statusTekst =
    resultat?.kan_parkere_nå === true ? 'Du kan parkere her' :
    resultat?.kan_parkere_nå === false ? 'Du kan ikke parkere her' : 'Arvid er usikker';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Arvid</Text>
      </View>

      {laster ? (
        <View style={styles.kort}>
          <ActivityIndicator size="large" color="#4A7C59" />
          <Text style={styles.lasterTekst}>{lasterMeldinger[meldingIndex]}</Text>
        </View>
      ) : resultat ? (
        <View style={styles.kort}>
          <View style={[styles.statusYtre, { backgroundColor: statusBakgrunnYtre }]}>
            <View style={[styles.statusIndre, { backgroundColor: statusBakgrunnIndre }]}>
              <Text style={[styles.statusIkon, { color: statusIkonFarge }]}>
                {statusIkon}
              </Text>
            </View>
          </View>
          <Text style={styles.statusTekst}>{statusTekst}</Text>
          {bilde && (
            <Image source={{ uri: bilde }} style={styles.skiltBilde} resizeMode="contain" />
          )}
          <View style={styles.forklaringBoks}>
            <Text style={styles.forklaringTittel}>AI Forklaring</Text>
            <Text style={styles.forklaringTekst}>{resultat.forklaring}</Text>
          </View>
          <TouchableOpacity style={styles.scanIgjenKnapp} onPress={() => setResultat(null)}>
            <Text style={styles.scanIgjenTekst}>Scan igjen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.hjemContainer}>
          <View style={styles.velkomstBoks}>
            <Text style={styles.velkomstNavn}>{hilsen}, {navn}.</Text>
          </View>

          <TouchableOpacity style={styles.scanKnapp} onPress={takePicture}>
            <View style={styles.scanIkonSirkel}>
              <View style={styles.scanIkonIndre}>
                <View style={styles.kameraLinse} />
              </View>
            </View>
            <Text style={styles.scanKnappTekst}>Scan parkeringsskilt</Text>
            <Text style={styles.scanKnappSubtekst}>Ta bilde – få svar med én gang</Text>
          </TouchableOpacity>

          <View style={styles.tipsBoks}>
            <Text style={styles.tipsTittel}>TIPS</Text>
            <Text style={styles.tipsTekst}>
              Sjekk alltid pilens retning på underskiltet – den viser hvilken side forbudet gjelder.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  header: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  navnContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  navnTittel: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  navnSubtittel: {
    fontSize: 20,
    color: '#6B6B6B',
    marginBottom: 16,
  },
  navnInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E5E1',
  },
  navnKnapp: {
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  navnKnappTekst: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hjemContainer: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  velkomstBoks: {
    marginBottom: 8,
  },
  velkomstNavn: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  scanKnapp: {
    backgroundColor: '#4A7C59',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  scanIkonSirkel: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scanIkonIndre: {
    width: 36,
    height: 28,
    borderRadius: 4,
    borderWidth: 2.5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kameraLinse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  scanKnappTekst: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scanKnappSubtekst: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  tipsBoks: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E8EDE9',
  },
  tipsTittel: {
    fontSize: 12,
    color: '#8A9E90',
    letterSpacing: 0.4,
    fontWeight: '500',
    marginBottom: 8,
  },
  tipsTekst: {
    fontSize: 14,
    color: '#4A5C4E',
    lineHeight: 22,
  },
  kort: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lasterTekst: {
    textAlign: 'center',
    color: '#6B6B6B',
    marginTop: 12,
    fontSize: 15,
  },
  scanIgjenKnapp: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4A7C59',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  scanIgjenTekst: {
    color: '#4A7C59',
    fontSize: 16,
  },
  statusTekst: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statusYtre: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusIndre: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIkon: {
    fontSize: 28,
    fontWeight: '900',
  },
  forklaringTekst: {
    fontSize: 15,
    color: '#6B6B6B',
    lineHeight: 22,
    marginBottom: 8,
  },
  skiltBilde: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  forklaringBoks: {
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  forklaringTittel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
});