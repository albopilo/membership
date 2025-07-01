// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDNvgS_PqEHU3llqHt0XHN30jJgiQWLkdc",
  authDomain: "e-loyalty-12563.firebaseapp.com",
  projectId: "e-loyalty-12563",
  storageBucket: "e-loyalty-12563.appspot.com", // ✅ corrected domain
  messagingSenderId: "3887061029",
  appId: "1:3887061029:web:f9c238731d7e6dd5fb47cc",
  measurementId: "G-966P8W06W2"
};

// Initialize Firebase (compat version)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Save member to Firestore
function saveMember(member) {
  if (!member.transactions) member.transactions = [];
  return db.collection("members").doc(member.id).set(member);
}

// Delete member
function deleteMember(id) {
  return db.collection("members").doc(id).delete();
}

// -------- INDEX PAGE --------
const isAdmin = localStorage.getItem("isAdmin") === "true"; // Access mode

const settingsRef = db.collection("settings").doc("tierThresholds");
let tierSettings = {}; // Global shared tier settings

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

const modeSelect = document.getElementById("modeSelect");

if (modeSelect) {
  // Reflect saved mode in dropdown
  const savedMode = localStorage.getItem("isAdmin") === "true" ? "admin" : "public";
  modeSelect.value = savedMode;

  modeSelect.addEventListener("change", async (e) => {
    const selected = e.target.value;

    if (selected === "admin") {
      const password = prompt("🔐 Enter admin password:");
      if (password === "1234") {
        localStorage.setItem("isAdmin", true);
        alert("✅ Admin mode enabled.");
        location.reload();
      } else {
        alert("❌ Incorrect password. Staying in public mode.");
        modeSelect.value = "public";
      }
    } else {
      localStorage.setItem("isAdmin", false);
      location.reload();
    }
  });
}

if (document.getElementById("memberList")) {
  // Live updates using Firestore's onSnapshot
  db.collection("members").onSnapshot(snapshot => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMembers(members);
    checkUpcomingBirthdays(members);
  });

  // Real-time search
  document.getElementById("searchInput").addEventListener("input", async (e) => {
    const members = await fetchMembers();
    renderMembers(members, e.target.value);
  });

  function renderMembers(members, filter = "") {
    const list = document.getElementById("memberList");
    list.innerHTML = "";
    const filtered = members.filter(m =>
      m.name.toLowerCase().includes(filter.toLowerCase())
    );
    filtered.forEach(member => {
      const card = document.createElement("div");
      card.className = "member-card";
      card.innerHTML = `<span class="tier-${member.tier.toLowerCase()}">●</span> ${member.name} (${member.tier})`;
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

    let messages = [];
    members.forEach(member => {
      if (!member.birthdate) return;
      const birth = new Date(member.birthdate);
      birth.setFullYear(today.getFullYear());
      const diff = (birth - today) / (1000 * 60 * 60 * 24);
      const dateStr = birth.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (diff === 0) {
        messages.push(`🎈 Today only: <strong>${member.name}</strong> gets a birthday freebie! 🎁`);
      } else if (diff >= -3 && diff <= 3) {
        messages.push(`🎉 <strong>${member.name}</strong>'s birthday is on ${dateStr}!`);
      }
    });

    if (messages.length > 0) {
      banner.style.display = "block";
      messageSpan.innerHTML = messages.join("<br>");
    } else {
      banner.style.display = "none";
    }
  }
}

// -------- ADD PAGE --------
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
    } catch (error) {
      console.error("Failed to save member:", error);
      alert("⚠️ Failed to add member. Please try again.");
    }
  });
}

// -------- DETAILS PAGE --------
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

  async function renderDetails(member) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;

    let monthly = 0, yearly = 0, lastYearTotal = 0, full = 0;
    (member.transactions || []).forEach(tx => {
      const date = new Date(tx.date);
      full += tx.amount;
      if (date.getFullYear() === thisYear) {
        yearly += tx.amount;
        if (date.getMonth() === thisMonth) monthly += tx.amount;
      }
      if (date.getFullYear() === lastYear) lastYearTotal += tx.amount;
    });

    const isJanFirst = (now.getMonth() === 0 && now.getDate() === 1);

console.log("🧪 Yearly total:", yearly);
console.log("🧪 Threshold for Gold:", tierSettings.silverToGoldYear);
    tryAutoUpgrade(member, monthly, yearly, lastYearTotal, isJanFirst);

    document.getElementById("memberDetails").innerHTML = `
      <h2>${member.name}</h2>
      <p>Tier: ${member.tier}</p>
      <ul>
        <li>Birthdate: ${member.birthdate || "-"}</li>
        <li>Phone: ${member.phone || "-"}</li>
        <li>Email: ${member.email || "-"}</li>
        <li>KTP: ${member.ktp || "-"}</li>
        <li>This Month: Rp${monthly.toLocaleString()}</li>
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

document.getElementById("deleteMemberBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("❌ You must be in admin mode to delete members.");
    return;
  }

  if (confirm("Are you sure you want to delete this member?")) {
    await deleteMember(member.id);
    alert("🗑 Member deleted.");
    window.location.href = "index.html";
  }
});

    document.getElementById("addTxBtn").addEventListener("click", async () => {
      const amount = parseFloat(document.getElementById("txAmount").value);
      const file = document.getElementById("txFile").files[0];

      if (isNaN(amount) || amount <= 0) {
        alert("Enter a valid amount.");
        return;
      }

      const tx = {
        date: new Date().toISOString(),
        amount,
        fileData: null
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          tx.fileData = reader.result;
          member.transactions.push(tx);
          await updateTier(member);
          await saveMember(member);
          alert("✅ Transaction added with file!");
          location.reload();
        };
        reader.readAsDataURL(file);
      } else {
        member.transactions.push(tx);
        await updateTier(member);
        await saveMember(member);
        alert("✅ Transaction added!");
        location.reload();
      }
    });
  }
}

// 🔁 Export transactions as CSV
async function exportAllTransactions() {
  const snapshot = await db.collection("members").get();
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let csv = "Member ID,Member Name,Date,Amount,File Attached\n";

  members.forEach(member => {
    (member.transactions || []).forEach(tx => {
      const date = new Date(tx.date).toLocaleDateString();
      const amount = tx.amount;
      const fileAttached = tx.fileData ? "Yes" : "No";
      csv += `"${member.id}","${member.name}","${date}",${amount},"${fileAttached}"\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "13e-transactions.csv";
  a.click();
}

// 📷 Export CSV with embedded base64 image
async function exportTransactionsWithImages() {
  const snapshot = await db.collection("members").get();
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const rows = [
    ["Member ID", "Member Name", "Date", "Amount", "Image"]
  ];

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

  const csvContent = rows.map(row =>
    row.map(cell =>
      typeof cell === "string" && cell.includes(",")
        ? `"${cell}"`
        : cell
    ).join(",")
  ).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "13e-transactions-with-images.csv";
  link.click();
}

// 💾 Export full data as JSON
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

// 📈 Auto-calculate yearly total and assign tier
async function updateTier(member) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearTotal = (member.transactions || [])
    .filter(tx => new Date(tx.date).getFullYear() === currentYear)
    .reduce((sum, tx) => sum + tx.amount, 0);

  let newTier = "Bronze";
  if (yearTotal >= 1000000) newTier = "Gold";
  else if (yearTotal >= 500000) newTier = "Silver";

  if (member.tier !== newTier) {
    member.tier = newTier;
    await db.collection("members").doc(member.id).update({ tier: newTier });
    console.log(`${member.name} upgraded to ${newTier}`);
  }
}

// 🏅 Tier upgrade/demotion logic
function tryAutoUpgrade(member, monthly, yearly, lastYearTotal, isJanFirst) {

if (!member.tier) {
  member.tier = "Bronze";
}

  const thresholds = {
    bronzeToSilverMonth: tierSettings.bronzeToSilverMonth ?? 50000,
    bronzeToSilverYear: tierSettings.bronzeToSilverYear ?? 500000,
    silverToGoldMonth: tierSettings.silverToGoldMonth ?? 100000,
    silverToGoldYear: tierSettings.silverToGoldYear ?? 1250000,
    silverMaintainYear: tierSettings.silverMaintainYear ?? 400000,
    goldMaintainYear: tierSettings.goldMaintainYear ?? 800000
  };

  let upgraded = false;

  if (member.tier === "Bronze") {
    if (monthly >= thresholds.bronzeToSilverMonth || yearly >= thresholds.bronzeToSilverYear) {
      member.tier = "Silver";
      upgraded = true;
      alert(`${member.name} upgraded to Silver!`);
    }
    return upgraded; // Prevent further upgrades
  } else if (member.tier === "Silver") {
    if (monthly >= thresholds.silverToGoldMonth || yearly >= thresholds.silverToGoldYear) {
      member.tier = "Gold";
      upgraded = true;
      alert(`${member.name} upgraded to Gold!`);
    } else if (isJanFirst && lastYearTotal < thresholds.silverMaintainYear) {
      member.tier = "Bronze";
      upgraded = true;
      alert(`${member.name} demoted to Bronze.`);
    }
  } else if (member.tier === "Gold") {
    if (isJanFirst && lastYearTotal < thresholds.goldMaintainYear) {
      member.tier = "Silver";
      upgraded = true;
      alert(`${member.name} demoted to Silver.`);
    }
  }

  console.log("🧪 Member tier after upgrade:", member.tier);
  return upgraded;
}

// ⚙️ Load + Save tier threshold settings to localStorage

function saveTierSettings() {
  localStorage.setItem("tierSettings", JSON.stringify(tierSettings));
}

if (document.getElementById("saveSettingsBtn")) {
  document.getElementById("monthlyThreshold").value = tierSettings.bronzeToSilverMonth;
  document.getElementById("yearlyThreshold").value = tierSettings.bronzeToSilverYear;
  document.getElementById("maintainSilver").value = tierSettings.silverMaintainYear;
  document.getElementById("silverToGoldMonth").value = tierSettings.silverToGoldMonth;
  document.getElementById("silverToGoldYear").value = tierSettings.silverToGoldYear;
  document.getElementById("maintainGoldYear").value = tierSettings.goldMaintainYear;

  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    tierSettings.bronzeToSilverMonth = parseInt(document.getElementById("monthlyThreshold").value) || 0;
    tierSettings.bronzeToSilverYear = parseInt(document.getElementById("yearlyThreshold").value) || 0;
    tierSettings.silverMaintainYear = parseInt(document.getElementById("maintainSilver").value) || 0;
    tierSettings.silverToGoldMonth = parseInt(document.getElementById("silverToGoldMonth").value) || 0;
    tierSettings.silverToGoldYear = parseInt(document.getElementById("silverToGoldYear").value) || 0;
    tierSettings.goldMaintainYear = parseInt(document.getElementById("maintainGoldYear").value) || 0;

    saveTierSettings();
    alert("✅ Settings saved!");
  });
}

