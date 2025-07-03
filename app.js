// -------- 🔥 FIREBASE CONFIG --------
const firebaseConfig = {
  apiKey: "AIzaSyDNvgS_PqEHU3llqHt0XHN30jJgiQWLkdc",
  authDomain: "e-loyalty-12563.firebaseapp.com",
  projectId: "e-loyalty-12563",
  storageBucket: "e-loyalty-12563.appspot.com",
  messagingSenderId: "3887061029",
  appId: "1:3887061029:web:f9c238731d7e6dd5fb47cc",
  measurementId: "G-966P8W06W2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// -------- 🧠 CORE FUNCTIONS --------
function saveMember(member) {
  if (!member.transactions) member.transactions = [];
  if (!member.upgradeDate) member.upgradeDate = null;
  if (!member.yearlySinceUpgrade) member.yearlySinceUpgrade = 0;
  return db.collection("members").doc(member.id).set(member);
}


function sendEmailNotification(templateId, data) {
  return emailjs.send("service_dhmya66", templateId, data)
    .then(() => console.log("✅ Email sent"))
    .catch(err => console.error("❌ Email send failed:", err));
}

function getMessagePayload(type, member, meta = {}) {
  switch (type) {
    case "birthday": {
  const birthdayItems = birthdayPerks[member.tier] || [];
  return {
    main_message: `🎉 We’re thrilled to celebrate you, {{member_name}}!
As a cherished {{member_tier}} member, you can now redeem your exclusive birthday rewards designed to make your day just a little more magical.
`,
    benefit_1: birthdayItems[0] || "",
    benefit_2: birthdayItems[1] || "",
    benefit_3: birthdayItems[2] || "",
    benefit_4: birthdayItems[3] || "",
    benefit_5: birthdayItems[4] || "",
benefit_6: birthdayItems[5] || "",
benefit_7: birthdayItems[6] || ""
  };
}
    case "upgrade": {
  const perks = tierBenefits[member.tier] || [];
  const birthday = birthdayPerks[member.tier] || [];

  return {
    main_message: `🚀 Congrats, ${member.name}! You've just leveled up to ${member.tier} tier at 13e Café.`,
    benefit_1: `🌟 Daily Perks:`,
    benefit_2: `${perks[0] || ""}`,
    benefit_2: `${perks[1] || ""}`,
    benefit_3: `${perks[2] || ""}`,
    benefit_4: `${perks[3] || ""}`,
    benefit_5: ``,
    benefit_6: `🎂 Birthday Perks:`,
    benefit_7: `${birthday[1] || ""}`,
    benefit_8: `${birthday[2] || ""}`,
    benefit_9: `${birthday[3] || ""}`,
    benefit_10: `${birthday[4] || ""}`,
    benefit_11: `${birthday[5] || ""}`,
    benefit_12: `${birthday[6] || ""}`
  };
}

case "transaction_summary": {
  const { lastTransaction, cashbackPoints, member } = meta || {};
  const txDate = lastTransaction?.date
  ? new Date(lastTransaction.date).toLocaleString()
  : "(unknown date)";

  return {
    main_message: `🧾 A new transaction has been added to your 13e Café account.`,
    benefit_1: `• Transaction Date: ${txDate}`,
    benefit_2: `• Amount Spent: Rp${lastTransaction?.amount?.toLocaleString()}`,
    benefit_3: ``,
    benefit_4: ``,
    benefit_5: cashbackPoints > 0 ? `• Cashback Earned: Rp${cashbackPoints.toLocaleString()}` : "• Cashback Earned: –",
    benefit_6: `• Available Cashback Points: Rp${(member?.redeemablePoints ?? 0).toLocaleString()}`,
    benefit_7: ""
  };
}

    case "cashback_expire":
      return {
        main_message: `⚠️ Reminder: Your cashback points are expiring soon!`,
        benefit_1: "Visit the café to redeem them before the deadline.",
        benefit_2: "",
        benefit_3: ""
      };
    default:
      return {
        main_message: `Hello from 13e Café ☕`,
        benefit_1: "",
        benefit_2: "",
        benefit_3: ""
      };
  }
}

function buildBirthdayMessage(member) {
  return `
    🎉 Happy Birthday, ${member.name}!<br><br>
    You’ve unlocked your <strong>${member.tier} Birthday Package:</strong><br>
    <ul>
      ${tierBenefits[member.tier].map(b => `<li>${b}</li>`).join("")}
    </ul>
    Come by 13e Café today and let’s celebrate you! 🎁
  `;
}

async function testBirthdayEmail(member) {
  const payload = {
    member_name: member.name,
    member_email: member.email,
    ...getMessagePayload("birthday", member),
    closing_line: "Drop by 13e Café today to claim your treats — we can’t wait to celebrate with you! 🎂",
    subject_line: getSubjectForType("birthday", member)
  };

  await sendEmailNotification("template_2q6hh6g", payload);
}

async function sendUpgradeEmail(member) {
  const payload = {
    member_name: member.name,
    member_email: member.email,
    ...getMessagePayload("upgrade", member),
    closing_line: "Enjoy your new status and don’t forget to say hi on your next visit! ☕🎁",
    subject_line: getSubjectForType("upgrade", member)
  };

  await sendEmailNotification("template_2q6hh6g", payload);
}

async function sendTransactionSummaryEmail(member, tx) {
  const payload = {
    member_name: member.name,
    member_email: member.email,
    ...getMessagePayload("transaction_summary", member, {
      lastTransaction: tx,
      cashbackPoints: tx.cashback || 0,
      member
    }),
    closing_line: "Thank you for your continued loyalty — we’ll see you again soon! ☕",
    subject_line: getSubjectForType("transaction_summary", member)
  };

  if (tx.fileData) {
    payload.attachment_base64 = tx.fileData; // Optional: you'll add this field to your EmailJS template
  }

  await sendEmailNotification("template_2q6hh6g", payload);
}


function getSubjectForType(type, member) {
  switch (type) {
    case "birthday":
      return `Celebrate in Style: Your Exclusive 13e Birthday Rewards`;
    case "upgrade":
      return `🚀 Congrats, ${member.name}! Welcome to ${member.tier} Status`;
    case "cashback_expire":
      return `⏳ Don’t Let Your Cashback Expire – Redeem Now, ${member.name}!`;
    case "transaction_summary":
      return `🧾 Your Transaction Has Been Recorded – Cashback Updated!`;
    case "welcome":
      return `☕ Welcome to 13e Café Rewards, ${member.name}!`;
    default:
      return `Hello from 13e Café ☕`;
  }
}


async function sendWelcomeToAllMembers() {
  const snapshot = await db.collection("members").get();
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  for (const member of members) {
    if (!member.email) continue; // Skip those without email

    // OPTIONAL: check if already welcomed
    if (member.welcomed === true) continue;

    try {
      await sendEmailNotification("welcome_member", {
        member_name: member.name,
        member_email: member.email
      });

      // OPTIONAL: mark as welcomed
      await db.collection("members").doc(member.id).update({
        welcomed: true
      });

      console.log(`✅ Sent welcome to ${member.name}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${member.name}:`, err);
    }
  }

  alert("🎉 Welcome emails sent to all applicable members!");
}


function extractTotalAmount(ocrText) {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const label = lines[i].toLowerCase().replace(/[^a-z ]/g, "").trim();

    if (/s?g?rand[ \-]?total/.test(label)) {
      const scanLines = [lines[i], lines[i + 1]];
      for (const line of scanLines) {
        if (!line) continue;
        const matches = line.match(/[\d.,]+/g);
        if (matches) {
          for (const str of matches) {
            const num = parseInt(str.replace(/[^\d]/g, ""), 10);
            if (!isNaN(num) && num >= 1000 && num <= 10000000) {
              return num;
            }
          }
        }
      }
    }
  }

  // fallback
  const fallbackMatches = [];
  for (const line of lines) {
    const matches = line.match(/[\d.,]+/g);
    if (matches) {
      matches.forEach(str => {
        const num = parseInt(str.replace(/[^\d]/g, ""), 10);
        if (!isNaN(num) && num >= 1000 && num <= 10000000) {
          fallbackMatches.push(num);
        }
      });
    }
  }

  return fallbackMatches.length > 0 ? Math.max(...fallbackMatches) : null;
}

function resizeImage(base64, maxWidth = 750) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");

      // 🧠 Add this line before drawing
      ctx.filter = "grayscale(100%) contrast(130%) brightness(105%)";

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = base64;
  });
}

async function handleReceiptOCR(file, statusEl, amountEl) {
  const reader = new FileReader();

  reader.onload = async () => {
    const base64 = await resizeImage(reader.result);
    statusEl.textContent = "🔍 Scanning receipt… please wait";

    try {
      const start = performance.now();

      const worker = Tesseract.createWorker({
        logger: m => console.log(m) // optional
      });

      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      const { data } = await worker.recognize(base64);
      await worker.terminate();

      const end = performance.now();
      const scanTime = ((end - start) / 1000).toFixed(1);
      console.log(`⏱️ OCR took ${scanTime}s`);

      const text = data.text;
      console.log("🧾 OCR TEXT:\n", text);

      const extracted = extractTotalAmount(text);
      if (extracted !== null) {
        amountEl.value = extracted;
        statusEl.textContent = `✅ Auto-filled: Rp${extracted.toLocaleString()} (in ${scanTime}s)`;
statusEl.textContent += " — now press 'Add' to confirm transaction.";
      } else {
        statusEl.textContent = `⚠️ Couldn't detect a valid total (scanned in ${scanTime}s)`;
      }

    } catch (err) {
      console.error("OCR error:", err);
      statusEl.textContent = "❌ Failed to scan receipt.";
    }
  };

  reader.readAsDataURL(file);
}


function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// -------- 🧩 ADMIN MODE / TIER SETTINGS --------
const modeSelect = document.getElementById("modeSelect");

if (modeSelect) {
  const savedMode = localStorage.getItem("isAdmin") === "true" ? "admin" : "public";
  modeSelect.value = savedMode;

  modeSelect.addEventListener("change", async (e) => {
    const selected = e.target.value;

    if (selected === "admin") {
      const password = prompt("🔐 Enter admin password:");
      if (password === "1234") {
        alert("✅ Admin mode enabled.");
        localStorage.setItem("isAdmin", true);
        location.reload();
      } else {
        alert("❌ Incorrect password. Staying in public mode.");
        modeSelect.value = "public";
        localStorage.setItem("isAdmin", false);
      }
    } else {
      localStorage.setItem("isAdmin", false);
      location.reload();
    }
  });
}

const isAdmin = localStorage.getItem("isAdmin") === "true";
const settingsRef = db.collection("settings").doc("tierThresholds");
let tierSettings = {};

// -------- 🧠 CASHBACK SETTINGS --------
async function loadCashbackSettings() {
  try {
    const doc = await db.collection("settings").doc("cashbackRates").get();
    if (doc.exists) {
      const d = doc.data();
      document.getElementById("silverRate").value = d.silverCashbackRate;
      document.getElementById("goldRate").value = d.goldCashbackRate;
      document.getElementById("birthdayGold").value = d.birthdayGoldCashbackRate;
      document.getElementById("silverCap").value = d.silverDailyCashbackCap;
      document.getElementById("goldCap").value = d.goldDailyCashbackCap;
      console.log("✅ Loaded cashback settings:", d);
    }
  } catch (err) {
    console.error("⚠️ Failed to load cashback settings:", err);
  }
}

async function loadTierSettingsFromCloud() {
  try {
    const doc = await settingsRef.get();
    if (doc.exists) {
      tierSettings = doc.data();
      console.log("✅ Loaded settings from Firestore:", tierSettings);
    }
  } catch (err) {
    console.error("⚠️ Failed to load settings:", err);
  }
}
loadTierSettingsFromCloud();

let lastVisible = null;

const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", async (e) => {
    const keyword = e.target.value.trim().toLowerCase();

    if (!keyword) {
      document.getElementById("loadMoreBtn").style.display = "block";
      lastVisible = null;
      document.getElementById("memberList").innerHTML = "";
      await loadNextPage();
      return;
    }

    const results = await searchMembersByName(keyword);
    renderMembers(results);
    document.getElementById("loadMoreBtn").style.display = "none";
  });
}


  const tierBenefits = {
    Bronze: [
      "- 10% off at 13e Café",
      "- 5% off Honda motorbike service (excl. spare parts)",
    ],
    Silver: [
      "- 15% off at 13e Café",
      "- 10% off Honda service + 5% off at Millennium",
      "- 5% cashback (Rp15k/day cap)",
    ],
    Gold: [
      "- 20% off at 13e Café",
      "- 15% off Honda service + 10% off at Millennium",
      "- 🏨 Free room upgrade (every 6 months)",
      "- 💰 5% cashback (Rp30k/day cap) + new unit voucher",
    ]
  };

const birthdayPerks = {
  Bronze: [
    "🎂 Birthday Treat:",
    "- Free drink/snack + 30% off Honda service"
  ],
  Silver: [
    "🎂 Birthday Treat:",
    "- Free drink and snack",
    "- 50% off at Millennium",
    "- 30% off Honda service"
  ],
  Gold: [
    "🎂 VIP Birthday Package:",
    "- 🏨 Free Deluxe room for one night",
    "- 🍽️ Free Food+drink+snack combo",
    "- 💰 30% cashback (Rp30k/day cap)",
    "- 🍽️ Free VIP lounge access at 13e Café",
    "- 🎁 Optional Free birthday gift delivered to home"
  ]
};

async function searchMembersByName(keyword) {
  const snapshot = await db.collection("members")
    .orderBy("nameLower")
    .startAt(keyword)
    .endAt(keyword + '\uf8ff')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

  function renderMembers(members, filter = "") {

    const list = document.getElementById("memberList");
    list.innerHTML = "";

    const filtered = members.filter(m =>
      m.name.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(member => {
  const card = document.createElement("div");
  card.className = "member-card";

  const tierKey = (member.tier || "Bronze").charAt(0).toUpperCase() + member.tier.slice(1).toLowerCase();

  card.innerHTML = `
    <span class="tier-${member.tier.toLowerCase()}">●</span>
    <strong>${member.name}</strong> (${tierKey})<br>
    <ul style="margin:4px 0 8px; padding-left:16px; font-size:0.75em; color:#555;">
       ${(tierBenefits[tierKey] || []).map(b => `<li>☕ ${b}</li>`).join("")}
  ${(birthdayPerks[tierKey] || []).map(b => `<li>🎉 ${b}</li>`).join("")}
    </ul>
  `;

  card.onclick = () => {
    window.location.href = `details.html?id=${member.id}`;
  };

  list.appendChild(card);
});
}

  function checkUpcomingBirthdays(members) {
    const today = new Date();
    const banner = document.getElementById("birthdayBanner");
    const messageSpan = document.getElementById("birthdayMessage");
    if (!banner || !messageSpan) return;

    const messages = members
      .filter(m => m.birthdate)
      .map(m => {
        const b = new Date(m.birthdate);
        b.setFullYear(today.getFullYear());
        const diff = (b - today) / (1000 * 60 * 60 * 24);
        const dateStr = b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        if (diff === 0) {
          return `🎈 Today only: <strong>${m.name}</strong> gets a birthday freebie! 🎁`;
        } else if (diff >= -3 && diff <= 3) {
          return `🎉 <strong>${m.name}</strong>'s birthday is on ${dateStr}!`;
        }
        return null;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      banner.style.display = "block";
      messageSpan.innerHTML = messages.join("<br>");
    } else {
      banner.style.display = "none";
    }
  }

// 🆔 KTP-to-Birthdate Autofill
const newKTPInput = document.getElementById("newKTP");
if (newKTPInput) {
  newKTPInput.addEventListener("blur", () => {
    const ktp = newKTPInput.value.trim();
    if (!ktp || ktp.length < 12) return;

    const dobPart = ktp.slice(6, 12);
    let day = parseInt(dobPart.slice(0, 2), 10);
    const month = parseInt(dobPart.slice(2, 4), 10);
    const year = parseInt(dobPart.slice(4, 6), 10);

    const gender = day > 40 ? "Female" : "Male";
    if (day > 40) day -= 40;

    const now = new Date();
    const century = year <= now.getFullYear() % 100 ? 2000 : 1900;
    const fullDate = new Date(century + year, month - 1, day);

    const yyyy = fullDate.getFullYear();
    const mm = String(fullDate.getMonth() + 1).padStart(2, '0');
    const dd = String(fullDate.getDate()).padStart(2, '0');

    const iso = `${yyyy}-${mm}-${dd}`;
    const birthInput = document.getElementById("newBirthdate");
    if (birthInput) birthInput.value = iso;

    console.log(`🎂 Detected birthdate: ${iso} (${gender})`);
  });
}

// -------- ➕ ADD PAGE --------
if (document.getElementById("addMemberBtn")) {
  document.getElementById("addMemberBtn").addEventListener("click", async () => {
if (!isAdmin) {
  const tierSelect = document.getElementById("newTier");
  tierSelect.value = "bronze";
  tierSelect.disabled = true;

  // Optional: add a note
  const note = document.createElement("small");
  note.textContent = "Public users are assigned Bronze tier automatically.";
  note.style.color = "gray";
  tierSelect.parentElement.appendChild(note);
}
    const name = document.getElementById("newName").value.trim();
    const birthdate = document.getElementById("newBirthdate").value;
    const phone = document.getElementById("newPhone").value;
    const email = document.getElementById("newEmail").value;
const ktp = document.getElementById("newKTP").value;
    const tier = isAdmin ? document.getElementById("newTier").value : "bronze";

    if (!name) {
      alert("Name is required.");
      return;
    }



const newMember = {
  id: Date.now().toString(),
  name,
  nameLower: name.toLowerCase(), // ✅ Add this!
  birthdate,
  phone,
  email,
  ktp,
  tier,
  transactions: [],
  lastRoomUpgrade: null // 👈 Add this line
};

    try {
  newMember.welcomed = true; // 👈 Set flag here
  await saveMember(newMember);

  await sendEmailNotification("template_hi5egvi", {
    member_name: name,
    member_email: email
  });

  alert(`✅ ${name} added!`);
  window.location.href = "index.html";
} catch (err) {
      console.error("Failed to save member:", err);
      alert("⚠️ Failed to add member. Please try again.");
    }
  });

document.addEventListener("DOMContentLoaded", () => {



  if (!isAdmin && document.getElementById("newTier")) {
    const tierSelect = document.getElementById("newTier");
    tierSelect.value = "bronze";
    tierSelect.disabled = true;

    const note = document.createElement("small");
    note.textContent = "Public users are assigned Bronze tier automatically.";
    note.style.color = "gray";
    tierSelect.parentElement.appendChild(note);
  }
});
}

// -------- 🔍 DETAILS PAGE --------
if (document.getElementById("memberDetails")) {
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("id");

  db.collection("members").doc(memberId).get().then(doc => {
    if (!doc.exists) {
      document.getElementById("memberDetails").innerHTML = "<p>Member not found.</p>";
    } else {
      renderDetails({ id: doc.id, ...doc.data() });
    }
  });
}

async function renderDetails(member) {

if (!Array.isArray(member.roomUpgradeHistory)) member.roomUpgradeHistory = [];

if (typeof member.yearlySinceUpgrade !== "number") member.yearlySinceUpgrade = 0;
member.redeemablePoints = member.redeemablePoints || 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  let monthly = 0, yearly = 0, lastYearTotal = 0, full = 0, cashbackTotal = 0;

  (member.transactions || []).forEach(tx => {
    const date = new Date(tx.date);
    full += tx.amount;
    cashbackTotal += tx.cashback || 0;
    if (date.getFullYear() === thisYear) {
      yearly += tx.amount;
      if (date.getMonth() === thisMonth) monthly += tx.amount;
    }
    if (date.getFullYear() === lastYear) lastYearTotal += tx.amount;
  });

  await updateTier(member);

  document.getElementById("memberDetails").innerHTML = `
${isAdmin ? `
  <button id="editMemberBtn">✏️ Edit Member Details</button>
` : ""}



<p>Available Cashback Points: <strong>Rp${member.redeemablePoints}</strong></p>

<input type="number" id="redeemAmount" placeholder="Redeem Rp..." />
<button id="redeemBtn">Redeem</button>


${member.tier === "Gold" && member.roomUpgradeHistory?.length > 0 ? `
  <h3>Room Upgrade History</h3>
  <ul style="font-size:0.9em; color:#444; padding-left:20px;">
    ${member.roomUpgradeHistory.slice().reverse().map(date => `
      <li>🏨 ${new Date(date).toLocaleDateString()}</li>
    `).join("")}
  </ul>
` : ""}

    <h2>${member.name}</h2>
    <p>Tier: ${member.tier}</p>

    <ul>
      <li>Birthdate: ${member.birthdate || "-"}</li>
      <li>Phone: ${member.phone || "-"}</li>
      <li>Email: ${member.email || "-"}</li>
      <li>KTP: ${member.ktp || "-"}</li>
      <li>Spending Since Upgrade (Month): Rp${(member.monthlySinceUpgrade ?? 0).toLocaleString()}</li>
      <li>Spending Since Upgrade (Year): Rp${(member.yearlySinceUpgrade ?? 0).toLocaleString()}</li>
      <li>Cashback Earned: Rp${cashbackTotal.toLocaleString()}</li>
      <li>This Year: Rp${yearly.toLocaleString()}</li>
      <li>Last Year: Rp${lastYearTotal.toLocaleString()}</li>
      <li>All Time: Rp${full.toLocaleString()}</li>
    </ul>
    <p>Total Transactions: ${member.transactions.length}</p>

${member.tier === "Gold" ? (() => {
  const now = new Date();
  const last = member.lastRoomUpgrade ? new Date(member.lastRoomUpgrade) : null;
  const diff = last ? (now - last) / (1000 * 60 * 60 * 24) : 999;
  if (diff >= 180) {
    return `<button id="claimRoomUpgrade">🏨 Claim Free Room Upgrade</button>`;
  } else {
    const nextDate = new Date(last.setMonth(last.getMonth() + 6));
    return `<p style="color:gray;">⏳ Next upgrade on ${nextDate.toLocaleDateString()}</p>`;
  }
})() : ""}



    <h3>Add Transaction</h3>
<input type="number" id="txAmount" placeholder="Amount Spent" ${isAdmin ? "" : "readonly"} />
${!isAdmin ? `<small style="color:gray;">Amount is auto-filled from scanned receipt</small>` : ""}
    <input type="file" id="txFile" accept="image/*,.pdf" />

<p id="ocrStatus" style="color:#777; font-style:italic;"></p>
    <button id="addTxBtn">Add</button><br><br>

    <button id="deleteMemberBtn" style="background-color:crimson; color:white;">
      🗑 Delete Member
    </button>
  `;

if (isAdmin) {
  document.getElementById("editMemberBtn")?.addEventListener("click", () => {
    window.location.href = `edit.html?id=${member.id}`;
  });
}


// 🔽 Add this OCR handler immediately after setting the HTML:
const txFile = document.getElementById("txFile");
const txAmountEl = document.getElementById("txAmount");
const ocrStatus = document.getElementById("ocrStatus");

txFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  handleReceiptOCR(file, ocrStatus, txAmountEl).then(() => {
    e.target.value = ""; // ✅ Reset so same file can be reselected
  });
});

document.getElementById("saveEditsBtn")?.addEventListener("click", async () => {
  member.name = document.getElementById("editName").value.trim();
  member.nameLower = member.name.toLowerCase();
  member.birthdate = document.getElementById("editBirth").value;
  member.phone = document.getElementById("editPhone").value.trim();
  member.email = document.getElementById("editEmail").value.trim();
  member.ktp = document.getElementById("editKTP").value.trim();
  member.tier = document.getElementById("editTier").value;

  await saveMember(member);
  alert("✅ Changes saved!");
  location.reload();
});




  // 🗑 Admin Delete Button
  document.getElementById("deleteMemberBtn").addEventListener("click", async () => {
    if (!isAdmin) {
      alert("❌ You must be in admin mode to delete members.");
      return;
    }
    if (confirm(`Are you sure you want to delete ${member.name}?`)) {
      await deleteMember(member.id);
      alert("🗑 Member deleted.");
      window.location.href = "index.html";
    }
  });

document.getElementById("claimRoomUpgrade")?.addEventListener("click", async () => {
  if (!confirm("Confirm Gold tier room upgrade for this member?")) return;

  const nowStr = new Date().toISOString();

  member.lastRoomUpgrade = nowStr;
  member.roomUpgradeHistory = member.roomUpgradeHistory || [];
  member.roomUpgradeHistory.push(nowStr); // ✅ record the claim

  await saveMember(member);
  alert("✅ Room upgrade redeemed! Next one in 6 months.");
  location.reload();
});

  // 💳 Transaction History Table with Cashback
  if (member.transactions?.length > 0) {
  const historySection = document.createElement("div");

  const rows = member.transactions.slice().reverse().map((tx, index) => {
    const txDate = new Date(tx.date);
    const txDateStr = txDate.toLocaleDateString();
    const capped = tx.note?.includes("capped")
      ? `<br><small style="color:crimson;">🎯 ${tx.note}</small>` : "";

    return `
      <tr>
        <td>${txDateStr}</td>
        <td>Rp${tx.amount.toLocaleString()}</td>
        <td style="color:${tx.cashback ? 'green' : '#999'};">
          ${tx.cashback ? `+Rp${tx.cashback.toLocaleString()}` : '–'}${capped}
        </td>
        ${isAdmin ? `<td><button class="deleteTxBtn" data-index="${member.transactions.length - 1 - index}">🗑</button></td>` : ""}
      </tr>`;
  }).join("");

  historySection.innerHTML = `
    <h3>Transaction History</h3>
    <table style="border-collapse:collapse;width:100%;font-size:0.9em;">
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount</th>
          <th>Cashback</th>
          ${isAdmin ? `<th>Delete</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  document.getElementById("memberDetails").appendChild(historySection);
}

if (isAdmin) {
  document.querySelectorAll(".deleteTxBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.dataset.index);
      if (!confirm("Delete this transaction?")) return;

      const removedTx = member.transactions.splice(i, 1)[0];
      member.redeemablePoints = Math.max(0, (member.redeemablePoints || 0) - (removedTx.cashback || 0));

      await saveMember(member);
      alert("🗑 Transaction deleted.");
      location.reload();
    });
  });
}

const redeemBtn = document.getElementById("redeemBtn");
if (redeemBtn) {
  redeemBtn.addEventListener("click", async () => {
    const redeem = parseInt(document.getElementById("redeemAmount").value);
    if (isNaN(redeem) || redeem <= 0) return alert("Enter a valid amount.");
    if (redeem > member.redeemablePoints) return alert("Insufficient points.");

    member.redeemablePoints -= redeem;
    await saveMember(member);
    alert(`🎉 Redeemed Rp${redeem}!`);
    location.reload();
  });
}

document.querySelectorAll(".deleteTxBtn").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    const i = parseInt(btn.dataset.index);
    if (!confirm(`Delete transaction on ${new Date(member.transactions[i].date).toLocaleDateString()}?`)) return;

    const removedTx = member.transactions.splice(i, 1)[0];
    member.redeemablePoints = Math.max(0, (member.redeemablePoints || 0) - (removedTx.cashback || 0));

    await saveMember(member);
    alert("🗑 Transaction deleted.");
    location.reload();
  });
});



  // ➕ Add Transaction + Cashback
  document.getElementById("addTxBtn").addEventListener("click", async () => {
    const amount = parseFloat(document.getElementById("txAmount").value);
    const file = document.getElementById("txFile").files[0];
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const tier = member.tier;
    const isBirthday = isSameDay(now, member.birthdate);

  // 📷 Auto-OCR if amount field is empty

if (file && !amount) {
  await handleReceiptOCR(file, document.getElementById("ocrStatus"), document.getElementById("txAmount"));
  return; // Wait for user to confirm or edit before submitting
}

    const rate =
      tier === "Gold" && isBirthday
        ? tierSettings.birthdayGoldCashbackRate ?? 30
        : tier === "Gold"
          ? tierSettings.goldCashbackRate ?? 5
          : tier === "Silver"
            ? tierSettings.silverCashbackRate ?? 5
            : 0;

    const cap =
      tier === "Gold"
        ? tierSettings.goldDailyCashbackCap ?? 30000
        : tier === "Silver"
          ? tierSettings.silverDailyCashbackCap ?? 15000
          : 0;

    const todayCashback = (member.transactions || [])
      .filter(tx => tx.date?.startsWith(todayStr) && tx.cashback)
      .reduce((sum, tx) => sum + tx.cashback, 0);

// ✅ Use capped cashback value above
let cashback = Math.floor((amount * rate) / 100);
if (todayCashback + cashback > cap) {
  cashback = Math.max(0, cap - todayCashback);
}

// 💾 Then use it here:
const tx = {
  date: now.toISOString(),
  amount,
  cashback, // ✅ capped value
  fileData: null
};

const finishTransaction = async () => {
  const txFinal = {
    date: now.toISOString(),
    amount,
    cashback,
    note: (todayCashback + cashback === cap && cap !== 0)
      ? `Cashback capped at Rp${cap.toLocaleString()} today`
      : "",
    fileData: tx.fileData || null
  };

  member.transactions.push(txFinal);
  member.redeemablePoints = (member.redeemablePoints || 0) + cashback;

  const upgraded = await updateTier(member);

if (member.email) {
  await sendTransactionSummaryEmail(member, txFinal);
}

if (!upgraded) {
  await saveMember(member); // Only save again if not already saved during upgrade
}
  if (upgraded) alert(`🎉 ${member.name} upgraded to ${member.tier}!`);
  location.reload();
};

    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        tx.fileData = reader.result;
        await finishTransaction();
      };
      reader.readAsDataURL(file);
    } else {
      await finishTransaction();
    }
  });
}



if (document.getElementById("editForm")) {
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("id");

  db.collection("members").doc(memberId).get().then(doc => {
    if (!doc.exists) {
      document.getElementById("editForm").innerHTML = "<p>Member not found.</p>";
    } else {
      renderEditForm({ id: doc.id, ...doc.data() });
    }
  });
}

function renderEditForm(member) {
  document.getElementById("editForm").innerHTML = `
    <label>Name:<br><input type="text" id="editName" value="${member.name}" /></label><br>
    <label>Birthdate:<br><input type="date" id="editBirth" value="${member.birthdate}" /></label><br>
    <label>Phone:<br><input type="text" id="editPhone" value="${member.phone}" /></label><br>
    <label>Email:<br><input type="email" id="editEmail" value="${member.email}" /></label><br>
    <label>KTP:<br><input type="text" id="editKTP" value="${member.ktp}" /></label><br>
    <label>Tier:<br>
      <select id="editTier">
        <option value="Bronze">Bronze</option>
        <option value="Silver">Silver</option>
        <option value="Gold">Gold</option>
      </select>
    </label><br><br>
    <button id="saveEditsBtn">💾 Save Changes</button>
    <button onclick="location.href='details.html?id=${member.id}'">↩️ Back to Details</button>
  `;

  document.getElementById("editTier").value = member.tier;

  document.getElementById("saveEditsBtn").addEventListener("click", async () => {
    member.name = document.getElementById("editName").value.trim();
    member.nameLower = member.name.toLowerCase();
    member.birthdate = document.getElementById("editBirth").value;
    member.phone = document.getElementById("editPhone").value;
    member.email = document.getElementById("editEmail").value;
    member.ktp = document.getElementById("editKTP").value;
    member.tier = document.getElementById("editTier").value;

    await saveMember(member);
    alert("✅ Member updated!");
    window.location.href = `details.html?id=${member.id}`;
  });
}

// 🔁 Export transactions as CSV
async function exportAllTransactions() {
  const snapshot = await db.collection("members").get();
renderMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

  let csv = "Member ID,Member Name,Date,Amount,File Attached\n";
  members.forEach(member => {
    (member.transactions || []).forEach(tx => {
      const date = new Date(tx.date).toLocaleDateString();
      const fileAttached = tx.fileData ? "Yes" : "No";
      csv += `"${member.id}","${member.name}","${date}",${tx.amount},"${fileAttached}"\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "13e-transactions.csv";
  a.click();
}

// 📷 Export with embedded base64 image
async function exportTransactionsWithImages() {
  const snapshot = await db.collection("members").get();
renderMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

  const rows = [["Member ID", "Member Name", "Date", "Amount", "Image"]];
  members.forEach(member => {
    (member.transactions || []).forEach(tx => {
      rows.push([
        member.id,
        member.name,
        new Date(tx.date).toLocaleDateString(),
        tx.amount,
        tx.fileData || ""
      ]);
    });
  });

  const csv = rows.map(row =>
    row.map(cell => (typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell)).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "13e-transactions-with-images.csv";
  link.click();
}

// 💾 Export full member data as JSON
async function exportJSON() {
  const snapshot = await db.collection("members").get();
renderMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  const blob = new Blob([JSON.stringify(members, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "13e-members-backup.json";
  a.click();
}

async function updateTier(member) {

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const upgradeDate = member.upgradeDate ? new Date(member.upgradeDate) : null;

  let yearTotal = 0, monthlyTotal = 0;
  let yearlySinceUpgrade = 0, monthlySinceUpgrade = 0;

  (member.transactions || []).forEach(tx => {
    const txDate = new Date(tx.date);
    if (txDate.getFullYear() === currentYear) {
      yearTotal += tx.amount;
      if (txDate.getMonth() === currentMonth) {
        monthlyTotal += tx.amount;
      }
      if (upgradeDate && txDate > upgradeDate) {
        yearlySinceUpgrade += tx.amount;
        if (txDate.getMonth() === currentMonth) {
          monthlySinceUpgrade += tx.amount;
        }
      }
    }
  });

  if (!upgradeDate) {
    yearlySinceUpgrade = yearTotal;
    monthlySinceUpgrade = monthlyTotal;
  }

  member.yearlySinceUpgrade = yearlySinceUpgrade;
  member.monthlySinceUpgrade = monthlySinceUpgrade;

  const thresholds = {
    bronzeToSilverMonth: tierSettings.bronzeToSilverMonth ?? 300000,
    bronzeToSilverYear: tierSettings.bronzeToSilverYear ?? 1200000,
    silverToGoldMonth: tierSettings.silverToGoldMonth ?? 1250000,
    silverToGoldYear: tierSettings.silverToGoldYear ?? 4000000
  };

  const currentTier = (member.tier || "Bronze").trim().toLowerCase();
let newTier = currentTier;

if (currentTier === "bronze" && (
  monthlySinceUpgrade >= thresholds.bronzeToSilverMonth ||
  yearlySinceUpgrade >= thresholds.bronzeToSilverYear)) {
  newTier = "silver";
} else if (currentTier === "silver" && (
  monthlySinceUpgrade >= thresholds.silverToGoldMonth ||
  yearlySinceUpgrade >= thresholds.silverToGoldYear)) {
  newTier = "gold";
}

console.log("🔎 Checking for upgrade:", member.name, {
  monthlySinceUpgrade,
  yearlySinceUpgrade,
  currentTier,
  thresholds
});

  if (newTier !== currentTier) {
  member.tier = newTier;
  member.upgradeDate = now.toISOString();
  member.yearlySinceUpgrade = 0;
  member.monthlySinceUpgrade = 0;
member.tier = newTier.charAt(0).toUpperCase() + newTier.slice(1).toLowerCase();
if (member.email) {
  await sendUpgradeEmail(member); // 💌 Congratulates them by email
}
  await saveMember(member);
  alert(`🎉 ${member.name} has just been upgraded to ${newTier} tier!`);
  console.log(`🎉 ${member.name} upgraded to ${newTier}`);
  return true;
  } else {
    await db.collection("members").doc(member.id).update({
      yearlySinceUpgrade,
      monthlySinceUpgrade
    });
    return false;
  }


}

async function deleteMember(memberId) {
  try {
    await db.collection("members").doc(memberId).delete();
    console.log(`🗑 Member ${memberId} deleted from Firestore.`);
  } catch (err) {
    console.error("❌ Failed to delete member:", err);
    alert("Failed to delete member. Please try again.");
  }
}


function saveTierSettings() {
  localStorage.setItem("tierSettings", JSON.stringify(tierSettings));
  alert("✅ Settings saved!");
}

async function loadNextPage() {
  let query = db.collection("members").orderBy("nameLower").limit(20);
  if (lastVisible) query = query.startAfter(lastVisible);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.log("🚫 No more members to load.");
    document.getElementById("loadMoreBtn").disabled = true;
    document.getElementById("loadMoreBtn").textContent = "✅ All loaded";
    return;
  }

  lastVisible = snapshot.docs[snapshot.docs.length - 1];
  const newMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
checkUpcomingBirthdays(newMembers); // 🥳 optional banner
  renderMembers(newMembers);
  
}

async function renderTierChart() {
  const snapshot = await db.collection("members").get();
  const data = { Bronze: 0, Silver: 0, Gold: 0 };

  snapshot.forEach(doc => {
    const tier = (doc.data().tier || "Bronze").trim();
    if (data[tier]) data[tier]++;
  });

  new Chart(document.getElementById("tierChart"), {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Members per Tier",
        data: Object.values(data),
        backgroundColor: ["#cd7f32", "#c0c0c0", "#ffd700"]
      }]
    }
  });
}

async function showTopMembers() {
  const snapshot = await db.collection("members").get();
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  members.sort((a, b) =>
    (b.transactions || []).reduce((t, x) => t + x.amount, 0) -
    (a.transactions || []).reduce((t, x) => t + x.amount, 0)
  );

  const top = members.slice(0, 3);
  const div = document.getElementById("topMembers");
  div.innerHTML = `
    <h3>🏅 Top Customers</h3>
    <ul>
      ${top.map(m => `<li><strong>${m.name}</strong> (${m.tier}) — Rp${(m.transactions || []).reduce((t, x) => t + x.amount, 0).toLocaleString()}</li>`).join("")}
    </ul>
  `;
}

async function showActivityFeed() {
  const snapshot = await db.collection("members").get();
  const recent = [];

  snapshot.forEach(doc => {
    const m = doc.data();
    (m.transactions || []).forEach(tx => recent.push({
      name: m.name,
      date: new Date(tx.date),
      amount: tx.amount
    }));
  });

  recent.sort((a, b) => b.date - a.date);
  const feed = recent.slice(0, 5);

  const div = document.getElementById("activityFeed");
  div.innerHTML = `
    <h3>🔔 Recent Activity</h3>
    <ul>
      ${feed.map(f => `<li>${f.date.toLocaleString()} — ${f.name} spent Rp${f.amount.toLocaleString()}</li>`).join("")}
    </ul>
  `;
}




document.addEventListener("DOMContentLoaded", async () => {
  if (!isAdmin) return;
  console.log("👀 Birthday check running");

  const snapshot = await db.collection("members").get();
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  for (const member of members) {
    if (!member.birthdate || !member.email) continue;

    const b = new Date(member.birthdate);
    const isBirthdayToday = b.getDate() === today.getDate() && b.getMonth() === today.getMonth();

    const lastSent = new Date(member.lastBirthdayEmail || 0);
    const daysSince = (today - lastSent) / (1000 * 60 * 60 * 24);

    if (isBirthdayToday && daysSince >= 7) {
      await testBirthdayEmail(member);
      await db.collection("members").doc(member.id).update({
        lastBirthdayEmail: todayStr
      });
    }
  }

  console.log("🎂 Birthday email auto-check complete.");
});


if (isAdmin && document.getElementById("sendAllWelcomeBtn")) {
  const btn = document.getElementById("sendAllWelcomeBtn");
  btn.style.display = "inline-block";
  btn.addEventListener("click", () => {
    if (confirm("Send welcome email to all members who haven't received one yet?")) {
      sendWelcomeToAllMembers();
    }
  });
}



if (document.getElementById("tierChart")) {
  renderTierChart();
  showTopMembers();
  showActivityFeed();
}

  const memberList = document.getElementById("memberList");
  if (memberList) {
    try {
      loadNextPage();
    } catch (err) {
      console.error("❌ Failed to load members:", err);
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", async (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        if (!keyword) {
          document.getElementById("loadMoreBtn").style.display = "block";
          lastVisible = null;
          document.getElementById("memberList").innerHTML = "";
          await loadNextPage();
          return;
        }

        const results = await searchMembersByName(keyword);
        renderMembers(results);
        document.getElementById("loadMoreBtn").style.display = "none";
      });
    }
  }

if (document.getElementById("silverRate")) {
  loadCashbackSettings();
}

if (document.getElementById("saveSettingsBtn")) {
  document.getElementById("monthlyThreshold").value = tierSettings.bronzeToSilverMonth ?? 0;
  document.getElementById("yearlyThreshold").value = tierSettings.bronzeToSilverYear ?? 0;
  document.getElementById("maintainSilver").value = tierSettings.silverMaintainYear ?? 0;
  document.getElementById("silverToGoldMonth").value = tierSettings.silverToGoldMonth ?? 0;
  document.getElementById("silverToGoldYear").value = tierSettings.silverToGoldYear ?? 0;
  document.getElementById("maintainGoldYear").value = tierSettings.goldMaintainYear ?? 0;

  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    tierSettings.bronzeToSilverMonth = parseInt(document.getElementById("monthlyThreshold").value) || 0;
    tierSettings.bronzeToSilverYear = parseInt(document.getElementById("yearlyThreshold").value) || 0;
    tierSettings.silverMaintainYear = parseInt(document.getElementById("maintainSilver").value) || 0;
    tierSettings.silverToGoldMonth = parseInt(document.getElementById("silverToGoldMonth").value) || 0;
    tierSettings.silverToGoldYear = parseInt(document.getElementById("silverToGoldYear").value) || 0;
    tierSettings.goldMaintainYear = parseInt(document.getElementById("maintainGoldYear").value) || 0;
    saveTierSettings();
  });
}