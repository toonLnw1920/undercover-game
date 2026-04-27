# 🕵️ Undercover — Multiplayer Game

เกม Undercover ออนไลน์ สร้างด้วย Node.js + Socket.io

## โครงสร้างไฟล์

```
undercover/
├── server.js         ← backend server
├── package.json      ← dependencies
├── public/
│   └── index.html    ← หน้าเกม (frontend)
└── README.md
```

---

## วิธีรันในเครื่องตัวเอง (Local)

1. ติดตั้ง [Node.js](https://nodejs.org) ถ้ายังไม่มี
2. เปิด Terminal แล้วเข้าไปในโฟลเดอร์:
   ```
   cd undercover
   npm install
   npm start
   ```
3. เปิด browser ไปที่ `http://localhost:3000`
4. เพื่อนในเครือข่าย Wi-Fi เดียวกันใช้ IP เครื่องคุณ เช่น `http://192.168.1.x:3000`

---

## วิธี Deploy ฟรีบน Railway (แนะนำ — ง่ายที่สุด)

1. สมัคร [Railway.app](https://railway.app) (ฟรี)
2. กด **New Project → Deploy from GitHub**
3. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub ก่อน (public หรือ private ก็ได้)
4. Railway จะ detect Node.js อัตโนมัติ และรัน `npm start`
5. ได้ URL สาธารณะ เช่น `https://undercover-xxx.railway.app`
6. แชร์ลิงก์นั้นให้เพื่อนได้เลย!

> Railway ให้ฟรี $5/เดือน เพียงพอสำหรับเกมเล่นกับเพื่อน

---

## วิธี Deploy บน Render.com (ทางเลือก)

1. สมัคร [Render.com](https://render.com)
2. New → Web Service → เชื่อม GitHub repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. ได้ URL ฟรีทันที

---

## วิธีเล่น

1. คนหนึ่งสร้างห้อง → ได้รหัส 5 ตัว
2. แชร์รหัสให้เพื่อน → กด "เข้าร่วมห้อง"
3. Host ใส่คู่คำลับ → กด "เริ่มเกม"
4. ทุกคนได้รับคำลับในจอตัวเองทันที (ไม่ต้อง pass มือถือ!)
5. ผลัดกันบรรยายคำ → Host กด "เริ่มโหวต"
6. ทุกคนโหวตพร้อมกัน → ระบบนับโหวตอัตโนมัติ

## กฎ

- **พลเมือง**: ได้คำเดียวกัน พยายามหา Undercover
- **Undercover**: ได้คำใกล้เคียง พยายามซ่อนตัว
- **Mr. White** (optional): ไม่ได้รับคำ — ถ้าถูกคัดออกสามารถเดาคำพลเมืองเพื่อชนะ
- 7+ ผู้เล่น: มี Undercover 2 คน
