import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ view, auth }: HttpContext) {
    const user = auth.use('web').user!
    return view.render('pages/profile', { user })
  }

  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const data = request.only(['name', 'bio', 'avatar'])

    user.merge(data)
    await user.save()

    session.flash('success', 'Profil mis à jour')
    return response.redirect().back()
  }

  async followers({ view, auth }: HttpContext) {
    const user = auth.use('web').user!
    return view.render('pages/followers', { user })
  }

  async following({ view, auth }: HttpContext) {
    const user = auth.use('web').user!
    return view.render('pages/following', { user })
  }

  async togglePrivate({ response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    user.isPrivate = !user.isPrivate
    await user.save()

    session.flash('success', `Compte ${user.isPrivate ? 'privé' : 'public'}`)
    return response.redirect().back()
  }
}
