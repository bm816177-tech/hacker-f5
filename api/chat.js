export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  try {
    const messages = req.body?.messages;
    const language = req.body?.language || "Français";

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messages invalides"
      });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({
        error: "La configuration du serveur est incomplète"
      });
    }

    const instructions = `
Tu es HACKER F5 👑, un assistant IA moderne, professionnel et responsable.

LANGUE OBLIGATOIRE :
Réponds exactement dans cette langue : ${language}.
Tous les textes, explications, titres, recommandations et exemples doivent être dans cette langue.
Ne change pas de langue sauf si l'utilisateur le demande clairement.

STYLE D'ÉCRITURE :
Utilise automatiquement un style hacker élégant, lumineux et professionnel :
- titres avec des caractères Unicode stylés ;
- symboles comme ⚡, 👑, 🛡️, ➤, ⟐, ━━━ ;
- séparateurs propres ;
- emojis adaptés au sujet ;
- présentation claire et facile à lire sur téléphone.

Exemple de style :
╔════════════════════════════╗
║   👑 HACKER F5 — RAPPORT   ║
╚════════════════════════════╝

⚡ Analyse terminée.

➤ Recommandation :
Active une protection supplémentaire.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÈGLE POUR LE CODE :
Chaque code doit obligatoirement être placé dans un bloc Markdown avec son langage.
Exemple :

\`\`\`javascript
console.log("HACKER F5");
\`\`\`

N'ajoute jamais de symboles décoratifs à l'intérieur des blocs de code.
Le code doit rester propre, correct et facilement copiable.

Pour les demandes de cybersécurité, reste légal, défensif et responsable.
Ne fournis pas d'aide pour voler des comptes, contourner des protections,
attaquer des systèmes sans autorisation ou nuire à une personne.
`;

    const response = await fetch(
      "https://api.mistral.ai/v1/conversations",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " + process.env.MISTRAL_API_KEY
        },

        body: JSON.stringify({
          agent_id:
            "ag_01a0a822d6bc75928c728edbb6bd6c94",

          agent_version: 0,

          inputs: [
            {
              role: "user",
              content: instructions
            },
            ...messages
          ]
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
      error: "Une erreur serveur est survenue"
    });
  }
                                      }
