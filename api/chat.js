export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Méthode non autorisée"
    });
  }

  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Aucun message reçu"
      });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Configuration du serveur incomplète"
      });
    }

    const response = await fetch(
      "https://api.mistral.ai/v1/conversations",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.MISTRAL_API_KEY}`
        },

        body: JSON.stringify({
          agent_id:
            "ag_01a0bd128b0a75be97d07bc34dea0418",

          agent_version: 0,

          inputs: messages
        })
      }
    );

    const data = await response.json();


    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error:
          data?.message ||
          data?.error ||
          "Erreur lors de la communication avec Mistral"
      });
    }


    /*
      Extraction robuste de la réponse.
      On évite d'afficher [object Object].
    */

    let answer = "";


    if (Array.isArray(data.outputs)) {

      for (const output of data.outputs) {

        if (typeof output === "string") {
          answer += output;
          continue;
        }


        if (typeof output?.content === "string") {
          answer += output.content;
          continue;
        }


        if (Array.isArray(output?.content)) {

          for (const item of output.content) {

            if (typeof item === "string") {
              answer += item;
            }

            else if (
              typeof item?.text === "string"
            ) {
              answer += item.text;
            }

          }

        }


        if (
          !answer &&
          typeof output?.text === "string"
        ) {
          answer += output.text;
        }

      }

    }


    if (
      !answer &&
      typeof data?.output === "string"
    ) {
      answer = data.output;
    }


    if (
      !answer &&
      typeof data?.content === "string"
    ) {
      answer = data.content;
    }


    if (
      !answer &&
      typeof data?.text === "string"
    ) {
      answer = data.text;
    }


    if (!answer) {
      answer =
        "HACKER F5 a reçu la demande, mais aucune réponse texte n'a été retournée.";
    }


    return res.status(200).json({
      ok: true,

      answer: answer.trim(),

      conversationId:
        data?.conversation_id ||
        data?.conversationId ||
        data?.id ||
        null
    });


  } catch (error) {

    console.error("HACKER F5 ERROR:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Erreur interne du serveur"
    });
  }
        }
