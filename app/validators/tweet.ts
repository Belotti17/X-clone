import vine from '@vinejs/vine' // import du validateur VineJS

/*
 Validator pour créer un tweet
 Vérifie et sécurise les données envoyées par l'utilisateur
 Empêche les tweets vides ou trop longs
*/

export const tweetValidator = vine.compile(
  vine.object({
    // contenu du tweet
    content: vine
      .string() // doit être une chaîne de caractères
      .trim() // supprime les espaces avant/après
      .minLength(1) // empêche contenu vide
      .maxLength(280), // limite type Twitter
  })
)
