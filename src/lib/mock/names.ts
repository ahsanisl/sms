/** Deterministic pseudo-random generator so mock data is stable across reloads. */
export function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(42);

export function pick<T>(arr: readonly T[], r: () => number = rand): T {
  return arr[Math.floor(r() * arr.length)];
}

export function pickMany<T>(arr: readonly T[], n: number, r: () => number = rand): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function intBetween(min: number, max: number, r: () => number = rand): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

export const MALE_FIRST_NAMES = [
  "Ahmed", "Muhammad", "Ali", "Hamza", "Bilal", "Usman", "Hassan", "Hussain",
  "Zain", "Fahad", "Danish", "Faisal", "Omar", "Saad", "Talha", "Haris",
  "Shahzaib", "Rayyan", "Arham", "Ibrahim", "Yousuf", "Kashif", "Waqas", "Adeel",
];

export const FEMALE_FIRST_NAMES = [
  "Ayesha", "Fatima", "Zainab", "Sana", "Amna", "Hira", "Mahnoor", "Sara",
  "Rabia", "Iqra", "Areeba", "Komal", "Sadaf", "Nimra", "Laiba", "Maryam",
  "Anaya", "Aiza", "Alishba", "Noor", "Sidra", "Rimsha", "Khadija", "Warda",
];

export const LAST_NAMES = [
  "Khan", "Ahmed", "Ali", "Malik", "Hussain", "Sheikh", "Raza", "Iqbal",
  "Farooq", "Siddiqui", "Chaudhry", "Baig", "Qureshi", "Abbasi", "Butt",
  "Awan", "Mirza", "Soomro", "Rana", "Javed",
];

export function fullName(gender: "male" | "female", r: () => number = rand) {
  const first = gender === "male" ? pick(MALE_FIRST_NAMES, r) : pick(FEMALE_FIRST_NAMES, r);
  const last = pick(LAST_NAMES, r);
  return `${first} ${last}`;
}

export function emailFrom(name: string, domain: string) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${domain}`;
}

export function phoneNumber(r: () => number = rand) {
  const prefix = pick(["300", "301", "302", "321", "333", "345", "312"], r);
  const rest = String(intBetween(1000000, 9999999, r));
  return `+92 ${prefix} ${rest.slice(0, 7)}`;
}
