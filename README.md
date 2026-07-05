# Clinic Pro — Cloudflare Pages Ready

ระบบนี้เป็น React + Vite + Firebase Firestore/Auth และปรับโครงสร้างให้ deploy บน Cloudflare Pages ได้แล้ว

## สิ่งที่เพิ่ม/ปรับแล้ว

- เพิ่ม `public/_redirects` สำหรับ React Router / SPA fallback
- เพิ่ม `public/_headers` สำหรับ security headers และ cache policy
- เพิ่ม `.nvmrc` เพื่อให้ Cloudflare ใช้ Node.js 20+
- เพิ่ม script สำหรับ preview/deploy ผ่าน Wrangler
- คง Firebase config เดิมไว้ที่ `firebase-applet-config.json`

## วิธี Deploy แบบฟรีบน Cloudflare Pages

### วิธี A: ผ่าน GitHub

1. สร้าง repository ใหม่บน GitHub
2. อัปโหลดไฟล์โปรเจกต์ทั้งหมดขึ้น GitHub
3. เข้า Cloudflare Dashboard > Workers & Pages > Create application > Pages > Connect to Git
4. เลือก repository นี้
5. ตั้งค่า build ดังนี้

```txt
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Node version: 20
```

6. กด Deploy

หลัง deploy สำเร็จ ระบบจะได้ URL ลักษณะนี้

```txt
https://clinic-pro.pages.dev
```

### วิธี B: Deploy จากเครื่องด้วย Wrangler

```bash
npm install
npm run cf:deploy
```

หรือ preview ก่อน deploy

```bash
npm run cf:preview
```

## Environment Variable ที่ควรตั้งใน Cloudflare Pages

ถ้าระบบใช้ Gemini ให้ตั้งใน Cloudflare Pages > Settings > Environment variables

```txt
GEMINI_API_KEY=ใส่คีย์ของคุณ
```

หมายเหตุ: แอปฝั่ง Frontend จะฝังค่านี้ใน bundle ตอน build จึงควรจำกัดสิทธิ์ API key ให้เหมาะสม

## Firebase ที่ต้องตรวจสอบ

ใน Firebase Console ของ project `nathakorn-clinic-pro`

1. Authentication > Sign-in method: เปิด provider ที่ต้องใช้ เช่น Email/Password หรือ Google
2. Authentication > Settings > Authorized domains: เพิ่ม domain ของ Cloudflare Pages เช่น

```txt
clinic-pro.pages.dev
ชื่อโปรเจกต์จริง.pages.dev
โดเมนจริงของคลินิก ถ้ามี
```

3. Firestore Database: Deploy rules จากไฟล์ `firestore.rules`

## คำสั่งใช้งานในเครื่อง

```bash
npm install
npm run dev
```

เปิดที่

```txt
http://localhost:3000
```

## คำสั่งตรวจสอบก่อน deploy

```bash
npm run lint
npm run build
```

## ค่าใช้จ่าย

- Cloudflare Pages: ฟรี
- SSL: ฟรี
- Subdomain `.pages.dev`: ฟรี
- Firebase Spark Plan: ใช้งานฟรีตาม quota ของ Firebase
- โดเมนส่วนตัว: มีค่าใช้จ่ายเฉพาะถ้าต้องการซื้อโดเมนเอง
