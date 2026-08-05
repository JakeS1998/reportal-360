// Alabama ALSDE Report Card discovery provider.
// Implements the provider interface: discoverSystems() and discoverSchoolsForSystem(systemCode).
// Uses the DevExpress ASPxComboBox callback protocol on SelectSchool.aspx.
//
// NOTE: The ALSDE dropdowns load items via DevExpress virtual-scrolling callbacks that
// normally require client-side JS execution. This provider replicates the callback request
// (viewstate + session cookie + anti-forgery token + LECCP/LBCRI callback params). If the
// site changes its callback contract, item retrieval may return empty — errors are surfaced.

const BASE = "https://reportcard.alsde.edu/SelectSchool.aspx";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const providerInfo = { name: "Alabama", state: "AL", source: BASE };

async function fetchWithRetry(url, opts, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function getSession() {
  const r = await fetchWithRetry(BASE, { headers: { "User-Agent": UA } });
  const html = await r.text();
  const cookie = (r.headers.get("set-cookie") || "")
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
  const vs = html.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/);
  const vsg = html.match(/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
  const ev = html.match(/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/);
  const rvt = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/);
  return {
    html,
    cookie,
    vs: vs ? vs[1] : "",
    vsg: vsg ? vsg[1] : "",
    ev: ev ? ev[1] : "",
    rvt: rvt ? rvt[1] : "",
  };
}

function formatArg(prefix, arg) {
  arg = arg == null ? "" : String(arg);
  return prefix + "|" + arg.length + ";" + arg + ";";
}

async function doCallback(session, callbackId, param, extraFields) {
  const fields = {
    __CALLBACKID: callbackId,
    __CALLBACKPARAM: param,
    __VIEWSTATE: session.vs,
    __VIEWSTATEGENERATOR: session.vsg,
    __EVENTVALIDATION: session.ev,
    "ctl00$CPH_ReportCard$ddlReportYear": "2024-2025",
    "ctl00$CPH_ReportCard$ddlSystem": (extraFields && extraFields.system) || "",
    "ctl00$CPH_ReportCard$ddlSchool": "",
    "ctl00$CPH_ReportCard$txtAppHeader": "ALSDEREPORTCARDHTTPHEADER",
  };
  if (session.rvt) fields["__RequestVerificationToken"] = session.rvt;
  const res = await fetchWithRetry(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": UA,
      Referer: BASE,
      Origin: "https://reportcard.alsde.edu",
      Cookie: session.cookie,
    },
    body: new URLSearchParams(fields).toString(),
  });
  return await res.text();
}

function parseDxResult(text) {
  const m = text.match(/\/\*DX\*\/\((\{[\s\S]*\})\)/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function parseItems(resultHtml) {
  if (!resultHtml) return [];
  const items = [];
  // DevExpress list box item rows: value in the row id or a value attribute; text in the cell.
  const re = /<tr[^>]*id="[^"]*_LBI-\d+"[^>]*>[\s\S]*?<td[^>]*class="dxeListBoxItem"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  let m;
  while ((m = re.exec(resultHtml)) !== null) {
    const text = m[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (text) items.push({ text });
  }
  // Fallback: try to capture value attributes too
  const re2 = /<tr[^>]*_LBI-\d+"[^>]*value="([^"]*)"[^>]*>[\s\S]*?class="dxeListBoxItem"[^>]*>([\s\S]*?)<\/td>/g;
  let m2;
  while ((m2 = re2.exec(resultHtml)) !== null) {
    items.push({ value: m2[1], text: m2[2].replace(/<[^>]*>/g, "").trim() });
  }
  return items;
}

export async function discoverSystems() {
  const session = await getSession();
  // ddlSystem.PerformCallback() with no arg -> LECCP custom perform + LBCRI load range
  const param = formatArg("LECCP", "") + formatArg("LBCRI", "0:9999");
  const resp = await doCallback(session, "ctl00$CPH_ReportCard$ddlSystem", param);
  const dx = parseDxResult(resp);
  if (dx && dx.error) return { systems: [], error: dx.error.message, raw: resp.slice(0, 200) };
  const items = parseItems(dx && dx.result ? dx.result : "");
  if (!items.length) {
    return { systems: [], error: "No systems returned — DevExpress callback did not yield items (client-side JS may be required).", raw: resp.slice(0, 200) };
  }
  return {
    systems: items.map((i) => ({
      system_code: i.value || extractCode(i.text),
      district_name: i.text,
    })),
    error: null,
  };
}

function extractCode(text) {
  const m = text.match(/\((\d+)\)/);
  return m ? m[1] : text;
}

export async function discoverSchoolsForSystem(systemCode, systemName) {
  const session = await getSession();
  // Select the system via callback (sets server-side ddlSystem), then load schools.
  const selectParam = formatArg("LECCP", systemCode);
  await doCallback(session, "ctl00$CPH_ReportCard$ddlSystem", selectParam, { system: systemCode });
  const loadParam = formatArg("LECCP", "") + formatArg("LBCRI", "0:9999");
  const resp = await doCallback(session, "ctl00$CPH_ReportCard$ddlSchool", loadParam, { system: systemCode });
  const dx = parseDxResult(resp);
  if (dx && dx.error) return { schools: [], error: dx.error.message };
  const items = parseItems(dx && dx.result ? dx.result : "");
  if (!items.length) {
    return { schools: [], error: "No schools returned for system " + systemCode };
  }
  return {
    schools: items.map((i) => ({
      system_code: systemCode,
      school_code: i.value || extractCode(i.text),
      school_name: i.text,
    })),
    error: null,
  };
}