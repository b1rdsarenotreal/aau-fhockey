// Starting league: every member of the Association of American Universities
// with a varsity field hockey team, in the 2030 season after the AAU took over
// college athletics. Field hockey is women's only, so it is one dynasty.
//
// The program list is the owner's AAU Dynasty file (30 programs) less WashU,
// whose field hockey is a self-coached club, not a varsity team (washubears.com).
// Conferences are the commissioner's alignment from the AAU Dynasty: Maryland
// plays in the Coastal Atlantic Conference with Duke, North Carolina and
// Virginia, and Rutgers in the Metro with Boston University and Georgetown.
// Colors and mascots are each school's real ones.
//
// Ratings: ATT (attack), MID (midfield) and DEF (defense and goalkeeping),
// 40–99, stored as off / pit / def. OVR comes from each program's 2025 season:
// - The 2025 NCAA Division I tournament (Wikipedia, "2025 NCAA Division I field
//   hockey championship"): champion Northwestern (18-1 entering), runner-up
//   Princeton (15-3), semifinalists North Carolina (19-1, the No. 1 seed) and
//   Harvard (17-1); also in the field Virginia (16-2), Duke (12-7), Iowa
//   (14-5), Yale (12-5) and Boston University (8-10, Patriot League champion).
// - The 2025 Big Ten tournament bracket (bigten.org): Maryland 9-7, Michigan
//   9-6, Rutgers 9-8, Indiana 9-8, Ohio State 7-9.
// - School sites: Cornell 11-4 (4-3 Ivy), UC Davis 16-10 (MPSF runner-up),
//   Georgetown 1-5 in the Big East late in the season, Cal reached No. 19.
//   Penn State, Michigan State, Stanford, Brown, Penn, Columbia and Dartmouth
//   are placed by the 2026 Ivy and conference preseason polls and estimates.
// - Division III sits below Division I (OVR 45–55): Tufts won the 2025 NCAA
//   Division III title 2-1 in overtime over Johns Hopkins (22-2); Rochester
//   was the Liberty League favorite; MIT is an estimate.
//
// Head coaches are the real ones for 2026 (school athletics sites and the
// NFHCA's list of 2026 coaching changes): new in 2026 are Sarah Shute (Boston
// University, from MIT), Megan Caveny (MIT), Tamara Durante (Michigan State),
// Hannah Prince (Penn State), Jason Klinkradt (Dartmouth) and Tara Danielson
// (Cal, who leads the program with Steve Danielson). Home fields are from
// Wikipedia's list of Division I field hockey programs; the Division III
// fields are the schools' main turf fields.

import { DEFAULT_LOGOS } from './logo-import.js?v=20261103153000';

export const START_YEAR = 2030;

// The commissioner's conference alignment (from the AAU Dynasty), each with a
// logo drawn for these dynasties (img/conf/, made by tools/conf_logos.py,
// transparent backgrounds).
// Conference logos the owner picked from the web (linked, not copied; the
// drawn ones in img/conf/ stay for CAC, SWC, UCAA and as fallbacks).
export const CONF_LOGO_LINKS = {
  bigten: 'https://content.sportslogos.net/logos/153/4661/full/big_ten_conference_logo_primary_20115933.png',
  ivy: 'https://content.sportslogos.net/logos/153/4824/full/ivy_league_logo_primary_2019_sportslogosnet-9024.png',
  metro: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/METRO_Primary_LtBG.png/500px-METRO_Primary_LtBG.png',
  pac10: 'https://content.sportslogos.net/logos/153/4945/full/pacific-10_conference_logo_wordmark_1995_sportslogosnet-1134.png',
  uaa: 'https://dbukjj6eu5tsf.cloudfront.net/uaasports.info/images/responsive_2023/logo-main.svg',
};
const L = f => CONF_LOGO_LINKS[f] || `img/conf/${f}.svg`;
export const CONFERENCES = {
  'Big Ten': { abbr: 'B1G', color: '#0088CE', altColor: '#0B2A4A', logo: L('bigten') },
  'Coastal Atlantic Conference': { abbr: 'CAC', color: '#3A4A5C', altColor: '#5CC6C2', logo: L('cac') },
  'Ivy League': { abbr: 'IVY', color: '#026937', altColor: '#C9B37E', logo: L('ivy') },
  'Metro Conference': { abbr: 'METRO', color: '#E03A3E', altColor: '#23262D', logo: L('metro') },
  'Pacific-10 Conference': { abbr: 'P10', color: '#092346', altColor: '#D6A84B', logo: L('pac10') },
  'Southwest Conference': { abbr: 'SWC', color: '#719AE8', altColor: '#F28C38', logo: L('swc') },
  'UC Athletic Association': { abbr: 'UCAA', color: '#0F6E7A', altColor: '#F2C14E', logo: L('ucaa') },
  'University Athletic Association': { abbr: 'UAA', color: '#003087', altColor: '#F2B33D', logo: L('uaa') },
};

// [school, conference, abbr, mascot, color, altColor, OVR]
const TEAMS = [
  ['Northwestern', 'Big Ten', 'NU', 'Wildcats', '#4E2A84', '#FFFFFF', 92],
  ['Iowa', 'Big Ten', 'IOWA', 'Hawkeyes', '#000000', '#FFCD00', 80],
  ['Michigan', 'Big Ten', 'MICH', 'Wolverines', '#00274C', '#FFCB05', 75],
  ['Indiana', 'Big Ten', 'IND', 'Hoosiers', '#990000', '#EEEDEB', 70],
  ['Ohio State', 'Big Ten', 'OSU', 'Buckeyes', '#BB0000', '#666666', 68],
  ['Penn State', 'Big Ten', 'PSU', 'Nittany Lions', '#041E42', '#FFFFFF', 67],
  ['Michigan State', 'Big Ten', 'MSU', 'Spartans', '#18453B', '#FFFFFF', 63],
  ['North Carolina', 'Coastal Atlantic Conference', 'UNC', 'Tar Heels', '#7BAFD4', '#13294B', 91],
  ['Virginia', 'Coastal Atlantic Conference', 'UVA', 'Cavaliers', '#232D4B', '#E57200', 86],
  ['Duke', 'Coastal Atlantic Conference', 'DUKE', 'Blue Devils', '#00539B', '#FFFFFF', 81],
  ['Maryland', 'Coastal Atlantic Conference', 'MD', 'Terrapins', '#E21833', '#FFD200', 76],
  ['Princeton', 'Ivy League', 'PRIN', 'Tigers', '#E77500', '#000000', 88],
  ['Harvard', 'Ivy League', 'HARV', 'Crimson', '#A51C30', '#1E1E1E', 87],
  ['Yale', 'Ivy League', 'YALE', 'Bulldogs', '#00356B', '#FFFFFF', 77],
  ['Cornell', 'Ivy League', 'COR', 'Big Red', '#B31B1B', '#FFFFFF', 72],
  ['Brown', 'Ivy League', 'BRWN', 'Bears', '#4E3629', '#C00404', 64],
  ['Penn', 'Ivy League', 'PENN', 'Quakers', '#011F5B', '#990000', 62],
  ['Columbia', 'Ivy League', 'CLMB', 'Lions', '#1D4F91', '#9BCBEB', 60],
  ['Dartmouth', 'Ivy League', 'DART', 'Big Green', '#00693E', '#FFFFFF', 58],
  ['Rutgers', 'Metro Conference', 'RUTG', 'Scarlet Knights', '#CC0033', '#5F6A72', 70],
  ['Boston University', 'Metro Conference', 'BU', 'Terriers', '#CC0000', '#FFFFFF', 66],
  ['Georgetown', 'Metro Conference', 'GTWN', 'Hoyas', '#041E42', '#63666A', 58],
  ['California', 'Pacific-10 Conference', 'CAL', 'Golden Bears', '#003262', '#FDB515', 71],
  ['Stanford', 'Pacific-10 Conference', 'STAN', 'Cardinal', '#8C1515', '#FFFFFF', 70],
  ['UC Davis', 'UC Athletic Association', 'UCD', 'Aggies', '#022851', '#FFBF00', 64],
  ['Tufts', 'University Athletic Association', 'TUFT', 'Jumbos', '#3E8EDE', '#002E6D', 55],
  ['Johns Hopkins', 'University Athletic Association', 'JHU', 'Blue Jays', '#002D72', '#68ACE5', 54],
  ['Rochester', 'University Athletic Association', 'ROCH', 'Yellowjackets', '#001E5F', '#FFD100', 48],
  ['MIT', 'University Athletic Association', 'MIT', 'Engineers', '#A31F34', '#8A8B8C', 45],
];

// Home fields: [field, city].
export const SITES = {
  "Northwestern": ["Lakeside Field", "Evanston, Ill."],
  "Iowa": ["Dr. Christine H. B. Grant Field", "Coralville, Iowa"],
  "Michigan": ["Phyllis Ocker Field", "Ann Arbor, Mich."],
  "Indiana": ["Deborah Tobias Field", "Bloomington, Ind."],
  "Ohio State": ["Buckeye Varsity Field", "Columbus, Ohio"],
  "Penn State": ["Penn State Field Hockey Complex", "University Park, Pa."],
  "Michigan State": ["MSU Field Hockey Complex at Ralph Young Field", "East Lansing, Mich."],
  "North Carolina": ["Karen Shelton Stadium", "Chapel Hill, N.C."],
  "Virginia": ["University Hall Turf Field", "Charlottesville, Va."],
  "Duke": ["Jack Katz Stadium", "Durham, N.C."],
  "Maryland": ["Maryland Field Hockey & Lacrosse Complex", "College Park, Md."],
  "Princeton": ["Bedford Field", "Princeton, N.J."],
  "Harvard": ["Berylson Family Field Hockey Field", "Cambridge, Mass."],
  "Yale": ["Johnson Field", "New Haven, Conn."],
  "Cornell": ["Dodson Field", "Ithaca, N.Y."],
  "Brown": ["Goldberger Family Field", "Providence, R.I."],
  "Penn": ["Ellen Vagelos Field", "Philadelphia, Pa."],
  "Columbia": ["Columbia Field Hockey Stadium", "New York, N.Y."],
  "Dartmouth": ["Chase Astroturf Field", "Hanover, N.H."],
  "Rutgers": ["Bauer Track and Field/Field Hockey Complex", "New Brunswick, N.J."],
  "Boston University": ["Nickerson Field", "Boston, Mass."],
  "Georgetown": ["Cooper Field", "Washington, D.C."],
  "California": ["Maxwell Family Field", "Berkeley, Calif."],
  "Stanford": ["Varsity Field Hockey Stadium", "Stanford, Calif."],
  "UC Davis": ["Aggie Field Hockey Facility", "Davis, Calif."],
  "Tufts": ["Bello Field", "Medford, Mass."],
  "Johns Hopkins": ["Homewood Field", "Baltimore, Md."],
  "Rochester": ["Fauver Stadium", "Rochester, N.Y."],
  "MIT": ["Jack Barry Field", "Cambridge, Mass."],
};

// Names the logo lists may know a school by.
export const LOGO_ALIASES = { 'Penn': 'Pennsylvania' };

// Head coaches for the 2026 season (see above). By 2030 some will have moved
// on; rename anyone on the Coaches page.
export const COACHES = {
  "Northwestern": "Tracey Fuchs",
  "Iowa": "Lisa Cellucci",
  "Michigan": "Kristi Gannon Fisher",
  "Indiana": "Kayla Bashore",
  "Ohio State": "Jarred Martin",
  "Penn State": "Hannah Prince",
  "Michigan State": "Tamara Durante",
  "North Carolina": "Erin Matson",
  "Virginia": "Ole Keusgen",
  "Duke": "Pam Bustin",
  "Maryland": "Missy Meharg",
  "Princeton": "Carla Tagliente",
  "Harvard": "Tjerk van Herwaarden",
  "Yale": "Melissa Gonzalez",
  "Cornell": "Andy Smith",
  "Brown": "Britt Broady",
  "Penn": "Scott Tupper",
  "Columbia": "Niki Miller",
  "Dartmouth": "Jason Klinkradt",
  "Rutgers": "Meredith Civico",
  "Boston University": "Sarah Shute",
  "Georgetown": "Christy Banks",
  "California": "Tara Danielson",
  "Stanford": "Roz Ellis",
  "UC Davis": "Austin Pile",
  "Tufts": "Tina Mattera",
  "Johns Hopkins": "Jane Wells",
  "Rochester": "Wendy Andreatta",
  "MIT": "Megan Caveny",
};

function hashName(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }

export function makeTeam({ school, conference, abbr, mascot = '', coach = '', coachId = null, color = '#555555', altColor = '#dddddd', off = 65, pit = 65, def = 65, stadium, city }) {
  const known = SITES[school] || [];
  return {
    school, conference, abbr: abbr || school.replace(/[^A-Za-z ]/g, '').split(/\s+/).map(w => w[0]).join('').slice(0, 4).toUpperCase(),
    mascot, coach, coachId, color, altColor, off, pit, def, base: { off, pit, def }, logoOverride: null,
    stadium: stadium || known[0] || '', city: city || known[1] || '',
  };
}

// Gives a team its home field from SITES if it has none yet (older saves).
export function fillSite(t) {
  if (t.stadium !== undefined && t.city !== undefined) return;
  const known = SITES[t.school] || [];
  t.stadium ??= known[0] || '';
  t.city ??= known[1] || '';
}

// OVR → ATT / MID / DEF: each team leans a little one way (a high-scoring
// attack, a possession team, a stingy back line and goalkeeper), keeping the
// same OVR.
export function splitOvr(school, ovr) {
  const h = hashName(school);
  const a = (h % 7) - 3, b = ((h >>> 4) % 5) - 2;
  const off = ovr + a, pit = ovr + b, def = Math.round(ovr - (0.4 * a + 0.3 * b) / 0.3);
  const c = x => Math.max(40, Math.min(99, x));
  return { off: c(off), pit: c(pit), def: c(def) };
}

// Field hockey is one dynasty (women's only; no switch in the top bar).
// The side machinery stays so the code matches the other AAU apps.
export const SIDES = {
  women: { label: "Women's", name: 'AAU Field Hockey' },
};
export const sideOf = () => 'women';

export function seedTeams(side = 'women') {
  const teams = {};
  for (const [school, conference, abbr, mascot, color, altColor, ovr] of TEAMS) {
    teams[school] = makeTeam({ school, conference, abbr, mascot, coach: COACHES[school] || '', color, altColor, ...splitOvr(school, ovr) });
    // The AAU Dynasty's logos win over the automatic logo lists.
    teams[school].logoOverride = DEFAULT_LOGOS[school] || null;
  }
  return teams;
}
// Conferences the dynasty starts with: only those with field hockey teams.
export function conferencesFor() {
  const used = new Set(TEAMS.map(r => r[1]));
  return Object.fromEntries(Object.entries(CONFERENCES).filter(([c]) => used.has(c)));
}
