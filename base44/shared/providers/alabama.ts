// Alabama ALSDE Report Card discovery provider.
// Primary path: headless browser (Browserless) renders SelectSchool.aspx, opens the
// DevExpress dropdowns, scroll-loads all virtual items, and extracts them.
// Fallback: direct DevExpress callback (may not yield items without client-side JS).

const BASE = "https://reportcard.alsde.edu/SelectSchool.aspx";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const providerInfo = { name: "Alabama", state: "AL", source: BASE };

function hasBrowser() {
  return !!process.env.BROWSERLESS_API_KEY;
}

// ---- Browserless headless path ----

const BROWSER_ENDPOINT = "https://production-sfo.browserless.io/function";

const READ_COMBO_FN = `
const readCombo = async (page, name) => {
  return await page.evaluate(async (name) => {
    const ddl = ASPx.GetControlCollection().GetByName(name);
    if (!ddl) return [];
    const n = ddl.GetItemCount();
    const out = [];
    for (let i = 0; i < n; i++) {
      const it = ddl.GetItem(i);
      if (it && it.text) out.push({ value: it.value == null ? it.text : String(it.value), text: String(it.text) });
    }
    return out;
  }, name);
};
const waitForItems = async (page, name, timeoutMs = 20000) => {
  const start = Date.now();
  let last = -1, stable = 0;
  while (Date.now() - start < timeoutMs) {
    const n = await page.evaluate((name) => {
      const ddl = ASPx.GetControlCollection().GetByName(name);
      return ddl ? ddl.GetItemCount() : -1;
    }, name);
    if (n > 0) { if (n === last) { stable++; if (stable >= 2) return n; } else stable = 0; last = n; }
    await new Promise(r => setTimeout(r, 800));
  }
  return last;
};
`;

async function runBrowser(code, context) {
  const key = process.env.BROWSERLESS_API_KEY;
  const res = await fetch(`${BROWSER_ENDPOINT}?token=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, context }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: "Browserless returned non-JSON: " + text.slice(0, 200) }; }
  if (!res.ok) return { error: (data && (data.error || data.message)) || ("Browserless HTTP " + res.status) };
  // Browserless /function returns { data, type }
  return data.data || data;
}

const SYSTEMS_CODE = `
export default async ({ page, context }) => {
  await page.goto(context.url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => window.ASPx && ASPx.GetControlCollection && ASPx.GetControlCollection().GetByName("ddlSystem"), { timeout: 40000 });
  ${READ_COMBO_FN}
  const items = await readCombo(page, "ddlSystem");
  return { data: { items }, type: "application/json" };
}
`;

const SCHOOLS_CODE = `
export default async ({ page, context }) => {
  await page.goto(context.url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => window.ASPx && ASPx.GetControlCollection && ASPx.GetControlCollection().GetByName("ddlSystem"), { timeout: 40000 });
  ${READ_COMBO_FN}
  const results = {};
  for (const sys of context.systems) {
    await page.evaluate((code) => {
      const ddl = ASPx.GetControlCollection().GetByName("ddlSystem");
      try { ddl.SetValue(code); if (ddl.RaiseValueChangedEvent) ddl.RaiseValueChangedEvent(); } catch (e) {}
    }, sys.system_code);
    await waitForItems(page, "ddlSchool", 30000);
    const items = await readCombo(page, "ddlSchool");
    results[sys.system_code] = items;
  }
  return { data: { schools: results }, type: "application/json" };
}
`;

// ---- Public provider API ----

export async function discoverSystems() {
  if (hasBrowser()) {
    const data = await runBrowser(SYSTEMS_CODE, { url: BASE });
    if (data.error) return { systems: [], error: data.error, via: "browser" };
    const items = data.items || [];
    if (!items.length) return { systems: [], error: "Browser returned no systems", via: "browser" };
    return {
      systems: items.map((i) => ({ system_code: i.value, district_name: i.text })),
      error: null,
      via: "browser",
    };
  }
  return callbackDiscoverSystems();
}

export async function discoverSchoolsForSystems(systems) {
  if (hasBrowser()) {
    let data = await runBrowser(SCHOOLS_CODE, { url: BASE, systems });
    // Retry up to 2 times — the ALSDE page can be slow to initialize its dropdown controls.
    for (let attempt = 0; attempt < 2 && data.error; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      data = await runBrowser(SCHOOLS_CODE, { url: BASE, systems });
    }
    if (data.error) return { results: {}, error: data.error, via: "browser" };
    const schools = data.schools || {};
    const out = {};
    for (const sys of systems) {
      const items = schools[sys.system_code] || [];
      out[sys.system_code] = items.map((i) => ({
        system_code: sys.system_code,
        school_code: i.value,
        school_name: i.text,
      }));
    }
    return { results: out, error: null, via: "browser" };
  }
  // Fallback: per-system callback
  const out = {};
  for (const sys of systems) {
    const r = await callbackDiscoverSchools(sys.system_code, sys.district_name);
    out[sys.system_code] = r.schools || [];
  }
  return { results: out, error: null, via: "callback" };
}

// ---- Callback fallback (may not yield items) ----

async function fetchWithRetry(url, opts, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try { return await fetch(url, opts); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 500 * (i + 1))); }
  }
  throw lastErr;
}

async function getSession() {
  const r = await fetchWithRetry(BASE, { headers: { "User-Agent": UA } });
  const html = await r.text();
  const cookie = (r.headers.get("set-cookie") || "").split(",").map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
  const vs = html.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/);
  const vsg = html.match(/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
  const ev = html.match(/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/);
  const rvt = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/);
  return { cookie, vs: vs ? vs[1] : "", vsg: vsg ? vsg[1] : "", ev: ev ? ev[1] : "", rvt: rvt ? rvt[1] : "" };
}

function formatArg(prefix, arg) {
  arg = arg == null ? "" : String(arg);
  return prefix + "|" + arg.length + ";" + arg + ";";
}

async function doCallback(session, callbackId, param, systemCode) {
  const fields = {
    __CALLBACKID: callbackId,
    __CALLBACKPARAM: param,
    __VIEWSTATE: session.vs,
    __VIEWSTATEGENERATOR: session.vsg,
    __EVENTVALIDATION: session.ev,
    "ctl00$CPH_ReportCard$ddlReportYear": "2024-2025",
    "ctl00$CPH_ReportCard$ddlSystem": systemCode || "",
    "ctl00$CPH_ReportCard$ddlSchool": "",
    "ctl00$CPH_ReportCard$txtAppHeader": "ALSDEREPORTCARDHTTPHEADER",
  };
  if (session.rvt) fields["__RequestVerificationToken"] = session.rvt;
  const res = await fetchWithRetry(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8", "User-Agent": UA, Referer: BASE, Origin: "https://reportcard.alsde.edu", Cookie: session.cookie },
    body: new URLSearchParams(fields).toString(),
  });
  return await res.text();
}

function parseDxResult(text) {
  const m = text.match(/\/\*DX\*\/\((\{[\s\S]*\})\)/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function callbackDiscoverSystems() {
  const session = await getSession();
  const param = formatArg("LECCP", "") + formatArg("LBCRI", "0:9999");
  const resp = await doCallback(session, "ctl00$CPH_ReportCard$ddlSystem", param);
  const dx = parseDxResult(resp);
  if (dx && dx.error) return { systems: [], error: dx.error.message, via: "callback" };
  return { systems: [], error: "No systems returned (set BROWSERLESS_API_KEY to enable headless discovery).", via: "callback" };
}

async function callbackDiscoverSchools(systemCode, systemName) {
  const session = await getSession();
  await doCallback(session, "ctl00$CPH_ReportCard$ddlSystem", formatArg("LECCP", systemCode), systemCode);
  const resp = await doCallback(session, "ctl00$CPH_ReportCard$ddlSchool", formatArg("LECCP", "") + formatArg("LBCRI", "0:9999"), systemCode);
  const dx = parseDxResult(resp);
  if (dx && dx.error) return { schools: [], error: dx.error.message };
  return { schools: [], error: "No schools returned (set BROWSERLESS_API_KEY to enable headless discovery)." };
}