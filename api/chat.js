import OpenAI from "openai";
import fs from "fs";
import path from "path";

const SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  "config",
  "system-prompt.txt"
);

const client = new OpenAI({
  apiKey: process.env.OPENIA_API_KEY
});

function sendJSON(res, status, data) {
  res.status(status);
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  return res.end(JSON.stringify(data));
}

function loadSystemPrompt() {
  if (!fs.existsSync(SYSTEM_PROMPT_PATH)) {
    throw new Error(
      "SYSTEM_PROMPT_MISSING: config/system-prompt.txt est introuvable."
    );
  }

  const prompt = fs
    .readFileSync(SYSTEM_PROMPT_PATH, "utf8")
    .trim();

  if (!prompt) {
    throw new Error(
      "SYSTEM_PROMPT_EMPTY: config/system-prompt.txt est vide."
    );
  }

  return prompt;
}

function getErrorMessage(error) {
  if (!error) return "Erreur inconnue.";

  if (typeof error === "string") {
    return error;
  }

  if (typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Erreur inconnue du serveur.";
  }
}

function getRequestBody(req) {
  if (!req.body || typeof req.body !== "object") {
    return {};
  }

  return req.body;
}

function extractResponseText(response) {
  if (!response) return "";

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (Array.isArray(response.output)) {
    const parts = [];

    for (const item of response.output) {
      if (!item) continue;

      if (Array.isArray(item.content)) {
        for (const content of item.content) {
          if (
            content &&
            typeof content.text === "string"
          ) {
            parts.push(content.text);
          }
        }
      }
    }

    return parts.join("\n").trim();
  }

  return "";
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return sendJSON(res, 405, {
      ok: false,
      error: "Méthode non autorisée."
    });
  }

  try {

    if (!process.env.OPENIA_API_KEY) {
      return sendJSON(res, 500, {
        ok: false,
        error: "OPENIA_API_KEY est absente dans Vercel."
      });
    }

    const systemPrompt = loadSystemPrompt();
    const body = getRequestBody(req);

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const mode =
      typeof body.mode === "string" &&
      body.mode.trim()
        ? body.mode.trim()
        : "chat";

    if (!message) {
      return sendJSON(res, 400, {
        ok: false,
        error: "Le message est vide."
      });
    }

    /*
     * Le System Prompt de HACKER F5 reste prioritaire.
     * Le mode vient uniquement de l'interface.
     */

    const instructions = `
${systemPrompt}

==============================
CONTEXTE INTERFACE HACKER F5
==============================

Mode sélectionné :
${mode}

Le mode de l'interface ne remplace jamais
les instructions du System Prompt HACKER F5.

Respecte obligatoirement le System Prompt.
`;

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions,
      input: message
    });

    const answer = extractResponseText(response);

    if (!answer) {
      return sendJSON(res, 502, {
        ok: false,
        error: "OpenAI n'a renvoyé aucune réponse exploitable."
      });
    }

    return sendJSON(res, 200, {
      ok: true,

      // Réponse principale
      answer,

      // Compatibilité avec notre interface actuelle
      reply: answer,

      // Informations utiles pour le frontend
      mode,

      // ID OpenAI pour le suivi éventuel
      responseId: response.id || null
    });

  } catch (error) {

    console.error(
      "HACKER F5 OPENAI ERROR:",
      error
    );

    return sendJSON(res, 500, {
      ok: false,
      error: getErrorMessage(error)
    });
  }
  }
