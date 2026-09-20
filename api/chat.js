import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
});

const AGENT_ID =
  "ag_01a0bd128b0a75be97d07bc34dea0418";

function extractText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(extractText)
      .filter(Boolean)
      .join("");
  }

  if (typeof value === "object") {
    if (typeof value.text === "string") {
      return value.text;
    }

    if (typeof value.content === "string") {
      return value.content;
    }

    if (value.content) {
      return extractText(value.content);
    }

    if (value.outputs) {
      return extractText(value.outputs);
    }

    if (value.output) {
      return extractText(value.output);
    }
  }

  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Méthode non autorisée"
    });
  }

  try {
    const body = req.body || {};

    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Aucun message reçu"
      });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Configuration API manquante"
      });
    }

    /*
     * On garde uniquement les messages
     * utilisateur / assistant utiles à l'agent.
     */
    const cleanMessages = messages
      .filter(
        (message) =>
          message &&
          (message.role === "user" ||
            message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim()
      )
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    if (cleanMessages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Message invalide"
      });
    }

    /*
     * IMPORTANT :
     * On utilise TON nouvel Agent Mistral.
     *
     * Le System Prompt configuré dans l'Agent
     * est donc conservé côté Mistral.
     */
    const response =
      await client.beta.conversations.start({
        agentId: AGENT_ID,
        agentVersion: 0,
        inputs: cleanMessages
      });

    const answer =
      extractText(response?.outputs) ||
      extractText(response?.output) ||
      extractText(response?.content);

    if (!answer) {
      console.error(
        "Réponse Mistral sans texte :",
        JSON.stringify(response)
      );

      return res.status(502).json({
        ok: false,
        error: "Aucun texte reçu de Mistral"
      });
    }

    return res.status(200).json({
      ok: true,
      answer: answer.trim(),
      conversationId:
        response?.conversationId ||
        response?.conversation_id ||
        null
    });

  } catch (error) {
    console.error(
      "HACKER F5 / MISTRAL ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Erreur lors du traitement de la demande"
    });
  }
  }
