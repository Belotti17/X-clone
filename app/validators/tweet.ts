import vine from '@vinejs/vine'

/*
|--------------------------------------------------------------------------
| Validator pour créer un tweet
|--------------------------------------------------------------------------
| Ce validator vérifie le contenu du tweet envoyé par l'utilisateur
*/

export const tweetValidator = vine.compile(
  vine.object({
    // contenu du tweet
    // trim() supprime les espaces inutiles
    // maxLength(280) limite Twitter
    content: vine.string().trim().minLength(1).maxLength(280),
  })
)
