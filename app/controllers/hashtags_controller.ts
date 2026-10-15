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

    const recentTweets = await Tweet.query()
      .whereNotNull('content')
      .select('content')
      .orderBy('createdAt', 'desc')
      .limit(500)

    const hashtagRegex = /#[\p{L}\p{N}\p{M}_]+/gu
    const hashtagCounts = new Map<string, number>()

    for (const tweet of recentTweets) {
      for (const match of tweet.content?.match(hashtagRegex) ?? []) {
        const tag = match.toLowerCase()
        hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1)
      }
    }

    const trending = Array.from(hashtagCounts, ([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    return view.render('pages/trending', { user, trending })
  }
}
