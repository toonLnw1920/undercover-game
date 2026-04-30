const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// เปลี่ยนบรรทัดนี้ใน server.js
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const app = express();
const server = http.createServer(app);
const io = new Server(server);



app.use(express.static(path.join(__dirname, 'public')));

// rooms: { roomCode: { players, host, state, ... } }
const rooms = {};

const WORD_PAIRS = [
  // --- หมวดอาหารและเครื่องดื่ม ---
  ['ส้มตำ', 'ลาบ'], ['พิซซ่า', 'พาย'], ['เบียร์', 'ไวน์'], ['ชา', 'กาแฟ'],
  ['ข้าวผัด', 'ผัดไทย'], ['ช็อกโกแลต', 'คาราเมล'], ['โดนัท', 'เบเกิล'],
  ['ราเมง', 'อุดง'], ['ทุเรียน', 'ขนุน'], ['น้ำผึ้ง', 'น้ำเชื่อม'],
  ['ไส้กรอก', 'เบคอน'], ['ไอศกรีม', 'โยเกิร์ต'], ['สปาเกตตี', 'มักกะโรนี'],
  ['แซนวิช', 'เบอร์เกอร์'], ['น้ำส้ม', 'น้ำมะนาว'],

  // --- หมวดสัตว์และธรรมชาติ ---
  ['สิงโต', 'เสือโคร่ง'], ['แมว', 'กระรอก'], ['หมา', 'หมาป่า'], ['ผึ้ง', 'ตัวต่อ'],
  ['จระเข้', 'ตะกวด'], ['นกเพนกวิน', 'นกกระจอกเทศ'], ['ทะเล', 'ทะเลสาบ'],
  ['ภูเขา', 'เนินเขา'], ['กุหลาบ', 'ดอกบัว'], ['ฝน', 'หิมะ'],
  ['พระอาทิตย์', 'พระจันทร์'], ['ดาวอังคาร', 'ดาวพฤหัส'], ['ป่าชายเลน', 'ป่าดงดิบ'],

  // --- หมวดสิ่งของและเทคโนโลยี ---
  ['ดาบ', 'หอก'], ['โทรศัพท์', 'แท็บเล็ต'], ['หนังสือ', 'นิตยสาร'],
  ['เปียโน', 'กีตาร์'], ['ลิปสติก', 'ลิปกลอส'], ['รองเท้าผ้าใบ', 'รองเท้าแตะ'],
  ['กางเกงยีนส์', 'กางเกงขายาว'], ['คีย์บอร์ด', 'เครื่องพิมพ์ดีด'],
  ['เมาส์', 'ทัชแพด'], ['หูฟัง', 'ลำโพง'], ['กระจก', 'กล้องถ่ายรูป'],
  ['ร่ม', 'เสื้อกันฝน'], ['นาฬิกาข้อมือ', 'นาฬิกาปลุก'], ['เทียนไข', 'ไฟฉาย'],

  // --- หมวดสถานที่และกิจกรรม ---
  ['ฟุตบอล', 'รักบี้'], ['ว่ายน้ำ', 'ดำน้ำ'], ['ตลาด', 'ห้างสรรพสินค้า'],
  ['บ้าน', 'อพาร์ตเมนต์'], ['โรงภาพยนตร์', 'โรงละคร'], ['สวนสนุก', 'สวนสาธารณะ'],
  ['โรงพยาบาล', 'คลินิก'], ['สถานีรถไฟ', 'สถานีขนส่ง'], ['สนามบิน', 'ท่าเรือ'],
  ['วิ่งเหยาะๆ', 'เดินเร็ว'], ['โยคะ', 'พิลาทิส'],

  // --- หมวดบุคคลและอาชีพ ---
  ['ครู', 'อาจารย์'], ['นักแสดง', 'นักร้อง'], ['ตำรวจ', 'ทหาร'],
  ['พยาบาล', 'หมอ'], ['ราชา', 'ประธานาธิบดี'], ['นักบิน', 'คนขับรถไฟ'],

  // --- หมวดนามธรรม/เทศกาล ---
  ['วันเกิด', 'วันแต่งงาน'], ['ความรัก', 'ความหลง'], ['ความกลัว', 'ความกังวล']
];

function makeCode() {
  return Math.random().toString(36).substring(2,7).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function getRoom(code) { return rooms[code]; }

function publicPlayers(room) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    isHost: p.isHost,
  }));
}

io.on('connection', (socket) => {

  // Create room
  socket.on('create-room', ({ name }) => {
    const code = makeCode();
    const player = { id: socket.id, name, alive: true, isHost: true, role: null, word: null };
    rooms[code] = {
      code,
      host: socket.id,
      players: [player],
      phase: 'lobby', // lobby | playing | voting | result | end
      wordCitizen: '',
      wordUnder: '',
      hasWhite: false,
      round: 1,
      votes: {},
      eliminated: [],
    };
    socket.join(code);
    socket.data.room = code;
    socket.data.name = name;
    socket.emit('room-joined', { code, playerId: socket.id });
    io.to(code).emit('players-update', publicPlayers(rooms[code]));
  });

  // Join room
  socket.on('join-room', ({ code, name }) => {
    const room = getRoom(code);
    if (!room) { socket.emit('error', 'ไม่พบห้องนี้'); return; }
    if (room.phase !== 'lobby') { socket.emit('error', 'เกมเริ่มไปแล้ว'); return; }
    if (room.players.length >= 12) { socket.emit('error', 'ห้องเต็มแล้ว (12 คน)'); return; }
    const player = { id: socket.id, name, alive: true, isHost: false, role: null, word: null };
    room.players.push(player);
    socket.join(code);
    socket.data.room = code;
    socket.data.name = name;
    socket.emit('room-joined', { code, playerId: socket.id });
    io.to(code).emit('players-update', publicPlayers(room));
  });

  // --- ระบบ AI สร้างคู่คำ Real-time ---
  socket.on('request-ai-words', async () => {
    try {
      // เลือกใช้โมเดล gemini-1.5-flash เพราะทำงานได้เร็วและเหมาะกับงาน Text สั้นๆ
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Prompt สั่งงาน AI ให้คืนค่าเป็น JSON Array เท่านั้น
      const prompt = `
        คุณคือผู้ช่วยคิดคำศัพท์สำหรับเกม Undercover (เกมสายลับ)
        จงสุ่มสร้างคู่คำศัพท์ภาษาไทย 1 คู่ ที่มีความคล้ายคลึงกัน แต่อยู่คนละหมวดหมู่หรือมีความหมายต่างกันนิดหน่อย
        ตัวอย่างเช่น: ["ส้มตำ", "ลาบ"], ["โรงพยาบาล", "คลินิก"], ["เปียโน", "กีตาร์"], ["แบทแมน", "สไปเดอร์แมน"]
        
        ข้อกำหนด:
        - คิดคู่คำที่แปลกใหม่และไม่ซ้ำซาก
        - ตอบกลับมาเป็น JSON Array รูปแบบ ["คำของพลเมือง", "คำของสายลับ"] เท่านั้น ห้ามพิมพ์ข้อความอธิบายใดๆ เพิ่มเติมเด็ดขาด
      `;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      
      // ตัด backticks (```json ... ```) ที่ AI อาจจะแถมมาออก เพื่อให้ parse JSON ได้
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const pair = JSON.parse(text); // แปลงข้อความเป็น Array

      // ส่งคู่คำกลับไปที่ผู้สร้างห้อง (Host)
      socket.emit('ai-words-result', { citizen: pair[0], under: pair[1] });
      
    } catch (error) {
      console.error("AI Error:", error);
      socket.emit('error', 'AI คิดคำล้มเหลว กรุณาลองกดใหม่อีกครั้ง');
    }
  });

  // Start game (host only)
  socket.on('start-game', ({ wordCitizen, wordUnder, hasWhite, underCount }) => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 3) { socket.emit('error', 'ต้องมีผู้เล่นอย่างน้อย 3 คน'); return; }
    if (hasWhite && room.players.length < 4) { socket.emit('error', 'ต้องมีผู้เล่นอย่างน้อย 4 คน เมื่อใช้ Mr. White'); return; }
    if (!wordCitizen || !wordUnder) { socket.emit('error', 'กรุณาใส่คู่คำลับ'); return; }

    room.wordCitizen = wordCitizen;
    room.wordUnder = wordUnder;
    room.hasWhite = hasWhite;
    room.phase = 'playing';
    room.round = 1;
    room.votes = {};
    room.eliminated = [];

    // Assign roles
    const n = room.players.length;
    const slots = n - (hasWhite ? 1 : 0);
    const maxUnder = Math.max(1, Math.floor((slots - 1) / 2));
    const resolvedUnderCount = Math.min(Math.max(1, underCount || 1), maxUnder);
    const indices = shuffle([...Array(n).keys()]);
    room.players.forEach(p => { p.role = 'citizen'; p.word = wordCitizen; p.alive = true; });
    for (let i = 0; i < resolvedUnderCount; i++) { room.players[indices[i]].role = 'undercover'; room.players[indices[i]].word = wordUnder; }
    if (hasWhite) { room.players[indices[resolvedUnderCount]].role = 'white'; room.players[indices[resolvedUnderCount]].word = ''; }

    // Send each player their own role/word privately
    room.players.forEach(p => {
      io.to(p.id).emit('your-role', { role: p.role, word: p.word });
    });

    io.to(code).emit('game-started', { round: room.round, turnOrder: shuffle(room.players.map(p => p.id)) });
    io.to(code).emit('players-update', publicPlayers(room));
  });

  // Open voting
  socket.on('open-vote', () => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.phase = 'voting';
    room.votes = {};
    room.players.forEach(p => { if (p.alive) p.voted = false; });
    io.to(code).emit('voting-started');
  });

  // Cast vote (ปรับปรุงให้ลบโหวตเก่าอัตโนมัติถ้ามีการโหวตซ้ำ)
  socket.on('cast-vote', ({ targetId }) => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room || room.phase !== 'voting') return;
    const voter = room.players.find(p => p.id === socket.id);
    
    // ตรวจสอบว่าผู้เล่นมีสิทธิ์โหวตหรือไม่
    if (!voter || !voter.alive) return;

    // หากผู้เล่นเคยโหวตไปแล้ว ให้ทำการหักคะแนนจากคนที่เคยโหวตให้ก่อน
    if (voter.voted && voter.votedFor) {
      if (typeof room.votes[voter.votedFor] === 'number') {
        room.votes[voter.votedFor] = Math.max(0, room.votes[voter.votedFor] - 1);
      }
    }

    // อัปเดตสถานะการโหวตใหม่
    voter.voted = true;
    voter.votedFor = targetId;
    room.votes[targetId] = (room.votes[targetId] || 0) + 1;

    const alivePlayers = room.players.filter(p => p.alive);
    const votedCount = alivePlayers.filter(p => p.voted).length;
    io.to(code).emit('vote-update', { votes: room.votes, votedCount, total: alivePlayers.length });

    // All voted → auto-resolve
    if (votedCount === alivePlayers.length) {
      resolveVote(room, code);
    }
  });

  // Cancel vote (ปรับปรุงให้การหักลบคะแนนแม่นยำขึ้น)
  socket.on('cancel-vote', () => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room || room.phase !== 'voting') return;
    const voter = room.players.find(p => p.id === socket.id);
    if (!voter || !voter.alive || !voter.voted) return;

    // ลบโหวตออกอย่างปลอดภัย ไม่ให้คะแนนติดลบ
    if (voter.votedFor && typeof room.votes[voter.votedFor] === 'number') {
      room.votes[voter.votedFor] = Math.max(0, room.votes[voter.votedFor] - 1);
    }
    
    // รีเซ็ตสถานะของผู้เล่น
    voter.voted = false;
    voter.votedFor = null;

    const alivePlayers = room.players.filter(p => p.alive);
    const votedCount = alivePlayers.filter(p => p.voted).length;
    io.to(code).emit('vote-update', { votes: room.votes, votedCount, total: alivePlayers.length });
  });

  // White guess
  socket.on('white-guess', ({ guess }) => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room) return;
    const correct = guess.trim().toLowerCase() === room.wordCitizen.toLowerCase();
    if (correct) {
      io.to(code).emit('game-end', { winner: 'white', wordCitizen: room.wordCitizen, wordUnder: room.wordUnder, players: room.players.map(p => ({ name: p.name, role: p.role, word: p.word })) });
    } else {
      io.to(code).emit('white-guess-wrong');
      const win = checkWin(room);
      if (win) {
        io.to(code).emit('game-end', { winner: win, wordCitizen: room.wordCitizen, wordUnder: room.wordUnder, players: room.players.map(p => ({ name: p.name, role: p.role, word: p.word })) });
      } else {
        room.round++;
        room.phase = 'playing';
        const alivePlayers = room.players.filter(p => p.alive);
        const turnOrder = shuffle(alivePlayers.map(p => p.id));
        io.to(code).emit('next-round', { round: room.round, turnOrder });
        io.to(code).emit('players-update', publicPlayers(room));
      }
    }
  });

  // Next round (host)
  socket.on('next-round', () => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.round++;
    room.phase = 'playing';
    const alivePlayers = room.players.filter(p => p.alive);
    const turnOrder = shuffle(alivePlayers.map(p => p.id));
    io.to(code).emit('next-round', { round: room.round, turnOrder });
    io.to(code).emit('players-update', publicPlayers(room));
  });

  // Play again (host)
  socket.on('play-again', () => {
    const code = socket.data.room;
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.phase = 'lobby';
    room.players.forEach(p => { p.role = null; p.word = null; p.alive = true; });
    io.to(code).emit('back-to-lobby');
    io.to(code).emit('players-update', publicPlayers(room));
  });

  socket.on('disconnect', () => {
    const code = socket.data.room;
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { delete rooms[code]; return; }
    if (room.host === socket.id && room.players.length > 0) {
      room.host = room.players[0].id;
      room.players[0].isHost = true;
    }
    io.to(code).emit('players-update', publicPlayers(room));
    io.to(code).emit('player-left', { name: socket.data.name });
  });
});

function resolveVote(room, code) {
  const votes = room.votes;
  const alive = room.players.filter(p => p.alive);
  const maxV = Math.max(...alive.map(p => votes[p.id] || 0));
  const candidates = alive.filter(p => (votes[p.id] || 0) === maxV);
  const elim = candidates[Math.floor(Math.random() * candidates.length)];
  elim.alive = false;
  room.eliminated.push(elim.id);
  room.phase = 'result';

  io.to(code).emit('elimination-result', {
    eliminated: { id: elim.id, name: elim.name, role: elim.role, word: elim.word },
    votes: room.votes,
  });
  io.to(code).emit('players-update', publicPlayers(room));

  if (elim.role === 'white') {
    io.to(code).emit('white-must-guess', { name: elim.name });
  } else {
    const win = checkWin(room);
    if (win) {
      io.to(code).emit('game-end', { winner: win, wordCitizen: room.wordCitizen, wordUnder: room.wordUnder, players: room.players.map(p => ({ name: p.name, role: p.role, word: p.word })) });
    }
  }
}

function checkWin(room) {
  const alive = room.players.filter(p => p.alive);
  const under = alive.filter(p => p.role === 'undercover');
  const citizen = alive.filter(p => p.role === 'citizen');
  const white = alive.filter(p => p.role === 'white');
  // พลเมืองชนะ: ไม่เหลือ undercover และ mr.white
  if (under.length === 0 && white.length === 0) return 'citizen';
  // Undercover ชนะ: จำนวน undercover >= จำนวน citizen (1vs1, 2vs2, ...)
  if (under.length >= citizen.length) return 'undercover';
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Undercover server running on http://localhost:${PORT}`));