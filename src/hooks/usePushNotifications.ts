import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// VAPID public key — replace with your actual key from `npx web-push generate-vapid-keys`
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Check existing subscription
      (async () => {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch {
          // noop: registration may already be managed by vite-plugin-pwa
        }

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);

        // If the user logs in after permission was granted, keep DB subscription in sync.
        if (user && sub) {
          const subJson = sub.toJSON();
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint: subJson.endpoint!,
              p256dh: subJson.keys?.p256dh || "",
              auth: subJson.keys?.auth || "",
            },
            { onConflict: "endpoint" }
          );
        }
      })();
    }
  }, [user?.id]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") return false;

      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // noop
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Store subscription in Supabase for server-side push
      if (user) {
        const subJson = subscription.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: subJson.endpoint!,
            p256dh: subJson.keys?.p256dh || "",
            auth: subJson.keys?.auth || "",
          },
          { onConflict: "endpoint" }
        );
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Remove from Supabase
        if (user) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      return false;
    }
  }, [user]);

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe };
}
