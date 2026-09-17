export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messages invalides"
      });
    }

    const response = await fetch(
      "https://api.mistral.ai/v1/conversations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.MISTRAL_API_KEY
        },
        body: JSON.stringify({
          agent_id: "ag_01a0a822d6bc75928c728edbb6bd6c94",
          agent_version: 0,
          inputs: messages
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: result
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erreur serveur :", error);

    return res.status(500).json({
      error: error.message || "Erreur serveur Vercel"
    });
  }
          }
