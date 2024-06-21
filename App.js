import React, { useState, useRef, useEffect } from "react";
//import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  // Share,
  Alert,
  Linking,
  Animated,
} from "react-native";
//import { Image } from "expo-image";

import {
  BannerAd,
  BannerAdSize,
  TestIds,
  InterstitialAd,
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  RewardedInterstitialAd,
  mobileAds,
  AppOpenAd,
  AdsConsent,
  AdsConsentStatus,
  useForeground,
} from "react-native-google-mobile-ads";

//import * as Device from "expo-device";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { I18n } from "i18n-js";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { FontAwesome6 } from "@expo/vector-icons";
import { getLocales } from "expo-localization";
import { useFonts } from "expo-font";
//import * as SplashScreen from "expo-splash-screen";
//import FastImage from "react-native-fast-image";
import * as Haptics from "expo-haptics";
import { Input } from "@rneui/themed";
//import { SelectList } from "react-native-dropdown-select-list";
//import { Divider } from "@rneui/themed";
import {
  requestTrackingPermissionsAsync,
  getAdvertisingId,
  getTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import Translations from "./components/languages";
import * as Device from "expo-device";
import axios from "axios";
import * as Updates from "expo-updates";

// SplashScreen.preventAutoHideAsync();
const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const GuideLineBaseWidth = 414;
const GuideLineBaseHeight = 896;
const horizontalScale = (size) => (windowWidth / GuideLineBaseWidth) * size;
const verticalScale = (size) => (windowHeight / GuideLineBaseHeight) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

let {
  languageTag,
  languageCode,
  textDirection,
  digitGroupingSeparator,
  decimalSeparator,
  measurementSystem,
  currencyCode,
  currencySymbol,
  regionCode,
} = getLocales()[0];
if (languageCode === "iw") {
  languageCode = "he";
}
console.log("digitgroupingseperator:", digitGroupingSeparator);
console.log("decimal seperator", decimalSeparator);
const i18n = new I18n(Translations);
i18n.fallbacks = true;
// languageCode = "he";
console.log("languagecode:", languageCode);
if (!Translations.hasOwnProperty(languageCode)) {
  i18n.locale = "en";
} else {
  i18n.locale = languageCode;
}

i18n.defaultLocale = "en";
//i18n.missingBehavior = "error";

i18n.missingBehavior = "guess";

const iosAppOpen = "ca-app-pub-8754599705550429/6844475216";
const androidAppOpen = "ca-app-pub-8754599705550429/2760678403";
const productionAppOpenId =
  Device.osName === "Android" ? androidAppOpen : iosAppOpen;

const iosAdmobBanner = "ca-app-pub-8754599705550429/4186593720";
const androidAdmobBanner = "ca-app-pub-8754599705550429/2706265136";
const productionID =
  Device.osName === "Android" ? androidAdmobBanner : iosAdmobBanner;

const iosAdmobInterstitial = "ca-app-pub-8754599705550429/2597147010";
const androidAdmobInterstitial = "ca-app-pub-8754599705550429/7575448434";
const productionInterstitialID =
  Device.osName === "Android" ? iosAdmobInterstitial : androidAdmobInterstitial;

const iosRewarderdInterstitial = "ca-app-pub-8754599705550429/1379434110";
const androidRewarderdInterstitial = "ca-app-pub-8754599705550429/8527737330";
const productionRewarderdInterstitialID =
  Device.osName === "Android"
    ? androidRewarderdInterstitial
    : iosRewarderdInterstitial;

const adUnitIdAppOpen = __DEV__ ? TestIds.APP_OPEN : productionAppOpenId;

const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : productionID;

const adUnitIdInterstitial = __DEV__
  ? TestIds.INTERSTITIAL
  : productionInterstitialID;

const adUnitIdRewarded = __DEV__
  ? TestIds.REWARDED_INTERSTITIAL
  : productionRewarderdInterstitialID;



let isMobileAdsStartCalled = false;

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [friends, setFriends] = useState([
    { amount: "", isValid: true, nickname: "" },
  ]);
  const [isFriendExpenseValid, setIsFriendExpenseValid] = useState([false]);
  const [friendArrayValid, setFrindArrayValid] = useState(false);
  const [numPeople, setNumPeople] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [FriendsNumIsValid, setFriendsNumValid] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showText, setShowText] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNickNameVisible, setModalNickNameVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [nextBtnValid, setNextBtnValid] = useState(false);
  const input = useRef(null);
  const nameInput = useRef(null);
  const inputNumFriend = useRef(null);
  const [fontsLoaded, fontError] = useFonts({
    Varela: require("./assets/fonts/Varela.ttf"),
  });
  const [selected, setSelected] = React.useState("");
  const [data, setData] = React.useState([]);
  const [selectListPressed, setSelectListPressed] = useState([false]);
  const [isTrackingPermission, setIsTrackingPermission] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [appOpenLoaded, setAppOpenLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedInterstitialLoaded, setRewardedInterstitialLoaded] =
    useState(false);
  const [loadedRewarded, setLoadedRewarded] = useState(false);
  const [adClosed, setAdClosed] = useState(false);
  const [trackingPermissionProcessEnd, setTrackingPermissionProcessEnd] =
    useState(false);
  const [canShowAd, setCanShowAd] = useState(false);
  const [interstitalClosed, setInterstitialClosed] = useState(false);
  const [appOpenClosed, setAppOpenClosed] = useState(false);
  const [isAppOpenAdError, setIsAppOpenAdError] = useState(false);
  const [translationsJson, setTranslationsJson] = useState({});
  const [loading, setLoading] = useState(true);
  //"https://itamarn01.github.io/Juba-backend/components/languages.js"
  useEffect(() => {
    fetchTranslations();
    appVersionChecker();
  }, []);

  const appVersionChecker = async () => {
    try{
      let currentVersion = "1.0.1" //change the version
      const response = await axios.get(
        "https://itamarn01.github.io/Juba-backend/components/version.json"
      );
     // console.log("version:", response.data.version);
      const latestVersion = response.data.updatedVersion;
      console.log("version:", latestVersion)
      console.log("----------------------------------------------------------")
      const updateStatus = getUpdateStatus(currentVersion, latestVersion);

      if (updateStatus === 'mustUpdate') {
        showMandatoryUpdateAlert('Update Required', 'A new version of the app is available. Please update to continue using the app.', 'https://play.google.com/store/apps/details?id=com.webixnow.gigtune', 'https://play.google.com/store/apps/details?id=com.gigtunetry.JUBA');
      } else if (updateStatus === 'recommendToUpdate') {
        showAlert('Update Recommended', 'A new version of the app is available. We recommend updating to the latest version.', 'https://play.google.com/store/apps/details?id=com.webixnow.gigtune', 'https://play.google.com/store/apps/details?id=com.gigtunetry.JUBA');
      }
    }
    catch (error) {console.log("error to fetch version", error)}
  }

  const showAlert = (title, message, appStoreLink, googlePlayLink) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            // Modify the link based on the platform
            const link = Platform.OS === 'ios' ? appStoreLink : googlePlayLink;
            Linking.openURL(link).catch(err => console.error('An error occurred', err));
          }
        }
      ],
      { cancelable: false }
    );
  };
  const showMandatoryUpdateAlert = (title, message, appStoreLink, googlePlayLink) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Update',
          onPress: () => {
            const link = Platform.OS === 'ios' ? appStoreLink : googlePlayLink;
            Linking.openURL(link).catch(err => console.error('An error occurred', err));
          }
        }
      ],
      { cancelable: false }
    );
  };
 

// Your getUpdateStatus function
function getUpdateStatus(currentVersion, latestVersion) {
  const currentVersionArray = currentVersion.split('.').map(Number);
  const latestVersionArray = latestVersion.split('.').map(Number);

  // Compare each segment of the version number
  for (let i = 0; i < currentVersionArray.length - 1; i++) {
    if (currentVersionArray[i] < latestVersionArray[i]) {
      return 'mustUpdate'; // Major or minor version update
    }
  }
  if (currentVersionArray[2] < latestVersionArray[2]) {
    return 'recommendToUpdate';
  }

  return 'noUpdate'; // Versions are identical
}

  const fetchTranslations = async () => {
    try {
      setLoading(true); // Show loading indicator while fetching
      const response = await axios.get(
        "https://itamarn01.github.io/Juba-backend/components/languages.json"
      );
      console.log("responseData[0]:", response.data[0]);
      const translations = response.data;

      setTranslationsJson(translations); // Update state with fetched translations

      setLoading(false);
    } catch (error) {
      console.error("Error fetching translations:", error);
      setLoading(false);
    }
  };
  const languageRestart = async () => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
      await Updates.reloadAsync();
    }
  };
  // const i18n = new I18n();
  useEffect(() => {
    if (loading) return;
    i18n.store(translationsJson);
  }, [translationsJson, loading]);

  useEffect(() => {
    const locales = getLocales();
    console.log("i18n.locale:", i18n.locale);
    // console.log("local:", locales[0].textDirection);
    if (
      (locales &&
        /* locales[0].textDirection === "rtl" */ i18n.locale === "he") ||
      i18n.locale === "ar"
    ) {
    /*   I18nManager.forceRTL(true);
      console.log("forcing rtl");
     restartApp() */
     languageRestart()
    } else {
      I18nManager.forceRTL(false);
    }
    console.log("is rtl?", I18nManager.isRTL);
  }, []);

  React.useEffect(() => {
    //Get Values from database

    // Store Values in Temporary Array
    let newArray = NickNames.map((item) => {
      return { key: item.he, value: item.he };
    });
    //Set Data Variable
    setData(newArray);
  }, []);
  const [appOpen, setAppOpen] = useState(null);
  const [interstitial, setInterstitial] = useState(null);
  const [rewardedInterstitial, setRewardedInterstitial] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("Requesting tracking status...");
        const { status: trackingStatus, canAskAgain } =
          await requestTrackingPermissionsAsync();

        console.log("Tracking status:", trackingStatus);
        console.log("Can ask again:", canAskAgain);

        if (trackingStatus === "granted") {
          setIsTrackingPermission(true);
          console.log("Permission to track data granted.");
        }
      } catch (error) {
        console.error("Error during tracking permissions request:", error);
      } finally {
        console.log("Finalizing permissions and initializing ads...");
        setTrackingPermissionProcessEnd(true);
        await mobileAds().initialize();
        console.log("Ads initialized.");
      }
    })();
  }, []);

  /*  const removeSplash = useCallback(async () => {
    console.log("soger tasplash");
    try {
      if (canShowAd) await SplashScreen.hideAsync();
      console.log("Splash screen hidden successfully");
    } catch (hideError) {
      console.error("Error hiding splash screen:", hideError);
    }
    if (!canShowAd) {
      return null;
    }
  }, [canShowAd]); */

  /*  const onLayoutRootView1 = useCallback(async () => {
    if (trackingPermissionProcessEnd) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      
    }
  }, [trackingPermissionProcessEnd]);

  if (!trackingPermissionProcessEnd) {
    return null;
  } */

  /* const HideSplashScreen = async () => {
    // if (!trackingPermissionProcessEnd) return;
    console.log("tracking permission end", trackingPermissionProcessEnd);
    if (trackingPermissionProcessEnd) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
      setCanShowAd(true);
    }
  };

  useEffect(() => {
    HideSplashScreen();
  }, [trackingPermissionProcessEnd]);
 */
useEffect(()=> {
  if (!trackingPermissionProcessEnd) {
    console.log("tracking process doesn't finish");
    return;
  }
  setAppOpenClosed(true)
},[trackingPermissionProcessEnd, isTrackingPermission])
//---------------------------------------------------check without app open-------------
 /*  useEffect(() => {
    if (!trackingPermissionProcessEnd) {
      console.log("tracking process doesn't finish");
      return;
    }
    console.log("Start initialize appOpenAd");
    const invalidAdUnitIdAppOpen = "invalid_ad_unit_id";
    const newAppOpen = AppOpenAd.createForAdRequest(adUnitIdAppOpen, {
      keywords: ["fashion", "clothing", "food", "cooking", "fruit"],
      requestNonPersonalizedAdsOnly: !isTrackingPermission,
    });

    setAppOpen(newAppOpen);
    const unsubscribe = newAppOpen.addAdEventListener(
      AdEventType.LOADED,
      () => {
        console.log("appOpen ad loaded");
        setAppOpenLoaded(true);
        newAppOpen.show();
      }
    );

    const unsubscribeClosed = newAppOpen.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log("app open ad closed");
        setAppOpenClosed(true);
      }
    );

    const unsubscribeErorr = newAppOpen.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.log(`error loading appOpen :`, error);
        setAppOpenClosed(true);
      }
    );

    // Start loading the interstitial straight away
    newAppOpen.load();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribe();
      unsubscribeClosed();
      unsubscribeErorr();
    };
  }, [isTrackingPermission, trackingPermissionProcessEnd]);
 */
  /*  useEffect(() => {
    if (!trackingPermissionProcessEnd) {
      console.log("tracking process doesn't finish");
      return;
    }
    console.log("tracking process load interstitial");
    console.log;
    const newInterstitial = InterstitialAd.createForAdRequest(
      adUnitIdInterstitial,
      {
        keywords: ["fashion", "clothing", "food", "cooking", "fruit"],
        requestNonPersonalizedAdsOnly: !isTrackingPermission,
      }
    );

    setInterstitial(newInterstitial);
    const unsubscribe = newInterstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        console.log("interstitial loaded");
        setLoaded(true);
        newInterstitial.show();
      }
    );

    const unsubscribeClosed = newInterstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log("interstitial closed");
        setInterstitialClosed(true);
      }
    );

    // Start loading the interstitial straight away
    newInterstitial.load();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribe();
      unsubscribeClosed();
    };
  }, [isTrackingPermission, trackingPermissionProcessEnd]); */

  useEffect(() => {
    if (adClosed) {
      calculateExpenses();
    }
  }, [adClosed]);

  const loadInterstitial = () => {
    const invalidAdUnitIdInterstitial = "invalid_ad_unit_id";
    const newInterstitial = InterstitialAd.createForAdRequest(
      adUnitIdInterstitial,
      {
        keywords: ["fashion", "clothing", "food", "cooking", "fruit"],
        requestNonPersonalizedAdsOnly: !isTrackingPermission,
      }
    );

    setInterstitial(newInterstitial);

    const unsubscribeLoaded = newInterstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        console.log("loading interstitial process done");
        setInterstitialLoaded(true);
      }
    );

    /*  const unsubscribeErorr = newInterstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.log(`error loading interstitial ad :`, error);
        //  onCalculateButtonPressed();
        // setIsInterstitialError(true);
        setInterstitialLoaded(false);
        newInterstitial.load();
        setAdClosed(true);
      }
    ); */

    const unsubscribeClosed = newInterstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setInterstitialLoaded(false);
        newInterstitial.load();
        setAdClosed(true);
      }
    );

    newInterstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      // unsubscribeErorr();
    };
  };

  useEffect(() => {
    if (!trackingPermissionProcessEnd) {
      console.log("tracking process doesn't finish");
      return;
    }
    const unsubscribeInterstitialEvents = loadInterstitial();

    return () => {
      unsubscribeInterstitialEvents();
    };
  }, [isTrackingPermission, trackingPermissionProcessEnd]);

  const loadRewardedInterstitial = () => {
    const newRewardedInterstitial = RewardedInterstitialAd.createForAdRequest(
      adUnitIdRewarded,
      {
        keywords: ["fashion", "clothing", "food", "cooking", "fruit"],
        requestNonPersonalizedAdsOnly: !isTrackingPermission,
      }
    );

    setRewardedInterstitial(newRewardedInterstitial);

    const unsubscribeLoaded = newRewardedInterstitial.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log("loading rewarded interstitial process done");
        setRewardedInterstitialLoaded(true);
      }
    );

    const unsubscribeEarned = newRewardedInterstitial.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log(`User earned reward of ${reward.amount} ${reward.type}`);
        //  onCalculateButtonPressed();
      }
    );

    const unsubscribeClosed = newRewardedInterstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setRewardedInterstitialLoaded(false);
        newRewardedInterstitial.load();
        setAdClosed(true);
      }
    );

    newRewardedInterstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeEarned();
    };
  };

  useEffect(() => {
    if (!trackingPermissionProcessEnd) {
      console.log("tracking process doesn't finish");
      return;
    }
    const unsubscribeRewardedInterstitialEvents = loadRewardedInterstitial();

    return () => {
      unsubscribeRewardedInterstitialEvents();
    };
  }, [isTrackingPermission, trackingPermissionProcessEnd]);

  /*  if (!loaded) {
    return null;
  } */

  const onLayoutRootView = useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppIsReady(true);
    }
  }, [fontsLoaded, fontError]);

  /*  async function loadFonts() {
    
    setAppIsReady(true)
  }

  useEffect(() => {
    loadFonts();
  }, []);
 
 */

  const onNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const onPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  const imagePath = require("./assets/juba-spend.png");
  const viewShotRef = useRef(null);
  //להחזיר
  const captureAndShareImage = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: "jpg",
        quality: 0.9,
      });

      // Share the captured image
      shareImage(uri);
    } catch (error) {
      console.error("Error capturing and sharing image:", error);
    }
  };
  ///להחזיר
  const shareImage = async (imageUri) => {
    try {
      await Sharing.shareAsync(imageUri, {
        mimeType: "image/jpeg",
        dialogTitle: "Share via",
        UTI: "com.instagram.photo",
      });
    } catch (error) {
      console.error("Error sharing image:", error.message);
    }
  };

  const handleSelectNickName = (nickName, index) => {
    setFriends([{ ...friends[index], nickName: nickName }]);
    setModalNickNameVisible(false);
  };

  const addMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const handleInputChange = (text) => {
    // Regular expression for a whole number
    const integerRegex = /^(?:[1-9]?\d|100)$/;

    // Check if the input is a whole number
    const isInteger = integerRegex.test(text);

    // Check if the input is greater than or equal to the array length
    const isValidInput = isInteger && parseInt(text, 10) >= friends.length;

    // Update the state based on the validation result
    setFriendsNumValid(isValidInput);
    setNumPeople(text);
  };

  const addFriend = (amount) => {
    setFriends([...friends, { amount: amount, isValid: true, nickname: "" }]);
    // focusInput()
  };
  const focusInput = () => {
    input.current.focus();
  };

  const deleteFriend = (index) => {
    const updatedFriends = [...friends];
    updatedFriends.splice(index, 1);
    setFriends(updatedFriends);
  };

  const validateFriendsInput = (index) => {
    const moneyRegex = /^(?=.*[1-9])\d{1,9}(\.\d{1,2})?$/;

    // Your validation logic here
    const isValidInput = moneyRegex.test(friends[index].amount);
    const updatedFriends = [...friends];
    updatedFriends[index].isValid = isValidInput;
    setFriends(updatedFriends);
    return isValidInput;
  };

  const onBlurHandler = (index) => {
    validateFriendsInput(index);
  };

  const onNextButtonPressed = () => {
    // Alert.alert("button pressed");
    let allInputsValid = true;
    friends.forEach((friend, index) => {
      if (!validateFriendsInput(index)) {
        allInputsValid = false;
      }
    });

    if (allInputsValid) {
      setCurrentStep(2);
      // Proceed with your logic if all inputs are valid
      //  Alert.alert("Success", "All inputs are valid!");
    } else {
      /*   Alert.alert("Error", "Please enter valid inputs."); */
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      input.current.shake();
    }
  };

  const onCalculateButtonPressed = () => {
    // console.log("friendsNumisvalid:", FriendsNumIsValid);
    // console.log("friend length:", friends.length);
    if (FriendsNumIsValid) {
      onCalculateButtonPressed();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      inputNumFriend.current.shake();
    }
  };

  const validateMoneyFormat = (text, index) => {
    // Regular expression to validate money format with 2 decimal places
    const moneyRegex = /^(?=.*[1-9])\d+(\.\d{1,2})?$/;

    // console.log("textregex:", moneyRegex.test(text));
    const updateValidate = [...isFriendExpenseValid];
    updateValidate[index] = moneyRegex.test(text);
    setIsFriendExpenseValid(updateValidate);
    //  console.log("updatevalidate", updateValidate);
    return moneyRegex.test(text);
  };

  const CheckArray = () => {
    //console.log("isFriendExpenseValid:", isFriendExpenseValid);
    // Use the every method to check if all elements are true
    const allTrue = isFriendExpenseValid.every((item) => item === true);

    // if (allTrue) {setNextBtnValid(true)} else {setNextBtnValid(false)}
    // console.log("arrayall true:", allTrue);
    // setNextBtnValid(allTrue)
    return allTrue;
  };
  const calculateExpenses = () => {
    setMessages("");
    const friendsArray = [];
    const namesArray = [];
    const total = friends.reduce(
      (acc, friend) => acc + parseFloat(friend.amount),
      0
    );
    setTotalAmount(total);
    friendsArray.push(
      ...friends.map((friend) => friend.amount),
      ...Array(Math.max(0, numPeople - friends.length)).fill("0")
    );
    namesArray.push(
      ...friends.map((friend) => friend.nickname),
      ...Array(Math.max(0, numPeople - friends.length)).fill("")
    );
    for (let i = 0; i < friendsArray.length; i++) {
      friendsArray[i] -= total / parseInt(numPeople);
      friendsArray[i] = parseFloat(friendsArray[i].toFixed(2));
    }
    for (let i = 0; i < friendsArray.length; i++) {
      let person = i + 1;
      let iterationCount = 0;
      const maxIterations = 30;

      while (friendsArray[i] < -0.1 && iterationCount < maxIterations) {
        let maxIndex = friendsArray.indexOf(Math.max(...friendsArray));
        let friend = maxIndex + 1;

        const friend1 =
          namesArray[person - 1] === ""
            ? `${i18n.t("friend")} ${person}`
            : namesArray[person - 1].length > 14
            ? namesArray[person - 1].substring(0, 14) + ".."
            : namesArray[person - 1];

        const friend2 =
          namesArray[friend - 1] !== ""
            ? namesArray[friend - 1].length > 14
              ? namesArray[friend - 1].substring(0, 14) + ".."
              : namesArray[friend - 1]
            : `${i18n.t("friend")} ${friend}`;

        const amount = (parseFloat(friendsArray[i]) * -1).toFixed(2);

        if (friendsArray[maxIndex] + friendsArray[i] >= 0) {
          friendsArray[maxIndex] += friendsArray[i];
          friendsArray[maxIndex] = parseFloat(
            friendsArray[maxIndex].toFixed(2)
          );
          addMessage(
            i18n.t("member1OwesMember2", {
              friend1,
              friend2,
              amount: parseFloat(amount).toLocaleString(),
              currency: currencySymbol,
            })
          );
          friendsArray[i] = 0;
        } else {
          friendsArray[i] += friendsArray[maxIndex];
          friendsArray[i] = parseFloat(friendsArray[i].toFixed(2));
          addMessage(
            i18n.t("member1OwesMember2", {
              friend1,
              friend2,
              amount: parseFloat(
                friendsArray[maxIndex].toFixed(2)
              ).toLocaleString(),
              currency: currencySymbol,
            })
          );
          friendsArray[maxIndex] = 0;
        }
        iterationCount++;

        if (iterationCount >= maxIterations) {
          console.warn("Maximum iterations reached. Exiting loop.");
          break;
        }
      }
      setShowText(true);
      setModalVisible(true);
      setAdClosed(false);
    }
  };

  const handlePress = async () => {
    console.log("rewarded interstitial load:", rewardedInterstitialLoaded);
    if (rewardedInterstitialLoaded) {
      await rewardedInterstitial.show();
    } else {
      calculateExpenses();
    }
  };

  const updateFriendNickname = (index, nickname) => {
    console.log("index:", index);
    const updatedFriends = [...friends];
    updatedFriends[index].nickname = nickname;
    setFriends(updatedFriends);
    setModalNickNameVisible(false);
  };
  const renderItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <FontAwesome name="user-circle" size={24} color="purple" />
      <View style={styles.textContainer}>
        <Text style={styles.nickname}>
          {item.nickname.length > 20
            ? item.nickname.substring(0, 20) + ".."
            : item.nickname === ""
            ? `${i18n.t("friend")} ${index + 1}`
            : item.nickname}
        </Text>
        <Text style={styles.amount}>{`${currencySymbol}${Number(
          item.amount
        ).toLocaleString()}`}</Text>
      </View>
    </View>
  );
  const NickNameSelectorModal = ({ visible, onClose, onSelect }) => {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{ backgroundColor: "white", padding: 20, borderRadius: 10 }}
          >
            <ScrollView>
              {NickNames.map((nickname, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => onSelect(nickname.he)}
                  style={{
                    padding: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#ccc",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{nickname.he}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: "#ccc",
                borderRadius: 5,
              }}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS == "ios" ? "padding" : "height"}
        enabled
        keyboardVerticalOffset={10}
        /*  behavior="padding" // or "height" or "position" */
        style={styles.keyboardAvoidingContainer}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: /* !appIsReady || */ !appOpenClosed
                ? "white"
                : "#EDEDED",
            },
          ]}
        >
          {
            /* !appIsReady || */ !appOpenClosed ? (
              <>
                {console.log("app isnt ready:", appOpenClosed)}
                <Image
                  style={{
                    width: horizontalScale(400),
                    height: verticalScale(400),
                  }}
                  source={require("./assets/JubaGif.gif")}
                  contentFit="contain"
                />
                {/*  <ActivityIndicator
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                size="large"
                color="orange"
              /> */}
              </>
            ) : (
              <View>
                <LinearGradient
                  // Button Linear Gradient
                  colors={["#BD1865", "#88209B"]}
                  style={{
                    width: windowWidth,
                    height: verticalScale(200),
                    // backgroundColor: "purple",
                    justifyContent: "center",
                    alignItems: "center",
                    // flexDirection: "row",
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: moderateScale(50), // width: horizontalScale(150),
                      fontFamily: "Varela",
                      //  backgroundColor:"green",
                      // width:windowWidth,
                      //alignSelf:"center"
                      //  height: verticalScale(50),
                      //marginTop: verticalScale(40),
                      // marginHorizontal: horizontalScale(250),
                    }}
                  >
                    JUBA
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Varela",
                      fontSize: 20,
                      color: "white",
                    }}
                  >
                    {i18n.t("expenseCalculator")}
                  </Text>
                </LinearGradient>

                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  // keyboardDismissMode={"interactive"}
                  // keyboardShouldPersistTaps={"always"}
                  contentContainerStyle={{
                    justifyContent: "flex-start",
                    alignItems: "center",
                    //  backgroundColor: "green",
                    width: windowWidth,
                    flexGrow: 1,

                    //  zIndex: 1,
                  }}
                >
                  {currentStep === 1 ? (
                    <View
                      style={{
                        backgroundColor: "white",
                        borderRadius: moderateScale(10),
                        width: horizontalScale(400),
                        height: "auto",
                        justifyContent: "flex-start",
                        zIndex: 1,
                        alignItems: "center",
                        marginTop: verticalScale(50),
                      }}
                    >
                      <Text
                        style={{
                          color: "#474747",
                          fontSize: 25,
                          fontWeight: "700",
                          fontFamily: "Varela",
                        }}
                      >
                        {i18n.t("whoPaidHowMuch")}
                      </Text>
                      <Text style={{ color: "grey", fontFamily: "Varela" }}>
                        {i18n.t("eachMemberPaid")}
                      </Text>
                      {friends.map((friendAmount, index) => (
                        <View
                          key={index}
                          style={{
                            justifyContent: "center",
                            alignItems: "center",
                            marginVertical: verticalScale(5),

                            // backgroundColor: "blue",
                          }}
                        >
                          {/*  <Button
                        title="הוסף כינוי"
                        onPress={() => setModalNickNameVisible(true)}
                      /> */}
                          {/* <Text>{friends[index].nickName}</Text> */}

                          {/*    <NickNameSelectorModal
                        visible={modalNickNameVisible}
                        onClose={() => setModalNickNameVisible(false)}
                        onSelect={(nickname) =>
                          
                          {
                            console.log("index:", index)
                           /*  const updatedFriends = [...friends];
                            updatedFriends[index].nickName = nickname;
                            setFriends(updatedFriends);
                            setModalNickNameVisible(false) 
                           updateFriendNickname(index,nickname)
                          }
                        }
                        // onSelect={handleSelectNickName}
                      /> */}
                          <View style={styles.friendInputContainer}>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                height: verticalScale(47),

                                borderColor: "#CECECE",
                                borderWidth: 1,
                                // marginBottom: 10,
                                //  padding: 10,
                                width: "45%",
                                borderRadius: 10,
                                //backgroundColor: "yellow",
                              }}
                            >
                              <LinearGradient
                                colors={["#BD1865", "#88209B"]}
                                style={{
                                  width: horizontalScale(25),
                                  height: verticalScale(25),
                                  borderRadius: 100,
                                  marginLeft: horizontalScale(8),
                                  //backgroundColor: "purple",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  //flexDirection: "row",
                                  shadowColor: "#000",
                                  shadowOffset: {
                                    width: 0,
                                    height: 2,
                                  },
                                  shadowOpacity: 0.25,
                                  shadowRadius: 4,
                                  elevation: 5,
                                }}
                              >
                                <MaterialIcons
                                  name="emoji-people"
                                  size={18}
                                  color="white"
                                />
                              </LinearGradient>
                              <Input
                                ref={nameInput}
                                inputContainerStyle={{
                                  // backgroundColor: "grey",
                                  borderBottomWidth: 0,
                                  width: "80%",
                                  height: "100%",
                                  marginHorizontal: horizontalScale(5),
                                  borderColor: "green",
                                  marginTop: verticalScale(25),
                                  //borderWidth:1
                                }}
                                style={{
                                  //color: "green",
                                  textAlign:
                                    i18n.locale === "he" || i18n.locale === "ar"
                                      ? "right"
                                      : "left", // Aligns text conditionally
                                  writingDirection:
                                    i18n.locale === "he" || i18n.locale === "ar"
                                      ? "rtl"
                                      : "ltr",
                                }}
                                placeholder={`${i18n.t("name")} ${index + 1}`}
                                placeholderTextColor="#707070"
                                keyboardType="name-phone-pad"
                                onChangeText={(text) => {
                                  const updatedFriends = [...friends];
                                  updatedFriends[index].nickname = text;
                                  setFriends(updatedFriends);
                                }}
                                value={friendAmount.nickname}
                                //onBlur={() => onBlurHandler(index)}
                              />
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                height: verticalScale(47),

                                borderColor: "#CECECE",
                                borderWidth: 1,
                                // marginBottom: 10,
                                //  padding: 10,
                                width: "45%",
                                borderRadius: 10,
                                //     backgroundColor: "yellow",
                              }}
                            >
                              <LinearGradient
                                colors={["#BD1865", "#88209B"]}
                                style={{
                                  width: horizontalScale(25),
                                  height: verticalScale(25),
                                  borderRadius: 100,
                                  marginLeft: horizontalScale(8),
                                  //backgroundColor: "purple",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  //flexDirection: "row",
                                  shadowColor: "#000",
                                  shadowOffset: {
                                    width: 0,
                                    height: 2,
                                  },
                                  shadowOpacity: 0.25,
                                  shadowRadius: 4,
                                  elevation: 5,
                                }}
                              >
                                <FontAwesome6
                                  name="coins"
                                  size={12}
                                  color="white"
                                />
                              </LinearGradient>
                              <Input
                                ref={input}
                                inputContainerStyle={{
                                  // backgroundColor: "grey",
                                  borderBottomWidth: 0,
                                  width: "80%",
                                  height: "100%",
                                  marginHorizontal: horizontalScale(5),
                                  borderColor: "green",
                                  marginTop: verticalScale(25),
                                  //borderWidth:1
                                }}
                                style={{
                                  textAlign:
                                    i18n.locale === "he" || i18n.locale === "ar"
                                      ? "right"
                                      : "left", // Aligns text conditionally
                                  writingDirection:
                                    i18n.locale === "he" || i18n.locale === "ar"
                                      ? "rtl"
                                      : "ltr",
                                }}
                                placeholder={`${i18n.t("amount")} ${index + 1}`}
                                placeholderTextColor="#707070"
                                keyboardType="numeric"
                                onChangeText={(text) => {
                                  const updatedFriends = [...friends];
                                  updatedFriends[index].amount = text;
                                  setFriends(updatedFriends);
                                }}
                                value={friendAmount.amount}
                                onBlur={() => onBlurHandler(index)}
                              />
                            </View>
                            {/* {!selectListPressed[index] ? (
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              height: verticalScale(47),
                              borderColor: "#CECECE",
                              borderWidth: 1,
                              width: "45%",
                              borderRadius: 10,
                            }}
                          >
                            <LinearGradient
                              colors={["#BD1865", "#88209B"]}
                              style={{
                                width: horizontalScale(50),
                                height: verticalScale(25),
                                borderRadius: moderateScale(10),
                                marginLeft: horizontalScale(8),
                                //backgroundColor: "purple",
                                justifyContent: "center",
                                alignItems: "center",
                                //flexDirection: "row",
                                shadowColor: "#000",
                                shadowOffset: {
                                  width: 0,
                                  height: 2,
                                },
                                shadowOpacity: 0.25,
                                shadowRadius: 4,
                                elevation: 5,
                              }}
                            >
                              <TouchableOpacity
                                onPress={() => {
                                  const updateBtnPressed = [
                                    ...selectListPressed,
                                  ];
                                  updateBtnPressed[index] = true;
                                  setSelectListPressed(updateBtnPressed);
                                }}
                              >
                                <Text
                                  style={{ color: "white", fontSize: 10 }}
                                >
                                  בחר כינוי
                                </Text>
                              </TouchableOpacity>
                            </LinearGradient>
                            <Input
                              ref={nameInput}
                              inputContainerStyle={{
                                // backgroundColor: "grey",
                                borderBottomWidth: 0,
                                width: "60%",
                                height: "100%",
                                marginHorizontal: horizontalScale(5),
                                borderColor: "green",
                                marginTop: verticalScale(25),
                                //borderWidth:1
                              }}
                              placeholder={`שם ${index + 1}`}
                              placeholderTextColor="#707070"
                              keyboardType="name-phone-pad"
                              onChangeText={(text) => {
                                const updatedFriends = [...friends];
                                updatedFriends[index].nickname = text;
                                setFriends(updatedFriends);
                              }}
                              value={friendAmount.nickname}
                              //onBlur={() => onBlurHandler(index)}
                            />
                          </View>
                        ) : (
                          <SelectList
                            setSelected={(val) => {
                              setSelected(val);
                              const updatedFriends = [...friends];
                              updatedFriends[index].nickname = val;
                              setFriends(updatedFriends);
                            }}
                            data={data}
                            search={false}
                            maxHeight={200}
                            notFoundText={"איתמר"}
                            save="he"
                            dropdownShown="true"
                            fontFamily="Varela"
                            placeholder={"בחר כינוי"}
                            boxStyles={{
                               width:
                                horizontalScale(170),
                              borderColor: "#CECECE",
                            }}
                          />
                        )} */}
                            {/* <View style={{width:horizontalScale(300), backgroundColor:"green"}}>
                          {selectListPressed[index] ? (
                          <SelectList
                            setSelected={(val) => {
                              setSelected(val);
                              const updatedFriends = [...friends];
                              updatedFriends[index].nickname = val;
                              setFriends(updatedFriends);
                            }}
                            data={data}
                            search={false}
                            notFoundText={"איתמר"}
                            save="he"
                            fontFamily="Varela"
                            placeholder={"בחר כינוי"}
                            boxStyles={{
                               width:
                                horizontalScale(170),
                              borderColor: "#CECECE",
                            }}
                          />
                        ) : null}
                   </View> */}
                            {index !== 0 ? (
                              <TouchableOpacity
                                onPress={() => deleteFriend(index)}
                                style={{}}
                              >
                                <Feather
                                  name="x-circle"
                                  size={30}
                                  color="#CECECE"
                                />
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity onPress={() => {}} style={{}}>
                                <Feather
                                  name="x-circle"
                                  size={30}
                                  color="white"
                                />
                              </TouchableOpacity>
                            )}

                            {/*  <Button title="Delete" onPress={() => deleteFriend(index)} /> */}
                          </View>
                          {!friendAmount.isValid ? (
                            <Text
                              style={{ color: "red", fontFamily: "Varela" }}
                            >
                              {i18n.t("invalidAmount")}
                            </Text>
                          ) : null}
                          {Number(friends[index].amount) > 999999999 ? (
                            <Text
                              style={{ color: "red", fontFamily: "Varela" }}
                            >
                              מספר גבוה מדי
                            </Text>
                          ) : null}
                        </View>
                      ))}
                      <TouchableOpacity
                        onPress={() => {
                          addFriend(0);
                        }}
                        style={{
                          padding: 10,
                          borderRadius: 20,
                          // backgroundColor: "yellow",
                        }}
                      >
                        <LinearGradient
                          colors={["#BD1865", "#88209B"]}
                          style={{
                            width: horizontalScale(200),
                            height: verticalScale(40),

                            borderRadius: moderateScale(20),
                            borderColor: "transparent",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: "white", // Solid color for the button
                              borderRadius: moderateScale(20),

                              //padding:10,
                              width: horizontalScale(195),
                              height: verticalScale(35),
                              overflow: "hidden",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: "#2B2B2B",
                                fontFamily: "Varela",
                                fontSize: moderateScale(15),
                              }}
                            >
                              {i18n.t("addMember")}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                      {/*  <Button title="הוסף חבר" onPress={() => addFriend(0)} /> */}

                      <TouchableOpacity
                        onPress={onNextButtonPressed}
                        style={{
                          justifyContent: "center",
                          alignItems: "center",
                          width: "90%",
                          height: verticalScale(50),
                          borderRadius: moderateScale(30),
                          marginBottom: verticalScale(50),
                          marginTop: verticalScale(30),
                        }}
                      >
                        <LinearGradient
                          colors={["#BD1865", "#88209B"]}
                          style={{
                            justifyContent: "center",
                            alignItems: "center",
                            width: "90%",
                            height: verticalScale(50),
                            borderRadius: moderateScale(30),
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontSize: 24,
                              fontFamily: "Varela",
                            }}
                          >
                            {i18n.t("next")}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {currentStep === 2 ? (
                    <View
                      style={{
                        backgroundColor: "white",
                        borderRadius: moderateScale(10),
                        width: horizontalScale(400),
                        height: "auto",
                        justifyContent: "flex-start",
                        paddingVertical: verticalScale(20),
                        alignItems: "center",
                        marginTop: verticalScale(50),
                      }}
                    >
                      <Text
                        style={{
                          color: "#474747",
                          fontSize: 25,
                          fontWeight: "700",
                          fontFamily: "Varela",
                          textAlign: "center",
                        }}
                      >
                        {i18n.t("howManyMembers")}
                      </Text>
                      <Text style={{ color: "grey", fontFamily: "Varela" }}>
                        {i18n.t("howManyPeople")}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          height: verticalScale(70),

                          borderColor: "#CECECE",
                          borderWidth: 1,
                          // marginBottom: 10,
                          //  padding: 10,
                          width: "95%",
                          borderRadius: 30,
                          //     backgroundColor: "yellow",
                        }}
                      >
                        <LinearGradient
                          colors={["#BD1865", "#88209B"]}
                          style={{
                            width: horizontalScale(45),
                            height: verticalScale(45),
                            borderRadius: 100,
                            marginLeft: horizontalScale(8),
                            //backgroundColor: "purple",
                            justifyContent: "center",
                            alignItems: "center",
                            //flexDirection: "row",
                            shadowColor: "#000",
                            shadowOffset: {
                              width: 0,
                              height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,
                          }}
                        >
                          <FontAwesome6
                            name="people-group"
                            size={24}
                            color="white"
                          />
                        </LinearGradient>
                        <Input
                          ref={inputNumFriend}
                          inputContainerStyle={{
                            borderBottomWidth: 0,
                            //  backgroundColor: "grey",
                            width: "80%",
                            height: "100%",
                            marginTop: verticalScale(25),
                          }}
                          style={{
                            textAlign:
                              i18n.locale === "he" || i18n.locale === "ar"
                                ? "right"
                                : "left", // Aligns text conditionally
                            writingDirection:
                              i18n.locale === "he" || i18n.locale === "ar"
                                ? "rtl"
                                : "ltr",
                          }}
                          placeholder={i18n.t("numberOfPeople")}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          onChangeText={handleInputChange}
                          value={numPeople}
                        />
                      </View>
                      <View>
                        {/* <TextInput
            style={{
              height: 40,
              borderColor: "gray",
              borderWidth: 1,
              padding: 10,
            }}
            placeholder={`Enter a number >= ${friends.length}`}
            keyboardType="numeric"
            onChangeText={handleInputChange}
            value={numPeople}
          /> */}
                        {!FriendsNumIsValid && (
                          <Text style={{ color: "red", fontFamily: "Varela" }}>
                            {i18n.t("membersBetween1And100", {
                              startNumber: friends.length,
                            })}{" "}
                            {/* {friends.length} ל 100 */}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={onPreviousStep}
                        style={{
                          justifyContent: "center",
                          alignItems: "center",
                          width: "90%",
                          height: verticalScale(50),
                          borderRadius: moderateScale(30),
                          marginBottom: verticalScale(50),
                          marginTop: verticalScale(30),
                        }}
                      >
                        <LinearGradient
                          colors={["#BD1865", "#88209B"]}
                          style={{
                            justifyContent: "center",
                            alignItems: "center",
                            width: "90%",
                            height: verticalScale(50),
                            borderRadius: moderateScale(30),
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontSize: 24,
                              fontFamily: "Varela",
                            }}
                          >
                            {i18n.t("previous")}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {FriendsNumIsValid && currentStep === 2 && (
                    /* rewardedInterstitialLoaded && */ <TouchableOpacity
                      onPress={async () => {
                        interstitialLoaded
                          ? await interstitial.show()
                          : calculateExpenses();
                        /*  Alert.alert(
                          "הפעל פרסום",
                          "כדי לקבל את התוצאה צריך לאפשר צפיה בפרסומות בהגדרות המכשיר",
                          [
                            {
                              text: "Cancel",
                              onPress: () => console.log("Cancel Pressed"),
                              style: "cancel",
                            },
                            {
                              text: "OK",
                              onPress: () => console.log("OK Pressed"),
                            },
                          ],
                          { cancelable: false }
                        ); */
                        //    onCalculateButtonPressed();
                        console.log(
                          "freind num is valid 1:",
                          FriendsNumIsValid
                        );
                      }}
                      style={{
                        justifyContent: "center",
                        alignItems: "center",
                        width: "90%",
                        height: verticalScale(50),
                        borderRadius: moderateScale(30),
                        marginBottom: verticalScale(200),
                        marginTop: verticalScale(30),
                      }}
                    >
                      <LinearGradient
                        colors={["#BD1865", "#88209B"]}
                        style={{
                          justifyContent: "center",
                          alignItems: "center",
                          width: "90%",
                          height: verticalScale(50),
                          borderRadius: moderateScale(30),
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 24,
                            fontFamily: "Varela",
                          }}
                        >
                          {i18n.t("calculate")}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <View ref={viewShotRef} collapsable={false}>
                          {showText ? (
                            <View
                              style={{
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "white",
                              }}
                            >
                              <Image
                                source={imagePath}
                                style={{
                                  width: horizontalScale(250),
                                  height: verticalScale(100),
                                }}
                                // resizeMode={FastImage.resizeMode.contain}
                                //  onLoad={handleImageLoad}
                              />
                              <Text
                                style={{
                                  fontFamily: "Varela",
                                  fontSize: moderateScale(20),
                                }}
                              >
                                {i18n.t("membersPaid")}
                              </Text>
                              <View
                                style={{
                                  width: "100%",
                                  backgroundColor: "grey",
                                  height: 1,
                                }}
                              />

                              <FlatList
                                data={friends}
                                horizontal
                                renderItem={renderItem}
                                keyExtractor={(item, index) => index.toString()}
                                showsHorizontalScrollIndicator={false}
                              />
                              <View
                                style={{
                                  width: "100%",
                                  backgroundColor: "grey",
                                  height: 1,
                                  //marginVertical: verticalScale(10),
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: moderateScale(25),
                                  fontFamily: "Varela",
                                  marginBottom: verticalScale(20),
                                  textAlign: "center",
                                  writingDirection:
                                    i18n.locale === "he" || i18n.locale === "ar"
                                      ? "rtl"
                                      : "ltr",
                                }}
                              >{`${i18n.t(
                                "totalPaid"
                              )} ${currencySymbol}${totalAmount.toLocaleString()}`}</Text>

                              <Text
                                style={{
                                  fontSize: moderateScale(27),
                                  color: "grey",
                                  fontFamily: "Varela",
                                  writingDirection:
                                    i18n.locale === "he" || i18n.locale === "ar"
                                      ? "rtl"
                                      : "ltr",
                                  textAlign: "center",
                                }}
                              >{`${i18n.t(
                                "pricePerPerson"
                              )} ${currencySymbol}${parseFloat(
                                (totalAmount / parseInt(numPeople)).toFixed(2)
                              ).toLocaleString()}`}</Text>
                              <View
                                style={{
                                  width: "100%",
                                  backgroundColor: "grey",
                                  height: 1,
                                  marginVertical: verticalScale(10),
                                }}
                              />

                              <View
                                style={{
                                  // height: 200,
                                  // marginTop: verticalScale(100),
                                  //  marginBottom:verticalScale(40),
                                  justifyContent: "center",
                                  alignItems: "center",
                                  maxHeight: verticalScale(400),
                                  //backgroundColor: "green",
                                }}
                              >
                                <FlatList
                                  data={messages}
                                  renderItem={({ item }) => (
                                    <Text
                                      style={{
                                        fontSize: moderateScale(12),
                                        fontFamily: "Varela",
                                        marginVertical: verticalScale(12),
                                        writingDirection:
                                          i18n.locale === "he" ||
                                          i18n.locale === "ar"
                                            ? "rtl"
                                            : "ltr",
                                      }}
                                    >
                                      {item}
                                    </Text>
                                  )}
                                  keyExtractor={(item, index) =>
                                    index.toString()
                                  }
                                />
                                {/* {messages.map((message, index) => (
                              <Text
                                key={index}
                                style={{
                                  fontSize: moderateScale(12),
                                  fontFamily: "Varela",
                                  marginVertical: verticalScale(12),
                                }}
                              >
                                {message}
                              </Text>
                            ))} */}
                              </View>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.modalBottomContainer}>
                          <TouchableOpacity
                            onPress={captureAndShareImage}
                            style={{ padding: 10, borderRadius: 20 }}
                          >
                            <LinearGradient
                              colors={["#BD1865", "#88209B"]}
                              style={{
                                width: horizontalScale(150),
                                height: verticalScale(40),
                                /* paddingVertical:verticalScale(10), */ borderRadius: 20,
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: "white",
                                  fontFamily: "Varela",
                                  fontSize: moderateScale(18),
                                }}
                              >
                                {i18n.t("share")}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setFriends([
                                { amount: 0, isValid: true, nickname: "" },
                              ]),
                                setNumPeople(""),
                                setModalVisible(false);
                              setFriendsNumValid(false);
                              setCurrentStep(1);
                              CheckArray();
                            }}
                            style={{
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <LinearGradient
                              colors={["#BD1865", "#88209B"]}
                              style={{
                                width: horizontalScale(150),
                                //paddingVertical:verticalScale(10),
                                height: verticalScale(40), //padding: 10,
                                borderRadius: moderateScale(20),
                                // borderWidth: 1, // Border width
                                borderColor: "transparent",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <View
                                style={{
                                  backgroundColor: "white", // Solid color for the button
                                  borderRadius: moderateScale(20),

                                  //padding:10,
                                  width: horizontalScale(145),
                                  height: verticalScale(35),
                                  overflow: "hidden",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#2B2B2B",
                                    fontFamily: "Varela",
                                    fontSize: moderateScale(18),
                                  }}
                                >
                                  {i18n.t("close")}
                                </Text>
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                  {/*             <WebView
      source={{ uri: 'https://web.whatsapp.com/' }} // Specify the URL you want to load
      style={{width:windowWidth, height:600}}
    /> */}
                </ScrollView>
              </View>
            )
          }
        </View>
        {trackingPermissionProcessEnd && (
          <>
            {/* {console.log("banner loading")} */}
            <BannerAd
              //    ref={bannerRef}
              unitId={adUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: !isTrackingPermission,
                // You can change this setting depending on whether you want to use the permissions tracking we set up in the initializing
              }}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    //  padding: 80,
  },
  input: {
    height: verticalScale(40),
    borderColor: "#CECECE",
    borderWidth: 1,
    marginBottom: verticalScale(10),
    padding: moderateScale(10),
    width: "70%",
    borderRadius: moderateScale(20),
  },
  friendInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",

    // backgroundColor: "green",
  },
  messageContainer: {
    backgroundColor: "#e0e0e0",
    padding: moderateScale(50),
    width: horizontalScale(400),
    marginVertical: verticalScale(5),
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontSize: moderateScale(16),
    color: "black",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Adjust the alpha value for transparency
  },
  modalContent: {
    justifyContent: "space-between",
    backgroundColor: "white",
    width: windowWidth * 0.95,
    height: windowHeight * 0.9,
    borderRadius: moderateScale(10),
    elevation: 5,
    maxHeight: "90%", // Adjust the maximum height as needed
  },
  modalBottomContainer: {
    //alignSelf:"flex-end",
    marginTop: verticalScale(10),
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    borderBottomEndRadius: moderateScale(20),
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  itemContainer: {
    //width:"100%",
    flexDirection: "column",
    margin: moderateScale(10),
    alignItems: "center",
    // maxHeight: verticalScale(100),
    // backgroundColor:"green"
  },
  avatar: {
    width: horizontalScale(50),
    height: verticalScale(50),
    borderRadius: moderateScale(25),
  },
  textContainer: {
    alignItems: "center",
    marginVertical: verticalScale(5),
  },
  nickname: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    // writingDirection: i18n.
  },
  amount: {
    fontSize: moderateScale(14),
    // marginTop: 3,
    //marginBottom: 10,
  },
});

// [25, 75 0, 0, 0] [5, 55, -20, -20 , -20]
// [0,60, -20, -20, -20]
// 1 מעביר 5 שקלים ל2
//[0,40,0,-20,-20]
//3 מעביר 20 ל2
//[0,20,0,0,-20]
//4 מעביר 20 ל2
//[0,0,0,0,0]
//5 מעביר 20 ל2

const NickNames = [
  {
    en: "Moneybags",
    he: "שק הכסף",
  },
  {
    en: "The Benefactor",
    he: "הנדבן",
  },
  {
    en: "The Miser",
    he: "הקמצן",
  },
  {
    en: "Loan Shark",
    he: "הלווה בריבית גבוהה",
  },
  {
    en: "The Tycoon",
    he: "איל ההון",
  },
  {
    en: "Money Maker",
    he: "יוצר הכסף",
  },
  {
    en: "Mr. Money Bags",
    he: "מר שקי כסף",
  },
  {
    en: "The Investor",
    he: "המשקיע",
  },
  {
    en: "The Philanthropist",
    he: "הפילנתרופ",
  },
  {
    en: "Richie Rich",
    he: "העשירון",
  },
  {
    en: "The Banker",
    he: "הבנקאי",
  },
  {
    en: "Cash Cow",
    he: "פרת המשק",
  },
  {
    en: "Money Tree",
    he: "עץ הכסף",
  },
  {
    en: "The Frugal",
    he: "החסכן",
  },
  {
    en: "The Tightwad",
    he: "הקמצן",
  },
  {
    en: "Mr. Big Bucks",
    he: "מר שטרות גדולים",
  },
  {
    en: "The Spendthrift",
    he: "בזבזן",
  },
  {
    en: "The Bargain Shopper",
    he: "צייד המבצעים",
  },
  {
    en: "The Mooch",
    he: "הפריזיית",
  },
  {
    en: "Money Grubber",
    he: "אוהב הממון",
  },
  {
    en: "The Ladies Man",
    he: "הפלרטטן הגדול",
  },
  {
    en: "The Scrooge",
    he: "הקמצן",
  },
  {
    en: "Mr. Big Spender",
    he: "בעל ההוצאות הגדולות",
  },
  {
    en: "Wallet Watch",
    he: "שומר הארנק",
  },
  {
    en: "The Stingy One",
    he: "הקמצן",
  },
  {
    en: "The Glutton",
    he: "התאווה",
  },
  {
    en: "The Miserly One",
    he: "הקמצני",
  },
  {
    en: "The Hoarder",
    he: "האגרן",
  },
  {
    en: "The Penny Pincher",
    he: "חוסך הפרוטות",
  },
  {
    en: "Heshy",
    he: "חשוי",
  },
  {
    en: "The Tightwad",
    he: "הקמצן",
  },
  {
    en: "The Big Saver",
    he: "החוסך הגדול",
  },
  {
    en: "Money Bags",
    he: "שקי כסף",
  },
  {
    en: "Dollar Man",
    he: "איש הדולרים",
  },
  {
    en: "The Thrift",
    he: "החסכן",
  },
  {
    en: "Mr. Cash Flow",
    he: "מר תזרים מזומנים",
  },
  {
    en: "The Cost Cutter",
    he: "חותך העלויות",
  },
  {
    en: "The Skinflint",
    he: "הקמצן",
  },
  {
    en: "The Money Saver",
    he: "חוסך הכסף",
  },
  {
    en: "Cash Cow",
    he: "הפרה המניבה",
  },
  {
    en: "The Saver",
    he: "החוסך",
  },
  {
    en: "Penny Pincher",
    he: "טובע המטבעות",
  },
  {
    en: "The Generous One",
    he: "הנדיב",
  },
  {
    en: "Money Bags McGee",
    he: "שקי כסף מק'גי",
  },
  {
    en: "The Deep Pockets",
    he: "עמוק הכיסים",
  },
  {
    en: "The Wealthy One",
    he: "העשיר",
  },
  {
    en: "Mr. Money Maker",
    he: "מר עושה הכסף",
  },
  {
    en: "The Rich One",
    he: "העשיר",
  },
  {
    en: "The Thrifty One",
    he: "החסכן",
  },
  {
    en: "Ms. Frugal",
    he: "הגברת החסכנית",
  },
];
