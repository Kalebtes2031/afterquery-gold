// src/hooks/useRatingEligibility.ts
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";

interface RatingConfig {
  id: string;
  name: string;
  isActive: boolean;
  questions: Array<{
    id: string;
    text: string;
    type: "rating" | "text" | "yesno";
    required: boolean;
  }>;
  eligibility: {
    minDeliveredOrders: number;
    maxDeliveredOrders?: number | null;
    excludeRecentRaters?: boolean;
    daysBeforeRerate?: number | null;
  };
  displaySettings: {
    triggerType: "onPage" | "afterAction";
    pages?: string[] | null;
    afterAction?: "orderPlaced" | "orderDelivered" | null;
    delaySeconds?: number | null;
  };
}

interface EligibilityResult {
  isEligible: boolean;
  config: RatingConfig | null;
  loading: boolean;
}

export const useRatingEligibility = (
  currentPage?: string,
  triggerAction?: "orderPlaced" | "orderDelivered",
): EligibilityResult => {
  const { user } = useAuth();
  const [result, setResult] = useState<EligibilityResult>({
    isEligible: false,
    config: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setResult({ isEligible: false, config: null, loading: false });
      return;
    }

    const checkEligibility = async () => {
      try {
        // 1. Get all active configs
        const configsQuery = query(
          collection(db, "ratingConfigs"),
          where("isActive", "==", true),
        );
        const configsSnapshot = await getDocs(configsQuery);

        if (configsSnapshot.empty) {
          setResult({ isEligible: false, config: null, loading: false });
          return;
        }

        // 2. Count orders for this user.  For the "orderPlaced" trigger we count all orders
        // (pending or otherwise) since the rating needs to appear immediately after placement.
        // For other cases we only consider delivered orders because previous logic treated
        // minDeliveredOrders as a delivered‑orders threshold.
        let orderCount = 0;
        if (triggerAction === "orderPlaced") {
          const ordersQuery = query(
            collection(db, "laundryOrders"),
            where("customerId", "==", user.uid),
          );
          const ordersSnapshot = await getDocs(ordersQuery);
          orderCount = ordersSnapshot.size;
        } else {
          const ordersQuery = query(
            collection(db, "laundryOrders"),
            where("customerId", "==", user.uid),
            where("status", "==", "delivered"),
          );
          const ordersSnapshot = await getDocs(ordersQuery);
          orderCount = ordersSnapshot.size;
        }

        // 3. Find matching config
        for (const configDoc of configsSnapshot.docs) {
          const config = {
            id: configDoc.id,
            ...configDoc.data(),
          } as RatingConfig;

          // Check order count eligibility.  We still refer to the field as
          // minDeliveredOrders since that's what the admin UI uses, but it now
          // represents "min orders" when evaluating an orderPlaced trigger.
          const { minDeliveredOrders, maxDeliveredOrders } = config.eligibility;
          if (orderCount < minDeliveredOrders) continue;
          if (maxDeliveredOrders && orderCount > maxDeliveredOrders) continue;

          // Check if user already rated this config
          const ratingsQuery = query(
            collection(db, "customerRatings"),
            where("customerId", "==", user.uid),
            where("configId", "==", config.id),
            orderBy("submittedAt", "desc"),
            limit(1),
          );
          const ratingsSnapshot = await getDocs(ratingsQuery);

          if (!ratingsSnapshot.empty) {
            // User has rated this config before
            const lastRating = ratingsSnapshot.docs[0].data();

            if (
              config.eligibility.excludeRecentRaters &&
              config.eligibility.daysBeforeRerate
            ) {
              const lastRatedDate = lastRating.submittedAt?.toDate();
              const daysSinceRating = lastRatedDate
                ? Math.floor(
                    (Date.now() - lastRatedDate.getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : 999;

              if (daysSinceRating < config.eligibility.daysBeforeRerate) {
                continue; // Too soon to rate again
              }
            } else {
              continue; // Already rated and no re-rating allowed
            }
          }

          // Check trigger type match
          const { triggerType, pages, afterAction } = config.displaySettings;

          if (triggerType === "onPage") {
            if (currentPage && pages && pages.includes(currentPage)) {
              setResult({ isEligible: true, config, loading: false });
              return;
            }
          }

          if (triggerType === "afterAction") {
            if (triggerAction && afterAction === triggerAction) {
              setResult({ isEligible: true, config, loading: false });
              return;
            }
          }
        }

        // No matching config found
        setResult({ isEligible: false, config: null, loading: false });
      } catch (error) {
        console.error("Error checking rating eligibility:", error);
        setResult({ isEligible: false, config: null, loading: false });
      }
    };

    checkEligibility();
  }, [user, currentPage, triggerAction]);

  return result;
};
