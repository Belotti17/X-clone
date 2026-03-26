import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import User from '#models/user'

export default class SearchController {
  async index({ request, view, auth }: HttpContext) {
    const user = auth.use('web').user!
    const query = request.input('q', '')

    const tweets = await Tweet.query()
      .where('content', 'LIKE', `%${query}%`)
      .preload('user')
      .limit(20)

    const users = await User.query()
      .where('username', 'LIKE', `%${query}%`)
      .orWhere('name', 'LIKE', `%${query}%`)
      .limit(20)

    return view.render('pages/search', { user, tweets, users, query })
  }

  async hashtag({ params, view, auth }: HttpContext) {
    const user = auth.use('web').user!
    const tag = params.tag

    const tweets = await Tweet.query()
      .where('content', 'LIKE', `%#${tag}%`)
      .preload('user')
      .limit(50)

    return view.render('pages/hashtag', { user, tweets, tag })
  }
}
