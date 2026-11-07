export type FacultySlug = "engineering" | "finance" | "law";

export interface Specialization {
  slug: string;
  name: string;
  blurb: string;
  topics: string[];
}

export interface Faculty {
  slug: FacultySlug;
  index: string;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  accentClass: string;
  specializations: Specialization[];
}

export interface Tutor {
  id: string;
  name: string;
  title: string;
  faculty: FacultySlug;
  specializations: string[];
  rating: number;
  reviews: number;
  rate: number; // USD per hour
  yearsExperience: number;
  sessionsTaught: number;
  credentials: string[];
  bio: string;
  languages: string[];
  initials: string;
  /** Weekly availability: day of week (0 = Sunday) → working hours [start, end) in 24h. */
  schedule: Record<number, [number, number]>;
  sessionLengths: number[]; // minutes
  formats: ("online" | "in-person")[];
}

export const FACULTIES: Faculty[] = [
  {
    slug: "engineering",
    index: "01",
    name: "Engineering",
    tagline: "Precision, built from first principles.",
    description:
      "Mechanics, circuits, software and systems — taught by engineers who have shipped real machines, chips and code.",
    accent: "#5aa9ff",
    accentClass: "text-eng",
    specializations: [
      { slug: "mechanical", name: "Mechanical", blurb: "Statics, dynamics, thermodynamics and design.", topics: ["Statics", "Dynamics", "Thermodynamics", "Fluid Mechanics", "CAD"] },
      { slug: "electrical", name: "Electrical", blurb: "Circuits, signals, control and power systems.", topics: ["Circuit Analysis", "Signals & Systems", "Control Theory", "Electromagnetics"] },
      { slug: "software", name: "Software", blurb: "Algorithms, systems design and interview prep.", topics: ["Data Structures", "Algorithms", "System Design", "Operating Systems"] },
      { slug: "civil", name: "Civil & Structural", blurb: "Structures, materials and geotechnics.", topics: ["Structural Analysis", "Materials", "Geotechnics", "Surveying"] },
    ],
  },
  {
    slug: "finance",
    index: "02",
    name: "Finance",
    tagline: "Capital, understood in depth.",
    description:
      "Corporate finance, valuation, markets and accounting — guided by practitioners from banks, funds and the Big Four.",
    accent: "#d8b35a",
    accentClass: "text-fin",
    specializations: [
      { slug: "corporate", name: "Corporate Finance", blurb: "Capital structure, budgeting and M&A.", topics: ["Capital Budgeting", "WACC", "M&A", "LBO Modeling"] },
      { slug: "valuation", name: "Valuation & Modeling", blurb: "DCF, comps and three-statement models.", topics: ["DCF", "Comparables", "3-Statement Models", "Excel"] },
      { slug: "markets", name: "Markets & Derivatives", blurb: "Fixed income, options and portfolio theory.", topics: ["Fixed Income", "Options", "Portfolio Theory", "Risk"] },
      { slug: "accounting", name: "Accounting & CFA", blurb: "Financial reporting and CFA exam prep.", topics: ["Financial Reporting", "CFA Level I–III", "Audit", "IFRS / GAAP"] },
    ],
  },
  {
    slug: "law",
    index: "03",
    name: "Law",
    tagline: "Argument, made rigorous.",
    description:
      "Contracts, constitutional law, litigation and the bar — mentored by counsel, clerks and law faculty.",
    accent: "#b0384a",
    accentClass: "text-law",
    specializations: [
      { slug: "contracts", name: "Contracts & Torts", blurb: "Formation, breach, remedies and liability.", topics: ["Formation", "Breach & Remedies", "Negligence", "Strict Liability"] },
      { slug: "constitutional", name: "Constitutional Law", blurb: "Rights, powers and judicial review.", topics: ["Judicial Review", "Federalism", "Civil Liberties", "Due Process"] },
      { slug: "litigation", name: "Litigation & Advocacy", blurb: "Procedure, evidence and moot court.", topics: ["Civil Procedure", "Evidence", "Moot Court", "Legal Writing"] },
      { slug: "bar", name: "Bar & LSAT Prep", blurb: "Structured exam preparation.", topics: ["LSAT Logic", "MBE", "Essay Writing", "Study Plans"] },
    ],
  },
];

const weekdays = (start: number, end: number): Record<number, [number, number]> => ({
  1: [start, end], 2: [start, end], 3: [start, end], 4: [start, end], 5: [start, end],
});

export const TUTORS: Tutor[] = [
  // Engineering
  { id: "elena-voss", name: "Elena Voss", title: "Mechanical Engineer, ex-aerospace", faculty: "engineering", specializations: ["mechanical", "civil"], rating: 4.97, reviews: 214, rate: 95, yearsExperience: 11, sessionsTaught: 1820, credentials: ["MEng, Imperial College London", "Chartered Engineer (CEng)", "8 yrs turbine design"], bio: "I spent eight years designing turbine stages. Now I teach mechanics the way it is used in industry: free-body diagrams first, equations second, intuition always.", languages: ["English", "German"], initials: "EV", schedule: weekdays(9, 17), sessionLengths: [60, 90], formats: ["online", "in-person"] },
  { id: "marcus-chen", name: "Marcus Chen", title: "Senior Software Engineer", faculty: "engineering", specializations: ["software"], rating: 4.94, reviews: 388, rate: 120, yearsExperience: 9, sessionsTaught: 2410, credentials: ["BSc Computer Science, Stanford", "Staff engineer at a top-5 tech firm", "500+ mock interviews run"], bio: "Algorithms and system design, explained through problems you will actually see. I focus on the reasoning, so you can handle questions you have never seen.", languages: ["English", "Mandarin"], initials: "MC", schedule: { 1: [17, 22], 2: [17, 22], 3: [17, 22], 6: [10, 16], 0: [10, 16] }, sessionLengths: [60, 90], formats: ["online"] },
  { id: "amara-okafor", name: "Amara Okafor", title: "Electrical Engineering PhD", faculty: "engineering", specializations: ["electrical"], rating: 4.92, reviews: 156, rate: 85, yearsExperience: 7, sessionsTaught: 940, credentials: ["PhD Electrical Engineering, MIT", "Control systems researcher", "TA of the year 2022"], bio: "Circuits and control theory can feel abstract. I make them concrete with simulations and real hardware examples.", languages: ["English", "French"], initials: "AO", schedule: weekdays(12, 20), sessionLengths: [45, 60, 90], formats: ["online"] },
  { id: "jonas-lindqvist", name: "Jonas Lindqvist", title: "Structural Engineer, PE", faculty: "engineering", specializations: ["civil", "mechanical"], rating: 4.88, reviews: 97, rate: 80, yearsExperience: 14, sessionsTaught: 760, credentials: ["MSc Structural Engineering, KTH", "Licensed Professional Engineer", "Bridge & high-rise projects"], bio: "From beams to bridges. I help students see structures as load paths, and prepare for the FE and PE exams.", languages: ["English", "Swedish"], initials: "JL", schedule: { 2: [8, 14], 4: [8, 14], 6: [9, 13] }, sessionLengths: [60], formats: ["online", "in-person"] },
  // Finance
  { id: "sophia-marchetti", name: "Sophia Marchetti", title: "Former M&A Associate", faculty: "finance", specializations: ["corporate", "valuation"], rating: 4.98, reviews: 302, rate: 140, yearsExperience: 10, sessionsTaught: 1650, credentials: ["MBA, Wharton", "Ex-investment banking associate", "Built 200+ deal models"], bio: "I teach modeling the way it is done on a deal team: clean, auditable, and fast. Expect real case studies and honest feedback.", languages: ["English", "Italian"], initials: "SM", schedule: weekdays(18, 22), sessionLengths: [60, 90], formats: ["online"] },
  { id: "daniel-park", name: "Daniel Park", title: "CFA Charterholder, Portfolio Manager", faculty: "finance", specializations: ["markets", "accounting"], rating: 4.95, reviews: 241, rate: 110, yearsExperience: 12, sessionsTaught: 1980, credentials: ["CFA Charterholder", "MSc Finance, LSE", "Manages a multi-asset fund"], bio: "CFA prep and markets, from someone who uses the material every day. I build study plans around your weak spots.", languages: ["English", "Korean"], initials: "DP", schedule: { 1: [7, 9], 3: [7, 9], 5: [7, 9], 6: [9, 15], 0: [9, 15] }, sessionLengths: [60, 90], formats: ["online"] },
  { id: "isabel-reyes", name: "Isabel Reyes", title: "Chartered Accountant, Big Four", faculty: "finance", specializations: ["accounting", "valuation"], rating: 4.9, reviews: 133, rate: 90, yearsExperience: 8, sessionsTaught: 870, credentials: ["ACA / CPA", "Audit manager, Big Four", "IFRS specialist"], bio: "Financial statements tell a story. I teach you to read it — for exams, interviews and real audits.", languages: ["English", "Spanish"], initials: "IR", schedule: weekdays(10, 16), sessionLengths: [45, 60], formats: ["online", "in-person"] },
  { id: "theo-hart", name: "Theo Hart", title: "Quant Analyst", faculty: "finance", specializations: ["markets"], rating: 4.86, reviews: 88, rate: 125, yearsExperience: 6, sessionsTaught: 520, credentials: ["MFE, Columbia", "Derivatives desk quant", "Python & stochastic calculus"], bio: "Options, fixed income and risk, with the maths made clear and the Python to back it up.", languages: ["English"], initials: "TH", schedule: { 2: [18, 22], 4: [18, 22], 0: [12, 18] }, sessionLengths: [60, 90], formats: ["online"] },
  // Law
  { id: "catherine-wells", name: "Catherine Wells", title: "Barrister & Law Lecturer", faculty: "law", specializations: ["contracts", "litigation"], rating: 4.96, reviews: 276, rate: 130, yearsExperience: 15, sessionsTaught: 2130, credentials: ["LLM, University of Oxford", "Practising barrister", "Lecturer in Contract Law"], bio: "I teach law as argument. You will learn to spot issues, structure answers and defend a position under pressure.", languages: ["English"], initials: "CW", schedule: weekdays(16, 21), sessionLengths: [60, 90], formats: ["online", "in-person"] },
  { id: "rafael-santos", name: "Rafael Santos", title: "Former Supreme Court Clerk", faculty: "law", specializations: ["constitutional", "litigation"], rating: 4.93, reviews: 174, rate: 145, yearsExperience: 9, sessionsTaught: 1100, credentials: ["JD, Harvard Law School", "Clerked for a Supreme Court justice", "Appellate litigator"], bio: "Constitutional doctrine and appellate writing, from inside the chambers. Precision and clarity above all.", languages: ["English", "Portuguese"], initials: "RS", schedule: { 1: [9, 13], 3: [9, 13], 5: [9, 13], 6: [10, 14] }, sessionLengths: [60, 90], formats: ["online"] },
  { id: "naomi-adler", name: "Naomi Adler", title: "Bar Exam Coach", faculty: "law", specializations: ["bar", "contracts"], rating: 4.91, reviews: 319, rate: 100, yearsExperience: 11, sessionsTaught: 2600, credentials: ["JD, Columbia Law School", "Top-1% bar score", "Coached 600+ bar candidates"], bio: "A structured, calm path to the bar and LSAT. Weekly plans, timed practice and essay feedback within 24 hours.", languages: ["English", "Hebrew"], initials: "NA", schedule: weekdays(8, 18), sessionLengths: [45, 60, 90], formats: ["online"] },
  { id: "omar-haddad", name: "Omar Haddad", title: "Litigation Partner", faculty: "law", specializations: ["litigation", "contracts"], rating: 4.87, reviews: 92, rate: 150, yearsExperience: 18, sessionsTaught: 640, credentials: ["LLB, King's College London", "Partner, commercial litigation", "Moot court judge"], bio: "Evidence, procedure and advocacy — taught by someone who still stands up in court every month.", languages: ["English", "Arabic", "French"], initials: "OH", schedule: { 2: [19, 22], 4: [19, 22], 6: [10, 16] }, sessionLengths: [60], formats: ["online", "in-person"] },
];

export const getFaculty = (slug: string) => FACULTIES.find((f) => f.slug === slug);
export const getTutor = (id: string) => TUTORS.find((t) => t.id === id);
export const tutorsForFaculty = (slug: string) => TUTORS.filter((t) => t.faculty === slug);
export const specializationName = (faculty: FacultySlug, slug: string) =>
  getFaculty(faculty)?.specializations.find((s) => s.slug === slug)?.name ?? slug;
