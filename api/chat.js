import { Mistral } from "@mistralai/mistralai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT_PATH = path.join(
  __dirname,
  "..",
  "config",
  "system-prompt.txt"
);

const AGENT_ID = "ag_01a0bd128b0a75be97d07bc34dea0418";
const AGENT_VERSION = 0;

function loadSystemPrompt() {
  try {
    return fs.readFileSync(SYSTEM_PROMPT_PATH, "utf8").trim();
  } catch (error) {
    console.error("SYSTEM PROMPT ERROR:", error);
    return "";
  }
}

function extractText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (!value) {
    return "";
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  if (typeof value.content === "string") {
    return value.content;
  }

  if (Array.isArray(value.content)) {
    return value.content
      .map((item) => extractText(item))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractAnswer(response) {
  let answer = "";

  if (Array.isArray(response?.outputs)) {
    answer = response.outputs
      .map((output) => extractText(output))
      .filter(Boolean)
      .join("\n");
  }

  if (!answer) answer = extractText(response?.output);
  if (!answer) answer = extractText(response?.content);
  if (!answer) answer = extractText(response?.text);

  return answer.trim();
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
        error: "MISTRAL_API_KEY absente des variables Vercel."
      });
    }

    const systemPrompt = loadSystemPrompt();

    if (!systemPrompt) {
      return res.status(500).json({
        ok: false,
        error: "Le fichier config/system-prompt.txt est vide ou introuvable."
      });
    }

    const body = req.body || {};
    const incomingMessages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const safeMessages = incomingMessages
      .filter(
        (message) =>
          message &&
          typeof message.content === "string" &&
          ["user", "assistant"].includes(message.role)
      )
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    if (safeMessages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Aucun message utilisateur reçu."
      });
    }

    const client = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY
    });

    /*
     * Le prompt privé est chargé depuis :
     * config/system-prompt.txt
     *
     * Il n'est jamais envoyé au navigateur.
     *
     * Le dernier message utilisateur est conservé comme
     * entrée principale de l'agent.
     */
    const messages = [
      {
        role: "user",
        content: `${systemPrompt}\n\n--- MESSAGE UTILISATEUR ---\n${safeMessages
          .filter((message) => message.role === "user")
          .map((message) => message.content)
          .join("\n\n")}`
      }
    ];

    const response = await client.beta.conversations.start({
      agentId: AGENT_ID,
      agentVersion: AGENT_VERSION,
      inputs: messages
    });

    console.log(
      "HACKER F5 MISTRAL RESPONSE:",
      JSON.stringify(response)
    );

    const answer =
      extractAnswer(response) ||
      "HACKER F5 a reçu la demande, mais aucune réponse textuelle n'a été retournée.";

    const conversationId =
      response?.conversation_id ||
      response?.conversationId ||
      response?.id ||
      null;

    return res.status(200).json({
      ok: true,
      answer,
      conversationId
    });
  } catch (error) {
    console.error("HACKER F5 ERROR:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Une erreur est survenue pendant la communication avec HACKER F5."
    });
  }
}
