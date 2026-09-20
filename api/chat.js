import { Mistral } from "@mistralai/mistralai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT_FILE = path.join(
  __dirname,
  "..",
  "config",
  "system-prompt.txt"
);

const AGENT_ID = "ag_01a0bd128b0a75be97d07bc34dea0418";
const AGENT_VERSION = 0;

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
});

async function getSystemPrompt() {
  const prompt = await fs.readFile(SYSTEM_PROMPT_FILE, "utf8");
  const cleanPrompt = prompt.trim();

  if (!cleanPrompt) {
    throw new Error(
      "Le fichier config/system-prompt.txt est vide."
    );
  }

  return cleanPrompt;
}

function extractText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (typeof value.content === "string") {
    return value.content;
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  if (Array.isArray(value.content)) {
    return value.content
      .map(extractText)
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractAnswer(response) {
  if (Array.isArray(response?.outputs)) {
    const text = response.outputs
      .map(extractText)
      .filter(Boolean)
      .join("\n")
      .trim();

    if (text) return text;
  }

  return (
    extractText(response?.output) ||
    extractText(response?.content) ||
    extractText(response?.text) ||
    ""
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Méthode non autorisée."
    });
  }

  try {
    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "MISTRAL_API_KEY absente de Vercel."
      });
    }

    /*
     * OBLIGATOIRE :
     * HACKER F5 doit utiliser le fichier local.
     */
    const systemPrompt = await getSystemPrompt();

    const body = req.body || {};

    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const validMessages = messages
      .filter(
        (message) =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    if (validMessages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Aucun message valide reçu."
      });
    }

    /*
     * NOUVELLE CONVERSATION
     *
     * Le fichier system-prompt.txt devient
     * l'instruction obligatoire de cette conversation.
     */
    if (!body.conversationId) {
      const response = await client.beta.conversations.start({
        agentId: AGENT_ID,
        agentVersion: AGENT_VERSION,
        instructions: systemPrompt,
        inputs: validMessages
      });

      const answer = extractAnswer(response);

      return res.status(200).json({
        ok: true,
        answer:
          answer ||
          "Aucune réponse textuelle n'a été retournée.",
        conversationId:
          response?.conversation_id ||
          response?.conversationId ||
          null
      });
    }

    /*
     * CONVERSATION EXISTANTE
     *
     * Le prompt a déjà été appliqué au démarrage.
     * On continue la conversation avec son historique Mistral.
     */
    const lastUserMessage = [...validMessages]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage) {
      return res.status(400).json({
        ok: false,
        error: "Aucun nouveau message utilisateur."
      });
    }

    const response = await client.beta.conversations.append({
      conversationId: body.conversationId,
      conversationAppendRequest: {
        inputs: [lastUserMessage]
      }
    });

    const answer = extractAnswer(response);

    return res.status(200).json({
      ok: true,
      answer:
        answer ||
        "Aucune réponse textuelle n'a été retournée.",
      conversationId:
        response?.conversation_id ||
        response?.conversationId ||
        body.conversationId
    });

  } catch (error) {
    console.error("HACKER F5 ERROR:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Erreur lors de la communication avec HACKER F5."
    });
  }
      }
