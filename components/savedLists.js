// Expense lists saved on the device.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "juba.savedLists.v1";

export async function loadSavedLists() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lists = raw ? JSON.parse(raw) : [];
    return Array.isArray(lists) ? lists : [];
  } catch (error) {
    console.log("Error loading saved lists:", error);
    return [];
  }
}

export async function writeSavedLists(lists) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}
