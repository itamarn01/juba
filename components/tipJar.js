import { useCallback, useEffect, useRef, useState } from "react";
import { useIAP, getAvailablePurchases, isUserCancelledError } from "expo-iap";
import { getDeviceId, recordTip } from "./deviceRegistry";

// Consumable in-app products, created in Play Console under
// Monetize with Play -> Products -> In-app products. Smallest first.
export const TIP_SKUS = ["tip_small", "tip_medium", "tip_large"];

// "Buy me a coffee" tips through Google Play Billing. products is empty until
// the store answers (and stays empty where the products don't exist, e.g. iOS).
export const useTipJar = ({ onThanks, onPending, onError } = {}) => {
  const callbacksRef = useRef({ onThanks, onPending, onError });
  callbacksRef.current = { onThanks, onPending, onError };
  const handledRef = useRef(new Set());
  const productsRef = useRef([]);
  const [buying, setBuying] = useState(false);

  // Records the tip and consumes it so the same tip can be bought again.
  // Google refunds purchases that aren't finished within 3 days.
  const completeTip = useCallback(async (purchase, finishTransaction) => {
    if (purchase.purchaseState !== "purchased") return false;
    const key = purchase.purchaseToken ?? purchase.id;
    if (handledRef.current.has(key)) return false;
    handledRef.current.add(key);
    const product = productsRef.current.find((p) => p.id === purchase.productId);
    await recordTip({
      productId: purchase.productId,
      orderId: purchase.transactionId ?? purchase.id ?? key,
      price: product?.price,
      currency: product?.currency,
      displayPrice: product?.displayPrice,
    });
    try {
      await finishTransaction({ purchase, isConsumable: true });
    } catch (error) {
      handledRef.current.delete(key);
      console.log("Error finishing tip:", error);
      return false;
    }
    return true;
  }, []);

  const finishRef = useRef(null);
  const { connected, products, fetchProducts, requestPurchase, finishTransaction } =
    useIAP({
      onPurchaseSuccess: async (purchase) => {
        if (!TIP_SKUS.includes(purchase.productId)) return;
        setBuying(false);
        if (purchase.purchaseState === "pending") {
          callbacksRef.current.onPending?.();
          return;
        }
        if (await completeTip(purchase, finishRef.current)) {
          callbacksRef.current.onThanks?.();
        }
      },
      onPurchaseError: (error) => {
        setBuying(false);
        if (!isUserCancelledError(error)) callbacksRef.current.onError?.(error);
      },
    });
  finishRef.current = finishTransaction;

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Load the tips, and finish tips left unfinished by an earlier session
  // (e.g. a pending payment that went through while the app was closed).
  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: TIP_SKUS, type: "in-app" }).catch((error) =>
      console.log("Error fetching tips:", error)
    );
    getAvailablePurchases()
      .then((purchases) =>
        purchases
          .filter((purchase) => TIP_SKUS.includes(purchase.productId))
          .forEach((purchase) => completeTip(purchase, finishTransaction))
      )
      .catch((error) => console.log("Error checking unfinished tips:", error));
  }, [connected]);

  const buyTip = useCallback(
    async (sku) => {
      if (buying) return;
      setBuying(true);
      try {
        await requestPurchase({
          request: {
            google: { skus: [sku], obfuscatedAccountId: await getDeviceId() },
            apple: { sku },
          },
          type: "in-app",
        });
      } catch (error) {
        setBuying(false);
        if (!isUserCancelledError(error)) callbacksRef.current.onError?.(error);
      }
    },
    [buying, requestPurchase]
  );

  const tips = TIP_SKUS.map((sku) => products.find((p) => p.id === sku)).filter(
    Boolean
  );
  return { tips, buyTip, buying };
};
