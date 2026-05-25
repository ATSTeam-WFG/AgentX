'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPushState, requestAndSubscribe, type PushState } from '@/lib/push'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = 'unknown' | 'available' | 'ios-prompt' | 'installed'

const KEY_INSTALL = 'agentx_install_dismissed'
const KEY_NOTIF   = 'agentx_notif_dismissed'

export function usePwaPrompts() {
  // Start pessimistic so banners don't flash during hydration
  const [installDismissed, setInstallDismissed] = useState(true)
  const [notifDismissed, setNotifDismissed]     = useState(true)
  const [installState, setInstallState]         = useState<InstallState>('unknown')
  const [pushState, setPushState]               = useState<PushState>('unsupported')
  const [deferredPrompt, setDeferredPrompt]     = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setInstallDismissed(!!localStorage.getItem(KEY_INSTALL))
    setNotifDismissed(!!localStorage.getItem(KEY_NOTIF))
    setPushState(getPushState())

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true

    if (standalone) {
      setInstallState('installed')
    } else if (ios) {
      setInstallState('ios-prompt')
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallState('available')
    }
    const onInstalled = () => {
      setInstallState('installed')
      setInstallDismissed(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'dismissed') {
      localStorage.setItem(KEY_INSTALL, '1')
      setInstallDismissed(true)
    }
  }, [deferredPrompt])

  const dismissInstall = useCallback(() => {
    localStorage.setItem(KEY_INSTALL, '1')
    setInstallDismissed(true)
  }, [])

  const enableNotifications = useCallback(async () => {
    const result = await requestAndSubscribe()
    setPushState(getPushState())
    if (result !== 'granted') {
      localStorage.setItem(KEY_NOTIF, '1')
      setNotifDismissed(true)
    }
  }, [])

  const dismissNotif = useCallback(() => {
    localStorage.setItem(KEY_NOTIF, '1')
    setNotifDismissed(true)
  }, [])

  // ios-prompt means iOS + not standalone → push won't work until installed
  const canPush = installState !== 'ios-prompt'

  const showInstallPrompt = !installDismissed && installState === 'available'
  const showIosInstall    = !installDismissed && installState === 'ios-prompt'
  // Only show notif prompt when not already showing an install prompt
  const showNotifPrompt   = !notifDismissed && pushState === 'default' && canPush &&
                            !showInstallPrompt && !showIosInstall

  return {
    showInstallPrompt,
    showIosInstall,
    showNotifPrompt,
    installApp,
    dismissInstall,
    enableNotifications,
    dismissNotif,
  }
}
