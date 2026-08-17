import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  PanResponder,
  Animated,
  Vibration,
  Platform,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LAYOUT_WIDTH = Platform.OS === "web" ? Math.min(420, SCREEN_WIDTH) : SCREEN_WIDTH;
const LAYOUT_HEIGHT = Platform.OS === "web" ? Math.min(740, SCREEN_HEIGHT) : SCREEN_HEIGHT;

// Center of the arc is off-screen to the right of the full container width
const CX = LAYOUT_WIDTH * 0.88;
const CY = LAYOUT_HEIGHT * 0.46;
const RADIUS = LAYOUT_WIDTH * 0.68;
const ANGLE_STEP = 0.19; // spacing between beads in radians
const SWIPE_THRESHOLD = 64; // pixels needed to swipe to register 1 count

const BEAD_SIZE = 52;
const ACTIVE_BEAD_SIZE = 80;

// Map bead types to their assets/styling
const BEAD_ASSETS = {
  rudraksha: require("../../assets/rudraksha_bead.png"),
  tulsi: require("../../assets/tulsi_bead.png"),
  chandan: require("../../assets/chandan_bead.png"),
  crystal: require("../../assets/crystal_bead.png"),
  kamalgatta: require("../../assets/kamal_bead.png"),
  karungali: require("../../assets/karungali_bead.png"),
  om: require("../../assets/om_bead.png"),
};

export default function MalaSwipe({ currentCount, onSwipeIncrement, selectedMala = "rudraksha", isSpeaking = false }) {
  // Animated value for swipe offset: 0 to 1
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const lastGestureY = useRef(0);

  const [localCount, setLocalCount] = useState(currentCount);
  const lastCountRef = useRef(currentCount);
  const isManualSwipeRef = useRef(false);

  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Sync state if count increases from external sources (auto chant, voice recognition)
  useEffect(() => {
    if (currentCount !== lastCountRef.current) {
      if (isManualSwipeRef.current) {
        lastCountRef.current = currentCount;
        setLocalCount(currentCount);
        return;
      }

      const diff = currentCount - lastCountRef.current;
      const isIncrement = diff === 1 || (currentCount === 0 && lastCountRef.current === 107);

      if (isIncrement) {
        swipeAnim.setValue(0);
        Animated.timing(swipeAnim, {
          toValue: 1.0,
          duration: 320, // Smooth transition for automatic swipe
          useNativeDriver: false,
        }).start(() => {
          lastCountRef.current = currentCount;
          setLocalCount(currentCount);
          swipeAnim.setValue(0);
        });
      } else {
        lastCountRef.current = currentCount;
        setLocalCount(currentCount);
      }
    }
  }, [currentCount]);

  // Apply custom scale multiplier for Chandan if its image has wider white margins
  const sizeMultiplier = selectedMala === "chandan" ? 1.3 : 1.0;
  const beadSize = BEAD_SIZE * sizeMultiplier;
  const activeBeadSize = ACTIVE_BEAD_SIZE * sizeMultiplier;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSpeakingRef.current,
      onMoveShouldSetPanResponder: () => !isSpeakingRef.current,
      onPanResponderGrant: () => {
        lastGestureY.current = 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          const val = Math.min(gestureState.dy / SWIPE_THRESHOLD, 1.0); // Capped at 1.0 to prevent reverse rebound on release
          swipeAnim.setValue(val);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const touchX = evt.nativeEvent.locationX || gestureState.x0 || 0;
        const touchY = evt.nativeEvent.locationY || gestureState.y0 || 0;

        // Active Zoomed Dark Bead center position
        const activeX = CX - RADIUS; // ~50px from left of swipe zone
        const activeY = CY;          // ~46% of container height

        // Calculate Euclidean distance strictly from the active zoomed bead center
        const distFromActive = Math.hypot(touchX - activeX, touchY - activeY);

        // Tap MUST be within 65px of the active zoomed bead center only
        const isTapOnActiveBead = 
          Math.abs(gestureState.dy) < 15 && 
          Math.abs(gestureState.dx) < 15 && 
          (distFromActive <= 70);

        const isSwipe = gestureState.dy >= 20;

        if (isSwipe || isTapOnActiveBead) {
          isManualSwipeRef.current = true;
          // Complete swipe animation to 1, then increment count
          Animated.timing(swipeAnim, {
            toValue: 1.0,
            duration: 100, // Smooth responsive animation for both tap & swipe
            useNativeDriver: false,
          }).start(() => {
            onSwipeIncrement("touch");
            swipeAnim.setValue(0);
            setTimeout(() => {
              isManualSwipeRef.current = false;
            }, 80);
          });
        } else {
          isManualSwipeRef.current = false;
          Animated.spring(swipeAnim, {
            toValue: 0,
            tension: 40,
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // We render 10 beads on the screen: 4 below center (-4 to -1), active center (0), and 5 above center (1 to 5)
  const visibleBeadIndices = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  // Helper to dynamically calculate angles and add a gap around the large active center bead
  const getPositionAngle = (pos) => {
    const PUSH_ANGLE = 0.035; // push angle in radians (creates a minor touch-level gap around center bead)
    if (pos > 0) {
      return Math.PI + pos * ANGLE_STEP + PUSH_ANGLE;
    } else if (pos < 0) {
      return Math.PI + pos * ANGLE_STEP - PUSH_ANGLE;
    } else {
      return Math.PI;
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Pan Area Helper Text overlay (invisible but active for touches) */}
      <View style={styles.activeArea} pointerEvents="box-none">
        {visibleBeadIndices.map((offsetIndex) => {
          const isFilled = offsetIndex < 0; // Beads already pulled down are filled
          const isCurrent = offsetIndex === 0;

          // Dynamically interpolate scale and opacity to create smooth zoom and focus on center
          let animatedScale;
          let animatedOpacity;
          const activeScale = activeBeadSize / beadSize;

          if (offsetIndex === 0) {
            // Center bead: shrinks and fades out as swipe progress goes from 0 to 1
            animatedScale = swipeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [activeScale, 1.0],
            });
            animatedOpacity = swipeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1.0, 0.6],
            });
          } else if (offsetIndex === 1) {
            // Bead above center: grows and fades in as swipe progress goes from 0 to 1
            animatedScale = swipeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1.0, activeScale],
            });
            animatedOpacity = swipeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1.0],
            });
          } else {
            // Other beads stay small and semi-transparent
            animatedScale = new Animated.Value(1.0);
            animatedOpacity = new Animated.Value(0.6);
          }

          const baseAngle = getPositionAngle(offsetIndex);
          const nextAngle = getPositionAngle(offsetIndex - 1);

          const baseLeftTranslated = CX + RADIUS * Math.cos(baseAngle) - beadSize / 2;
          const baseTopTranslated = CY + RADIUS * Math.sin(baseAngle) - beadSize / 2;

          const nextLeftTranslated = CX + RADIUS * Math.cos(nextAngle) - beadSize / 2;
          const nextTopTranslated = CY + RADIUS * Math.sin(nextAngle) - beadSize / 2;

          const translateX = swipeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [baseLeftTranslated, nextLeftTranslated],
          });

          const translateY = swipeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [baseTopTranslated, nextTopTranslated],
          });

          return (
            <Animated.View
              key={offsetIndex}
              style={[
                styles.beadWrapper,
                {
                  left: 0,
                  top: 0,
                  width: beadSize,
                  height: beadSize,
                  transform: [
                    { translateX: translateX },
                    { translateY: translateY },
                    { scale: animatedScale },
                  ],
                },
              ]}
            >
              <Animated.Image
                source={BEAD_ASSETS[selectedMala] || BEAD_ASSETS.rudraksha}
                style={[
                  styles.beadImage,
                  {
                    width: beadSize,
                    height: beadSize,
                    borderRadius: beadSize / 2,
                    opacity: animatedOpacity,
                  },
                  selectedMala === "crystal" && {
                    backgroundColor: "rgba(125, 211, 252, 0.25)",
                    shadowColor: "#38BDF8",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 5,
                  }
                ]}
              />
            </Animated.View>
          );
        })}
      </View>

      {/* Transparent gesture capture zone restricted to the right column */}
      <View style={styles.swipeZone} {...panResponder.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  activeArea: {
    flex: 1,
    position: "relative",
  },
  swipeZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT_WIDTH * 0.42,
    backgroundColor: "transparent",
  },
  beadWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  beadImage: {
    resizeMode: "cover",
  },
});
