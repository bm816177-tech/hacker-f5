import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Méthode non autorisée"
    });
  }

  try {
    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "MISTRAL_API_KEY absente de Vercel"
      });
    }

    const response = await client.beta.conversations.start({
      agentId: "ag_01a0bd128b0a75be97d07bc34dea0418",
      agentVersion: 0,
      inputs: [
        {
          role: "user",
          content: "Salut"
        }
      ]
    });

    console.log(
      "REPONSE MISTRAL:",
      JSON.stringify(response)
    );

    let answer = "";

    if (Array.isArray(response?.outputs)) {
      for (const output of response.outputs) {
        if (typeof output === "string") {
          answer += output;
        } else if (typeof output?.content === "string") {
          answer += output.content;
        } else if (typeof output?.text === "string") {
          answer += output.text;
        } else if (Array.isArray(output?.content)) {
          for (const item of output.content) {
            if (typeof item === "string") {
              answer += item;
            } else if (typeof item?.text === "string") {
              answer += item.text;
            }
          }
        }
      }
    }

    if (!answer && typeof response?.output === "string") {
      answer = response.output;
    }

    if (!answer && typeof response?.content === "string") {
      answer = response.content;
    }

    if (!answer && typeof response?.text === "string") {
      answer = response.text;
    }

    return res.status(200).json({
      ok: true,
      answer: answer || "Mistral a répondu, mais aucun texte n'a été trouvé.",
      conversationId:
        response?.conversation_id ||
        response?.conversationId ||
        response?.id ||
        null
    });

  } catch (error) {
    console.error(
      "ERREUR MISTRAL:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        JSON.stringify(error) ||
        "Erreur inconnue"
    });
  }
        }
