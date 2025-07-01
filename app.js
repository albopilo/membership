// Load members from localStorage or initialize defaults
let members = JSON.parse(localStorage.getItem("membersData")) || [
  {
    id: "001",
    name: "Ayu Lestari",
    birthdate: "1990-01-01",
    phone: "08123456789",
    email: "ayu@example.com",
    ktp: "1234567890",
    tier: "Bronze",
    transactions: []
  },
  {
    id: "002",
    name: "Budi Santoso",
    birthdate: "1992-03-15",
    phone: "08234567890",
    email: "budi@example.com",
    ktp: "0987654321",
    tier: "Silver",
    transactions: []
  }
];

if (!localStorage.getItem("membersData")) {
  localStorage.setItem("membersData", JSON.stringify(members));
}

function saveMembers() {
  localStorage.setItem("membersData", JSON.stringify(members));
}

// Load or initialize tier settings
let tierSettings = JSON.parse(localStorage.getItem("tierSettings")) || {
  bronzeToSilverMonth: 300000,
  bronzeToSilverYear: 1200000,
  silverMaintainYear: 300000,
  silverToGoldMonth: 1000000,
  silverToGoldYear: 3000000,
  goldMaintainYear: 1500000
};

function saveTierSettings() {
  localStorage.setItem("tierSettings", JSON.stringify(tierSettings));
}

// -------- INDEX PAGE --------
if (document.getElementById("memberList")) {
  renderMembers();
checkUpcomingBirthdays();

function checkUpcomingBirthdays() {
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

  document.getElementById("searchInput").addEventListener("input", e => {
    renderMembers(e.target.value);
  });

  function renderMembers(filter = "") {
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
}

// -------- DETAILS PAGE --------
if (document.getElementById("memberDetails")) {
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("id");
  const member = members.find(m => m.id === memberId);

  if (!member) {
    document.getElementById("memberDetails").innerHTML = "<p>Member not found.</p>";
  } else {
    renderDetails(member);
  }

  function renderDetails(member) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;

    let monthly = 0, yearly = 0, lastYearTotal = 0, full = 0;

    member.transactions.forEach(tx => {
      const date = new Date(tx.date);
      full += tx.amount;
      if (date.getFullYear() === thisYear) {
        yearly += tx.amount;
        if (date.getMonth() === thisMonth) monthly += tx.amount;
      }
      if (date.getFullYear() === lastYear) lastYearTotal += tx.amount;
    });

    const isJanFirst = now.getMonth() === 0 && now.getDate() === 1;
    const upgraded = tryAutoUpgrade(member, monthly, yearly, lastYearTotal, isJanFirst);
    if (upgraded) {
      saveMembers();
      location.reload();
      return;
    }

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

    document.getElementById("addTxBtn").addEventListener("click", () => {
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
        reader.onload = () => {
          tx.fileData = reader.result;
          member.transactions.push(tx);
          saveMembers();
          alert("✅ Transaction added with file!");
          location.reload();
        };
        reader.readAsDataURL(file);
      } else {
        member.transactions.push(tx);
        saveMembers();
        alert("✅ Transaction added!");
        location.reload();
      }
    });

    document.getElementById("deleteMemberBtn").addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete ${member.name}?`)) {
        members = members.filter(m => m.id !== member.id);
        saveMembers();
        alert("🗑 Member deleted.");
        window.location.href = "index.html";
      }
    });
  }
}

function tryAutoUpgrade(member, monthly, yearly, lastYear, isJanFirst) {
  if (member.tier === "Bronze") {
    if (monthly >= tierSettings.bronzeToSilverMonth || yearly >= tierSettings.bronzeToSilverYear) {
      member.tier = "Silver";
      alert(`${member.name} upgraded to Silver!`);
      return true;
    }
  } else if (member.tier === "Silver") {
    if (monthly >= tierSettings.silverToGoldMonth || yearly >= tierSettings.silverToGoldYear) {
      member.tier = "Gold";
      alert(`${member.name} upgraded to Gold!`);
      return true;
    }
    if (isJanFirst && lastYear < tierSettings.silverMaintainYear) {
      member.tier = "Bronze";
      alert(`${member.name} demoted to Bronze.`);
      return true;
    }
  } else if (member.tier === "Gold") {
    if (isJanFirst && lastYear < tierSettings.goldMaintainYear) {
      member.tier = "Silver";
      alert(`${member.name} demoted to Silver.`);
      return true;
    }
  }
  return false;
}

// -------- ADD PAGE --------
if (document.getElementById("addMemberBtn")) {
  document.getElementById("addMemberBtn").addEventListener("click", () => {
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

    members.push(newMember);
    saveMembers();
    alert(`✅ ${name} added!`);
    window.location.href = "index.html";
  });
}

function exportAllTransactions() {
  let csv = "Member ID,Member Name,Date,Amount,File Attached\n";

  members.forEach(member => {
    member.transactions.forEach(tx => {
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

function exportTransactionsWithImages() {
  const rows = [
    ["Member ID", "Member Name", "Date", "Amount", "Image"]
  ];

  members.forEach(member => {
    member.transactions.forEach(tx => {
      const row = [
        member.id,
        member.name,
        new Date(tx.date).toLocaleDateString(),
        tx.amount,
        tx.fileData ? tx.fileData : ""
      ];
      rows.push(row);
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

function exportJSON() {
  const blob = new Blob([JSON.stringify(members, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "13e-members-backup.json";
  a.click();
}


// SETTINGS.HTML → Load + save tier thresholds
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