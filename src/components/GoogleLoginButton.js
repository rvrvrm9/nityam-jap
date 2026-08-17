import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const WEB_CLIENT_ID = "630834772209-seihi60vd1cdp4fdjcd9niofmgkaknmv.apps.googleusercontent.com";

let GoogleSignin = null;
let statusCodes = {};
try {
  const gModule = require("@react-native-google-signin/google-signin");
  GoogleSignin = gModule.GoogleSignin;
  statusCodes = gModule.statusCodes;
} catch (e) {
  console.log("Native GoogleSignin not available");
}

export default function GoogleLoginButton({ onLoginSuccess, forceButton = false, buttonStyle }) {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: WEB_CLIENT_ID,
          offlineAccess: true,
          scopes: ["profile", "email"],
        });
      } catch (err) {
        console.warn("GoogleSignin configure error:", err);
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);

    if (!GoogleSignin) {
      Alert.alert("Google Sign-In", "Google Play Services उपलब्ध नहीं है।");
      setLoading(false);
      return;
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      const user = res.data ? res.data.user : res.user;
      const idToken = res.data ? res.data.idToken : res.idToken;

      if (user && user.email) {
        const profile = {
          name: user.name || user.email.split("@")[0],
          email: user.email,
          photo: user.photo,
        };
        setUserInfo(profile);
        if (onLoginSuccess) onLoginSuccess({ user: profile, idToken });
      } else {
        Alert.alert("लॉगिन त्रुटि", "Google यूजर की जानकारी प्राप्त नहीं हो सकी।");
      }
    } catch (error) {
      console.log("Google Sign-In Error:", error);
      if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
        // User cancelled picker
      } else if (error.code === statusCodes?.IN_PROGRESS) {
        Alert.alert("Google Sign-In", "लॉगिन पहले से प्रगति पर है।");
      } else if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Google Sign-In", "Google Play Services अपडेट की आवश्यकता है।");
      } else {
        Alert.alert(
          "Google Sign-In एरर विवरण",
          `Error Code: ${error.code || "N/A"}\nMessage: ${error.message || "Unknown error"}\n\nकृपया सुनिश्चित करें कि Firebase/Google Console में Google Sign-In चालू है।`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (GoogleSignin) {
        await GoogleSignin.signOut().catch(() => {});
      }
    } catch (_) {}
    setUserInfo(null);
    Alert.alert("साइन आउट", "आप सफलतापूर्वक साइन आउट हो गए हैं।");
  };

  return (
    <View style={styles.container}>
      {!forceButton && userInfo ? (
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            {userInfo.photo ? (
              <Image source={{ uri: userInfo.photo }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarLetter}>
                {userInfo.name ? userInfo.name[0].toUpperCase() : "👤"}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {userInfo.name}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {userInfo.email}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.googleButton, buttonStyle]}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={20}
                color="#4285F4"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    width: "100%",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: "100%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#202124",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 10,
    width: "100%",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E05E26",
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  userEmail: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
});
