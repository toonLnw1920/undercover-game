require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // ถ้ามี Error ส่งกลับมา ให้พิมพ์ออกมาดู
    if (data.error) {
      console.error("❌ Google API Error:");
      console.error(`- Message: ${data.error.message}`);
      console.error(`- Status: ${data.error.status}`);
      return;
    }

    console.log("✅ โมเดลที่คุณใช้ได้คือ:");
    data.models.forEach(m => console.log("- " + m.name.replace('models/', '')));

  } catch (e) {
    console.error("❌ เช็กโมเดลไม่สำเร็จ:", e.message);
  }
}

listModels();