export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Méthode non autorisée"
    });

  }

  try {

    const apiKey =
      process.env.MISTRAL_API_KEY;

    if (!apiKey) {

      return res.status(500).json({
        error:
          "La clé Mistral n'est pas disponible sur Vercel."
      });

    }

    const body =
      req.body || {};

    const messages =
      body.messages;

    const language =
      body.language ||
      "Français";

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {

      return res.status(400).json({
        error:
          "Aucun message valide reçu."
      });

    }

    const instructions = `
Tu es HACKER F5, l'assistant IA de King Franck.

Tu réponds en ${language}.

IDENTITÉ :

╔══════════════════════╗
║     HΛ₵ҠΞЯ F5 ♛      ║
╠══════════════════════╣
║  CORE      : ONLINE  ║
║  NETWORK   : READY   ║
║  DEFENSE   : ACTIVE  ║
╚══════════════════════╝

Signature :
HACKF5 — by King Franck

Sois naturel, clair, intelligent et professionnel.

Pour le code :
- utilise des blocs Markdown ;
- utilise uniquement des caractères normaux ;
- aucun caractère décoratif dans le code.

Pour la cybersécurité :
- reste légal ;
- défensif ;
- responsable.

Tu peux aider à programmer,
analyser du code,
sécuriser des systèmes,
comprendre des vulnérabilités
et apprendre la cybersécurité.

Ne prétends pas avoir généré une image,
une vidéo, un PDF, une musique ou un fichier
si aucun outil correspondant n'a réellement
produit ce résultat.

Ne répète pas inutilement le panneau HACKER F5.
`;

    const response =
      await fetch(
        "https://api.mistral.ai/v1/conversations",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              "Bearer " + apiKey
          },

          body: JSON.stringify({

            agent_id:
              "ag_01a0a822d6bc75928c728edbb6bd6c94",

            agent_version:
              0,

            instructions:
              instructions,

            inputs:
              messages

          })
        }
      );

    const raw =
      await response.text();

    let result;

    try {

      result =
        JSON.parse(raw);

    } catch {

      console.error(
        "Réponse Mistral non JSON :",
        raw
      );

      return res.status(502).json({
        error:
          "Mistral a renvoyé une réponse invalide."
      });

    }

    if (!response.ok) {

      console.error(
        "Erreur Mistral :",
        result
      );

      return res.status(
        response.status
      ).json({

        error:
          result?.message ||
          result?.error ||
          "Erreur de communication avec Mistral."

      });

    }

    return res.status(200).json(
      result
    );

  } catch (error) {

    console.error(
      "Erreur serveur :",
      error
    );

    return res.status(500).json({

      error:
        error?.message ||
        "Une erreur serveur est survenue."

    });

  }

        }
