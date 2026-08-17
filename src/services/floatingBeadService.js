import { NativeModules, DeviceEventEmitter, Platform } from "react-native";

const { FloatingBeadModule } = NativeModules;

export const FloatingBeadService = {
  isAvailable: () => Platform.OS === "android" && !!FloatingBeadModule,

  checkPermission: async () => {
    if (Platform.OS !== "android" || !FloatingBeadModule) return false;
    try {
      return await FloatingBeadModule.checkPermission();
    } catch (e) {
      console.warn("FloatingBeadService.checkPermission error:", e);
      return false;
    }
  },

  requestPermission: () => {
    if (Platform.OS === "android" && FloatingBeadModule) {
      FloatingBeadModule.requestPermission();
    }
  },

  showFloatingBead: (currentCount = 0, selectedMala = "rudraksha") => {
    if (Platform.OS === "android" && FloatingBeadModule) {
      try {
        FloatingBeadModule.showFloatingBead(currentCount, selectedMala);
      } catch (e) {
        console.warn("FloatingBeadService.showFloatingBead error:", e);
      }
    }
  },

  updateCount: (currentCount) => {
    if (Platform.OS === "android" && FloatingBeadModule) {
      try {
        FloatingBeadModule.updateCount(currentCount);
      } catch (e) {
        console.warn("FloatingBeadService.updateCount error:", e);
      }
    }
  },

  hideFloatingBead: () => {
    if (Platform.OS === "android" && FloatingBeadModule) {
      try {
        FloatingBeadModule.hideFloatingBead();
      } catch (e) {
        console.warn("FloatingBeadService.hideFloatingBead error:", e);
      }
    }
  },

  isShowing: async () => {
    if (Platform.OS !== "android" || !FloatingBeadModule) return false;
    try {
      return await FloatingBeadModule.isShowing();
    } catch (e) {
      return false;
    }
  },

  addIncrementListener: (callback) => {
    if (Platform.OS !== "android") return { remove: () => {} };
    return DeviceEventEmitter.addListener("onFloatingBeadIncrement", (data) => {
      if (callback) callback(data);
    });
  },
};
