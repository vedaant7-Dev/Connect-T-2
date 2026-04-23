import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Connect T</Text>
      <Text style={styles.sub}>BJP Member Services Platform</Text>

      <Pressable style={styles.button} onPress={() => alert("Continue clicked")}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/admin")}>
        <Text style={styles.hidden}>Admin</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ff6a00",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
  },
  sub: {
    marginTop: 10,
    fontSize: 18,
    color: "#fff",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    color: "#ff6a00",
    fontWeight: "bold",
    fontSize: 18,
  },
  hidden: {
    marginTop: 20,
    color: "#ff6a00",
  },
});
