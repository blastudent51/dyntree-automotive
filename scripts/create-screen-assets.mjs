import { mkdir, writeFile, readFile } from 'node:fs/promises';
await mkdir('public/screens', { recursive: true });
const styles = `<style>text{font-family:Arial,sans-serif;fill:#e0eceb} .muted{fill:#8ba6b7} .small{font-size:14px} .label{font-size:12px;letter-spacing:2px}</style>`;
const screens = {
  home: `<text x="115" y="155" font-size="30">Good morning.</text><text x="115" y="190" class="muted">Where shall we go?</text><rect x="105" y="230" width="450" height="220" rx="10" fill="#20323f"/><text x="135" y="265" class="label">NAVIGATION</text><path d="M120 420L230 370L230 320L440 320L490 280" fill="none" stroke="#a5e6df" stroke-width="7"/><circle cx="230" cy="370" r="10" fill="#d5f7ed"/><rect x="580" y="125" width="320" height="325" rx="10" fill="#1b2c38"/><text x="610" y="165" class="label">OPEN ROADS</text><text x="610" y="265" font-size="31">Dyntree Sessions</text><text x="610" y="300" class="muted">Ambient drive · Concept media</text><path d="M710 350L745 370L710 390Z" fill="#b4e4dd"/>`,
  navigation: `<defs><pattern id="map" width="75" height="60" patternUnits="userSpaceOnUse"><path d="M75 0H0V60" stroke="#34505f" fill="none" stroke-width="3"/></pattern></defs><rect x="100" y="120" width="810" height="340" fill="url(#map)"/><path d="M130 420L310 330L510 330L510 190L810 190" stroke="#afe4e2" fill="none" stroke-width="8"/><circle cx="510" cy="330" r="12" fill="#deffff"/><rect x="135" y="135" width="330" height="80" rx="10" fill="#1b303e"/><text x="165" y="165" font-size="22">Continue along River Road</text><text x="165" y="195" class="muted">2.4 miles · Illustrative route</text>`,
  carplay: `<text x="135" y="190" font-size="35">Your phone, connected.</text><text x="135" y="235" class="muted">CarPlay + Android Auto integration targets</text><rect x="135" y="285" width="720" height="120" rx="15" fill="#223747"/><text x="165" y="340" font-size="25">Phone projection area</text><text x="165" y="375" class="muted">Third-party interface not reproduced · Certification pending</text>`,
  media: `<rect x="130" y="150" width="250" height="270" rx="15" fill="#2c525e"/><path d="M225 250V335M225 270L300 248V315" stroke="#c0e5e1" stroke-width="7" fill="none"/><circle cx="212" cy="335" r="16" fill="#c0e5e1"/><circle cx="286" cy="315" r="16" fill="#c0e5e1"/><text x="430" y="205" class="label">DYNTREE SESSIONS</text><text x="430" y="265" font-size="46">Open roads</text><text x="430" y="310" class="muted">Ambient drive · Prototype media screen</text><path d="M590 350L625 370L590 390Z" fill="#c0e5e1"/>`,
  climate: `<text x="355" y="175" font-size="25">Cabin temperature</text><text x="350" y="325" font-size="130">70°</text><text x="190" y="285" font-size="60">−</text><text x="755" y="285" font-size="60">+</text><text x="320" y="390" class="muted">Dual-zone · AUTO · Physical controls retained</text>`,
  charging: `<text x="135" y="165" class="label">CHARGING CONCEPT</text><text x="135" y="290" font-size="105">68<tspan font-size="35">%</tspan></text><rect x="135" y="325" width="690" height="14" rx="7" fill="#304b5d"/><rect x="135" y="325" width="470" height="14" rx="7" fill="#bce9df"/><text x="135" y="395" font-size="25">144 kW</text><text x="390" y="395" font-size="25">12 min to 80%</text><text x="665" y="395" font-size="25">170 mi</text><text x="135" y="427" class="muted">Illustrative values only · Not a validated charge curve</text>`,
  drive: `<path d="M330 465L445 125M700 465L585 125" stroke="#a9dfe0" stroke-width="5" fill="none"/><rect x="477" y="300" width="80" height="110" rx="28" fill="#96bbc3"/><rect x="490" y="317" width="55" height="38" rx="12" fill="#294957"/><rect x="493" y="167" width="38" height="60" rx="10" fill="#4b7184"/><text x="100" y="510" class="small">Attentive driver required. The vehicle is not autonomous. Visualization concept only.</text>`,
  performance: `<text x="135" y="165" class="label">MULTIPLY / TRACK UI CONCEPT</text><text x="135" y="295" font-size="110">400<tspan font-size="33"> hp</tspan></text><text x="140" y="335" class="muted">Estimated peak output target</text><text x="590" y="245" font-size="62">~3.5 s</text><text x="590" y="290" class="muted">0–60 mph target</text><path d="M140 420L245 380L330 400L450 345L550 360L675 330L835 350" stroke="#a9e3e1" fill="none" stroke-width="4"/>`,
  cluster: `<text x="465" y="155" font-size="28">P</text><text x="425" y="320" font-size="170">0</text><text x="470" y="362" class="muted">mph</text><text x="135" y="425" font-size="24">68% battery</text><text x="650" y="425" font-size="24">170 mi estimated</text><path d="M215 330A295 170 0 0 1 795 330" stroke="#345363" fill="none" stroke-width="12"/><path d="M215 330A295 170 0 0 1 275 227" stroke="#a8d9dc" fill="none" stroke-width="12"/>`,
};
const newAssets = [];
for (const [mode, content] of Object.entries(screens)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img"><title>LIVI for Dyntree ${mode} interface design concept</title>${styles}<rect width="1000" height="560" rx="20" fill="#111f2a"/><rect x="0" y="0" width="1000" height="80" rx="20" fill="#182936"/><text x="35" y="49" font-size="24" letter-spacing="3">LIVI</text><text x="115" y="49" class="small muted">for Dyntree</text><text x="800" y="47" class="small">10:24 · 72°</text><text x="35" y="535" class="label">DYNTREE M1E</text><text x="610" y="535" class="label muted">INTERFACE DEVELOPMENT CONCEPT</text>${content}</svg>`;
  await writeFile(`public/screens/livi-${mode}.svg`, svg);
  newAssets.push({
    url: `/screens/livi-${mode}.svg`,
    alt: `LIVI for Dyntree ${mode} interface concept`,
    trim: null,
    paint: null,
    wheel: null,
    interior: null,
    angle: 'screen',
    category: 'technology',
    priority: 1,
    active: true,
  });
}
const assets = JSON.parse(await readFile('lib/generated-assets.json', 'utf8')).filter(
  (a) => a.category !== 'technology',
);
await writeFile(
  'lib/generated-assets.json',
  JSON.stringify([...assets, ...newAssets], null, 2) + '\n',
);
console.log('Created 9 exact, code-native LIVI screen mockups.');
