import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated, Image, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    // Fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();

    // Auto-transition after 2.8 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }).start(() => {
        onFinish();
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Large Prominent Centered Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../assets/app_logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        {/* Text Details Right Below Logo */}
        <Text style={styles.title}>नित्यम जप</Text>
        <View style={styles.divider} />
        <Text style={styles.footer}>Spiritual Focus & Calm</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120502", // Rich sacred mahogany
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  logoWrapper: {
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logoImg: {
    width: 280,
    height: 280,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFF2B2",
    letterSpacing: 2,
    marginTop: 0,
    marginBottom: 16,
    textShadowColor: "rgba(224, 94, 38, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    textAlign: "center",
  },
  divider: {
    width: 50,
    height: 2,
    backgroundColor: "#D4AF37",
    opacity: 0.6,
    borderRadius: 1,
    marginBottom: 14,
  },
  footer: {
    fontSize: 13,
    color: "#E2E8F0",
    opacity: 0.8,
    fontStyle: "italic",
    letterSpacing: 1,
    textAlign: "center",
  },
});
