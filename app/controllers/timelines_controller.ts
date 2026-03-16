import { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import Follow from '#models/follow'

export default class TimelineController {
  /**
   * Affiche la timeline de l'utilisateur connecté
   */
  public async index({ auth, response }: HttpContext) {
    try {
      // 1. Récupérer l'utilisateur (le ! garantit à TS qu'il est connecté grâce au middleware auth)
      const user = auth.user!

      // 2. Récupérer les IDs des personnes suivies
      const followings = await Follow.query().where('follower_id', user.id).select('following_id')

      // Extraire les IDs et filtrer les éventuels nulls
      const followingIds = followings
        .map((f) => f.followingId)
        .filter((id): id is number => id !== null)

      // 3. Inclure ses propres tweets dans la timeline
      followingIds.push(user.id)

      // 4. Récupérer les tweets des abonnements + les miens
      const tweets = await Tweet.query()
        .whereIn('user_id', followingIds)
        .preload('user') // Charge les infos de l'auteur du tweet
        .orderBy('createdAt', 'desc')

      return response.ok({ tweets })
    } catch (error) {
      return response.internalServerError({
        message: 'Erreur lors de la récupération de la timeline',
        error: error.message,
      })
    }
  }
}
