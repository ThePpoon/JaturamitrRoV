import heroesData from '../data/heroes.json';

export interface Hero {
  id: string;
  name: string;
  role: string;
}

export const heroes: Hero[] = heroesData;

export const heroById = new Map(heroes.map((h) => [h.id, h]));

export const ROLE_LABEL: Record<string, string> = {
  tank: 'Tank',
  warrior: 'Fighter',
  assassin: 'Assassin',
  mage: 'Mage',
  marksman: 'Carry',
  support: 'Support',
};

export function heroName(id: string | null | undefined) {
  return id ? (heroById.get(id)?.name ?? id) : null;
}

/**
 * ที่อยู่รูปฮีโร่ — ผ่าน hub เพราะไฟล์ใน public/heroes/ มีได้หลายนามสกุล
 * ถ้าไม่มีไฟล์จะได้ 404 แล้วฝั่ง UI ตกไปใช้ตัวย่อแทนเอง
 */
export function heroImageUrl(id: string) {
  return `/api/hero-image/${id}`;
}

/** ตัวย่อสำรองตอนยังไม่มีรูป — ใช้อักษรละตินเท่านั้นเพื่อให้กว้างคงที่ */
export function heroInitials(name: string) {
  return name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
}
