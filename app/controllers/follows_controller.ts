import type { HttpContext } from '@adonisjs/core/http'
import Follow from '#models/follow'

export default class FollowController {
  async store({ params, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const targetId = params.id

    if (user.id === Number(targetId)) {
      session.flash('error', 'Vous ne pouvez pas vous suivre vous-même')
      return response.redirect().back()
    }

    // Vérifier si l'utilisateur est déjà suivi
    const existingFollow = await Follow.query()
      .where('followerId', user.id)
      .where('followingId', targetId)
      .first()

    if (existingFollow) {
      session.flash('error', 'Vous suivez déjà cet utilisateur')
      return response.redirect().back()
    }

    await Follow.create({
      followerId: user.id,
      followingId: targetId,
    })

    session.flash('success', 'Utilisateur suivi')
    return response.redirect().back()
  }

  async destroy({ params, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!

    const follow = await Follow.query()
      .where('followerId', user.id)
      .where('followingId', params.id)
      .first()

    if (follow) {
      await follow.delete()
      session.flash('success', 'Utilisateur désabonné')
    } else {
      session.flash('error', 'Vous ne suivez pas cet utilisateur')
    }

    return response.redirect().back()
  }

  async accept({ response, session }: HttpContext) {
    // À implémenter pour les comptes privés
    session.flash('success', 'Demande acceptée')
    return response.redirect().back()
  }

  async decline({ response, session }: HttpContext) {
    // À implémenter pour les comptes privés
    session.flash('success', 'Demande refusée')
    return response.redirect().back()
  }
}
