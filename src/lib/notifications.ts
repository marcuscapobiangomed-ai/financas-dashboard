import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Budget notification system.
 * Uses the Notification API for immediate alerts when spending exceeds thresholds.
 * Subscribes to Web Push via VAPID for server-side push when app is closed.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  const result = await Notification.requestPermission()
  return result
}

/** Show a local notification for budget alerts */
export function showBudgetAlert(sectionLabel: string, percentUsed: number, limit: number, total: number) {
  if (getNotificationPermission() !== 'granted') return

  const isOver = percentUsed >= 100
  const title = isOver
    ? `Limite ultrapassado: ${sectionLabel}`
    : `Alerta de orçamento: ${sectionLabel}`
  const body = isOver
    ? `Gasto R$ ${total.toFixed(2)} de R$ ${limit.toFixed(2)} (${Math.round(percentUsed)}%)`
    : `Você atingiu ${Math.round(percentUsed)}% do limite (R$ ${total.toFixed(2)} / R$ ${limit.toFixed(2)})`

  const icon = '/icon-192.svg'

  // Use SW registration if available, otherwise direct Notification
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon,
        badge: icon,
        tag: `budget-${sectionLabel}`,
        data: { type: 'budget-alert', section: sectionLabel },
      })
    })
  } else {
    new Notification(title, { body, icon, tag: `budget-${sectionLabel}` })
  }
}

/** Subscribe to Web Push and save subscription to Supabase */
export async function savePushSubscription(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return false

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      // Subscribe with VAPID public key
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('[push] Failed to save subscription:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[push] Subscription error:', err)
    return false
  }
}

/** Send push notification via Edge Function (server-side delivery) */
export async function sendPushNotification(title: string, body: string, tag?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: { title, body, tag },
    })
    if (error) {
      console.error('[push] Send error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[push] Send error:', err)
    return false
  }
}

/** Remove push subscription from Supabase */
export async function removePushSubscription(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
    }

    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  } catch (err) {
    console.error('[push] Unsubscribe error:', err)
  }
}
