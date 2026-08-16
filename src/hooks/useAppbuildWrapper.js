import { useEffect, useState } from "react";

const getWrapper = () => (typeof window === "undefined" ? null : window.AppbuildWrapper);
const waitForReady = (wrapper) => Promise.race([wrapper.ready, new Promise((resolve) => setTimeout(() => resolve(null), 500))]);

export function useAppbuildWrapper() {
  const [state, setState] = useState({ isWrapper: false, capabilities: [], wrapper: null });
  useEffect(() => {
    const wrapper = getWrapper();
    if (!wrapper) return undefined;
    let active = true;
    waitForReady(wrapper).then((info) => {
      if (active && info) setState({ isWrapper: true, capabilities: info.capabilities || wrapper.capabilities || [], wrapper });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return state;
}

export async function registerAppbuildPush() {
  try {
    const wrapper = getWrapper();
    if (!wrapper || sessionStorage.getItem("appbuildPushRegistered")) return;
    const info = await waitForReady(wrapper);
    if (!info) return;
    const capabilities = info.capabilities || wrapper.capabilities || [];
    if (!capabilities.includes("push")) return;
    if (typeof wrapper.push.register === "function") await wrapper.push.register();
    else {
      const permission = await wrapper.push.checkPermissions();
      if (permission?.receive !== "granted") await wrapper.push.requestPermissions();
      await wrapper.push.getToken();
    }
    sessionStorage.setItem("appbuildPushRegistered", "true");
  } catch {}
}