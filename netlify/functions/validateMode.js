// netlify/functions/validateMode.js
exports.handler = async (event, context) => {
  try {
    // Parse request body
    const { mode, password } = JSON.parse(event.body || "{}");

    // Expected passwords (you can move these to environment variables later)
    const PASSWORDS = {
      admin: "123456",
      kafe: "kafe",
      reader: "mille123"
    };

    // Validate
    if (!PASSWORDS[mode]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Unknown mode" })
      };
    }

    if (password !== PASSWORDS[mode]) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: "Incorrect password" })
      };
    }

    // Success → return a token (very simple example: base64 of mode + timestamp)
    const token = Buffer.from(`${mode}:${Date.now()}`).toString("base64");

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, mode, token })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Server error", error: err.message })
    };
  }
};
