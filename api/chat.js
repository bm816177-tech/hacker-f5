import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
});

const AGENT_ID =
  "ag_01a0bd128b0a75be97d07bc34dea0418";

const AGENT_VERSION = 0;


/*
 * Récupère proprement le texte
 * dans les différentes structures
 * possibles retournées par Mistral.
 */

function extractText(value) {

  if (!value) {
    return "";
  }

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

    if (
      typeof value.text === "string"
    ) {
      return value.text;
    }

    if (
      typeof value.content === "string"
    ) {
      return value.content;
    }

    if (value.content) {
      return extractText(
        value.content
      );
    }

    if (value.outputs) {
      return extractText(
        value.outputs
      );
    }

    if (value.output) {
      return extractText(
        value.output
      );
    }

    if (value.message) {
      return extractText(
        value.message
      );
    }
  }

  return "";
}


/*
 * API HACKER F5
 */

export default async function handler(
  req,
  res
) {

  /*
   * Méthode HTTP
   */

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error: "Méthode non autorisée"
    });
  }


  try {

    /*
     * Vérification de la clé
     */

    if (
      !process.env.MISTRAL_API_KEY
    ) {

      return res.status(500).json({
        ok: false,
        error:
          "Configuration du serveur incomplète"
      });
    }


    const body =
      req.body || {};


    const messages =
      body.messages;


    const conversationId =
      body.conversationId ||
      null;


    const mode =
      body.mode ||
      "chat";


    /*
     * Vérification des messages
     */

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Aucun message reçu"
      });
    }


    /*
     * On prend uniquement
     * le dernier message utilisateur
     * pour l'API Conversations.
     */

    const lastMessage =
      messages[
        messages.length - 1
      ];


    const userMessage =
      typeof lastMessage?.content ===
      "string"
        ? lastMessage.content.trim()
        : "";


    if (!userMessage) {

      return res.status(400).json({
        ok: false,
        error:
          "Message utilisateur invalide"
      });
    }


    let response;


    /*
     * =================================
     * NOUVELLE CONVERSATION
     * =================================
     *
     * TON AGENT MISTRAL est appelé ici.
     *
     * Son System Prompt configuré
     * dans Mistral reste attaché
     * à cet Agent.
     */

    if (!conversationId) {

      response =
        await client.beta.conversations.start({

          agentId:
            AGENT_ID,

          agentVersion:
            AGENT_VERSION,

          inputs: [
            {
              role: "user",

              content:
                userMessage
            }
          ]
        });
    }


    /*
     * =================================
     * CONVERSATION EXISTANTE
     * =================================
     */

    else {

      response =
        await client.beta.conversations.append({

          conversationId:
            conversationId,

          conversationAppendRequest: {

            inputs: [
              {
                role: "user",

                content:
                  userMessage
              }
            ]
          }
        });
    }


    /*
     * =================================
     * EXTRACTION DE LA RÉPONSE
     * =================================
     */

    const answer =
      extractText(
        response?.outputs
      ).trim();


    if (!answer) {

      console.error(
        "MISTRAL EMPTY RESPONSE:",
        JSON.stringify(response)
      );

      return res.status(502).json({
        ok: false,
        error:
          "Mistral a répondu sans contenu texte."
      });
    }


    /*
     * =================================
     * CONVERSATION ID
     * =================================
     */

    const newConversationId =
      response?.conversationId ||
      response?.conversation_id ||
      conversationId ||
      null;


    /*
     * =================================
     * RÉPONSE À INDEX.HTML
     * =================================
     */

    return res.status(200).json({

      ok: true,

      answer:
        answer,

      conversationId:
        newConversationId,

      mode:
        mode
    });


  } catch (error) {

    console.error(
      "HACKER F5 ERROR:",
      error
    );


    return res.status(500).json({

      ok: false,

      error:
        error?.message ||
        "Erreur interne du serveur"
    });
  }
}
