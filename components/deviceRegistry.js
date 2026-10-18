import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getLocales } from "expo-localization";
import axios from "axios";

// Anonymous device registry in Supabase (see Juba-backend/supabase/schema.sql).
// The anon key is public by design; the tables are locked by RLS and the app
// can only call the register_device and record_tip functions.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const DEVICE_ID_KEY = "deviceId";
const ADS_DISABLED_KEY = "adsDisabled";

const isConfigured = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

const callRpc = (name, params) =>
  axios.post(`${SUPABASE_URL}/rest/v1/rpc/${name}`, params, {
    timeout: 10000,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

const createUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });

let deviceIdPromise = null;

// A random id created on first launch. It resets if the app is reinstalled.
export const getDeviceId = () => {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (saved) return saved;
      const id = createUuid();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      return id;
    })().catch((error) => {
      deviceIdPromise = null;
      throw error;
    });
  }
  return deviceIdPromise;
};

// The last known value, so ads stay hidden offline and before registering.
export const getCachedAdsDisabled = async () => {
  try {
    return (await AsyncStorage.getItem(ADS_DISABLED_KEY)) === "true";
  } catch {
    return false;
  }
};

// Records the device as seen now and returns whether its ads are disabled,
// or null when the registry can't be reached.
export const registerDevice = async ({ launch = false } = {}) => {
  if (!isConfigured()) return null;
  try {
    const locale = getLocales()[0];
    const { data } = await callRpc("register_device", {
      p_device_id: await getDeviceId(),
      p_platform: Platform.OS,
      p_app_version: Constants.expoConfig?.version ?? null,
      p_language: locale?.languageCode ?? null,
      p_region: locale?.regionCode ?? null,
      p_launch: launch,
    });
    const adsDisabled = data === true;
    await AsyncStorage.setItem(ADS_DISABLED_KEY, String(adsDisabled));
    return adsDisabled;
  } catch (error) {
    console.log("Error registering device:", error?.message ?? error);
    return null;
  }
};

export const recordTip = async ({ productId, orderId, price, currency, displayPrice }) => {
  if (!isConfigured()) return;
  try {
    await callRpc("record_tip", {
      p_device_id: await getDeviceId(),
      p_product_id: productId,
      p_order_id: orderId,
      p_price: price ?? null,
      p_currency: currency ?? null,
      p_display_price: displayPrice ?? null,
    });
  } catch (error) {
    console.log("Error recording tip:", error?.message ?? error);
  }
};
