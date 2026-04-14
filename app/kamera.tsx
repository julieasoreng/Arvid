import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { PinchGestureHandler, State } from "react-native-gesture-handler";

// useRef er som en huskelapp – den husker kameraet mellom renders
// useRouter lar oss navigere mellom skjermer

export default function KameraSkjerm() {
  const [tillatelse, beOmTillatelse] = useCameraPermissions();
  const kameraRef = useRef(null);
  const [zoom, setZoom] = useState(0);
const startZoom = useRef(0);
const [tattBilde, setTattBilde] = useState(false);
const [fryseBilde, setFryseBilde] = useState<string | null>(null)
const [galleriÅpent, setGalleriÅpent] = useState(false);

const onPinch = (event: any) => {
  if (event.nativeEvent.state === State.BEGAN) {
    startZoom.current = zoom;
  }
  const nyZoom = Math.min(Math.max(startZoom.current + (event.nativeEvent.scale - 1) * 0.3, 0), 1);
  setZoom(nyZoom);
};
  const router = useRouter();

  // Hvis vi ikke har tillatelse ennå, be om det
  if (!tillatelse?.granted) {
    beOmTillatelse();
    return <View style={styles.container} />;
  }

 // Felles funksjon som sender bildet til analyse
 const analyser = async (base64Image: string, uri: string) => {
    router.replace({
      pathname: "/",
      params: { 
        bilde: uri, 
        analyserer: base64Image 
      }
    });
  };
  
  // Ta bilde med kameraet
  const taBilde = async () => {
    if (!kameraRef.current || fryseBilde) return;
    const bilde = await kameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
    if (!bilde.base64) return;
    setFryseBilde(bilde.uri); // frys bildet først
    await new Promise(resolve => setTimeout(resolve, 500)); // vent 500ms
    await analyser(bilde.base64, bilde.uri); // naviger
  };
  
  // Åpne galleri
  const åpneGalleri = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      base64: true, 
      quality: 0.5,
      maxWidth: 1000,
      maxHeight: 1000,
    });
    if (result.canceled || !result.assets[0].base64) return;

    const konvertert = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
    
    setGalleriÅpent(true); // vis loading
    console.log("mimeType:", result.assets[0].mimeType);
    
    try {
      const response = await fetch("https://arvid-alpha.vercel.app/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
            image: konvertert.base64,
            tidspunkt: new Date().toLocaleString('no-NO')
          })
        })
      
      const data = await response.json();
      console.log("data:", JSON.stringify(data));
      const forklaring = data.content?.[0]?.text ?? "Ingen svar";
      const renJSON = forklaring.replace(/```json/g, "").replace(/```/g, "").trim();
      
      console.log("renJSON:", renJSON);
        router.replace({
        pathname: "/",
        params: { 
         bilde: result.assets[0].uri,
        resultat: renJSON
  }
});
    } catch (error) {
      setGalleriÅpent(false);
      alert("Noe gikk galt: " + error.message);
    }
  };

    return (
        <View style={styles.container}>
        {/* Kameraet fyller hele skjermen */}
        <PinchGestureHandler onGestureEvent={onPinch}>
  {fryseBilde ? (
    <Image source={{ uri: fryseBilde }} style={styles.kamera} />
  ) : (
    <CameraView 
      style={styles.kamera} 
      ref={kameraRef}
      zoom={zoom}
    />
  )}
</PinchGestureHandler>

    {tattBilde && (
    <View style={styles.blinkOverlay} />
    )}
    {zoom > 0 && (
  <View style={styles.zoomBar}>
    <View style={[styles.zoomFyll, { width: `${zoom * 100}%` }]} />
  </View>
)}
{galleriÅpent && (
  <View style={styles.galleriLaster}>
    <ActivityIndicator size="large" color="white" />
  </View>
)}

      {/* X-knapp øverst til venstre */}
      <TouchableOpacity style={styles.lukkKnapp} onPress={() => router.back()}>
        <View style={styles.lukkSirkel}>
          {/* X laget av to streker */}
          <View style={[styles.strek, { transform: [{ rotate: "45deg" }] }]} />
          <View style={[styles.strek, { transform: [{ rotate: "-45deg" }] }]} />
        </View>
      </TouchableOpacity>

      {/* Verktøylinje nederst */}
      <View style={styles.verktøylinje}>
        {/* Galleri-knapp til venstre */}
        <TouchableOpacity style={styles.galleriKnapp} onPress={åpneGalleri}>
            <View style={styles.galleriSirkel}>
                <Ionicons name="images-outline" size={28} color="white" />
                
            </View>
        </TouchableOpacity>

        {/* Lukker-knapp i midten */}
        <TouchableOpacity style={styles.lukkерKnapp} onPress={taBilde}>
          <View style={styles.lukkerIndre} />
        </TouchableOpacity>

        {/* Tom plass til høyre for balanse */}
        <View style={styles.tomPlass} />
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  kamera: {
    flex: 1,
  },
  lukkKnapp: {
    position: "absolute",
    top: 60,
    left: 24,
  },
  lukkSirkel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  strek: {
    position: "absolute",
    width: 16,
    height: 2,
    backgroundColor: "white",
    borderRadius: 1,
  },
  verktøylinje: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
  },
  galleriKnapp: {
    width: 48,
    height: 48,
  },
  galleriIkon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  galleriIndre: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  lukkерKnapp: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  lukkerIndre: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  tomPlass: {
    width: 48,
  },
  galleriSirkel: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  blinkOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "white",
    opacity: 0.6,
  },
  zoomBar: {
    position: "absolute",
    bottom: 140,
    left: "25%",
    right: "25%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  zoomFyll: {
    height: 4,
    backgroundColor: "white",
    borderRadius: 2,
  },
  galleriLaster: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});