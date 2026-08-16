const ignoredCodes = ["USER_CANCELLED", "PLUGIN_NOT_AVAILABLE"];

export const isIgnoredAppbuildError = (error) => ignoredCodes.includes(error?.code);

export async function nativeResultToFile(result, fallbackName = "attachment") {
  const item = result?.files?.[0] || result?.file || result;
  if (item instanceof File) return item;
  if (item?.blob instanceof Blob) return new File([item.blob], item.name || fallbackName, { type: item.blob.type || item.mimeType || "application/octet-stream" });
  if (item?.base64String) {
    const mimeType = item.mimeType || "image/jpeg";
    const response = await fetch(`data:${mimeType};base64,${item.base64String}`);
    return new File([await response.blob()], item.name || fallbackName, { type: mimeType });
  }
  const source = item?.webPath || item?.uri || item?.path || item?.dataUrl || item?.data;
  if (!source) throw new Error("The selected file could not be read.");
  const response = await fetch(source);
  const blob = await response.blob();
  return new File([blob], item?.name || fallbackName, { type: blob.type || item?.mimeType || "application/octet-stream" });
}

export async function pickAppbuildFile(wrapper, capabilities, fallbackName) {
  const canUseCamera = capabilities.includes("camera");
  if (canUseCamera) return nativeResultToFile(await wrapper.camera.getPhoto({ quality: 80 }), fallbackName);
  const picker = wrapper.plugin("CapgoFilePicker");
  return nativeResultToFile(await picker.pickFiles({ multiple: false }), fallbackName);
}