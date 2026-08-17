import React, { useMemo, useRef, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, LinearGradient, Stop } from "react-native-svg";
import { MALA_THEMES, MANTRA_LABELS } from "../constants/malaData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SVG_SIZE = SCREEN_WIDTH * 0.88; // Responsive ring size

const BEAD_COUNT = 108;
const CX = 200;
const CY = 200;
const RADIUS = 158; // Radius of bead ring
const BEAD_R = 5.2;

export default function MalaRing({ currentCount, pulseKey, onThumbTap, selectedMala = "rudraksha" }) {
  const theme = MALA_THEMES[selectedMala] || MALA_THEMES.rudraksha;
  const activeText = pulseKey > 0 ? (MANTRA_LABELS[selectedMala] || "राम") : "TAP";
  const fontSize = activeText.length > 18 ? 10 : activeText.length > 9 ? 12 : 14;

  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  // Calculate coordinates for 108 beads
  const beads = useMemo(() => {
    return Array.from({ length: BEAD_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / BEAD_COUNT - Math.PI / 2;
      const x = CX + RADIUS * Math.cos(angle);
      const y = CY + RADIUS * Math.sin(angle);
      const isGuru = i === 0;
      return { i, x, y, isGuru };
    });
  }, []);

  // Trigger scale animation on tap
  useEffect(() => {
    if (pulseKey > 0) {
      // Pulse animation
      pulseOpacity.setValue(1);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(buttonScale, {
            toValue: 0.94,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pulseKey]);

  return (
    <View style={styles.container}>
      {/* SVG Bead Ring */}
      <View style={styles.ringWrapper}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox="0 0 400 400">
          <Defs>
            {/* Premium 3D Gold Bead Gradient */}
            <RadialGradient id="goldRadialBead" cx="35%" cy="30%" r="70%">
              <Stop offset="0%" stopColor="#FFEFAA" />
              <Stop offset="40%" stopColor="#D4AF37" />
              <Stop offset="85%" stopColor="#AA7C11" />
              <Stop offset="100%" stopColor="#664600" />
            </RadialGradient>

            {/* Metallic Gold Stroke Gradient */}
            <LinearGradient id="goldLinearStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF2B2" />
              <Stop offset="50%" stopColor="#C59B27" />
              <Stop offset="100%" stopColor="#7F5A00" />
            </LinearGradient>
          </Defs>

          {/* Beads Rendering */}
          {beads.map((b) => {
            const filled = b.i < currentCount;
            const isLatest = b.i === currentCount - 1 && pulseKey > 0;

            return (
              <Circle
                key={b.i}
                cx={b.x}
                cy={b.y}
                r={b.isGuru ? 9.5 : isLatest ? BEAD_R * 1.3 : BEAD_R}
                fill={filled ? "url(#goldRadialBead)" : theme.emptyFill}
                stroke={filled ? "url(#goldLinearStroke)" : theme.emptyStroke}
                strokeWidth={b.isGuru ? 2 : 1.3}
              />
            );
          })}
        </Svg>

        {/* Center Touchable Button (Absolute positioned inside the ring) */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              transform: [{ scale: buttonScale }],
              borderColor: theme.centerGlow,
              shadowColor: theme.centerGlow,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onThumbTap}
            style={styles.touchArea}
          >
            {/* Dynamic visual text flash aura */}
            <Animated.View
              style={[
                styles.pulseAura,
                {
                  opacity: pulseOpacity,
                  borderColor: theme.centerGlow,
                },
              ]}
            />

            {/* Tap Count Text */}
            <Text style={styles.countText}>{currentCount}</Text>

            {/* Active Mantra / TAP Text */}
            <View style={styles.mantraWrapper}>
              <Animated.Text
                key={pulseKey}
                style={[
                  styles.mantraText,
                  {
                    color: theme.centerGlow,
                    fontSize: fontSize,
                  },
                ]}
              >
                {activeText}
              </Animated.Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  ringWrapper: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  buttonWrapper: {
    position: "absolute",
    width: SVG_SIZE * 0.64,
    height: SVG_SIZE * 0.64,
    borderRadius: (SVG_SIZE * 0.64) / 2,
    backgroundColor: "#110E0C",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    // Premium soft glow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
    overflow: "visible",
  },
  touchArea: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: (SVG_SIZE * 0.64) / 2,
    position: "relative",
  },
  pulseAura: {
    position: "absolute",
    width: "110%",
    height: "110%",
    borderRadius: (SVG_SIZE * 0.72) / 2,
    borderWidth: 1.5,
  },
  countText: {
    fontSize: 54,
    fontWeight: "bold",
    color: "#FFFFF0",
    fontFamily: "System",
  },
  mantraWrapper: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    paddingHorizontal: 12,
  },
  mantraText: {
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
