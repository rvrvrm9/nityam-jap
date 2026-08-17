import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MALA_THEMES } from "../constants/malaData";

export default function Controls({
  micOn,
  micState,
  toggleMic,
  autoOn,
  toggleAuto,
  swipeSoundOn,
  toggleSwipeSound,
  onResetSession,
  onResetAll,
  selectedMala = "rudraksha",
  appLanguage = "hi"
}) {
  const theme = MALA_THEMES[selectedMala] || MALA_THEMES.rudraksha;
  const isEn = appLanguage === "en";

  return (
    <View style={styles.container}>
      {/* ── Voice Chant Detector Control ──────────────────────── */}
      <View style={styles.controlRow}>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{isEn ? "Voice Chant" : "Voice Chant"}</Text>
          <Text style={styles.descText}>{isEn ? "Count by speaking" : "बोलकर काउंट करें"}</Text>
        </View>

        {/* Toggle Switch */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleMic}
          style={[
            styles.switchTrack,
            micOn
              ? { backgroundColor: "#E05E26" } // Saffron match
              : { backgroundColor: "#E2E8F0" }
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              micOn ? styles.switchThumbOn : styles.switchThumbOff
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Mic Status Indicator */}
      {micOn && (
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              micState === "listening"
                ? { backgroundColor: "#4FBF6B" }
                : { backgroundColor: "#A0AEC0" }
            ]}
          />
          <Text style={styles.statusText} numberOfLines={1}>
            {micState === "listening" ? (isEn ? "Listening..." : "सुन रहा है...") : (isEn ? "Starting..." : "शुरू हो रहा है...")}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* ── Auto Chant Control ──────────────────────── */}
      <View style={styles.controlRow}>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{isEn ? "Auto Chant" : "Auto Chant"}</Text>
          <Text style={styles.descText}>{isEn ? "Automatic chanting" : "स्वचालित जाप"}</Text>
        </View>

        {/* Toggle Switch */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleAuto}
          style={[
            styles.switchTrack,
            autoOn
              ? { backgroundColor: "#E05E26" }
              : { backgroundColor: "#E2E8F0" }
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              autoOn ? styles.switchThumbOn : styles.switchThumbOff
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* ── Swipe Sound Control Row ── */}
      <View style={styles.soundRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleSwipeSound}
          style={[
            styles.soundIconBtn,
            swipeSoundOn ? styles.soundIconBtnActive : styles.soundIconBtnInactive
          ]}
        >
          <Ionicons
            name={swipeSoundOn ? "volume-high" : "volume-mute"}
            size={22}
            color="#B5491F"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* ── Action Buttons (Reset, Clear All) ──────────────────────── */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onResetSession}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>{isEn ? "Reset" : "रीसेट"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onResetAll}
          style={[styles.actionBtn, styles.clearBtn]}
        >
          <Text style={[styles.actionBtnText, styles.clearBtnText]}>{isEn ? "Clear All" : "सब शून्य करें"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2D3748",
  },
  descText: {
    fontSize: 9.5,
    color: "#718096",
    marginTop: 1,
  },
  switchTrack: {
    width: 38,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  switchThumbOff: {
    alignSelf: "flex-start",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingLeft: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusText: {
    fontSize: 9.5,
    color: "#718096",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDF2F7",
    marginVertical: 10,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    alignItems: "center",
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4A5568",
  },
  clearBtn: {
    borderColor: "rgba(229, 62, 62, 0.15)",
    backgroundColor: "rgba(229, 62, 62, 0.05)",
  },
  clearBtnText: {
    color: "#E53E3E",
  },
  soundRow: {
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: 2,
  },
  soundIconBtn: {
    width: 54,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  soundIconBtnActive: {
    backgroundColor: "rgba(181, 73, 31, 0.08)",
    borderColor: "#B5491F",
  },
  soundIconBtnInactive: {
    backgroundColor: "#F7FAFC",
    borderColor: "#E2E8F0",
  },
});
