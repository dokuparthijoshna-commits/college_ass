const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  try {
    const response = await fetch("https://collegexbot.loca.lt/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    queryResult: {
      queryText: text,
      parameters: { "date-time": new Date().toISOString() },
      intent: { displayName: "GetTodayClasses" },
    },
  }),
});


    const data = await response.json();
    const botReply = data.fulfillmentText || "🤖 Sorry, I couldn’t get that.";
    addMessage(botReply, "bot");
  } catch (error) {
    console.error(error);
    addMessage("💥 Something went wrong. Try again.", "bot");
  }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});
