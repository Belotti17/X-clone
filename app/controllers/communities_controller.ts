// app/controllers/communities_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Follow from '#models/follow'

export default class CommunitiesController {
  async index({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    // Récupérer les IDs des utilisateurs déjà suivis
    const follows = await Follow.query().where('followerId', user.id).select('followingId')

    const followingIds = follows.map((f) => f.followingId)

    // Suggestions : utilisateurs non suivis et différents de l'utilisateur connecté
    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(20) // Afficher plus de suggestions sur cette page

    // Suggestions aléatoires pour varier (optionnel)
    // On pourrait ajouter un tri par date d'inscription ou par popularité

    return view.render('pages/communities', { user, suggestions })
  }
}
