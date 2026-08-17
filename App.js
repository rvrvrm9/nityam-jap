import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet, Linking, View, Text, SafeAreaView, ScrollView,
  TouchableOpacity, Vibration, StatusBar,
  ActivityIndicator, Alert, Platform, PermissionsAndroid, BackHandler, AppState,
  Image, Dimensions, Modal, Animated, Share, Switch, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as KeepAwake from "expo-keep-awake";

try { WebBrowser.maybeCompleteAuthSession(); } catch (e) {}

let ExpoWebSpeechRecognition = null;
try {
  ExpoWebSpeechRecognition = require("expo-speech-recognition").ExpoWebSpeechRecognition;
} catch (e) {
  console.warn("expo-speech-recognition is not supported in this environment");
}

import SplashScreen from "./src/components/SplashScreen";
import MalaSwipe    from "./src/components/MalaSwipe";
import Controls    from "./src/components/Controls";
import GoogleLoginButton from "./src/components/GoogleLoginButton";
import { MALA_OPTIONS, MALA_COOLDOWNS, MANTRA_LABELS } from "./src/constants/malaData";
import { TRANSLATIONS } from "./src/constants/translations";
import { FloatingBeadService } from "./src/services/floatingBeadService";

const STORAGE_KEY = "JAAP_MALA_MOBILE_STATE";
export const APK_SHARE_LINK = "https://expo.dev/artifacts/eas/SYekiZebvDlyBim__Mb4JMWW50CRZQkN030utaF3U6M.apk";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LAYOUT_WIDTH = Platform.OS === "web" ? Math.min(420, SCREEN_WIDTH) : SCREEN_WIDTH;

const DEITY_IMAGES = {
  rudraksha: require("./assets/shiva_bg.png"),
  tulsi: require("./assets/rama_bg.png"),
  chandan: require("./assets/krishna_bg.png"),
  crystal: require("./assets/durga_bg.png"),
  kamalgatta: require("./assets/lakshmi_bg.png"),
  karungali: require("./assets/murugan_bg.png"),
  om: require("./assets/om_bg.png"),
};

const BEAD_THUMBS = {
  rudraksha: require("./assets/rudraksha_bead.png"),
  tulsi: require("./assets/tulsi_bead.png"),
  chandan: require("./assets/chandan_bead.png"),
  crystal: require("./assets/crystal_bead.png"),
  kamalgatta: require("./assets/kamal_bead.png"),
  karungali: require("./assets/karungali_bead.png"),
  om: require("./assets/om_bead.png"),
};

// ── Mantra keywords per mala ──────────────────────────────────────────────────

const ALL_MANTRAS_LIST = [
  { id: "default", label: "माला मूल मन्त्र (Default Mala Mantra)" },
  { id: "om", label: "ॐ (Om Mantra)", kw: ["ॐ", "om", "aum", "ओम", "ओम्", "ओ३म्", "ohm", "ओइम", "ॐ नमः", "ॐ ॐ"] },
  { id: "rudraksha", label: "ॐ नमः शिवाय (Om Namah Shivaya)", kw: ["शिवाय", "shivaya", "shivaay", "namah shivaya", "namah", "नमः"] },
  { id: "siyaram", label: "जय सियाराम (Jai Siyaram)", kw: ["सियाराम", "siyaram", "jai siya", "jai ram", "जय राम", "राम", "ram"] },
  { id: "harekrishna", label: "हरे कृष्ण हरे राम (Hare Krishna)", kw: ["hare krishna", "harekrishna", "हरे कृष्ण", "कृष्ण", "krishna"] },
  { id: "vasudev", label: "ॐ नमो भगवते वासुदेवाय", kw: ["वासुदेवाय", "vasudev", "bhagwate", "vasudevaaya", "नमो"] },
  { id: "lakshmi", label: "ॐ श्रीं महालक्ष्म्यै नमः", kw: ["महालक्ष्मी", "mahalakshmi", "lakshmi", "mahalakshmyai", "श्रीं", "shreem"] },
  { id: "kamala", label: "ॐ श्रीं ह्रीं कमले कमलालये नमः", kw: ["कमले", "कमलालये", "kamale", "kamalaye", "ह्रीं"] },
  { id: "murugan", label: "ॐ सुब्रह्मण्याय नमः / ॐ मुरुगा", kw: ["मुरुगा", "muruga", "murugan", "सुब्रह्मण्याय"] },
];

const KEYWORDS = {
  rudraksha:  ["शिवाय", "shivaya", "shivaay", "namah shivaya", "namah"],
  tulsi_jai:  ["सियाराम", "siyaram", "jai siya", "jai ram", "जय राम"],
  tulsi_hare: ["hare krishna", "harekrishna", "हरे कृष्ण", "कृष्ण", "krishna"],
  chandan:    ["वासुदेवाय", "vasudev", "bhagwate", "vasudevaaya", "नमो"],
  crystal:    ["श्रीं", "shreem", "shrim", "श्री", "shree"],
  kamalgatta: ["महालक्ष्मी", "mahalakshmi", "lakshmi", "mahalakshmyai"],
  karungali:  ["मुरुगा", "muruga", "murugan"],
  om:         ["ॐ", "om", "aum", "ओम", "ओम्", "ओ३म्", "ohm", "ओइम", "ॐ नमः", "ॐ ॐ"],
};

function getKeywords(malaId, tulsiMantra, activeMantraKey) {
  if (activeMantraKey && activeMantraKey !== "default") {
    const item = ALL_MANTRAS_LIST.find(m => m.id === activeMantraKey);
    if (item && item.kw) return item.kw;
  }
  if (malaId === "tulsi") return KEYWORDS[tulsiMantra === "jaisiyaram" ? "tulsi_jai" : "tulsi_hare"];
  return KEYWORDS[malaId] || [];
}

function matchesMantra(transcript, malaId, tulsiMantra, activeMantraKey) {
  const kws = getKeywords(malaId, tulsiMantra, activeMantraKey);
  const t   = transcript.toLowerCase().replace(/\s+/g, "");
  const ts  = transcript.toLowerCase().trim();
  return kws.some((kw) => t.includes(kw.toLowerCase().replace(/\s+/g,"")) || ts.includes(kw.toLowerCase().trim()));
}

const DeityWatermark = React.memo(({ selectedMala }) => {
  return (
    <Image
      source={DEITY_IMAGES[selectedMala] || DEITY_IMAGES.rudraksha}
      style={styles.deityWatermark}
      resizeMode="contain"
    />
  );
});

export default function App() {
  const [activeView, setActiveView]     = useState("splash");
  const [selectedMala, setSelectedMala] = useState("om");
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [activeMantraKey, setActiveMantraKey] = useState("default");
  const [customMantraText, setCustomMantraText] = useState("");
  const [showMantraModal, setShowMantraModal] = useState(false);
  const selectedMalaRef = useRef("om");
  const activeMantraKeyRef = useRef("default");

  const [currentCount, setCurrentCount] = useState(0);
  const [totalMalas,   setTotalMalas]   = useState(0);
  const [todayBeads,   setTodayBeads]   = useState(0);
  const [pulseKey,     setPulseKey]     = useState(0);
  const [loading,      setLoading]      = useState(true);

  const currentCountRef = useRef(0);
  const totalMalasRef   = useRef(0);
  const globalStateRef  = useRef({});

  const [globalState, setGlobalState] = useState({
    rudraksha: { currentCount: 0, totalMalas: 0, history: {} },
    tulsi:     { currentCount: 0, totalMalas: 0, history: {} },
    chandan:   { currentCount: 0, totalMalas: 0, history: {} },
    crystal:   { currentCount: 0, totalMalas: 0, history: {} },
    kamalgatta:{ currentCount: 0, totalMalas: 0, history: {} },
    karungali: { currentCount: 0, totalMalas: 0, history: {} },
    om:        { currentCount: 0, totalMalas: 0, history: {} },
  });

  const [micOn,  setMicOn]  = useState(false);
  const micOnRef            = useRef(false);
  const [autoOn, setAutoOn] = useState(false);
  const autoOnRef           = useRef(false);

  const [tulsiMantra, setTulsiMantra] = useState("jaisiyaram");
  const tulsiMantraRef = useRef("jaisiyaram");

  const switcherScale = useRef(new Animated.Value(1)).current;
  const handlePressInSwitcher = () => {
    Animated.timing(switcherScale, { toValue: 0.94, duration: 180, useNativeDriver: true }).start();
  };
  const handlePressOutSwitcher = () => {
    Animated.timing(switcherScale, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const sheetAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const openSwitcherModal = () => {
    setShowSwitcher(true);
    sheetAnim.setValue(Dimensions.get("window").height);
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  };
  const closeSwitcherModal = () => {
    Animated.timing(sheetAnim, {
      toValue: Dimensions.get("window").height,
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      setShowSwitcher(false);
    });
  };

  const [showDrawer, setShowDrawer] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const userProfileRef = useRef(null);

  const getEmptyState = () => ({
    rudraksha: { currentCount: 0, totalMalas: 0, history: {} },
    tulsi:     { currentCount: 0, totalMalas: 0, history: {} },
    chandan:   { currentCount: 0, totalMalas: 0, history: {} },
    crystal:   { currentCount: 0, totalMalas: 0, history: {} },
    kamalgatta:{ currentCount: 0, totalMalas: 0, history: {} },
    karungali: { currentCount: 0, totalMalas: 0, history: {} },
    om:        { currentCount: 0, totalMalas: 0, history: {} },
  });

  const updateProfile = (profile) => {
    const p = profile ? { ...profile } : null;
    setUserProfile(p);
    userProfileRef.current = p;
    if (p) {
      AsyncStorage.setItem("JAAP_MALA_USER_PROFILE", JSON.stringify(p)).catch(() => {});
      const userKey = `JAAP_MALA_USER_STATS_${p.email || p.name}`;
      AsyncStorage.getItem(userKey).then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              setGlobalState(parsed);
              globalStateRef.current = parsed;
              calculateTodayBeads(parsed);
              const m = selectedMalaRef.current || "om";
              const mData = parsed[m] || { currentCount: 0, totalMalas: 0 };
              currentCountRef.current = mData.currentCount || 0;
              totalMalasRef.current = mData.totalMalas || 0;
              setCurrentCount(mData.currentCount || 0);
              setTotalMalas(mData.totalMalas || 0);
              return;
            }
          } catch (e) {}
        }
      }).catch(() => {});
    } else {
      AsyncStorage.removeItem("JAAP_MALA_USER_PROFILE").catch(() => {});
      const empty = getEmptyState();
      setGlobalState(empty);
      globalStateRef.current = empty;
      currentCountRef.current = 0;
      totalMalasRef.current = 0;
      setCurrentCount(0);
      setTotalMalas(0);
      setTodayBeads(0);
    }
  };
  const [appLanguage, setAppLanguage] = useState("hi");
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [floatingBeadEnabled, setFloatingBeadEnabled] = useState(false);
  const floatingBeadEnabledRef = useRef(false);

  const formatDisplayName = (inputStr, customName) => {
    if (customName && customName.trim()) {
      return customName.trim();
    }
    if (!inputStr) return "साधक";
    
    let handle = inputStr.split("@")[0] || "";
    // Remove numbers
    let clean = handle.replace(/[0-9]/g, "");
    // Replace dots, underscores, hyphens with space
    clean = clean.replace(/[_.-]/g, " ").trim();
    
    if (!clean) clean = handle;

    // Special case for rahulverma
    if (clean.toLowerCase() === "rahulverma") return "Rahul Verma";

    // Capitalize words
    const words = clean.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    return words.join(" ");
  };
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmOtpState, setConfirmOtpState] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [activeModalContent, setActiveModalContent] = useState(null);

  const t = (key) => {
    const dict = TRANSLATIONS[appLanguage] || TRANSLATIONS.hi;
    return dict[key] || TRANSLATIONS.hi[key] || key;
  };

  const getModalText = (modalKey, fieldKey) => {
    const langDict = TRANSLATIONS[appLanguage] || TRANSLATIONS.hi;
    const modalDict = langDict[modalKey] || TRANSLATIONS.hi[modalKey] || {};
    return modalDict[fieldKey] || TRANSLATIONS.hi[modalKey]?.[fieldKey] || "";
  };

  const drawerAnim = useRef(new Animated.Value(-LAYOUT_WIDTH * 0.82)).current;

  const openDrawer = () => {
    setShowDrawer(true);
    drawerAnim.setValue(-LAYOUT_WIDTH * 0.82);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -LAYOUT_WIDTH * 0.82,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setShowDrawer(false);
    });
  };

  const handleLogout = () => {
    updateProfile(null);
    if (Platform.OS === "web") {
      setTimeout(() => {
        alert(appLanguage === "en" ? "Signed out successfully!" : "सफलतापूर्वक साइन आउट हुआ!");
      }, 50);
    } else {
      Alert.alert(t("logoutSuccess"));
    }
  };

  const handleGoogleLogin = async () => {
    if (userProfile) {
      handleLogout();
      return;
    }

    try {
      const gModule = require("@react-native-google-signin/google-signin");
      const GoogleSignin = gModule.GoogleSignin;
      if (GoogleSignin) {
        GoogleSignin.configure({
          webClientId: "630834772209-seihi60vd1cdp4fdjcd9niofmgkaknmv.apps.googleusercontent.com",
          offlineAccess: true,
          scopes: ["profile", "email"],
        });
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const res = await GoogleSignin.signIn();
        const user = res.data ? res.data.user : res.user;
        if (user && user.email) {
          const name = user.name || user.email.split("@")[0] || "Sadhak";
          const userObj = {
            name: name,
            email: user.email,
            photo: user.photo,
            provider: "google",
          };
          updateProfile(userObj);
          setShowLoginModal(false);
          Alert.alert(
            appLanguage === "en" ? "Signed In with Google" : "Google से सफलतापूर्वक लॉगिन हुआ",
            `${appLanguage === "en" ? "Welcome back" : "साधना में स्वागत है"}, ${name}!`
          );
          return;
        }
      }
    } catch (e) {
      console.warn("Google Sign-In Notice:", e);
      if (e.code !== "SIGN_IN_CANCELLED" && e.code !== "12501") {
        Alert.alert("Google Sign-In", `Google लॉगिन में समस्या आई (${e.code || e.message || "Unknown"})`);
      }
    }
  };

  const handleConfirmGoogleLogin = (emailToUse, nameToUse) => {
    const finalEmail = (emailToUse || googleEmailInput || "").trim();
    if (!finalEmail) {
      Alert.alert(
        appLanguage === "en" ? "Enter Google Email" : "Google ईमेल दर्ज करें",
        appLanguage === "en" ? "Please enter your Gmail address." : "कृपया अपना Gmail एड्रेस दर्ज करें।"
      );
      return;
    }

    const formattedName = formatDisplayName(finalEmail, nameToUse);
    const userObj = {
      name: formattedName,
      email: finalEmail.includes("@") ? finalEmail : `${finalEmail.toLowerCase()}@gmail.com`,
      provider: "google",
    };

    updateProfile(userObj);
    setShowGoogleAuthModal(false);
    setShowLoginModal(false);

    if (Platform.OS === "web") {
      setTimeout(() => {
        alert(
          `${appLanguage === "en" ? "Signed In with Google as" : "Google से सफलतापूर्वक लॉगिन हुआ:"} ${formattedName}`
        );
      }, 50);
    } else {
      Alert.alert(
        appLanguage === "en" ? "Signed In with Google" : "Google से सफलतापूर्वक लॉगिन हुआ",
        `${appLanguage === "en" ? "Welcome back" : "साधना में स्वागत है"}, ${formattedName}!`
      );
    }
  };



  const handleShareApp = async () => {
    const shareMessage = appLanguage === "en"
      ? `📿 Nityam Jap Sadhana App\nChant with sacred Rudraksha, Tulsi & Om malas on your phone.\n\n📥 Download APK:\n${APK_SHARE_LINK}`
      : `📿 नित्यम जप साधना ऐप\nअपने मोबाइल पर प्रतिदिन रुद्राक्ष, तुलसी, चंदन और ॐ माला का जप करें और अपनी साधना का रिकॉर्ड रखें।\n\n📥 ऐप (APK) डाउनलोड करें:\n${APK_SHARE_LINK}`;

    try {
      await Share.share({
        title: "Nityam Jap Sadhana App",
        message: shareMessage,
        url: APK_SHARE_LINK,
      });
    } catch (error) {
      console.warn(error);
    }
  };

  const handleRateUs = () => {
    Alert.alert(
      appLanguage === "en" ? "Rate Nityam Jap" : "नित्यम जप को रेटिंग दें",
      appLanguage === "en" 
        ? "If you enjoy using Nityam Jap, please take a moment to rate us 5 stars on Google Play Store! Your support helps us spread devotion." 
        : "यदि आप नित्यम जप ऐप का आनंद ले रहे हैं, तो कृपया Google Play Store पर हमें 5-स्टार रेटिंग देकर अपना आशीर्वाद दें!",
      [
        { text: t("rateLater"), style: "cancel" },
        { 
          text: appLanguage === "en" ? "★★★★★ Rate 5 Stars" : "★★★★★ 5-स्टार रेटिंग दें", 
          onPress: async () => {
            const playStoreUrl = "https://play.google.com/store/apps/details?id=com.nityamjap.app";
            const marketUrl = "market://details?id=com.nityamjap.app";
            try {
              if (Platform.OS === "android") {
                const canOpenMarket = await Linking.canOpenURL(marketUrl);
                if (canOpenMarket) {
                  await Linking.openURL(marketUrl);
                } else {
                  await Linking.openURL(playStoreUrl);
                }
              } else if (Platform.OS === "web") {
                window.open(playStoreUrl, "_blank");
              } else {
                await Linking.openURL(playStoreUrl);
              }
            } catch (e) {
              console.warn("Could not open Play Store URL:", e);
            }
          } 
        }
      ]
    );
  };

  const handleLanguageChange = () => {
    closeDrawer();
    setTimeout(() => {
      setShowLanguageModal(true);
    }, 280);
  };

  const handleSelectLanguage = (langCode) => {
    setAppLanguage(langCode);
    AsyncStorage.setItem("JAAP_MALA_LANG", langCode);
    setShowLanguageModal(false);
  };
  const [swipeSoundOn, setSwipeSoundOn] = useState(false);
  const swipeSoundOnRef = useRef(false);
  const [isChantSpeaking, setIsChantSpeaking] = useState(false);
  const [showFloatingWidget, setShowFloatingWidget] = useState(false);
  const [appInBg, setAppInBg] = useState(false);

  // AppState Listener to detect when App goes to Background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        setAppInBg(true);
      } else if (nextAppState === "active") {
        setAppInBg(false);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);
  const isSpeakingRef = useRef(false);
  const speechTimeoutRef = useRef(null);

  const toggleSwipeSoundExclusively = () => {
    const nextVal = !swipeSoundOnRef.current;
    swipeSoundOnRef.current = nextVal;
    setSwipeSoundOn(nextVal);
  };

function getActiveMantraTextAndSettings(malaId, tulsiMantra, activeMantraKey) {
  let text = "राम", rate = 0.85, gap = 1000, lang = "hi-IN";

  if (activeMantraKey && activeMantraKey !== "default") {
    if (activeMantraKey === "om") {
      text = "ॐ"; rate = 0.10; gap = 2000;
    } else if (activeMantraKey === "rudraksha") {
      text = "ॐ नमः शिवाय"; rate = 0.80; gap = 1300;
    } else if (activeMantraKey === "siyaram") {
      text = "जय सियाराम"; rate = 0.80; gap = 800;
    } else if (activeMantraKey === "harekrishna") {
      text = "हरे कृष्ण हरे राम"; rate = 0.75; gap = 2000;
    } else if (activeMantraKey === "vasudev") {
      text = "ॐ नमो भगवते वासुदेवाय"; rate = 0.80; gap = 800;
    } else if (activeMantraKey === "lakshmi") {
      text = "ॐ श्रीं महालक्ष्म्यै नमः"; rate = 0.80; gap = 1600;
    } else if (activeMantraKey === "kamala") {
      text = "ॐ श्रीं ह्रीं कमले कमलालये नमः"; rate = 0.75; gap = 2000;
    } else if (activeMantraKey === "murugan") {
      text = "ॐ मुरुगा"; rate = 0.85; gap = 800;
    }
  } else {
    if (malaId === "rudraksha")       { text = "ॐ नमः शिवाय"; rate = 0.80; gap = 1300; }
    else if (malaId === "kamalgatta") { text = "ॐ महालक्ष्म्यै नमः"; rate = 0.80; gap = 1600; }
    else if (malaId === "karungali")  { text = "ॐ मुरुगा"; rate = 0.85; gap = 800; }
    else if (malaId === "chandan")    { text = "ॐ नमो भगवते वासुदेवाय"; rate = 0.80; gap = 800; }
    else if (malaId === "crystal")    { text = "ॐ श्रीं"; rate = 0.85; gap = 800; }
    else if (malaId === "om")         { text = "ॐ"; rate = 0.10; gap = 2000; }
    else if (malaId === "tulsi") {
      text = tulsiMantra === "jaisiyaram" ? "जय सियाराम" : "हरे कृष्ण हरे राम";
      rate = tulsiMantra === "jaisiyaram" ? 0.80 : 0.75;
      gap  = tulsiMantra === "jaisiyaram" ? 800 : 2000;
    }
  }

  return { text, rate, gap, lang };
}

  const playSwipeChant = () => {
    const mala = selectedMalaRef.current;
    if (!mala) return;
    const { text, rate, lang } = getActiveMantraTextAndSettings(
      mala,
      tulsiMantraRef.current,
      activeMantraKeyRef.current
    );
    const omPitch = 1.0;

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    isSpeakingRef.current = true;
    setIsChantSpeaking(true);

    // Set fallback lock release after 2.5 seconds (in case callbacks fail)
    speechTimeoutRef.current = setTimeout(() => {
      isSpeakingRef.current = false;
      setIsChantSpeaking(false);
    }, 2500);

    try {
      Speech.stop();
      Speech.speak(text, {
        language: lang,
        rate,
        pitch: omPitch,
        onStart: () => {
          isSpeakingRef.current = true;
          setIsChantSpeaking(true);
        },
        onDone: () => {
          isSpeakingRef.current = false;
          setIsChantSpeaking(false);
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        },
        onStopped: () => {
          isSpeakingRef.current = false;
          setIsChantSpeaking(false);
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        },
        onError: () => {
          isSpeakingRef.current = false;
          setIsChantSpeaking(false);
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        }
      });
    } catch (e) {
      console.warn("Speech error on swipe:", e);
      isSpeakingRef.current = false;
      setIsChantSpeaking(false);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    }
  };

  const lastCountTimeRef  = useRef(0);
  const lastProcessedLengthRef = useRef(0);
  const autoChantTimerRef = useRef(null);
  const recognitionRef    = useRef(null);

  const getTodayKey = () => new Date().toISOString().split("T")[0];

  // ── LOAD DATA ─────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("JAAP_MALA_LANG").then((lang) => {
      if (lang) setAppLanguage(lang);
    }).catch(() => {});

    AsyncStorage.getItem("JAAP_MALA_USER_PROFILE").then((profile) => {
      if (profile) {
        try {
          const p = JSON.parse(profile);
          if (p && typeof p === "object") {
            setUserProfile(p);
            userProfileRef.current = p;

            const userKey = `JAAP_MALA_USER_STATS_${p.email || p.name}`;
            AsyncStorage.getItem(userKey).then((s) => {
              if (s) {
                try {
                  const parsed = JSON.parse(s);
                  if (parsed && typeof parsed === "object") {
                    setGlobalState(parsed);
                    globalStateRef.current = parsed;
                    calculateTodayBeads(parsed);
                    const omData = parsed["om"] || { currentCount: 0, totalMalas: 0, history: {} };
                    currentCountRef.current = omData.currentCount || 0;
                    totalMalasRef.current   = omData.totalMalas || 0;
                    setCurrentCount(omData.currentCount || 0);
                    setTotalMalas(omData.totalMalas || 0);
                  }
                } catch (e) {}
              }
              setLoading(false);
            }).catch(() => setLoading(false));
            return;
          }
        } catch (e) {}
      }
      // If not logged in, keep empty zero state for stats
      const empty = getEmptyState();
      setGlobalState(empty);
      globalStateRef.current = empty;
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  // ── ANDROID BACK BUTTON HANDLER ───────────────────
  useEffect(() => {
    const backAction = () => {
      if (activeView === "counter") {
        Alert.alert(t("exitTitle"), t("exitMsg"), [
          { text: t("noBtn"), style: "cancel" },
          { text: t("yesBtn"), onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [activeView]);

  const calculateTodayBeads = (state) => {
    const key = getTodayKey();
    let total = 0;
    Object.keys(state).forEach((m) => { total += (state[m].history?.[key] || 0); });
    setTodayBeads(total);
  };

  // ── FLOATING BEAD OVERLAY EVENT LISTENERS ─────────
  useEffect(() => {
    AsyncStorage.getItem("JAAP_MALA_FLOATING_BEAD").then((val) => {
      if (val === "true") {
        setFloatingBeadEnabled(true);
        floatingBeadEnabledRef.current = true;
      }
    }).catch(() => {});

    // Listen for background floating bead taps
    const subBead = FloatingBeadService.addIncrementListener((data) => {
      handleIncrement("floating");
    });

    // Listen for AppState changes (minimize/foreground)
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        if (floatingBeadEnabledRef.current) {
          FloatingBeadService.showFloatingBead(
            currentCountRef.current,
            selectedMalaRef.current || "rudraksha"
          );
        }
      } else if (nextAppState === "active") {
        FloatingBeadService.updateCount(currentCountRef.current);
      }
    };

    const subApp = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      if (subBead && subBead.remove) subBead.remove();
      if (subApp && subApp.remove) subApp.remove();
    };
  }, []);

  const handleToggleFloatingBead = async () => {
    if (!FloatingBeadService.isAvailable()) {
      Alert.alert(
        appLanguage === "en" ? "Feature Notice" : "फ़ीचर सूचना",
        appLanguage === "en"
          ? "Floating Bead overlay requires the Standalone Android APK build. Please install the latest APK."
          : "फ्लोटिंग मनका फ़ीचर एंड्रॉइड स्टैंडअलोन APK में काम करता है। कृपया नया APK इंस्टॉल करें।"
      );
      return;
    }

    const nextVal = !floatingBeadEnabled;
    if (nextVal) {
      const hasPermission = await FloatingBeadService.checkPermission();
      if (!hasPermission) {
        Alert.alert(
          appLanguage === "en" ? "Permission Required" : "अनुमति आवश्यक है",
          appLanguage === "en"
            ? "To show floating bead on your screen while using other apps, please enable 'Display over other apps' permission."
            : "स्क्रीन पर फ्लोटिंग मनका दिखाने के लिए 'अन्य ऐप्स के ऊपर दिखाएं' (Display over other apps) की अनुमति आवश्यक है।",
          [
            { text: t("cancelBtn"), style: "cancel" },
            {
              text: appLanguage === "en" ? "Open Settings" : "सेटिंग्स खोलें",
              onPress: () => {
                FloatingBeadService.requestPermission();
              }
            }
          ]
        );
        return;
      }
      FloatingBeadService.showFloatingBead(
        currentCountRef.current,
        selectedMalaRef.current || "rudraksha"
      );
      Alert.alert(
        appLanguage === "en" ? "Floating Bead Activated" : "फ्लोटिंग मनका सक्रिय",
        appLanguage === "en"
          ? "Floating bead is now active on your screen. You can chant while using other apps!"
          : "फ्लोटिंग मनका आपकी स्क्रीन पर चालू हो गया है! आप कोई भी ऐप चलाते हुए स्क्रीन पर मनका टैप करके जप कर सकते हैं।"
      );
    } else {
      FloatingBeadService.hideFloatingBead();
    }
    setFloatingBeadEnabled(nextVal);
    floatingBeadEnabledRef.current = nextVal;
    AsyncStorage.setItem("JAAP_MALA_FLOATING_BEAD", nextVal ? "true" : "false").catch(() => {});
  };

  // ── SELECT MALA ───────────────────────────────────
  const handleSelectMala = (malaId) => {
    selectedMalaRef.current = malaId;
    setSelectedMala(malaId);
    const data = globalStateRef.current[malaId] || { currentCount: 0, totalMalas: 0, history: {} };
    currentCountRef.current = data.currentCount;
    totalMalasRef.current   = data.totalMalas;
    setCurrentCount(data.currentCount);
    setTotalMalas(data.totalMalas);
    stopSpeechSynthesis();
    stopVoiceRecognition();

    setActiveView("counter");
  };

  // ── INCREMENT ─────────────────────────────────────
  const handleIncrement = (source) => {
    if (!selectedMalaRef.current) return;
    if (source === "touch") {
      if (swipeSoundOnRef.current && isSpeakingRef.current) {
        return; // Ignore swipe until current voice chant completes
      }
      stopVoiceRecognition();
      stopSpeechSynthesis();
      if (swipeSoundOnRef.current) {
        playSwipeChant();
      }
    }

    setPulseKey((p) => p + 1);

    const malaId    = selectedMalaRef.current;
    const prevState = { ...globalStateRef.current };
    const malaState = { ...prevState[malaId] };
    const newCount  = currentCountRef.current + 1;
    malaState.currentCount = newCount;

    const key    = getTodayKey();
    const hist   = { ...malaState.history };
    hist[key]    = (hist[key] || 0) + 1;
    malaState.history = hist;

    let nextCount = newCount, nextTotal = totalMalasRef.current;
    if (newCount >= 108) {
      malaState.totalMalas = totalMalasRef.current + 1;
      malaState.currentCount = 0;
      nextCount = 0; nextTotal = malaState.totalMalas;

      // Pause all chanting
      const wasMicOn = micOnRef.current;
      const wasAutoOn = autoOnRef.current;
      if (wasAutoOn) { autoOnRef.current = false; setAutoOn(false); Speech.stop(); if (autoChantTimerRef.current) { clearTimeout(autoChantTimerRef.current); autoChantTimerRef.current = null; } }
      if (wasMicOn) { micOnRef.current = false; setMicOn(false); if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e){} } }
      Speech.stop();
      isSpeakingRef.current = false;
      setIsChantSpeaking(false);

      setTimeout(() => Alert.alert(t("malaCompleteTitle"), t("malaCompleteMsg"), [
        { text: t("okBtn"), onPress: () => {
          // Resume chanting after OK
          if (wasAutoOn) { autoOnRef.current = true; setAutoOn(true); speakChantLoop(); }
          if (wasMicOn) { micOnRef.current = true; setMicOn(true); startListening(); }
        }}
      ]), 300);
    }

    currentCountRef.current = nextCount;
    totalMalasRef.current   = nextTotal;
    setCurrentCount(nextCount);
    setTotalMalas(nextTotal);

    // ONLY save stats and history if user is logged in
    if (userProfileRef.current && (userProfileRef.current.email || userProfileRef.current.name)) {
      const updated = { ...prevState, [malaId]: malaState };
      globalStateRef.current = updated;
      setGlobalState(updated);
      calculateTodayBeads(updated);
      const userKey = `JAAP_MALA_USER_STATS_${userProfileRef.current.email || userProfileRef.current.name}`;
      AsyncStorage.setItem(userKey, JSON.stringify(updated)).catch(() => {});
    }
  };

  // ── NATIVE VOICE RECOGNITION ──────────────────────
  const startListening = () => {
    if (!micOnRef.current) return;
    lastProcessedLengthRef.current = 0;

    if (!ExpoWebSpeechRecognition) {
      Alert.alert(
        "वॉइस रिकग्निशन अनुपलब्ध",
        "इस डिवाइस या Expo Go ऐप में वॉइस रिकग्निशन उपलब्ध नहीं है। कृपया Standalone APK इंस्टॉल करें।"
      );
      setMicOn(false);
      micOnRef.current = false;
      return;
    }

    if (!recognitionRef.current) {
      const rec = new ExpoWebSpeechRecognition();
      rec.lang = "hi-IN";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        if (!micOnRef.current) return;
        const results = event.results;
        const lastResultIndex = event.resultIndex;
        const fullTranscript = results[lastResultIndex]?.[0]?.transcript || "";

        // Reset index if transcript buffer restarted
        if (fullTranscript.length < lastProcessedLengthRef.current || lastResultIndex === 0) {
          lastProcessedLengthRef.current = 0;
        }

        const newText = fullTranscript.substring(lastProcessedLengthRef.current);

        if (newText && matchesMantra(newText, selectedMalaRef.current, tulsiMantraRef.current, activeMantraKeyRef.current)) {
          let cooldown = 1400;
          const activeKey = activeMantraKeyRef.current;
          if (activeKey === "harekrishna" || (selectedMalaRef.current === "tulsi" && tulsiMantraRef.current === "harekrishna")) {
            cooldown = 4600; // 4.6s Full Maha Mantra chant duration (Hare Krishna... Hare Rama...)
          } else if (activeKey === "siyaram" || (selectedMalaRef.current === "tulsi" && tulsiMantraRef.current === "jaisiyaram")) {
            cooldown = 1600;
          } else if (activeKey === "rudraksha" || selectedMalaRef.current === "rudraksha") {
            cooldown = 2200;
          } else if (activeKey === "vasudev" || selectedMalaRef.current === "chandan") {
            cooldown = 3200;
          } else if (activeKey === "lakshmi" || activeKey === "kamala" || selectedMalaRef.current === "kamalgatta") {
            cooldown = 3000;
          } else if (activeKey === "om" || selectedMalaRef.current === "om") {
            cooldown = 1400;
          }

          const now = Date.now();
          if (now - lastCountTimeRef.current > cooldown) {
            lastCountTimeRef.current = now;
            lastProcessedLengthRef.current = fullTranscript.length;
            handleIncrement("voice");
          }
        }
      };

      rec.onerror = (e) => {
        console.log("Speech recognition error:", e);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          stopVoiceRecognition();
          Alert.alert("माइक्रोफ़ोन अनुमति नहीं मिली", "कृपया सेटिंग्स में जाकर माइक्रोफ़ोन की अनुमति दें।");
        }
      };

      rec.onend = () => {
        if (micOnRef.current) {
          // Restart immediately to keep microphone active
          setTimeout(() => {
            if (micOnRef.current) {
              try {
                if (recognitionRef.current) recognitionRef.current.start();
              } catch (_) {}
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.log("Failed to start speech recognition:", err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
  };

  const requestMicPermission = async () => {
    if (Platform.OS !== "android") return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "माइक्रोफ़ोन अनुमति",
        message: "जाप काउंट करने के लिए माइक्रोफ़ोन की अनुमति चाहिए।",
        buttonPositive: "Allow",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const toggleMicExclusively = async () => {
    if (!ExpoWebSpeechRecognition) {
      Alert.alert(
        "वॉइस रिकग्निशन अनुपलब्ध",
        "इस डिवाइस या Expo Go ऐप में वॉइस रिकग्निशन सपोर्टेड नहीं है। कृपया Standalone APK इंस्टॉल करें या टच/ऑटो-जाप का उपयोग करें।"
      );
      return;
    }

    if (micOnRef.current) {
      micOnRef.current = false;
      setMicOn(false);
      stopListening();
    } else {
      const ok = await requestMicPermission();
      if (!ok) {
        Alert.alert("अनुमति नहीं मिली", "Settings > Apps > Expo Go > Permissions > Microphone में ON करें।");
        return;
      }

      const startVoiceChant = () => {
        if (autoOnRef.current) stopSpeechSynthesis();
        micOnRef.current = true;
        setMicOn(true);
        lastCountTimeRef.current = 0;
        startListening();
      };

      if (selectedMalaRef.current === "tulsi") {
        Alert.alert("तुलसी माला जाप", "कृपया अपना प्रिय महामंत्र चुनें:", [
          { text: "जय सियाराम",       onPress: () => { tulsiMantraRef.current = "jaisiyaram";  setTulsiMantra("jaisiyaram");  startVoiceChant(); } },
          { text: "हरे कृष्ण हरे राम", onPress: () => { tulsiMantraRef.current = "harekrishna"; setTulsiMantra("harekrishna"); startVoiceChant(); } },
        ], { cancelable: false });
      } else {
        startVoiceChant();
      }
    }
  };

  const stopVoiceRecognition = () => {
    micOnRef.current = false;
    setMicOn(false);
    stopListening();
  };

  // ── AUTO CHANT ────────────────────────────────────
    // Keep phone screen awake continuously during Auto Chant or Voice Chant
  useEffect(() => {
    if (autoOn || micOn) {
      try {
        if (KeepAwake.activateKeepAwakeAsync) KeepAwake.activateKeepAwakeAsync().catch(() => {});
        else if (KeepAwake.activateKeepAwake) KeepAwake.activateKeepAwake();
      } catch (e) {}
    } else {
      try {
        if (KeepAwake.deactivateKeepAwakeAsync) KeepAwake.deactivateKeepAwakeAsync().catch(() => {});
        else if (KeepAwake.deactivateKeepAwake) KeepAwake.deactivateKeepAwake();
      } catch (e) {}
    }
    return () => {
      try {
        if (KeepAwake.deactivateKeepAwakeAsync) KeepAwake.deactivateKeepAwakeAsync().catch(() => {});
        else if (KeepAwake.deactivateKeepAwake) KeepAwake.deactivateKeepAwake();
      } catch (e) {}
    };
  }, [autoOn, micOn]);

  const toggleAutoExclusively = () => {
    if (autoOnRef.current) { stopSpeechSynthesis(); }
    else {
      const startAutoChant = () => {
        if (micOnRef.current) stopVoiceRecognition();
        autoOnRef.current = true;
        setAutoOn(true);
        speakChantLoop();
      };

      if (selectedMalaRef.current === "tulsi") {
        Alert.alert("तुलसी माला जाप", "कृपया अपना प्रिय महामंत्र चुनें:", [
          { text: "जय सियाराम",       onPress: () => { tulsiMantraRef.current = "jaisiyaram";  setTulsiMantra("jaisiyaram");  startAutoChant(); } },
          { text: "हरे कृष्ण हरे राम", onPress: () => { tulsiMantraRef.current = "harekrishna"; setTulsiMantra("harekrishna"); startAutoChant(); } },
        ], { cancelable: false });
      } else {
        startAutoChant();
      }
    }
  };

  const stopSpeechSynthesis = () => {
    autoOnRef.current = false; setAutoOn(false); Speech.stop();
    isSpeakingRef.current = false; setIsChantSpeaking(false);
    if (autoChantTimerRef.current) { clearTimeout(autoChantTimerRef.current); autoChantTimerRef.current = null; }
  };

  const speakChantLoop = () => {
    if (!autoOnRef.current) return;
    const mala = selectedMalaRef.current;
    const { text, rate, gap, lang } = getActiveMantraTextAndSettings(
      mala,
      tulsiMantraRef.current,
      activeMantraKeyRef.current
    );
    const omPitchAuto = 1.0;
    Speech.speak(text, {
      language: lang, rate, pitch: omPitchAuto,
      onStart: () => { handleIncrement("auto"); },
      onDone:  () => { if (autoOnRef.current) autoChantTimerRef.current = setTimeout(speakChantLoop, gap); },
      onError: () => { stopSpeechSynthesis(); },
    });
  };

  // ── RESET HANDLERS (Only resets current screen counter, never touches permanent stats) ──
  const handleResetSession = () => Alert.alert(
    appLanguage === "en" ? "Reset Current Beads" : "वर्तमान मनके रीसेट करें",
    appLanguage === "en"
      ? "Reset current bead count to 0? Your saved stats and history will remain safe."
      : "क्या आप चालू मनके का काउंट 0 करना चाहते हैं? आपका पिछला रिकॉर्ड व सांख्यिकी (Stats) पूरी तरह सुरक्षित रहेगी।",
    [
      { text: t("cancelBtn"), style: "cancel" },
      { 
        text: appLanguage === "en" ? "Reset" : "रीसेट करें", 
        onPress: () => {
          currentCountRef.current = 0; 
          setCurrentCount(0);
        }
      },
    ]
  );

  const handleResetAll = () => Alert.alert(
    appLanguage === "en" ? "Clear Current Counter" : "वर्तमान काउंटर शून्य करें",
    appLanguage === "en" 
      ? "This will reset your current screen count to 0. Your permanent sadhana record and stats will NOT be cleared."
      : "यह आपके चालू स्क्रीन के मनके काउंटर को 0 कर देगा। आपका स्थायी साधना रिकॉर्ड और इतिहास (Stats) सुरक्षित रहेगा।",
    [
      { text: t("cancelBtn"), style: "cancel" },
      { 
        text: appLanguage === "en" ? "Clear Counter" : "शून्य करें", 
        style: "destructive", 
        onPress: () => {
          currentCountRef.current = 0;
          setCurrentCount(0);
        }
      },
    ]
  );

  useEffect(() => () => { stopSpeechSynthesis(); stopVoiceRecognition(); }, []);

  // ── RENDER ────────────────────────────────────────
  const todayMalaBeads = (selectedMala && globalState[selectedMala]?.history?.[getTodayKey()]) || 0;
  if (activeView === "splash") return <SplashScreen onFinish={() => setActiveView("counter")} />;
  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#E5C158" /></View>;

  return (
    <View style={styles.webWrapper}>
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E05E26" />

      <View style={styles.counterContainer}>
        {/* Saffron Header */}
        <View style={styles.saffronHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={openDrawer}
              style={styles.headerIconBtn}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerCenterLogo}>
              <View style={styles.headerLogoCircleBtn}>
                <Image
                  source={require("./assets/app_logo_transparent.png")}
                  style={styles.headerAppLogoImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.headerIconBtn}>
              <Text style={styles.swastikaText}>卐</Text>
            </View>
          </View>

          {/* Active Logged-In User Name Badge */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              if (!userProfile) setShowLoginModal(true);
            }}
            style={styles.headerUserProfilePill}
          >
            <Ionicons name={userProfile ? "person-circle" : "person-circle-outline"} size={16} color="#FFE0B2" style={{ marginRight: 6 }} />
            <Text style={styles.headerUserProfileText} numberOfLines={1}>
              {userProfile 
                ? `${appLanguage === "en" ? "Sadhak" : "साधक"}: ${userProfile.name}`
                : (appLanguage === "en" ? "Guest Sadhak (Tap to Sign In)" : "अतिथि साधक (लॉगिन करें)")
              }
            </Text>
          </TouchableOpacity>

            <View style={styles.mantraTitleRow}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setShowMantraModal(true)}
                style={styles.headerMantraPickerBtn}
              >
                <Ionicons name="journal" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.headerMantraPickerText} numberOfLines={1}>
                  {activeMantraKey !== "default"
                    ? (ALL_MANTRAS_LIST.find(m => m.id === activeMantraKey)?.label.split(" (")[0] || customMantraText || MANTRA_LABELS[selectedMala])
                    : (selectedMala === "tulsi" 
                      ? (tulsiMantra === "jaisiyaram" ? TRANSLATIONS[appLanguage].mantraLabels.tulsiJaisiyaram : TRANSLATIONS[appLanguage].mantraLabels.tulsiHarekrishna)
                      : (TRANSLATIONS[appLanguage].mantraLabels[selectedMala] || MANTRA_LABELS[selectedMala]))}
                </Text>
                <Ionicons name="chevron-down" size={15} color="#FFFFFF" style={{ marginLeft: 4, opacity: 0.9 }} />
              </TouchableOpacity>

              <Animated.View style={{ transform: [{ scale: switcherScale }] }}>
                <TouchableOpacity 
                  activeOpacity={0.9}
                  onPressIn={handlePressInSwitcher}
                  onPressOut={handlePressOutSwitcher}
                  onPress={openSwitcherModal}
                  style={styles.headerMalaSwitcherBtn}
                >
                  <Image
                    source={BEAD_THUMBS[selectedMala] || BEAD_THUMBS.om}
                    style={styles.headerMalaSwitcherThumb}
                  />
                  <Text style={styles.headerMalaSwitcherText}>
                    {(appLanguage === "en" ? MALA_OPTIONS.find((o) => o.id === selectedMala)?.nameEn : MALA_OPTIONS.find((o) => o.id === selectedMala)?.nameHi)} ▾
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Cream Body */}
          <View style={styles.creamBody}>
            <DeityWatermark selectedMala={selectedMala} />
            <View style={styles.dashboardRow}>
              {/* Left Column */}
              <View style={styles.leftColumn}>
                {/* Badge Row */}
                <View style={styles.badgeRow}>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>⚙️ 108</Text>
                  </View>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{totalMalas} {t("malaUnit")}</Text>
                  </View>
                </View>

                {/* Row for Counter and Chant Player Card */}
                <View style={styles.sideBySideRow}>
                  {/* Count Display Card */}
                  <View style={styles.countCard}>
                    <Text style={[styles.countCardNumber, currentCount >= 100 && { fontSize: 36 }]}>
                      {currentCount}
                    </Text>
                  </View>

                   {/* Daily Mala Card */}
                   <View style={styles.dailyMalaCard}>
                     <Text style={styles.dailyMalaLabel}>{t("todayMalaLabel")}</Text>
                     <Text style={styles.dailyMalaNumber}>
                       {Math.floor(todayMalaBeads / 108)}
                     </Text>
                     <Text style={styles.dailyMalaProgress}>
                       +{todayMalaBeads % 108} {t("beadsLabel")}
                     </Text>
                   </View>
                </View>

                {/* Controls Component */}
                <Controls
                  micOn={micOn}   micState={micOn ? (autoOn ? "idle" : "listening") : "idle"} toggleMic={toggleMicExclusively}
                  autoOn={autoOn} toggleAuto={toggleAutoExclusively}
                  swipeSoundOn={swipeSoundOn} toggleSwipeSound={toggleSwipeSoundExclusively}
                  onResetSession={handleResetSession}
                  onResetAll={handleResetAll}
                  selectedMala={selectedMala}
                  appLanguage={appLanguage}
                />

                {/* 3D Animated Burning Diya and Side Lotus Flowers */}
                <View style={styles.bottomDecoration}>
                  <Text style={{ fontSize: 22, marginRight: 14 }}>🌸</Text>
                  <Image
                    source={require("./assets/diya_animated.gif")}
                    style={{
                      width: 66,
                      height: 66,
                      resizeMode: "contain",
                      shadowColor: "#FF9900",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.9,
                      shadowRadius: 10,
                    }}
                  />
                  <Text style={{ fontSize: 22, marginLeft: 14 }}>🌸</Text>
                </View>
              </View>

              {/* Right Column (Swipeable Mala Arc) */}
              <View style={styles.rightColumn}>
                <MalaSwipe
                  currentCount={currentCount}
                  onSwipeIncrement={handleIncrement}
                  selectedMala={selectedMala}
                  isSpeaking={isChantSpeaking}
                />
              </View>
            </View>



            {/* Quick Switcher Full Page Modal */}
            <Modal
              visible={showSwitcher}
              animationType="slide"
              onRequestClose={closeSwitcherModal}
            >
              <View style={styles.fullPageContainer}>
                <LinearGradient colors={["#E05E26", "#B5491F"]} style={styles.fullPageHeader}>
                  <TouchableOpacity onPress={closeSwitcherModal} style={styles.fullPageBackBtn}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.fullPageTitle}>{t("selectMalaTitle")}</Text>
                  <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.fullPageBody} contentContainerStyle={styles.modalList}>
                  {MALA_OPTIONS.map((opt) => {
                    const isSelected = opt.id === selectedMala;
                    const currentBead = globalStateRef.current[opt.id]?.currentCount || 0;
                    
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          handleSelectMala(opt.id);
                          closeSwitcherModal();
                        }}
                        style={[
                          styles.modalItem,
                          isSelected && styles.modalItemActive
                        ]}
                      >
                        <Image source={BEAD_THUMBS[opt.id]} style={styles.modalItemThumb} />
                        <View style={styles.modalItemInfo}>
                          <Text style={styles.modalItemName}>{appLanguage === "en" ? opt.nameEn : opt.nameHi}</Text>
                          <Text style={styles.modalItemSub}>{opt.nameEn} • {opt.tagline}</Text>
                        </View>
                        <View style={styles.modalItemRight}>
                          <Text style={styles.modalItemBeads}>{currentBead}/108</Text>
                          {isSelected && <Text style={styles.modalCheckmark}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </Modal>

            {/* Full Screen Clean Stats Page Modal */}
            <Modal
              visible={showStatsModal}
              animationType="slide"
              onRequestClose={() => setShowStatsModal(false)}
            >
              <View style={styles.fullPageContainer}>
                <LinearGradient colors={["#E05E26", "#B5491F"]} style={styles.fullPageHeader}>
                  <TouchableOpacity onPress={() => setShowStatsModal(false)} style={styles.fullPageBackBtn}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.fullPageTitle}>
                    {appLanguage === "en" ? "Sadhana Record" : "साधना रिकॉर्ड"}
                  </Text>
                  <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.fullPageBody} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                  {/* Sadhak Profile Badge if logged in */}
                  {userProfile ? (
                    <View style={styles.statsProfileActiveCard}>
                      <View style={styles.statsProfileAvatarCircle}>
                        {userProfile.photo ? (
                          <Image source={{ uri: userProfile.photo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                        ) : (
                          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#E05E26" }}>
                            {userProfile.name ? userProfile.name[0].toUpperCase() : "👤"}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.statsProfileName} numberOfLines={1}>
                          {appLanguage === "en" ? `Sadhak: ${userProfile.name}` : `साधक: ${userProfile.name}`}
                        </Text>
                        <Text style={styles.statsProfileSub}>
                          {appLanguage === "en" ? "Cloud Sync Active • All data saved" : "क्लाउड सिंक चालू • सभी रिकॉर्ड सुरक्षित"}
                        </Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                    </View>
                  ) : (
                    /* Guest Lock Warning Card when NOT logged in */
                    <View style={styles.statsGuestLockCard}>
                      <View style={styles.statsGuestLockIconCircle}>
                        <Ionicons name="lock-closed" size={22} color="#E05E26" />
                      </View>
                      <Text style={styles.statsGuestLockTitle}>
                        {appLanguage === "en" ? "Sign in to save sadhana stats" : "साधना रिकॉर्ड सुरक्षित करने के लिए लॉगिन करें"}
                      </Text>
                      <Text style={styles.statsGuestLockSub}>
                        {appLanguage === "en" 
                          ? "Chanting data is only saved when you are signed in. Log in to keep a permanent history of your malas and daily beads."
                          : "बिना लॉगिन किए किया गया जाप रिकॉर्ड में सेव नहीं होता है। अपने सभी जाप और माला का रिकॉर्ड सुरक्षित रखने के लिए कृपया Google से लॉगिन करें।"}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.statsGuestLoginBtn}
                        onPress={() => {
                          setShowStatsModal(false);
                          setTimeout(() => setShowLoginModal(true), 280);
                        }}
                      >
                        <Ionicons name="logo-google" size={17} color="#4285F4" style={{ marginRight: 8 }} />
                        <Text style={styles.statsGuestLoginBtnText}>
                          {appLanguage === "en" ? "Sign In with Google" : "Google से लॉगिन करें"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Top 2 Clean Stat Cards */}
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
                    <View style={styles.cleanStatCard}>
                      <Text style={styles.cleanStatNumber}>
                        {userProfile 
                          ? Object.values(globalState).reduce((acc, m) => acc + (m.currentCount || 0) + ((m.totalMalas || 0) * 108), 0)
                          : 0}
                      </Text>
                      <Text style={styles.cleanStatLabel}>
                        {appLanguage === "en" ? "Total Beads" : "कुल मनके जाप"}
                      </Text>
                    </View>

                    <View style={styles.cleanStatCardOrange}>
                      <Text style={styles.cleanStatNumberOrange}>
                        {userProfile 
                          ? Object.values(globalState).reduce((acc, m) => acc + (m.totalMalas || 0), 0)
                          : 0}
                      </Text>
                      <Text style={styles.cleanStatLabelOrange}>
                        {appLanguage === "en" ? "Total Malas" : "कुल पूर्ण मालाएँ"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cleanSectionTitle}>
                    {appLanguage === "en" ? "Mala Wise Details" : "माला अनुसार विवरण"}
                  </Text>

                  {/* Clean List Cards */}
                  {MALA_OPTIONS.map((opt) => {
                    const mData = userProfile ? (globalState[opt.id] || { currentCount: 0, totalMalas: 0 }) : { currentCount: 0, totalMalas: 0 };
                    const malaTotalBeads = userProfile ? ((mData.currentCount || 0) + ((mData.totalMalas || 0) * 108)) : 0;

                    return (
                      <View key={opt.id} style={styles.cleanMalaRow}>
                        <Image source={BEAD_THUMBS[opt.id]} style={styles.cleanMalaIcon} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cleanMalaName}>
                            {appLanguage === "en" ? opt.nameEn : opt.nameHi}
                          </Text>
                          <Text style={styles.cleanMalaBeadsSub}>
                            {userProfile 
                              ? (appLanguage === "en" ? `Total: ${malaTotalBeads} Beads` : `कुल: ${malaTotalBeads} मनके`)
                              : (appLanguage === "en" ? "0 Beads • Login required" : "0 मनके • लॉगिन आवश्यक")}
                          </Text>
                        </View>
                        <View style={styles.cleanMalaBadge}>
                          <Text style={styles.cleanMalaBadgeText}>
                            {userProfile ? `${mData.totalMalas || 0} ${appLanguage === "en" ? "Mala" : "माला"}` : (appLanguage === "en" ? "0 Mala" : "0 माला")}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </Modal>

            {/* Bottom Nav Bar */}
            <View style={styles.bottomNavBar}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openSwitcherModal}
                style={styles.navItem}
                hitSlop={{ top: 15, bottom: 15, left: 30, right: 30 }}
              >
                <Text style={styles.navIcon}>📿</Text>
                <Text style={styles.navText}>Mala</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowStatsModal(true)}
                style={styles.navItem}
                hitSlop={{ top: 15, bottom: 15, left: 30, right: 30 }}
              >
                <Text style={styles.navIcon}>📊</Text>
                <Text style={styles.navText}>{t("navStats")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        
            
            

        {/* Full Screen Login & Authentication Page Modal */}
        <Modal
          visible={showLoginModal}
          animationType="slide"
          onRequestClose={() => setShowLoginModal(false)}
        >
          <View style={styles.fullPageContainer}>
            <LinearGradient colors={["#E05E26", "#B5491F"]} style={styles.fullPageHeader}>
              <TouchableOpacity onPress={() => setShowLoginModal(false)} style={styles.fullPageBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.fullPageTitle}>
                {appLanguage === "en" ? "Sadhak Login" : "साधक लॉगिन"}
              </Text>
              <View style={{ width: 36 }} />
            </LinearGradient>

            <ScrollView style={styles.fullPageBody} contentContainerStyle={{ padding: 20, paddingTop: 28, alignItems: "center" }}>
              {/* Login Card Container */}
              <View style={styles.loginFormCard}>
                <View style={styles.loginAvatarCircle}>
                  <Image source={require("./assets/app_logo.png")} style={{ width: 64, height: 64 }} resizeMode="contain" />
                </View>

                <Text style={styles.loginTitleText}>
                  {appLanguage === "en" ? "Nityam Jap Sadhana" : "नित्यम जप साधना"}
                </Text>
                <Text style={styles.loginSubText}>
                  {appLanguage === "en" 
                    ? "Sign in with Google to securely save your daily chanting stats and mala history."
                    : "अपने सभी दैनिक जाप रिकॉर्ड, कुल माला संख्या और साधना इतिहास को सुरक्षित रखने के लिए Google से लॉगिन करें।"}
                </Text>

                {/* Prominent Google Sign-In Button */}
                <View style={{ width: "100%", marginVertical: 8 }}>
                  <GoogleLoginButton
                    forceButton={true}
                    buttonStyle={{
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1.5,
                      borderColor: "#4285F4",
                      paddingVertical: 13,
                      borderRadius: 24,
                      elevation: 3,
                    }}
                    onLoginSuccess={({ user }) => {
                      const name = user.name || user.email?.split("@")[0] || "Sadhak";
                      const userObj = {
                        name: name,
                        email: user.email,
                        photo: user.photo,
                        provider: "google",
                      };
                      updateProfile(userObj);
                      setShowLoginModal(false);
                      Alert.alert(
                        appLanguage === "en" ? "Signed In Successfully" : "✅ सफलतापूर्वक लॉगिन हुआ",
                        `${appLanguage === "en" ? "Welcome back" : "साधना में स्वागत है"}, ${name}!`
                      );
                    }}
                  />
                </View>

                {/* Spiritual Features & Benefits Card */}
                <View style={styles.loginBenefitsCard}>
                  <Text style={styles.loginBenefitsHeading}>
                    {appLanguage === "en" ? "Why Sign In?" : "लॉगिन करने के लाभ:"}
                  </Text>
                  
                  <View style={styles.loginBenefitRow}>
                    <Ionicons name="shield-checkmark" size={18} color="#E05E26" style={{ marginRight: 10 }} />
                    <Text style={styles.loginBenefitText}>
                      {appLanguage === "en" ? "Daily chanting & mala history backup" : "दैनिक जाप व कुल माला इतिहास सुरक्षित रहता है"}
                    </Text>
                  </View>

                  <View style={styles.loginBenefitRow}>
                    <Ionicons name="cloud-done" size={18} color="#E05E26" style={{ marginRight: 10 }} />
                    <Text style={styles.loginBenefitText}>
                      {appLanguage === "en" ? "Auto-sync across devices & reinstalls" : "फोन बदलने या ऐप री-इंस्टॉल करने पर रिकॉर्ड नहीं खोता"}
                    </Text>
                  </View>

                  <View style={styles.loginBenefitRow}>
                    <Ionicons name="flash" size={18} color="#E05E26" style={{ marginRight: 10 }} />
                    <Text style={styles.loginBenefitText}>
                      {appLanguage === "en" ? "100% Safe & 1-Tap Official Google Login" : "100% सुरक्षित एवं 1-टैप में आसान Google लॉगिन"}
                    </Text>
                  </View>
                </View>

                {/* Skip / Continue as Guest */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowLoginModal(false)}
                  style={styles.loginSkipBtn}
                >
                  <Text style={styles.loginSkipBtnText}>
                    {appLanguage === "en" ? "Continue as Guest (Skip for now)" : "बाद में करें (साधना जारी रखें)"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ── SIDEBAR DRAWER ────────────────────────────── */}
        <Modal
          visible={showDrawer}
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
        >
          <TouchableOpacity activeOpacity={1} onPress={closeDrawer} style={styles.drawerOverlay}>
            <Animated.View 
              style={[
                styles.drawerContainer,
                { transform: [{ translateX: drawerAnim }] }
              ]}
            >
              <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
                {/* Drawer Header with Profile Card OR Login Button */}
                <LinearGradient colors={["#E05E26", "#B5491F"]} style={styles.drawerHeader}>
                  <View style={styles.drawerUserRow}>
                    <View style={styles.drawerAvatarCircle}>
                      {userProfile && userProfile.photo ? (
                        <Image source={{ uri: userProfile.photo }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                      ) : (
                        <Image source={require("./assets/app_logo.png")} style={{ width: 30, height: 30 }} resizeMode="contain" />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.drawerUserName} numberOfLines={1}>
                        {userProfile ? userProfile.name : (appLanguage === "en" ? "Nityam Jap Sadhana" : "नित्यम जप साधना")}
                      </Text>
                      <Text style={styles.drawerUserEmail} numberOfLines={1}>
                        {userProfile ? userProfile.email : (appLanguage === "en" ? "Spiritual Focus & Calm" : "अध्यात्म एवं आत्मशांति")}
                      </Text>
                    </View>
                  </View>

                  {/* Header Actions: If Logged in -> Sign Out Button; If Not Logged In -> Login Button */}
                  <View style={{ marginTop: 12 }}>
                    {userProfile ? (
                      <TouchableOpacity
                        style={styles.drawerHeaderLogoutBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          handleLogout();
                        }}
                      >
                        <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.drawerHeaderLogoutBtnText}>
                          {appLanguage === "en" ? "Sign Out" : "लॉगआउट"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.drawerHeaderLoginBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          closeDrawer();
                          setTimeout(() => setShowLoginModal(true), 280);
                        }}
                      >
                        <Ionicons name="log-in-outline" size={19} color="#E05E26" style={{ marginRight: 8 }} />
                        <Text style={styles.drawerHeaderLoginBtnText}>
                          {appLanguage === "en" ? "Login / Sign In" : "लॉगिन करें (Login)"}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#E05E26" style={{ marginLeft: "auto" }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>

                {/* Drawer Menu Options List */}
                <ScrollView style={styles.drawerList}>

                  {/* 1. Floating Bead Overlay */}
                  <View style={styles.drawerItemRow}>
                    <View style={[styles.drawerItemLeft, { flex: 1, paddingRight: 8 }]}>
                      <Ionicons name="disc" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.drawerItemText}>{t("floatingBeadLabel")}</Text>
                        <Text style={styles.drawerSubDesc}>{t("floatingBeadSub")}</Text>
                      </View>
                    </View>
                    <Switch
                      value={floatingBeadEnabled}
                      onValueChange={handleToggleFloatingBead}
                      trackColor={{ false: "#E2E8F0", true: "#FFCC80" }}
                      thumbColor={floatingBeadEnabled ? "#E05E26" : "#FFFFFF"}
                    />
                  </View>

                  {/* 2. Language */}
                  <TouchableOpacity style={styles.drawerItemRow} onPress={handleLanguageChange}>
                    <View style={styles.drawerItemLeft}>
                      <Ionicons name="language-outline" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <Text style={styles.drawerItemText}>{t("languageLabel")}</Text>
                    </View>
                    <Text style={styles.drawerSubText}>{appLanguage === "hi" ? "हिंदी" : "English"}</Text>
                  </TouchableOpacity>

                  {/* 3. Rate Us */}
                  <TouchableOpacity style={styles.drawerItemRow} onPress={handleRateUs}>
                    <View style={styles.drawerItemLeft}>
                      <Ionicons name="star-outline" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <Text style={styles.drawerItemText}>{t("rateUsLabel")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  {/* 4. Share App */}
                  <TouchableOpacity style={styles.drawerItemRow} onPress={handleShareApp}>
                    <View style={styles.drawerItemLeft}>
                      <Ionicons name="share-social-outline" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <Text style={styles.drawerItemText}>{t("shareAppLabel")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  <View style={styles.drawerDivider} />

                  {/* 5. Contact Us */}
                  <TouchableOpacity style={styles.drawerItemRow} onPress={() => { closeDrawer(); setActiveModalContent("contact"); }}>
                    <View style={styles.drawerItemLeft}>
                      <Ionicons name="mail-outline" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <Text style={styles.drawerItemText}>{t("contactUsLabel")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  {/* 6. Privacy & Policy */}
                  <TouchableOpacity style={styles.drawerItemRow} onPress={() => { closeDrawer(); setActiveModalContent("privacy"); }}>
                    <View style={styles.drawerItemLeft}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <Text style={styles.drawerItemText}>{t("privacyPolicyLabel")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  {/* 7. About Us */}
                  <TouchableOpacity style={styles.drawerItemRow} onPress={() => { closeDrawer(); setActiveModalContent("about"); }}>
                    <View style={styles.drawerItemLeft}>
                      <Ionicons name="information-circle-outline" size={20} color="#E05E26" style={styles.drawerIcon} />
                      <Text style={styles.drawerItemText}>{t("aboutUsLabel")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                  </TouchableOpacity>

                  <View style={styles.drawerFooterInfo}>
                    <Text style={styles.drawerVersionText}>{t("versionLabel")}</Text>
                    <Text style={styles.drawerBlessingText}>{t("blessingText")}</Text>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* ── ABOUT / PRIVACY / CONTACT FULL PAGE MODAL ─────────────────── */}
        <Modal
          visible={!!activeModalContent}
          animationType="slide"
          onRequestClose={() => setActiveModalContent(null)}
        >
          <View style={styles.fullPageContainer}>
            <LinearGradient colors={["#E05E26", "#B5491F"]} style={styles.fullPageHeader}>
              <TouchableOpacity onPress={() => setActiveModalContent(null)} style={styles.fullPageBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.fullPageTitle}>
                {activeModalContent === "about" && getModalText("aboutModal", "title")}
                {activeModalContent === "privacy" && getModalText("privacyModal", "title")}
                {activeModalContent === "contact" && getModalText("contactModal", "title")}
              </Text>
              <View style={{ width: 36 }} />
            </LinearGradient>

            <ScrollView style={styles.fullPageBody} contentContainerStyle={{ padding: 20 }}>
              {activeModalContent === "about" && (
                <View style={styles.fullPageCard}>
                  {/* Top Branding Section */}
                  <View style={{ alignItems: "center", marginBottom: 20 }}>
                    <View style={styles.aboutLogoRing}>
                      <Image source={require("./assets/app_logo.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.aboutAppName}>{getModalText("aboutModal", "appName")}</Text>
                    <Text style={styles.aboutTagline}>{getModalText("aboutModal", "tagline")}</Text>
                    <View style={styles.aboutVersionBadge}>
                      <Text style={styles.aboutVersionBadgeText}>{getModalText("aboutModal", "version")}</Text>
                    </View>
                  </View>

                  {/* Mission Section */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("aboutModal", "missionTitle")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("aboutModal", "missionBody")}</Text>
                  </View>

                  {/* Highlights Section */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("aboutModal", "featuresTitle")}</Text>
                    <Text style={[styles.infoModalBody, { marginBottom: 6 }]}>{getModalText("aboutModal", "feat1")}</Text>
                    <Text style={[styles.infoModalBody, { marginBottom: 6 }]}>{getModalText("aboutModal", "feat2")}</Text>
                    <Text style={[styles.infoModalBody, { marginBottom: 6 }]}>{getModalText("aboutModal", "feat3")}</Text>
                    <Text style={[styles.infoModalBody, { marginBottom: 6 }]}>{getModalText("aboutModal", "feat4")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("aboutModal", "feat5")}</Text>
                  </View>

                  {/* Developer & Company Info */}
                  <View style={[styles.policySection, { backgroundColor: "#FFF8F0", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#FFE0B2" }]}>
                    <Text style={[styles.policySecTitle, { color: "#D84315", marginBottom: 8 }]}>
                      {getModalText("aboutModal", "developerTitle")}
                    </Text>
                    
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Ionicons name="business" size={16} color="#E05E26" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3E2723" }}>
                        {getModalText("aboutModal", "companyName")}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL("mailto:verdureinfotech@gmail.com")}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
                    >
                      <Ionicons name="mail" size={16} color="#1A73E8" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 13, color: "#1A73E8", fontWeight: "600" }}>
                        {getModalText("aboutModal", "contactEmail")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL("tel:+917851035142")}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
                    >
                      <Ionicons name="call" size={16} color="#2E7D32" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 13, color: "#2E7D32", fontWeight: "600" }}>
                        {getModalText("aboutModal", "contactPhone")}
                      </Text>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 12, color: "#795548", fontStyle: "italic" }}>
                      {getModalText("aboutModal", "madeIn")}
                    </Text>
                  </View>

                  {/* Blessing Shloka */}
                  <View style={{ alignItems: "center", marginTop: 16, padding: 12, backgroundColor: "#FFF3E0", borderRadius: 12 }}>
                    <Text style={{ fontSize: 13, color: "#B5491F", textAlign: "center", fontWeight: "bold", lineHeight: 20 }}>
                      {getModalText("aboutModal", "shloka")}
                    </Text>
                  </View>
                </View>
              )}

              {activeModalContent === "privacy" && (
                <View style={styles.fullPageCard}>
                  <Text style={styles.infoModalHeading}>{getModalText("privacyModal", "heading")}</Text>
                  <Text style={[styles.infoModalSub, { marginBottom: 16, color: "#8D6E63" }]}>
                    {getModalText("privacyModal", "lastUpdated")}
                  </Text>

                  {/* Section 1 */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("privacyModal", "sec1Title")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("privacyModal", "sec1Body")}</Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("privacyModal", "sec2Title")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("privacyModal", "sec2Body")}</Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("privacyModal", "sec3Title")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("privacyModal", "sec3Body")}</Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("privacyModal", "sec4Title")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("privacyModal", "sec4Body")}</Text>
                  </View>

                  {/* Section 5 - Terms & Conditions */}
                  <View style={[styles.policySection, { backgroundColor: "#FFF8F0", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FFE0B2" }]}>
                    <Text style={[styles.policySecTitle, { color: "#D84315" }]}>{getModalText("privacyModal", "sec5Title")}</Text>
                    <Text style={[styles.infoModalBody, { color: "#4E342E" }]}>{getModalText("privacyModal", "sec5Body")}</Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.policySection}>
                    <Text style={styles.policySecTitle}>{getModalText("privacyModal", "sec6Title")}</Text>
                    <Text style={styles.infoModalBody}>{getModalText("privacyModal", "sec6Body")}</Text>
                  </View>
                </View>
              )}

              {activeModalContent === "contact" && (
                <View style={styles.fullPageCard}>
                  <Text style={styles.infoModalHeading}>{getModalText("contactModal", "heading")}</Text>
                  <Text style={styles.infoModalBody}>
                    {getModalText("contactModal", "intro")}
                  </Text>

                  {/* Direct Phone / Call */}
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL("tel:+917851035142")}
                    style={[styles.contactItemRow, { marginTop: 16 }]}
                  >
                    <Ionicons name="call" size={18} color="#E05E26" style={{ marginRight: 8 }} />
                    <Text style={styles.contactLabel}>{getModalText("contactModal", "phoneLabel")}</Text>
                    <Text style={[styles.contactValue, { color: "#E05E26", fontWeight: "bold" }]}>+91 78510 35142</Text>
                  </TouchableOpacity>

                  {/* Direct WhatsApp */}
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL("https://wa.me/917851035142?text=Radhe%20Radhe%20-%20Nityam%20Jap%20Support")}
                    style={styles.contactItemRow}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={{ marginRight: 8 }} />
                    <Text style={styles.contactLabel}>{getModalText("contactModal", "whatsappLabel")}</Text>
                    <Text style={[styles.contactValue, { color: "#2E7D32", fontWeight: "bold" }]}>+91 78510 35142</Text>
                  </TouchableOpacity>

                  {/* Email Support */}
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL("mailto:verdureinfotech@gmail.com")}
                    style={styles.contactItemRow}
                  >
                    <Ionicons name="mail" size={18} color="#E05E26" style={{ marginRight: 8 }} />
                    <Text style={styles.contactLabel}>{getModalText("contactModal", "emailLabel")}</Text>
                    <Text style={[styles.contactValue, { color: "#1A73E8", fontWeight: "600" }]}>verdureinfotech@gmail.com</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* ── LANGUAGE SELECTION FULL PAGE MODAL ─────────────────────────── */}
        <Modal
          visible={showLanguageModal}
          animationType="slide"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.fullPageContainer}>
            <LinearGradient colors={["#E05E26", "#B5491F"]} style={styles.fullPageHeader}>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.fullPageBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.fullPageTitle}>{t("selectLanguageTitle")}</Text>
              <View style={{ width: 36 }} />
            </LinearGradient>

            <ScrollView style={styles.fullPageBody} contentContainerStyle={{ padding: 20 }}>
              {/* Hindi Option Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectLanguage("hi")}
                style={[
                  styles.langCard,
                  appLanguage === "hi" && styles.langCardActive
                ]}
              >
                <View style={styles.langCardLeft}>
                  <View style={styles.langCodeBadge}>
                    <Text style={styles.langCodeText}>IN</Text>
                  </View>
                  <View>
                    <Text style={styles.langTitle}>हिंदी (Hindi)</Text>
                    <Text style={styles.langSub}>ऐप की भाषा हिंदी में रखें</Text>
                  </View>
                </View>
                {appLanguage === "hi" && (
                  <View style={styles.langCheckBadge}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* English Option Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectLanguage("en")}
                style={[
                  styles.langCard,
                  appLanguage === "en" && styles.langCardActive
                ]}
              >
                <View style={styles.langCardLeft}>
                  <View style={styles.langCodeBadge}>
                    <Text style={styles.langCodeText}>EN</Text>
                  </View>
                  <View>
                    <Text style={styles.langTitle}>English</Text>
                    <Text style={styles.langSub}>Set app language to English</Text>
                  </View>
                </View>
                {appLanguage === "en" && (
                  <View style={styles.langCheckBadge}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      
      {/* Floating Bead Widget Overlay (Visible ONLY when App is Minimized / Backgrounded) */}
      {appInBg && (
        <View 
          style={{
            position: "absolute",
            right: 12,
            top: "40%",
            zIndex: 99999,
            elevation: 20,
          }}
        >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleIncrement("touch")}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#FAF7F0",
            borderWidth: 2.5,
            borderColor: "#E05E26",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
          }}
        >
          <Image 
            source={
              selectedMala === "tulsi" ? require("./assets/tulsi_bead.png") :
              selectedMala === "chandan" ? require("./assets/chandan_bead.png") :
              selectedMala === "crystal" ? require("./assets/crystal_bead.png") :
              selectedMala === "kamalgatta" ? require("./assets/kamal_bead.png") :
              selectedMala === "karungali" ? require("./assets/karungali_bead.png") :
              require("./assets/rudraksha_bead.png")
            } 
            style={{ width: 44, height: 44 }} 
            resizeMode="contain" 
          />
          <View style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            backgroundColor: "#E05E26",
            borderRadius: 10,
            paddingHorizontal: 5,
            paddingVertical: 1,
          }}>
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}>{currentCount}</Text>
          </View>
        </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
    
      {/* ── MANTRA SELECTION MODAL ────────────────────── */}
      <Modal
        visible={showMantraModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMantraModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMantraModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { maxHeight: "75%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="journal" size={22} color="#E05E26" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>
                  {appLanguage === "en" ? "Select Mantra for Chanting" : "जाप के लिए मन्त्र चुनें"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMantraModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#718096" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {ALL_MANTRAS_LIST.map((item) => {
                const isSelected = activeMantraKey === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      setActiveMantraKey(item.id);
                      activeMantraKeyRef.current = item.id;
                      if (item.id === "siyaram") {
                        setTulsiMantra("jaisiyaram");
                        tulsiMantraRef.current = "jaisiyaram";
                      } else if (item.id === "harekrishna") {
                        setTulsiMantra("harekrishna");
                        tulsiMantraRef.current = "harekrishna";
                      }
                      setShowMantraModal(false);
                      if (autoOnRef.current) {
                        Speech.stop();
                        if (autoChantTimerRef.current) clearTimeout(autoChantTimerRef.current);
                        speakChantLoop();
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      marginBottom: 8,
                      backgroundColor: isSelected ? "rgba(224, 94, 38, 0.12)" : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: isSelected ? "#E05E26" : "#E2E8F0",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: isSelected ? "#E05E26" : "#2D3748" }}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color="#E05E26" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF7F0",
    ...Platform.select({
      web: {
        maxWidth: 420,
        width: "100%",
        alignSelf: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "#E2E8F0",
      },
      default: {},
    }),
  },
  loadingContainer: { flex: 1, backgroundColor: "#FAF7F0", alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#E05E26", textAlign: "center", marginTop: 12, marginBottom: 4 },
  headerSubtitle: { fontSize: 10, fontWeight: "800", color: "#B5491F", opacity: 0.8, letterSpacing: 2, textAlign: "center", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  cardContainer: { width: "48%", borderRadius: 20, overflow: "hidden", marginBottom: 4 },
  card: { padding: 14, minHeight: 180, borderWidth: 1, borderColor: "#EAE2D5", borderRadius: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  beadPreview: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  beadLetter: { fontSize: 13, fontWeight: "bold" },
  badge: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(224, 94, 38, 0.15)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { color: "#E05E26", fontSize: 9.5, fontWeight: "bold" },
  cardTitle: { fontSize: 17, fontWeight: "bold", color: "#3E2012", marginBottom: 1 },
  cardEnTitle: { fontSize: 11.5, fontWeight: "600", color: "#7F5E4E", marginBottom: 4 },
  cardTagline: { fontSize: 9.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  cardDesc: { fontSize: 10, color: "#5A453A", lineHeight: 13, marginBottom: 10 },
  cardFooter: { borderTopWidth: 0.5, borderColor: "rgba(224, 94, 38, 0.08)", paddingTop: 8, marginTop: "auto" },
  footerBeadText: { fontSize: 9.5, color: "#7F5E4E" },
  selectionFooter: { textAlign: "center", fontSize: 11, color: "#7B6255", lineHeight: 15, paddingHorizontal: 16, marginTop: 24 },

  // New Saffron & Cream Layout Styles
  counterContainer: { flex: 1, backgroundColor: "#E05E26" },
  saffronHeader: { 
    backgroundColor: "#E05E26", 
    paddingTop: Platform.OS === "ios" ? 14 : (Platform.OS === "web" ? 20 : 32), 
    paddingBottom: 24, 
    paddingHorizontal: 20 
  },
  headerRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10 
  },
  headerIconBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: "rgba(255, 255, 255, 0.16)", 
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center", 
    alignItems: "center" 
  },
  headerIconText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  headerCenterLogo: {
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogoCircleBtn: {
    width: 54,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAppLogoImg: {
    width: 54,
    height: 54,
  },
  omCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#E05E26" },
  omCircleText: { fontSize: 20, fontWeight: "bold", color: "#E05E26", fontFamily: "System", marginTop: -2 },
  swastikaText: { 
    color: "#FFFFFF", 
    fontSize: 18, 
    fontWeight: "bold",
    textAlign: "center",
    includeFontPadding: false,
    marginTop: Platform.OS === "android" ? -1 : 0
  },
  mantraTitle: { color: "#FFFFFF", fontSize: 23, fontWeight: "bold", textAlign: "left", letterSpacing: 0.5 },
  mantraSubtitle: { color: "rgba(255, 255, 255, 0.8)", fontSize: 12, textAlign: "left", marginTop: 4 },
  creamBody: { flex: 1, backgroundColor: "#FAF7F0", borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -20, paddingHorizontal: 16, paddingTop: 20, position: "relative", overflow: "hidden" },
  deityWatermark: {
    position: "absolute",
    right: -25,
    top: "-12%",
    width: "65%",
    height: "65%",
    opacity: 0.65,
    zIndex: 0,
  },
  dashboardRow: { flexDirection: "row", flex: 1 },
  leftColumn: { flex: 1, paddingRight: 8 },
  rightColumn: { width: LAYOUT_WIDTH * 0.42, position: "relative" },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badgePill: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgePillText: { fontSize: 11, fontWeight: "700", color: "#4A5568" },
  countCard: { flex: 1.15, backgroundColor: "#B5491F", borderRadius: 16, height: 110, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  countCardNumber: { fontSize: 52, fontWeight: "bold", color: "#FFFFFF", includeFontPadding: false, textAlignVertical: "center" },
  dailyMalaCard: { flex: 0.85, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EAE2D5", borderRadius: 16, padding: 8, alignItems: "center", justifyContent: "center", height: 110 },
  dailyMalaLabel: { fontSize: 11.5, fontWeight: "bold", color: "#7F5E4E", marginBottom: 2 },
  dailyMalaNumber: { fontSize: 38, fontWeight: "bold", color: "#E05E26", includeFontPadding: false, textAlignVertical: "center" },
  dailyMalaProgress: { fontSize: 10, color: "#5A453A", fontWeight: "600", marginTop: 2 },
  mantraTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 4 },
    headerMantraPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: "58%",
  },
  headerMantraPickerText: {
    fontSize: 13.5,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerMalaSwitcherBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.22)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.4)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  headerMalaSwitcherThumb: { width: 16, height: 16, borderRadius: 8, marginRight: 6 },
  headerMalaSwitcherText: { fontSize: 13, fontWeight: "bold", color: "#FFFFFF" },
  bottomBeadIndicatorContainer: { position: "absolute", bottom: 74, left: 16, right: 16, alignItems: "flex-end", zIndex: 5 },
  bottomBeadIndicator: { flexDirection: "row", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  indicatorBeadThumb: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  indicatorBeadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FAF7F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: "65%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EAE2D5",
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E05E26",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAE2D5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#7B6255",
  },
  modalList: {
    gap: 10,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE2D5",
    borderRadius: 12,
    padding: 10,
  },
  modalItemActive: {
    borderColor: "#E05E26",
    backgroundColor: "#FFF8F5",
  },
  modalItemThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#3E2012",
  },
  modalItemSub: {
    fontSize: 10.5,
    color: "#7F5E4E",
  },
  modalItemRight: {
    alignItems: "flex-end",
  },
  modalItemBeads: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7F5E4E",
  },
  modalCheckmark: {
    color: "#E05E26",
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 2,
  },
  indicatorBeadText: { fontSize: 10.5, fontWeight: "700", color: "#4A5568" },
  bottomNavBar: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: "#E2E8F0", backgroundColor: "#FFFFFF", height: 62, position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 9999, elevation: 100 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%" },
  navIcon: { fontSize: 18 },
  navText: { fontSize: 9.5, color: "#718096", marginTop: 2, fontWeight: "600" },
  sideBySideRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  playerStatusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  playerPlayIconMini: { fontSize: 10, color: "#E05E26", marginRight: 4, fontWeight: "bold" },
  bottomDecoration: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  decorationText: {
    fontSize: 18,
    opacity: 0.8,
    letterSpacing: 6,
  },
  webWrapper: {
    flex: 1,
    ...Platform.select({
      web: {
        backgroundColor: "#1A1512",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: "100vh",
      },
      default: {},
    }),
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  drawerContainer: {
    width: LAYOUT_WIDTH * 0.82,
    height: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  drawerUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  drawerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerAvatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E05E26",
  },
  drawerUserName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  drawerUserEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  googleLoginBtn: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  googleLoginText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333333",
  },
  drawerList: {
    padding: 16,
  },
  drawerItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  drawerItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  drawerIcon: {
    marginRight: 14,
  },
  drawerItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3748",
  },
  drawerSubText: {
    fontSize: 12,
    color: "#718096",
    fontWeight: "500",
  },
  drawerSubDesc: {
    fontSize: 11,
    color: "#8D6E63",
    marginTop: 2,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  drawerFooterInfo: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  drawerVersionText: {
    fontSize: 12,
    color: "#A0AEC0",
  },
  drawerBlessingText: {
    fontSize: 13,
    color: "#E05E26",
    fontWeight: "bold",
    marginTop: 4,
  },
  infoModalHeading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E05E26",
    marginBottom: 12,
  },
  infoModalBody: {
    fontSize: 13.5,
    color: "#4A5568",
    lineHeight: 20,
    marginBottom: 10,
  },
  infoModalSub: {
    fontSize: 12,
    color: "#718096",
    marginTop: 12,
    fontWeight: "600",
  },
  policySection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAE1",
  },
  policySecTitle: {
    fontSize: 14.5,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 6,
  },
  aboutLogoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFE0B2",
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#E05E26",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E05E26",
    marginBottom: 4,
  },
  aboutTagline: {
    fontSize: 12.5,
    color: "#795548",
    textAlign: "center",
    paddingHorizontal: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  aboutVersionBadge: {
    backgroundColor: "#F1F8E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aboutVersionBadgeText: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  contactItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  contactLabel: {
    fontSize: 13.5,
    fontWeight: "bold",
    color: "#2D3748",
    width: 80,
  },
  contactValue: {
    fontSize: 13.5,
    color: "#E05E26",
    fontWeight: "600",
  },
  fullPageContainer: {
    flex: 1,
    backgroundColor: "#FAF7F0",
  },
  fullPageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 48 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fullPageBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullPageTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  fullPageBody: {
    flex: 1,
  },
  fullPageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  langCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  langCardActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#E05E26",
  },
  langCodeBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#E05E26",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  langCodeText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  langCardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  langFlag: {
    fontSize: 28,
    marginRight: 14,
  },
  langTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D3748",
  },
  langSub: {
    fontSize: 12,
    color: "#718096",
    marginTop: 2,
  },
  langCheckBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E05E26",
    justifyContent: "center",
    alignItems: "center",
  },
  cleanStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE2D5",
  },
  cleanStatNumber: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#3E2723",
  },
  cleanStatLabel: {
    fontSize: 11,
    color: "#795548",
    fontWeight: "600",
    marginTop: 2,
  },
  cleanStatCardOrange: {
    flex: 1,
    backgroundColor: "#FFF3E0",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  cleanStatNumberOrange: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#E05E26",
  },
  cleanStatLabelOrange: {
    fontSize: 11,
    color: "#B5491F",
    fontWeight: "600",
    marginTop: 2,
  },
  statsProfileActiveCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  statsProfileAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  statsProfileName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  statsProfileSub: {
    fontSize: 11.5,
    color: "#558B2F",
    marginTop: 1,
  },
  statsGuestLockCard: {
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderWidth: 1.5,
    borderColor: "#FFE0B2",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  statsGuestLockIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFE0B2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statsGuestLockTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#D84315",
    marginBottom: 4,
    textAlign: "center",
  },
  statsGuestLockSub: {
    fontSize: 12,
    color: "#6D4C41",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  statsGuestLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#4285F4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsGuestLoginBtnText: {
    color: "#1A73E8",
    fontSize: 13.5,
    fontWeight: "bold",
  },
  cleanSectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#3E2723",
    marginBottom: 10,
    marginTop: 6,
  },
  cleanMalaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0EAE1",
  },
  cleanMalaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  cleanMalaName: {
    fontSize: 14.5,
    fontWeight: "bold",
    color: "#3E2723",
  },
  cleanMalaBeadsSub: {
    fontSize: 11,
    color: "#8D6E63",
    marginTop: 1,
  },
  cleanMalaBadge: {
    backgroundColor: "#FFE0B2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cleanMalaBadgeText: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#E05E26",
  },
  cleanResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F0",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  cleanResetBtnText: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 14,
  },

  // Guest Login Required Promo Styles
  guestStatsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#EAE2D5",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  guestStatsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  guestStatsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3E2723",
    marginBottom: 8,
    textAlign: "center",
  },
  guestStatsSub: {
    fontSize: 13,
    color: "#795548",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  guestGoogleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  guestGoogleBtnText: {
    fontSize: 14.5,
    fontWeight: "bold",
    color: "#3E2723",
  },

  // Full Page Login Modal Styles
  mainLoginDrawerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  mainLoginDrawerBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13.5,
  },
  guestLoginMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E05E26",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#E05E26",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  guestLoginMainBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  loginFormCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE2D5",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loginAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#FFE0B2",
  },
  loginTitleText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3E2723",
    marginBottom: 6,
  },
  loginSubText: {
    fontSize: 12.5,
    color: "#795548",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  loginInputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FAF7F0",
    borderWidth: 1,
    borderColor: "#E0D7C6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  loginInputField: {
    flex: 1,
    fontSize: 14.5,
    color: "#3E2723",
  },
  loginSubmitBtn: {
    width: "100%",
    backgroundColor: "#E05E26",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    elevation: 3,
    shadowColor: "#E05E26",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginSubmitBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  drawerHeaderLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  drawerHeaderLoginBtnText: {
    color: "#E05E26",
    fontSize: 14.5,
    fontWeight: "bold",
  },
  drawerHeaderLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  drawerHeaderLogoutBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  loginBenefitsCard: {
    width: "100%",
    backgroundColor: "#FFF8F0",
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  loginBenefitsHeading: {
    fontSize: 13.5,
    fontWeight: "bold",
    color: "#E05E26",
    marginBottom: 12,
  },
  loginBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  loginBenefitText: {
    flex: 1,
    fontSize: 12.5,
    color: "#5D4037",
    lineHeight: 18,
    fontWeight: "500",
  },
  loginSkipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  loginSkipBtnText: {
    color: "#8D6E63",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Google Auth Modal Styles
  googleModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  googleModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  googleHeaderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F4F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E3EDF7",
  },
  googleModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#202124",
    marginBottom: 6,
  },
  googleModalSub: {
    fontSize: 12.5,
    color: "#5F6368",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  googleInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#F8F9FA",
    borderWidth: 1.5,
    borderColor: "#DADCE0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  googleInputField: {
    flex: 1,
    fontSize: 14.5,
    color: "#202124",
  },
  googleConnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "#4285F4",
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  googleConnectBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  googleCancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  googleCancelBtnText: {
    color: "#5F6368",
    fontWeight: "600",
    fontSize: 13.5,
  },

  // Header User Profile Badge Styles
  headerUserProfilePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.20)",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignSelf: "center",
    marginTop: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 224, 178, 0.35)",
  },
  headerUserProfileText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12.5,
    letterSpacing: 0.2,
  },

  // Glassmorphism Design System Styles
  glassContainer: {
    flex: 1,
    backgroundColor: "#0A0E17",
  },
  backgroundBlob1: {
    position: "absolute",
    top: "15%",
    left: "5%",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#6366F1",
    opacity: 0.35,
  },
  backgroundBlob2: {
    position: "absolute",
    bottom: "15%",
    right: "5%",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#10B981",
    opacity: 0.3,
  },
  glassTopNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  glassBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  glassTopNavTitle: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 16,
  },
  glassScrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  glassCardContainer: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  glassCardContent: {
    padding: 26,
    alignItems: "center",
  },
  glassHeroTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  glassHeroSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 26,
  },
  glassInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 52,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  glassInputFocused: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  glassPrefixText: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  glassInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 16,
  },
  glassPrimaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    elevation: 4,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  glassButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  glassLinkButton: {
    marginTop: 14,
    paddingVertical: 6,
  },
  glassLinkText: {
    color: "#818CF8",
    fontSize: 13.5,
    fontWeight: "600",
  },
  glassDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
    width: "100%",
  },
  glassDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  glassDividerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "bold",
    marginHorizontal: 12,
  },
  glassSocialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  glassSocialButtonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "bold",
  },

  // Desktop Web PC Styling
  rootContainer: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#0A0E17" : "#FAF7F0",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    justifyContent: Platform.OS === "web" ? "center" : "flex-start",
  },
  appWrapper: {
    flex: 1,
    width: Platform.OS === "web" ? 420 : "100%",
    maxWidth: 420,
    maxHeight: Platform.OS === "web" ? 860 : "100%",
    backgroundColor: "#FAF7F0",
    borderRadius: Platform.OS === "web" ? 24 : 0,
    overflow: "hidden",
    elevation: Platform.OS === "web" ? 12 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
});