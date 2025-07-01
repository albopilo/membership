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

if (document.getElementById("memberList")) {
  db.collection("members").onSnapshot(snapshot => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMembers(members);
    checkUpcomingBirthdays(members);
  });

  document.getElementById("searchInput").addEventListener("input", async (e) => {
    const members = await fetchMembers();
    renderMembers(members, e.target.value);
  });

  const tierBenefits = {
    Bronze: [
      "10% off at 13e Café",
      "5% off Honda motorbike service (excl. spare parts)",
      "🎂 Birthday Treat: free drink/snack + 30% off Honda service"
    ],
    Silver: [
      "15% off at 13e Café",
      "10% off Honda service + 5% off at Millennium",
      "💰 5% cashback (Rp15k/day cap)",
      "🎂 Birthday: free drink+snack, 50% off Millennium, 30% off service"
    ],
    Gold: [
      "20% off at 13e Café",
      "15% off Honda service + 10% off at Millennium",
      "🏨 Free room upgrade (every 6 months)",
      "💰 5% cashback (Rp30k/day cap) + new unit voucher",
      "🎁 VIP Birthday: deluxe room, food/drink/snack, 30% cashback, VIP lounge access"
    ]
  };

  function renderMembers(members, filter = "") {
    const list = document.getElementById("memberList");
    list.innerHTML = "";

    const filtered = members.filter(m =>
      m.name.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(member => {
      const card = document.createElement("div");
      card.className = "member-card";
      card.innerHTML = `
        <span class="tier-${member.tier.toLowerCase()}">●</span>
        <strong>${member.name}</strong> (${member.tier})<br>
        <ul style="margin:4px 0 8px; padding-left:16px; font-size:0.85em; color:#555;">
          ${(tierBenefits[member.tier] || []).map(b => `<li>${b}</li>`).join("")}
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
}

// -------- ➕ ADD PAGE --------
if (document.getElementById("addMemberBtn")) {
  document.getElementById("addMemberBtn").addEventListener("click", async () => {
    const name = document.getElementById("newName").value.trim();
    const birthdate = document.getElementById("newBirthdate").value;
    const phone = document.getElementById("newPhone").value;
    const email = document.getElementById("newEmail").value;
    const ktp = document.getElementById("newKTP").value;
    const tier = document.getElementById("newTier").value;

    if (!name) {
      alert("Name is required.");
      return;
    }

    const newMember = {
      id: Date.now().toString(),
      name,
      birthdate,
      phone,
      email,
      ktp,
      tier,
      transactions: []
    };

    try {
      await saveMember(newMember);
      alert(`✅ ${name} added!`);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Failed to save member:", err);
      alert("⚠️ Failed to add member. Please try again.");
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
<p>Available Cashback Points: <strong>Rp${member.redeemablePoints}</strong></p>

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

    <h3>Add Transaction</h3>
    <input type="number" id="txAmount" placeholder="Amount Spent" />
    <input type="file" id="txFile" accept="image/*,.pdf" />
    <button id="addTxBtn">Add</button><br><br>

    <button id="deleteMemberBtn" style="background-color:crimson; color:white;">
      🗑 Delete Member
    </button>
  `;

  // ➕ Add Transaction Logic
  document.getElementById("addTxBtn").addEventListener("click", async () => {


    const amount = parseFloat(document.getElementById("txAmount").value);
    const file = document.getElementById("txFile").files[0];
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const todayStr = now.toISOString().split("T")[0];
    const tier = member.tier;
    const isBirthday = isSameDay(now, member.birthdate);

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

    let cashback = Math.floor((amount * rate) / 100);
    if (todayCashback + cashback > cap) {
      cashback = Math.max(0, cap - todayCashback);
    }

    const tx = {
      date: now.toISOString(),
      amount,
      cashback,
      fileData: null
    };

    const finishTransaction = async () => {
  member.transactions.push(tx);
  member.redeemablePoints += cashback; // 👈 Add this here
  const upgraded = await updateTier(member);
  if (!upgraded) await saveMember(member);
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

// ✅ Place the OCR handler right here
document.getElementById("txFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    Tesseract.recognize(reader.result, 'eng').then(result => {
      const match = result.data.text.match(/(?:grand\s*)?total\s*[:\-]?\s*Rp?\s?([\d.,]+)/i);
      if (match) {
        const extracted = parseInt(match[1].replace(/[^\d]/g, ""));
        document.getElementById("txAmount").value = extracted;
        alert(`🧾 OCR auto-filled amount: Rp${extracted.toLocaleString()}`);
      } else {
        alert("⚠️ Couldn't detect a total amount in the receipt.");
      }
    }).catch(err => {
      console.error("OCR error:", err);
      alert("⚠️ Failed to scan receipt.");
    });
  };
  reader.readAsDataURL(file);
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

  // 💳 Transaction History Table with Cashback
  if (member.transactions?.length > 0) {
    const historySection = document.createElement("div");
    historySection.innerHTML = `
      <h3>Transaction History</h3>
      <table style="border-collapse:collapse;width:100%;font-size:0.9em;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Cashback</th>
          </tr>
        </thead>
        <tbody>
          ${member.transactions.slice().reverse().map(tx => `
            <tr>
              <td>${new Date(tx.date).toLocaleDateString()}</td>
              <td>Rp${tx.amount.toLocaleString()}</td>
              <td style="color:${tx.cashback ? 'green' : '#999'};">
                ${tx.cashback ? `+Rp${tx.cashback.toLocaleString()}` : '–'}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    `;
    document.getElementById("memberDetails").appendChild(historySection);
  }

document.getElementById("redeemBtn").addEventListener("click", async () => {
  const redeem = parseInt(document.getElementById("redeemAmount").value);
  if (isNaN(redeem) || redeem <= 0) return alert("Enter a valid amount.");
  if (redeem > member.redeemablePoints) return alert("Insufficient points.");

  member.redeemablePoints -= redeem;
  await saveMember(member);
  alert(`🎉 Redeemed Rp${redeem}!`);
  location.reload();
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
    const reader = new FileReader();
    reader.onload = () => {
      Tesseract.recognize(reader.result, 'eng').then(result => {
        const text = result.data.text;

        const match = text.match(/(?:total|jumlah|bayar)\s*[:\-]?\s*Rp?\s?([\d.,]+)/i);
        if (match) {
          const extracted = parseInt(match[1].replace(/[^\d]/g, ""));
          document.getElementById("txAmount").value = extracted;
          alert(`🧾 OCR detected amount: Rp${extracted.toLocaleString()}`);
        } else {
          alert("⚠️ Couldn't detect amount in receipt text.");
        }
      });
    };
    reader.readAsDataURL(file);
    return; // Stop form submission so user can confirm amount
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

    let cashback = Math.floor((amount * rate) / 100);
    if (todayCashback + cashback > cap) {
      cashback = Math.max(0, cap - todayCashback);
    }

    const tx = {
      date: now.toISOString(),
      amount,
      cashback,
      fileData: null
    };

    const finishTransaction = async () => {
      member.transactions.push(tx);
      const upgraded = await updateTier(member);
      if (!upgraded) await saveMember(member);
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

// 🔁 Export transactions as CSV
async function exportAllTransactions() {
  const snapshot = await db.collection("members").get();
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const currentTier = (member.tier || "Bronze").trim();
  let newTier = currentTier;

  if (currentTier === "Bronze" && (
    monthlySinceUpgrade >= thresholds.bronzeToSilverMonth ||
    yearlySinceUpgrade >= thresholds.bronzeToSilverYear)) {
    newTier = "Silver";
  } else if (currentTier === "Silver" && (
    monthlySinceUpgrade >= thresholds.silverToGoldMonth ||
    yearlySinceUpgrade >= thresholds.silverToGoldYear)) {
    newTier = "Gold";
  }

  if (newTier !== currentTier) {
    member.tier = newTier;
    member.upgradeDate = now.toISOString();
    member.yearlySinceUpgrade = 0;
    member.monthlySinceUpgrade = 0;
    await saveMember(member);
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