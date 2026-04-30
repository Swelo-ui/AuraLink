import fetch from 'node-fetch';
async function test() {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer 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",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-4-340b-instruct:free",
      messages: [
        { role: "system", content: "You are AuraBot, a friendly AI collaborator on the AuraLink app for students. Keep it short." },
        { role: "user", content: "hello" }
      ]
    })
  });
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}
test();
