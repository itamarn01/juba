import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Animated,
  InputAccessoryView,
  BackHandler,
  DevSettings,
} from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
  InterstitialAd,
  AdEventType,
  mobileAds,
} from "react-native-google-mobile-ads";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { I18n } from "i18n-js";
import { Feather, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getLocales } from "expo-localization";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Haptics from "expo-haptics";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import DropDownPicker from "react-native-dropdown-picker";
import { requestTrackingPermission } from "react-native-tracking-transparency";
import Translations from "./components/languages";
import Currencies from "./components/currencies";
import { calculateSplit, sumExpenses } from "./components/settlement";
import { loadSavedLists, writeSavedLists } from "./components/savedLists";

SplashScreen.preventAutoHideAsync();
const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const GuideLineBaseWidth = 414;
const GuideLineBaseHeight = 896;
const horizontalScale = (size) => (windowWidth / GuideLineBaseWidth) * size;
const verticalScale = (size) => (windowHeight / GuideLineBaseHeight) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

const PURPLE = "#88209B";
const GRADIENT = ["#BD1865", "#88209B"];

let { languageCode, currencyCode: localeCurrencyCode } = getLocales()[0];
if (languageCode === "iw") {
  languageCode = "he";
}

const i18n = new I18n(Translations);
i18n.enableFallback = true;
i18n.defaultLocale = "en";
i18n.locale = Object.prototype.hasOwnProperty.call(Translations, languageCode)
  ? languageCode
  : "en";
i18n.missingBehavior = "guess";
const isRTL = i18n.locale === "he";

const isAndroid = Platform.OS === "android";
const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : isAndroid
  ? "ca-app-pub-8754599705550429/2706265136"
  : "ca-app-pub-8754599705550429/4186593720";
const adUnitId2 = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : isAndroid
  ? "ca-app-pub-8754599705550429/2522696253"
  : "ca-app-pub-8754599705550429/8937907272";
const adUnitIdInterstitial = __DEV__
  ? TestIds.INTERSTITIAL
  : isAndroid
  ? "ca-app-pub-8754599705550429/7575448434"
  : "ca-app-pub-8754599705550429/2597147010";
const adKeywords = ["fashion", "clothing", "food", "cooking", "fruit"];

const findCurrency = (code) => Currencies.find((item) => item.value === code);
const defaultCurrencyCode = findCurrency(localeCurrencyCode)
  ? localeCurrencyCode
  : "USD";

const inputAccessoryViewID = "uniqueID";
const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Accepts "12", "12.5", "12,50" (comma decimal keyboards) up to 9 digits.
const parseAmount = (text) => {
  const normalized = text.trim().replace(",", ".");
  if (!/^(\d{1,9}(\.\d{0,2})?|\.\d{1,2})$/.test(normalized)) return null;
  const value = parseFloat(normalized);
  return value > 0 ? value : null;
};

const formatAmount = (amount) =>
  amount.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });

// Returns "mustUpdate" when the major/minor version is behind, and
// "recommendToUpdate" when only the patch version is behind.
function getUpdateStatus(currentVersion, latestVersion) {
  const current = currentVersion.split(".").map(Number);
  const latest = latestVersion.split(".").map(Number);
  for (let i = 0; i < 2; i++) {
    const currentPart = current[i] || 0;
    const latestPart = latest[i] || 0;
    if (currentPart !== latestPart) {
      return currentPart < latestPart ? "mustUpdate" : "noUpdate";
    }
  }
  return (current[2] || 0) < (latest[2] || 0) ? "recommendToUpdate" : "noUpdate";
}

const showUpdateAlert = (title, message, mandatory) => {
  const openStore = () => {
    const link =
      Platform.OS === "ios"
        ? "https://apps.apple.com/il/app/juba/id6502645038?l=he"
        : "https://play.google.com/store/apps/details?id=com.gigtunetry.JUBA";
    Linking.openURL(link).catch((err) =>
      console.error("An error occurred", err)
    );
  };
  const buttons = [{ text: "Update", onPress: openStore }];
  if (!mandatory) buttons.unshift({ text: "Cancel", style: "cancel" });
  Alert.alert(title, message, buttons, { cancelable: false });
};

function useShake() {
  const translateX = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {}
    );
    translateX.setValue(0);
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((toValue) =>
        Animated.timing(translateX, {
          toValue,
          duration: 50,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [translateX]);
  return [{ transform: [{ translateX }] }, shake];
}

function useToast() {
  const [message, setMessage] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const show = useCallback(
    (text) => {
      clearTimeout(timer.current);
      setMessage(text);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(({ finished }) => finished && setMessage(null));
      }, 1800);
    },
    [opacity]
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return { message, opacity, show };
}

const AppText = ({ style, ...props }) => (
  <Text allowFontScaling={false} style={[styles.text, style]} {...props} />
);

const AppInput = forwardRef(({ style, ...props }, ref) => (
  <TextInput
    ref={ref}
    allowFontScaling={false}
    placeholderTextColor="#707070"
    inputAccessoryViewID={
      Platform.OS === "ios" ? inputAccessoryViewID : undefined
    }
    style={[styles.input, style]}
    {...props}
  />
));

const GradientButton = ({ title, icon, onPress, style, small }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.button, small && styles.buttonSmall]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={small ? 16 : 18}
          color="white"
          style={title ? styles.buttonIcon : null}
        />
      ) : null}
      {title ? (
        <AppText
          style={[styles.buttonText, small && styles.buttonTextSmall]}
          numberOfLines={1}
        >
          {title}
        </AppText>
      ) : null}
    </LinearGradient>
  </TouchableOpacity>
);

const OutlineButton = ({ title, icon, onPress, style, small }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.button, styles.outlineButton, small && styles.buttonSmall, style]}
  >
    {icon ? (
      <Feather
        name={icon}
        size={small ? 16 : 18}
        color={PURPLE}
        style={title ? styles.buttonIcon : null}
      />
    ) : null}
    {title ? (
      <AppText
        style={[
          styles.buttonText,
          styles.outlineButtonText,
          small && styles.buttonTextSmall,
        ]}
        numberOfLines={1}
      >
        {title}
      </AppText>
    ) : null}
  </TouchableOpacity>
);

const ToolbarButton = ({ icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.toolbarButton}>
    <Feather name={icon} size={20} color={PURPLE} />
    <AppText style={styles.toolbarButtonText} numberOfLines={1}>
      {label}
    </AppText>
  </TouchableOpacity>
);

const Avatar = ({ size = 32 }) => (
  <LinearGradient
    colors={GRADIENT}
    style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2 },
    ]}
  >
    <MaterialIcons name="emoji-people" size={size * 0.6} color="white" />
  </LinearGradient>
);

const CardHeader = ({ title, description }) => (
  <View style={styles.cardHeader}>
    <AppText style={styles.cardTitle}>{title}</AppText>
    <AppText style={styles.cardDescription}>{description}</AppText>
  </View>
);

const ErrorText = ({ message, style }) =>
  message ? (
    <Animated.View style={style}>
      <AppText style={styles.errorText}>{message}</AppText>
    </Animated.View>
  ) : null;

const ToastView = ({ toast, bottom }) =>
  toast.message ? (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { opacity: toast.opacity, bottom }]}
    >
      <AppText style={styles.toastText}>{toast.message}</AppText>
    </Animated.View>
  ) : null;

const StepIndicator = ({ currentStep, onStepPress }) => {
  const steps = [
    { number: 1, label: i18n.t("stepFriends") },
    { number: 2, label: i18n.t("stepExpenses") },
    { number: 3, label: i18n.t("stepParticipants") },
  ];
  return (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => {
        const active = step.number === currentStep;
        const done = step.number < currentStep;
        return (
          <React.Fragment key={step.number}>
            {index > 0 ? (
              <View
                style={[
                  styles.stepLine,
                  (active || done) && styles.stepLineActive,
                ]}
              />
            ) : null}
            <TouchableOpacity
              disabled={!done}
              onPress={() => onStepPress(step.number)}
              style={styles.stepItem}
            >
              {active || done ? (
                <LinearGradient colors={GRADIENT} style={styles.stepCircle}>
                  {done ? (
                    <Feather name="check" size={16} color="white" />
                  ) : (
                    <AppText style={styles.stepNumberActive}>
                      {step.number}
                    </AppText>
                  )}
                </LinearGradient>
              ) : (
                <View style={[styles.stepCircle, styles.stepCircleInactive]}>
                  <AppText style={styles.stepNumber}>{step.number}</AppText>
                </View>
              )}
              <AppText
                style={[styles.stepLabel, active && styles.stepLabelActive]}
                numberOfLines={1}
              >
                {step.label}
              </AppText>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const SaveListModal = ({
  visible,
  name,
  onChangeName,
  error,
  shakeStyle,
  onSave,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    navigationBarTranslucent
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
      <View style={styles.dialogCard}>
        <AppText style={styles.dialogTitle}>{i18n.t("saveListTitle")}</AppText>
        <AppText style={styles.cardDescription}>
          {i18n.t("saveListDesc")}
        </AppText>
        <Animated.View style={[styles.inputRow, shakeStyle]}>
          <AppInput
            value={name}
            onChangeText={onChangeName}
            placeholder={i18n.t("saveListPlaceholder")}
            maxLength={40}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSave}
            style={isRTL ? styles.inputRTL : null}
          />
        </Animated.View>
        <ErrorText message={error} />
        <View style={styles.dialogButtonsRow}>
          <OutlineButton
            title={i18n.t("cancelButton")}
            onPress={onClose}
            style={styles.flexButton}
          />
          <GradientButton
            icon="save"
            title={i18n.t("saveButton")}
            onPress={onSave}
            style={styles.flexButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

// The results body. Rendered in the scrollable results window and again in an
// off-screen full-height copy that is captured for sharing, because content
// scrolled out of view is not drawn and would come out blank in the image.
const ResultsContent = ({ friends, selectedIds, results, formatMoney }) => (
  <>
    <Image
      source={require("./assets/juba-spend.png")}
      style={styles.resultsImage}
      resizeMode="contain"
    />
    <AppText style={styles.resultsTitle}>
      {i18n.t("resultsTitle")}
    </AppText>
    <View style={styles.statsRow}>
      <View style={[styles.statBox, styles.statBoxTotal]}>
        <AppText style={styles.statLabel}>
          {i18n.t("totalExpenses")}
        </AppText>
        <AppText style={styles.statValue}>
          {formatMoney(results.total)}
        </AppText>
      </View>
      <View style={[styles.statBox, styles.statBoxPerFriend]}>
        <AppText style={styles.statLabel}>{i18n.t("perFriend")}</AppText>
        <AppText style={styles.statValue}>
          {formatMoney(results.perPerson)}
        </AppText>
      </View>
    </View>

    <AppText style={styles.sectionTitle}>
      {i18n.t("expenseBreakdown")}
    </AppText>
    {friends.map((friend) => {
      const selected = selectedIds.includes(friend.id);
      return (
        <View
          key={friend.id}
          style={[
            styles.breakdownRow,
            !selected && styles.breakdownRowMuted,
          ]}
        >
          <FontAwesome
            name="user-circle"
            size={18}
            color={selected ? PURPLE : "#9E9E9E"}
          />
          <AppText
            style={[styles.breakdownName, !selected && styles.mutedText]}
            numberOfLines={1}
          >
            {selected
              ? friend.name
              : `${friend.name} ${i18n.t("notParticipating")}`}
          </AppText>
          <AppText style={!selected ? styles.mutedText : null}>
            {formatMoney(sumExpenses(friend))}
          </AppText>
        </View>
      );
    })}

    <View style={styles.divider} />
    <AppText style={styles.sectionTitle}>{i18n.t("repayments")}</AppText>
    {results.transfers.length === 0 ? (
      <AppText style={styles.emptyText}>
        {i18n.t("noRepayments")}
      </AppText>
    ) : (
      results.transfers.map((transfer, index) => (
        <View key={index} style={styles.transferRow}>
          <View style={styles.transferPerson}>
            <FontAwesome name="user-circle" size={20} color={PURPLE} />
            <AppText style={styles.transferName} numberOfLines={2}>
              {transfer.from}
            </AppText>
          </View>
          <View style={styles.transferMiddle}>
            <AppText style={styles.transferPays} numberOfLines={1}>
              {i18n.t("pays")}
            </AppText>
            <Feather
              name={isRTL ? "arrow-left" : "arrow-right"}
              size={22}
              color={PURPLE}
            />
          </View>
          <View style={styles.transferPerson}>
            <FontAwesome name="user-circle" size={20} color={PURPLE} />
            <AppText style={styles.transferName} numberOfLines={2}>
              {transfer.to}
            </AppText>
          </View>
          <AppText style={styles.transferAmount} numberOfLines={1}>
            {formatMoney(transfer.amount)}
          </AppText>
        </View>
      ))
    )}
  </>
);

function Main() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({
    Varela: require("./assets/fonts/Varela.ttf"),
  });
  const [isTrackingPermission, setIsTrackingPermission] = useState(false);
  const [trackingPermissionProcessEnd, setTrackingPermissionProcessEnd] =
    useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [, setTranslationsVersion] = useState(0);

  // The current expense list.
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currencyCode, setCurrencyCode] = useState(defaultCurrencyCode);
  const [currentListName, setCurrentListName] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // Wizard inputs.
  const [friendName, setFriendName] = useState("");
  const [friendError, setFriendError] = useState("");
  const [payerId, setPayerId] = useState(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const [stepError, setStepError] = useState("");
  const descriptionInput = useRef(null);

  // Modals.
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveListName, setSaveListName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedListsVisible, setSavedListsVisible] = useState(false);
  const [savedLists, setSavedLists] = useState([]);
  const resultsShotRef = useRef(null);

  // Ads.
  const interstitialRef = useRef(null);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const awaitingAdRef = useRef(false);

  const [friendShakeStyle, shakeFriend] = useShake();
  const [expenseShakeStyle, shakeExpense] = useShake();
  const [stepShakeStyle, shakeStep] = useShake();
  const [saveShakeStyle, shakeSave] = useShake();
  const toast = useToast();

  const currencySymbol = findCurrency(currencyCode)?.symbol ?? currencyCode;
  const formatMoney = (amount) => `${currencySymbol}${formatAmount(amount)}`;
  const results = useMemo(
    () => calculateSplit(friends, selectedIds),
    [friends, selectedIds]
  );
  const appReady = (fontsLoaded || !!fontError) && trackingPermissionProcessEnd;

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await axios.get(
          "https://itamarn01.github.io/Juba-backend/components/languages.json",
          { timeout: 10000 }
        );
        if (response.data && typeof response.data === "object") {
          i18n.store(response.data);
          setTranslationsVersion((version) => version + 1);
        }
      } catch (error) {
        console.log("Error fetching translations:", error);
      }
    };

    const appVersionChecker = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version;
        if (!currentVersion) return;
        const response = await axios.get(
          "https://itamarn01.github.io/Juba-backend/components/version.json",
          { timeout: 10000 }
        );
        const latestVersion =
          Platform.OS === "ios"
            ? response.data.iosUpdatedVersion
            : response.data.updatedVersion;
        if (typeof latestVersion !== "string") return;
        const updateStatus = getUpdateStatus(currentVersion, latestVersion);
        if (updateStatus === "mustUpdate") {
          showUpdateAlert(
            "Update Required",
            "A new version of the app is available. Please update to continue using the app.",
            true
          );
        } else if (updateStatus === "recommendToUpdate") {
          showUpdateAlert(
            "Update Recommended",
            "A new version of the app is available. We recommend updating to the latest version.",
            false
          );
        }
      } catch (error) {
        console.log("error to fetch version", error);
      }
    };

    fetchTranslations();
    appVersionChecker();
  }, []);

  // Hebrew needs an RTL layout, which only applies after a reload.
  useEffect(() => {
    if (I18nManager.isRTL === isRTL) return;
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    if (__DEV__) {
      DevSettings.reload();
    } else {
      Updates.reloadAsync().catch((error) =>
        console.log("Error reloading for RTL:", error)
      );
    }
  }, []);

  useEffect(() => {
    const getTrackingPermission = async () => {
      try {
        const permission = await requestTrackingPermission();
        if (permission === "authorized") {
          setIsTrackingPermission(true);
        }
      } catch (error) {
        console.log("Error during tracking permissions request:", error);
      } finally {
        setTrackingPermissionProcessEnd(true);
        try {
          await mobileAds().initialize();
        } catch (error) {
          console.log("Error initializing ads:", error);
        }
      }
    };

    getTrackingPermission();
  }, []);

  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch(() => {});
    setShowDescription(true);
  }, [appReady]);

  useEffect(() => {
    if (!trackingPermissionProcessEnd) return;
    const interstitial = InterstitialAd.createForAdRequest(
      adUnitIdInterstitial,
      {
        keywords: adKeywords,
        requestNonPersonalizedAdsOnly: !isTrackingPermission,
      }
    );
    interstitialRef.current = interstitial;
    let retryTimer = null;

    const showPendingResults = () => {
      if (awaitingAdRef.current) {
        awaitingAdRef.current = false;
        setResultsVisible(true);
      }
    };

    const unsubscribers = [
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        setInterstitialLoaded(true);
      }),
      interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log("Interstitial error:", error);
        setInterstitialLoaded(false);
        showPendingResults();
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => interstitial.load(), 30000);
      }),
      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        setInterstitialLoaded(false);
        interstitial.load();
        showPendingResults();
      }),
    ];

    interstitial.load();

    return () => {
      clearTimeout(retryTimer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      interstitialRef.current = null;
      setInterstitialLoaded(false);
    };
  }, [isTrackingPermission, trackingPermissionProcessEnd]);

  // Keep a valid payer selected in the expenses step.
  useEffect(() => {
    if (!friends.some((friend) => friend.id === payerId)) {
      setPayerId(friends[0]?.id ?? null);
    }
  }, [friends, payerId]);

  const clearErrors = () => {
    setFriendError("");
    setExpenseError("");
    setStepError("");
  };

  const goToStep = (step) => {
    Keyboard.dismiss();
    clearErrors();
    setCurrentStep(step);
  };

  // Android back button steps back through the wizard before leaving the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentStep > 1) {
          goToStep(currentStep - 1);
          return true;
        }
        return false;
      }
    );
    return () => subscription.remove();
  }, [currentStep]);

  const failStep = (message) => {
    setStepError(message);
    shakeStep();
  };

  const addFriend = () => {
    const name = friendName.trim();
    if (!name) {
      setFriendError(i18n.t("errorEnterName"));
      shakeFriend();
      return;
    }
    const nameTaken = friends.some(
      (friend) => friend.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (nameTaken) {
      setFriendError(i18n.t("errorNameExists"));
      shakeFriend();
      return;
    }
    const friend = { id: newId(), name, expenses: [] };
    setFriends((prev) => [...prev, friend]);
    setSelectedIds((prev) => [...prev, friend.id]);
    setFriendName("");
    clearErrors();
  };

  const removeFriend = (friend) => {
    const remove = () => {
      setFriends((prev) => prev.filter((item) => item.id !== friend.id));
      setSelectedIds((prev) => prev.filter((id) => id !== friend.id));
    };
    if (friend.expenses.length === 0) {
      remove();
      return;
    }
    Alert.alert("", i18n.t("confirmRemoveFriend", { name: friend.name }), [
      { text: i18n.t("cancelButton"), style: "cancel" },
      { text: i18n.t("removeButton"), style: "destructive", onPress: remove },
    ]);
  };

  const addExpense = () => {
    const amount = parseAmount(expenseAmount);
    if (!payerId || amount === null) {
      setExpenseError(i18n.t("errorInvalidExpense"));
      shakeExpense();
      return;
    }
    const expense = { id: newId(), amount };
    const description = expenseDescription.trim();
    if (description) expense.description = description;
    setFriends((prev) =>
      prev.map((friend) =>
        friend.id === payerId
          ? { ...friend, expenses: [...friend.expenses, expense] }
          : friend
      )
    );
    setExpenseAmount("");
    setExpenseDescription("");
    clearErrors();
  };

  const removeExpense = (friendId, expenseId) => {
    setFriends((prev) =>
      prev.map((friend) =>
        friend.id === friendId
          ? {
              ...friend,
              expenses: friend.expenses.filter((e) => e.id !== expenseId),
            }
          : friend
      )
    );
  };

  const toggleParticipant = (friendId) => {
    setStepError("");
    setSelectedIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const onNext = () => {
    if (currentStep === 1 && friends.length < 2) {
      failStep(i18n.t("errorMinFriends"));
      return;
    }
    if (
      currentStep === 2 &&
      !friends.some((friend) => friend.expenses.length > 0)
    ) {
      failStep(i18n.t("errorNoExpenses"));
      return;
    }
    goToStep(currentStep + 1);
  };

  // The results window opens only after the interstitial ad is closed.
  // If no ad could be loaded, the results open directly.
  const onCalculate = async () => {
    if (selectedIds.length === 0) {
      failStep(i18n.t("errorNoParticipants"));
      return;
    }
    if (awaitingAdRef.current) return;
    Keyboard.dismiss();
    setStepError("");
    const interstitial = interstitialRef.current;
    if (interstitialLoaded && interstitial) {
      awaitingAdRef.current = true;
      try {
        await interstitial.show();
      } catch (error) {
        console.log("Error showing interstitial:", error);
        awaitingAdRef.current = false;
        setResultsVisible(true);
      }
    } else {
      setResultsVisible(true);
    }
  };

  const shareResults = async () => {
    try {
      const uri = await captureRef(resultsShotRef, {
        format: "jpg",
        quality: 0.9,
        // The snapshot view is off-screen; iOS can only render it this way.
        useRenderInContext: Platform.OS === "ios",
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/jpeg",
        dialogTitle: i18n.t("share"),
        UTI: "public.jpeg",
      });
    } catch (error) {
      console.log("Error capturing and sharing image:", error);
    }
  };

  const resetList = () => {
    setFriends([]);
    setSelectedIds([]);
    setCurrentListName("");
    setFriendName("");
    setExpenseAmount("");
    setExpenseDescription("");
    goToStep(1);
  };

  const startNewList = () => {
    if (friends.length === 0) {
      resetList();
      return;
    }
    Alert.alert("", i18n.t("confirmNewList"), [
      { text: i18n.t("cancelButton"), style: "cancel" },
      {
        text: i18n.t("continueButton"),
        style: "destructive",
        onPress: resetList,
      },
    ]);
  };

  const openSaveModal = () => {
    if (friends.length === 0) {
      toast.show(i18n.t("errorNothingToSave"));
      return;
    }
    setSaveListName(currentListName);
    setSaveError("");
    setSaveModalVisible(true);
  };

  const saveCurrentList = async () => {
    const name = saveListName.trim();
    if (!name) {
      setSaveError(i18n.t("errorListName"));
      shakeSave();
      return;
    }
    const list = {
      id: newId(),
      name,
      savedAt: Date.now(),
      currency: currencyCode,
      friends,
      selectedIds,
    };
    try {
      const existing = await loadSavedLists();
      // Saving under an existing name replaces that list.
      const updated = [
        list,
        ...existing.filter(
          (item) => item.name.toLocaleLowerCase() !== name.toLocaleLowerCase()
        ),
      ];
      await writeSavedLists(updated);
      setSavedLists(updated);
      setCurrentListName(name);
      setSaveModalVisible(false);
      toast.show(i18n.t("listSaved"));
    } catch (error) {
      console.log("Error saving list:", error);
    }
  };

  const openSavedLists = async () => {
    setSavedLists(await loadSavedLists());
    setSavedListsVisible(true);
  };

  const loadList = (list) => {
    const apply = () => {
      const loadedFriends = Array.isArray(list.friends) ? list.friends : [];
      const friendIds = loadedFriends.map((friend) => friend.id);
      setFriends(loadedFriends);
      setSelectedIds(
        (Array.isArray(list.selectedIds) ? list.selectedIds : []).filter(
          (id) => friendIds.includes(id)
        )
      );
      if (findCurrency(list.currency)) setCurrencyCode(list.currency);
      setCurrentListName(list.name);
      setFriendName("");
      setExpenseAmount("");
      setExpenseDescription("");
      const complete =
        loadedFriends.length >= 2 &&
        loadedFriends.some((friend) => friend.expenses.length > 0);
      goToStep(complete ? 3 : 1);
      setSavedListsVisible(false);
      toast.show(i18n.t("listLoaded"));
    };
    if (friends.length === 0) {
      apply();
      return;
    }
    Alert.alert("", i18n.t("confirmLoadList", { name: list.name }), [
      { text: i18n.t("cancelButton"), style: "cancel" },
      { text: i18n.t("loadButton"), onPress: apply },
    ]);
  };

  const deleteList = (list) => {
    Alert.alert("", i18n.t("confirmDeleteList", { name: list.name }), [
      { text: i18n.t("cancelButton"), style: "cancel" },
      {
        text: i18n.t("deleteButton"),
        style: "destructive",
        onPress: async () => {
          const updated = savedLists.filter((item) => item.id !== list.id);
          setSavedLists(updated);
          try {
            await writeSavedLists(updated);
          } catch (error) {
            console.log("Error deleting list:", error);
          }
        },
      },
    ]);
  };

  const inputDirectionStyle = isRTL ? styles.inputRTL : null;

  const renderFriendsStep = () => (
    <>
      <CardHeader
        title={i18n.t("friendsTitle")}
        description={i18n.t("friendsDesc")}
      />
      <Animated.View style={[styles.inputRow, friendShakeStyle]}>
        <AppInput
          value={friendName}
          onChangeText={(text) => {
            setFriendName(text);
            setFriendError("");
          }}
          placeholder={i18n.t("friendNamePlaceholder")}
          maxLength={30}
          autoCapitalize="words"
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={addFriend}
          style={inputDirectionStyle}
        />
        <GradientButton
          small
          icon="plus"
          title={i18n.t("addButton")}
          onPress={addFriend}
          style={styles.inputRowButton}
        />
      </Animated.View>
      <ErrorText message={friendError} />
      {friends.length === 0 ? (
        <AppText style={styles.emptyText}>{i18n.t("noFriendsYet")}</AppText>
      ) : (
        friends.map((friend) => (
          <View key={friend.id} style={styles.listRow}>
            <Avatar />
            <AppText style={styles.listRowTitle} numberOfLines={1}>
              {friend.name}
            </AppText>
            <TouchableOpacity
              onPress={() => removeFriend(friend)}
              hitSlop={8}
            >
              <Feather name="x-circle" size={24} color="#BDBDBD" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </>
  );

  const renderExpensesStep = () => (
    <>
      <CardHeader
        title={i18n.t("expensesTitle")}
        description={i18n.t("expensesDesc")}
      />
      <AppText style={styles.fieldLabel}>{i18n.t("whoPaid")}</AppText>
      <View style={styles.chipsRow}>
        {friends.map((friend) => {
          const selected = friend.id === payerId;
          const chipContent = (
            <AppText
              style={[styles.chipText, selected && styles.chipTextSelected]}
              numberOfLines={1}
            >
              {friend.name}
            </AppText>
          );
          return (
            <TouchableOpacity
              key={friend.id}
              onPress={() => {
                setPayerId(friend.id);
                setExpenseError("");
              }}
            >
              {selected ? (
                <LinearGradient colors={GRADIENT} style={styles.chip}>
                  {chipContent}
                </LinearGradient>
              ) : (
                <View style={[styles.chip, styles.chipUnselected]}>
                  {chipContent}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Animated.View style={[styles.inputRow, expenseShakeStyle]}>
        <AppInput
          value={expenseAmount}
          onChangeText={(text) => {
            setExpenseAmount(text);
            setExpenseError("");
          }}
          placeholder={`${i18n.t("expenseAmountPlaceholder")} (${currencySymbol})`}
          keyboardType="decimal-pad"
          maxLength={12}
          returnKeyType="next"
          onSubmitEditing={() => descriptionInput.current?.focus()}
          style={[styles.amountInput, inputDirectionStyle]}
        />
        <AppInput
          ref={descriptionInput}
          value={expenseDescription}
          onChangeText={setExpenseDescription}
          placeholder={i18n.t("expenseDescriptionPlaceholder")}
          maxLength={40}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={addExpense}
          style={[styles.inputRowSecond, inputDirectionStyle]}
        />
      </Animated.View>
      <ErrorText message={expenseError} />
      <GradientButton
        icon="plus"
        title={i18n.t("addExpenseButton")}
        onPress={addExpense}
        style={styles.fullWidthButton}
      />
      <View style={styles.divider} />
      {friends.map((friend) => (
        <View key={friend.id} style={styles.expenseGroup}>
          <View style={styles.expenseGroupHeader}>
            <Avatar size={26} />
            <AppText style={styles.expenseGroupName} numberOfLines={1}>
              {friend.name}
            </AppText>
            {friend.expenses.length > 0 ? (
              <AppText style={styles.mutedText}>
                {i18n.t("totalLabel", {
                  amount: formatMoney(sumExpenses(friend)),
                })}
              </AppText>
            ) : null}
          </View>
          {friend.expenses.length === 0 ? (
            <AppText style={styles.emptyTextSmall}>
              {i18n.t("noExpensesYet")}
            </AppText>
          ) : (
            friend.expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <Feather name="tag" size={16} color="#BD1865" />
                <AppText style={styles.expenseDescription} numberOfLines={1}>
                  {expense.description || i18n.t("generalExpense")}
                </AppText>
                <AppText style={styles.expenseAmount}>
                  {formatMoney(expense.amount)}
                </AppText>
                <TouchableOpacity
                  onPress={() => removeExpense(friend.id, expense.id)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={18} color="#E53935" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      ))}
    </>
  );

  const renderParticipantsStep = () => (
    <>
      <CardHeader
        title={i18n.t("participantsTitle")}
        description={i18n.t("participantsDesc")}
      />
      <View style={styles.selectionButtonsRow}>
        <OutlineButton
          small
          icon="check-square"
          title={i18n.t("selectAll")}
          onPress={() => {
            setStepError("");
            setSelectedIds(friends.map((friend) => friend.id));
          }}
          style={styles.flexButton}
        />
        <OutlineButton
          small
          icon="square"
          title={i18n.t("clearSelection")}
          onPress={() => setSelectedIds([])}
          style={styles.flexButton}
        />
      </View>
      {friends.map((friend) => {
        const selected = selectedIds.includes(friend.id);
        return (
          <TouchableOpacity
            key={friend.id}
            onPress={() => toggleParticipant(friend.id)}
            activeOpacity={0.7}
            style={[
              styles.participantRow,
              selected && styles.participantRowSelected,
            ]}
          >
            <Feather
              name={selected ? "check-square" : "square"}
              size={24}
              color={selected ? PURPLE : "#9E9E9E"}
            />
            <AppText style={styles.participantName} numberOfLines={1}>
              {friend.name}
            </AppText>
            {friend.expenses.length > 0 ? (
              <AppText style={styles.mutedText}>
                {i18n.t("spentLabel", {
                  amount: formatMoney(sumExpenses(friend)),
                })}
              </AppText>
            ) : null}
          </TouchableOpacity>
        );
      })}
      <AppText style={styles.selectionSummary}>
        {selectedIds.length === 0
          ? i18n.t("noneSelected")
          : i18n.t("selectedCount", {
              count: selectedIds.length,
              total: friends.length,
            })}
      </AppText>
    </>
  );

  const renderResultsModal = () => (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      visible={resultsVisible}
      onRequestClose={() => setResultsVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.resultsCard,
            { maxHeight: windowHeight - insets.top - insets.bottom - 32 },
          ]}
        >
          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsContent}
          >
            <ResultsContent
              friends={friends}
              selectedIds={selectedIds}
              results={results}
              formatMoney={formatMoney}
            />
          </ScrollView>

          <View style={styles.dialogButtonsRow}>
            <GradientButton
              small
              icon="share-2"
              title={i18n.t("share")}
              onPress={shareResults}
              style={styles.flexButton}
            />
            <OutlineButton
              small
              icon="save"
              title={i18n.t("saveList")}
              onPress={openSaveModal}
              style={styles.flexButton}
            />
            <OutlineButton
              small
              title={i18n.t("close")}
              onPress={() => setResultsVisible(false)}
              style={styles.flexButton}
            />
          </View>
        </View>
        <View
          ref={resultsShotRef}
          collapsable={false}
          pointerEvents="none"
          style={[styles.resultsContent, styles.shareSnapshot]}
        >
          <ResultsContent
            friends={friends}
            selectedIds={selectedIds}
            results={results}
            formatMoney={formatMoney}
          />
        </View>
        <ToastView toast={toast} bottom={insets.bottom + 24} />
      </View>
      {/* Rendered inside the results modal so iOS can stack it on top. */}
      <SaveListModal
        visible={saveModalVisible && resultsVisible}
        name={saveListName}
        onChangeName={(text) => {
          setSaveListName(text);
          setSaveError("");
        }}
        error={saveError}
        shakeStyle={saveShakeStyle}
        onSave={saveCurrentList}
        onClose={() => setSaveModalVisible(false)}
      />
    </Modal>
  );

  const renderSavedListsModal = () => (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      visible={savedListsVisible}
      onRequestClose={() => setSavedListsVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.dialogCard,
            { maxHeight: windowHeight - insets.top - insets.bottom - 32 },
          ]}
        >
          <AppText style={styles.dialogTitle}>
            {i18n.t("savedListsTitle")}
          </AppText>
          <ScrollView style={styles.savedListsScroll}>
            {savedLists.length === 0 ? (
              <AppText style={styles.emptyText}>
                {i18n.t("noSavedLists")}
              </AppText>
            ) : (
              savedLists.map((list) => {
                const listFriends = Array.isArray(list.friends)
                  ? list.friends
                  : [];
                const listTotal = listFriends.reduce(
                  (sum, friend) => sum + sumExpenses(friend),
                  0
                );
                const listSymbol =
                  findCurrency(list.currency)?.symbol ?? currencySymbol;
                return (
                  <View key={list.id} style={styles.savedListRow}>
                    <TouchableOpacity
                      style={styles.savedListInfo}
                      onPress={() => loadList(list)}
                    >
                      <AppText style={styles.savedListName} numberOfLines={1}>
                        {list.name}
                      </AppText>
                      <AppText style={styles.mutedText} numberOfLines={1}>
                        {`${new Date(list.savedAt).toLocaleDateString()} · ${i18n.t(
                          "friendsCount",
                          { count: listFriends.length }
                        )} · ${listSymbol}${formatAmount(listTotal)}`}
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => loadList(list)}
                      hitSlop={6}
                      style={styles.savedListAction}
                    >
                      <Feather name="folder" size={22} color={PURPLE} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteList(list)}
                      hitSlop={6}
                      style={styles.savedListAction}
                    >
                      <Feather name="trash-2" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
          <OutlineButton
            title={i18n.t("close")}
            onPress={() => setSavedListsVisible(false)}
            style={styles.fullWidthButton}
          />
        </View>
      </View>
    </Modal>
  );

  const renderDescriptionModal = () => {
    const rtlTextStyle = {
      textAlign: isRTL ? "left" : "right",
      writingDirection: isRTL ? "rtl" : "ltr",
    };
    const features = [
      { icon: "users", title: "addFriendsTitle", desc: "addFriendsDesc" },
      { icon: "edit-3", title: "recordExpensesTitle", desc: "recordExpensesDesc" },
      {
        icon: "check-circle",
        title: "autoCalculationTitle",
        desc: "autoCalculationDesc",
      },
      { icon: "share-2", title: "easySharingTitle", desc: "easySharingDesc" },
    ];
    return (
      <Modal
        visible={showDescription}
        animationType="slide"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowDescription(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.descriptionCard}>
            <TouchableOpacity
              onPress={() => setShowDescription(false)}
              style={styles.descriptionClose}
            >
              <Feather name="x-circle" size={28} color={PURPLE} />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.descriptionContent}>
              <Text style={styles.descriptionTitle}>
                {i18n.t("whatIsJuba")}
              </Text>
              <Text style={styles.descriptionText}>
                {i18n.t("appDescription")}
              </Text>
              <View style={styles.featuresGrid}>
                {features.map((feature) => (
                  <View key={feature.icon} style={styles.featureRow}>
                    <Feather
                      name={feature.icon}
                      size={28}
                      color={PURPLE}
                      style={styles.featureIcon}
                    />
                    <View style={styles.featureTextContainer}>
                      <Text style={[styles.featureTitle, rtlTextStyle]}>
                        {i18n.t(feature.title)}
                      </Text>
                      <Text style={[styles.featureDesc, rtlTextStyle]}>
                        {i18n.t(feature.desc)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.howItWorksBox}>
                <Text style={[styles.howItWorksTitle, rtlTextStyle]}>
                  {i18n.t("howItWorksTitle")}
                </Text>
                {[1, 2, 3, 4, 5].map((step) => (
                  <Text key={step} style={[styles.howItWorksStep, rtlTextStyle]}>
                    {`${step}. ${i18n.t(`howStep${step}`)}`}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (!appReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          style={styles.loadingImage}
          source={require("./assets/JubaGif.gif")}
          resizeMode="contain"
        />
        <Text style={styles.loadingText}>loading...</Text>
      </View>
    );
  }

  const banner = (unitId) =>
    trackingPermissionProcessEnd ? (
      <View style={styles.banner}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: !isTrackingPermission,
          }}
        />
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={GRADIENT}
        style={[styles.header, { paddingTop: insets.top + verticalScale(12) }]}
      >
        <TouchableOpacity
          onPress={() => setShowDescription(true)}
          hitSlop={10}
          style={[styles.headerInfoButton, { top: insets.top + 10 }]}
        >
          <Feather name="info" size={24} color="white" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>JUBA</AppText>
        <AppText style={styles.headerSubtitle}>
          {i18n.t("expenseCalculator")}
        </AppText>
      </LinearGradient>

      <View style={styles.toolbar}>
        <View style={styles.currencyPicker}>
          <DropDownPicker
            open={currencyOpen}
            setOpen={setCurrencyOpen}
            value={currencyCode}
            setValue={setCurrencyCode}
            items={Currencies}
            listMode="MODAL"
            searchable
            searchPlaceholder={i18n.t("searchCurrency")}
            modalProps={{
              animationType: "slide",
              statusBarTranslucent: true,
              navigationBarTranslucent: true,
            }}
            modalContentContainerStyle={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            searchTextInputProps={{ maxLength: 25, allowFontScaling: false }}
            labelProps={{ numberOfLines: 1, allowFontScaling: false }}
          />
        </View>
        <ToolbarButton
          icon="folder"
          label={i18n.t("savedListsTitle")}
          onPress={openSavedLists}
        />
        <ToolbarButton
          icon="save"
          label={i18n.t("saveList")}
          onPress={openSaveModal}
        />
        <ToolbarButton
          icon="file-plus"
          label={i18n.t("newList")}
          onPress={startNewList}
        />
      </View>

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {banner(adUnitId)}
          <StepIndicator currentStep={currentStep} onStepPress={goToStep} />
          <View style={styles.card}>
            {currentStep === 1 ? renderFriendsStep() : null}
            {currentStep === 2 ? renderExpensesStep() : null}
            {currentStep === 3 ? renderParticipantsStep() : null}
          </View>
          <ErrorText message={stepError} style={stepShakeStyle} />
          <View style={styles.navRow}>
            {currentStep > 1 ? (
              <OutlineButton
                icon={isRTL ? "chevron-right" : "chevron-left"}
                title={i18n.t("previous")}
                onPress={() => goToStep(currentStep - 1)}
                style={styles.flexButton}
              />
            ) : (
              <View style={styles.flex} />
            )}
            {currentStep < 3 ? (
              <GradientButton
                title={i18n.t("next")}
                onPress={onNext}
                style={styles.flexButton}
              />
            ) : (
              <GradientButton
                icon="check-circle"
                title={i18n.t("calculate")}
                onPress={onCalculate}
                style={styles.flexButton}
              />
            )}
          </View>
          {banner(adUnitId2)}
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View style={styles.accessory}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
              <Text style={styles.accessoryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}

      <ToastView toast={toast} bottom={insets.bottom + 24} />
      {renderDescriptionModal()}
      {renderResultsModal()}
      {renderSavedListsModal()}
      <SaveListModal
        visible={saveModalVisible && !resultsVisible}
        name={saveListName}
        onChangeName={(text) => {
          setSaveListName(text);
          setSaveError("");
        }}
        error={saveError}
        shakeStyle={saveShakeStyle}
        onSave={saveCurrentList}
        onClose={() => setSaveModalVisible(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  text: {
    fontFamily: "Varela",
    color: "#2B2B2B",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  loadingImage: {
    width: horizontalScale(200),
    height: verticalScale(200),
  },
  loadingText: {
    fontSize: moderateScale(20),
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(14),
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  headerInfoButton: {
    position: "absolute",
    end: 16,
  },
  headerTitle: {
    color: "white",
    fontSize: moderateScale(44),
  },
  headerSubtitle: {
    color: "white",
    fontSize: 18,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  currencyPicker: {
    flex: 1,
    marginEnd: 4,
  },
  dropdown: {
    backgroundColor: "#fafafa",
    borderColor: "#CECECE",
    minHeight: 44,
  },
  dropdownText: {
    fontFamily: "Varela",
    fontSize: 14,
  },
  toolbarButton: {
    width: 60,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  toolbarButtonText: {
    fontSize: 10,
    color: PURPLE,
    marginTop: 2,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 4,
  },
  banner: {
    marginVertical: verticalScale(10),
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "92%",
    marginBottom: 12,
  },
  stepItem: {
    alignItems: "center",
    width: 84,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleInactive: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#BDBDBD",
  },
  stepNumber: {
    color: "#9E9E9E",
    fontSize: 15,
  },
  stepNumberActive: {
    color: "white",
    fontSize: 15,
  },
  stepLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#757575",
  },
  stepLabelActive: {
    color: PURPLE,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginTop: 15,
    backgroundColor: "#BDBDBD",
  },
  stepLineActive: {
    backgroundColor: PURPLE,
  },
  card: {
    backgroundColor: "white",
    borderRadius: moderateScale(12),
    width: "92%",
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#474747",
    fontSize: 22,
    textAlign: "center",
  },
  cardDescription: {
    color: "grey",
    textAlign: "center",
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#CECECE",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: "Varela",
    fontSize: 16,
    color: "#2B2B2B",
    backgroundColor: "white",
  },
  inputRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  inputRowButton: {
    marginStart: 8,
  },
  inputRowSecond: {
    flex: 1.6,
    marginStart: 8,
  },
  amountInput: {
    flex: 1,
  },
  errorText: {
    color: "#E53935",
    textAlign: "center",
    marginTop: 6,
  },
  emptyText: {
    color: "grey",
    textAlign: "center",
    paddingVertical: 16,
  },
  emptyTextSmall: {
    color: "#9E9E9E",
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 34,
  },
  mutedText: {
    color: "#9E9E9E",
    fontSize: 13,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  listRowTitle: {
    flex: 1,
    fontSize: 16,
    marginHorizontal: 10,
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  fieldLabel: {
    color: "#474747",
    fontSize: 15,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginEnd: 8,
    marginBottom: 8,
    maxWidth: horizontalScale(180),
  },
  chipUnselected: {
    borderWidth: 1,
    borderColor: "#CECECE",
    backgroundColor: "#FAFAFA",
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: "white",
  },
  fullWidthButton: {
    alignSelf: "stretch",
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 14,
    alignSelf: "stretch",
  },
  expenseGroup: {
    marginBottom: 12,
  },
  expenseGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  expenseGroupName: {
    flex: 1,
    fontSize: 16,
    marginHorizontal: 8,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F2F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  expenseDescription: {
    flex: 1,
    marginHorizontal: 8,
  },
  expenseAmount: {
    marginEnd: 12,
  },
  selectionButtonsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  participantRowSelected: {
    borderColor: "#D9B8E3",
    backgroundColor: "#F7F2F9",
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    marginHorizontal: 10,
  },
  selectionSummary: {
    color: "grey",
    textAlign: "center",
    marginTop: 12,
  },
  navRow: {
    flexDirection: "row",
    width: "92%",
    marginTop: 14,
  },
  button: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonSmall: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  buttonIcon: {
    marginEnd: 6,
  },
  buttonText: {
    color: "white",
    fontSize: 17,
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  outlineButton: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  outlineButtonText: {
    color: PURPLE,
  },
  flexButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dialogCard: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "90%",
    padding: 18,
    elevation: 6,
  },
  dialogTitle: {
    color: PURPLE,
    fontSize: 20,
    textAlign: "center",
    marginBottom: 6,
  },
  dialogButtonsRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  resultsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    width: windowWidth * 0.95,
    paddingBottom: 12,
    paddingHorizontal: 8,
    elevation: 6,
  },
  resultsScroll: {
    flexGrow: 0,
  },
  resultsContent: {
    backgroundColor: "white",
    padding: 12,
  },
  shareSnapshot: {
    position: "absolute",
    top: 0,
    left: windowWidth * 2,
    width: windowWidth * 0.95,
    paddingHorizontal: 20,
  },
  resultsImage: {
    width: horizontalScale(250),
    height: verticalScale(100),
    alignSelf: "center",
  },
  resultsTitle: {
    fontSize: moderateScale(22),
    textAlign: "center",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    alignItems: "center",
  },
  statBoxTotal: {
    backgroundColor: "#F3E6F8",
  },
  statBoxPerFriend: {
    backgroundColor: "#FDE7F0",
  },
  statLabel: {
    color: "#757575",
    fontSize: 13,
  },
  statValue: {
    fontSize: moderateScale(20),
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#474747",
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  breakdownRowMuted: {
    backgroundColor: "#FAFAFA",
  },
  breakdownName: {
    flex: 1,
    marginHorizontal: 8,
  },
  transferRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "grey",
  },
  transferPerson: {
    width: windowWidth * 0.2,
    alignItems: "center",
  },
  transferName: {
    fontSize: moderateScale(12),
    textAlign: "center",
    marginTop: 2,
  },
  transferMiddle: {
    alignItems: "center",
    marginHorizontal: 4,
  },
  transferPays: {
    fontSize: moderateScale(11),
  },
  transferAmount: {
    flex: 1,
    fontSize: moderateScale(16),
    textAlign: "center",
  },
  savedListsScroll: {
    marginVertical: 8,
  },
  savedListRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  savedListInfo: {
    flex: 1,
  },
  savedListName: {
    fontSize: 16,
    marginBottom: 2,
  },
  savedListAction: {
    paddingHorizontal: 8,
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(40, 40, 40, 0.9)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: "90%",
  },
  toastText: {
    color: "white",
    textAlign: "center",
  },
  accessory: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    alignItems: "center",
  },
  accessoryText: {
    color: "#007bff",
    fontSize: 16,
  },
  descriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: "90%",
    maxHeight: "85%",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    padding: 10,
  },
  descriptionClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  descriptionContent: {
    padding: 5,
    marginHorizontal: 20,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: PURPLE,
    textAlign: "center",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  featuresGrid: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: PURPLE,
  },
  featureDesc: {
    fontSize: 14,
    color: "#666",
  },
  howItWorksBox: {
    backgroundColor: "#F3E6F8",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  howItWorksTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
    color: PURPLE,
  },
  howItWorksStep: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
    paddingLeft: 8,
  },
});
