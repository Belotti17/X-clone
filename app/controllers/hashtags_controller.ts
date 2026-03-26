import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'

export default class HashtagController {
  async show({ params, view, auth }: HttpContext) {
    const user = auth.use('web').user!
    const tag = params.tag

    const tweets = await Tweet.query()
      .where('content', 'LIKE', `%#${tag}%`)
      .preload('user')
      .limit(50)

    return view.render('pages/hashtag', { user, tweets, tag })
  }

  async trending({ view, auth }: HttpContext) {
    const user = auth.use('web').user!

    // À implémenter : récupérer les hashtags tendances
    const trending = [
      { tag: 'adonisjs', count: 1234 },
      { tag: 'xclone', count: 892 },
      { tag: 'javascript', count: 567 },
    ]

    return view.render('pages/trending', { user, trending })
  }
}
