// netlify/functions/validateMode.js
exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
    }

    // 👇 Add this to see exactly what the frontend sent
    console.log("Received body:", event.body);

    const { mode, password } = JSON.parse(event.body || "{}");

    const PASSWORDS = { admin: "123456", kafe: "kafe", reader: "mille123" };

    if (!mode || !password) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing mode or password" }) };
    }

    if (PASSWORDS[mode] && password === PASSWORDS[mode]) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          mode,
          token: `demo-token-${mode}-${Date.now()}`,
          ttlSeconds: 600
        })
      };
    }

    return { statusCode: 401, body: JSON.stringify({ success: false, message: "Invalid credentials" }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: "Server error" }) };
  }
};

