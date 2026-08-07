// Alabama landmark scenes shared between the login homepage and transactional emails.
// Mirrors the SCENES array in src/pages/SelectSchool.jsx so emails match the homepage aesthetic.

export const SCENES = [
  { time: "morning", url: "https://images.unsplash.com/photo-1440582096070-fa5961d9d682?auto=format&fit=crop&w=1920&q=80", title: "Birmingham Skyline", location: "Birmingham, Alabama", fact: "Founded in 1871, Birmingham grew so fast it earned the nickname 'The Magic City.'" },
  { time: "morning", url: "https://images.unsplash.com/photo-1627063652902-a94b7d8df450?auto=format&fit=crop&w=1920&q=80", title: "Appalachian Foothills", location: "North Alabama", fact: "North Alabama marks the southern tip of the Appalachians — the oldest mountain range in North America." },
  { time: "morning", url: "https://images.unsplash.com/photo-1589747948711-64c21bee4019?auto=format&fit=crop&w=1920&q=80", title: "Lake Martin", location: "Central Alabama", fact: "With over 750 miles of shoreline, Lake Martin is one of the largest man-made lakes in the US." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1711048090288-1ccf17fc57a4?auto=format&fit=crop&w=1920&q=80", title: "Alabama Theatre", location: "Birmingham, Alabama", fact: "Opened in 1927 and dubbed the 'Showplace of the South,' it still hosts films and concerts." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1711048090328-1892e90ae260?auto=format&fit=crop&w=1920&q=80", title: "Archives & History Museum", location: "Montgomery, Alabama", fact: "Founded in 1901, it's the oldest state-funded archives agency in the United States." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1574723507385-265b5635e6c4?auto=format&fit=crop&w=1920&q=80", title: "Gulf Shores Harbor", location: "Gulf Shores, Alabama", fact: "Gulf Shores hosts the National Shrimp Festival each October, drawing over 200,000 visitors." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1659354264754-564df7e375da?auto=format&fit=crop&w=1920&q=80", title: "Coastal Boardwalk", location: "Gulf Shores, Alabama", fact: "Gulf State Park features over 28 miles of paved trails winding through nine distinct ecosystems." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1551292788-2031aee091a6?auto=format&fit=crop&w=1920&q=80", title: "Gulf Coast Waves", location: "Gulf Shores, Alabama", fact: "The warm Gulf waters make Alabama's coast a year-round destination for fishing and water sports." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1670872623631-cd88b0803d58?auto=format&fit=crop&w=1920&q=80", title: "Big Spring Park", location: "Huntsville, Alabama", fact: "Built around a natural spring that has flowed for over 10,000 years — the reason Huntsville was founded." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1711048090525-807f98902860?auto=format&fit=crop&w=1920&q=80", title: "Rocket Park", location: "Huntsville, Alabama", fact: "Established in 1960 at Redstone Arsenal, it displays rockets from the early days of the US space program." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1600388704262-530cb4af35d3?auto=format&fit=crop&w=1920&q=80", title: "Historic Huntsville", location: "Huntsville, Alabama", fact: "Huntsville was the first permanent settlement in Alabama, founded in 1805 and originally named Twickenham." },
  { time: "evening", url: "https://images.unsplash.com/photo-1728001528593-58c93982917b?auto=format&fit=crop&w=1920&q=80", title: "Downtown Montgomery", location: "Montgomery, Alabama", fact: "Montgomery has been Alabama's capital since 1846 and hosted the historic 1955 bus boycott." },
  { time: "evening", url: "https://images.unsplash.com/photo-1644578843995-b2cc1acbdf33?auto=format&fit=crop&w=1920&q=80", title: "Gulf Coast Sunset", location: "Gulf Shores, Alabama", fact: "Alabama's Gulf Coast boasts 32 miles of sugar-white sand beaches along the Gulf of Mexico." },
  { time: "evening", url: "https://images.unsplash.com/photo-1622409408503-f3ff61cc631b?auto=format&fit=crop&w=1920&q=80", title: "Huntsville Skyline", location: "Huntsville, Alabama", fact: "Huntsville is nicknamed 'The Rocket City' for its pivotal role in developing the Saturn V moon rocket." },
  { time: "evening", url: "https://images.unsplash.com/photo-1605813640975-0ef0ad36826a?auto=format&fit=crop&w=1920&q=80", title: "Saturn V Rocket", location: "Huntsville, Alabama", fact: "The Saturn V at the Space & Rocket Center is one of only three remaining and stands 363 feet tall." },
];

function timeOfDay(h: number): "morning" | "afternoon" | "evening" {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

export function pickScene(): typeof SCENES[number] {
  const tod = timeOfDay(new Date().getHours());
  const pool = SCENES.filter((s) => s.time === tod);
  const arr = pool.length ? pool : SCENES;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Builds a transactional email body with an Alabama landmark hero header,
// matching the login homepage's landmark card aesthetic.
export function buildEmailHtml(opts: {
  heading: string;
  message: string;
  code: string;
  footerNote: string;
}): string {
  const scene = pickScene();
  return `<div style="background:#0f172a;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.25);">
        <tr>
          <td style="background:#0f172a;line-height:0;">
            <img src="${scene.url}" alt="${scene.title}" width="560" style="width:100%;max-width:560px;display:block;" />
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:18px 24px 22px;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#fbbf24;font-weight:700;">This moment's Alabama Landmark</p>
            <p style="margin:0 0 2px;font-size:18px;font-weight:700;color:#ffffff;">${scene.title}</p>
            <p style="margin:0 0 10px;font-size:13px;color:#cbd5e1;">${scene.location}</p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#e2e8f0;border-top:1px solid rgba(255,255,255,0.15);padding-top:10px;">${scene.fact}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px;background:#ffffff;">
            <h2 style="margin:0 0 12px;color:#1e293b;font-size:22px;">${opts.heading}</h2>
            <p style="margin:0 0 20px;color:#475569;line-height:1.6;font-size:15px;">${opts.message}</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f8fafc;border-radius:8px;color:#1e293b;margin:0 0 20px;">${opts.code}</p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">${opts.footerNote}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;text-align:center;font-size:11px;color:#94a3b8;">ReportAL 360 · Alabama Education · 360° Insight · Better Outcomes</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</div>`;
}