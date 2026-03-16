import Tweet from '#models/tweet'
import { tweetValidator } from '#validators/tweet'
import { HttpContext } from '@adonisjs/core/http'

export default class TweetController {
  /*
  | Créer un tweet
  */
  public async store({ request, auth, response }: HttpContext) {
    // validation du contenu du tweet
    const payload = await request.validateUsing(tweetValidator)

    // récupération de l'utilisateur connecté
    const user = auth.user!

    // création du tweet
    const tweet = await Tweet.create({
      content: payload.content,
      userId: user.id,
    })

    // réponse
    return response.created({
      message: 'Tweet publié avec succès',
      tweet,
    })
  }

  /*
  | Afficher tous les tweets
  */
  public async index() {
    // récupération des tweets avec leurs auteurs
    const tweets = await Tweet.query().preload('user').orderBy('createdAt', 'desc')

    return tweets
  }

  /*
  | Supprimer un tweet
  */
  public async destroy({ params, auth, response }: HttpContext) {
    // trouver le tweet
    const tweet = await Tweet.findOrFail(params.id)

    // vérifier que l'utilisateur est bien le propriétaire
    if (tweet.userId !== auth.user!.id) {
      return response.forbidden({
        message: 'Vous ne pouvez pas supprimer ce tweet',
      })
    }

    // suppression
    await tweet.delete()

    return {
      message: 'Tweet supprimé',
    }
  }
}
