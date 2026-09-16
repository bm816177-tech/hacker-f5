import { Mistral } from "@mistralai/mistralai";

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

    const client = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY
    });

    const response = await client.beta.conversations.start({
      agentId: "ag_01a0a822d6bc75928c728edbb6bd6c94",
      agentVersion: 0,
      inputs: messages
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("Erreur Mistral :", error);

    return res.status(500).json({
      error: "Impossible de contacter HACKER F5"
    });
  }
}
