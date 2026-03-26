import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import User from '#models/user'
import Follow from '#models/follow'

export default class TimelineController {
  async index({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    // Récupérer les IDs des utilisateurs suivis
    const follows = await Follow.query().where('followerId', user.id).select('followingId')

    const followingIds = follows.map((f) => f.followingId)
    followingIds.push(user.id)

    // Récupérer les tweets avec les relations
    const tweets = await Tweet.query()
      .whereIn('userId', followingIds)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .preload('replies')
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Ajouter les compteurs et vérifier si l'utilisateur a liké
    for (const tweet of tweets) {
      // Compter les likes
      tweet.$extras.likesCount = tweet.likes.length
      // Compter les retweets
      tweet.$extras.retweetsCount = tweet.retweets.length
      // Compter les réponses
      tweet.$extras.repliesCount = tweet.replies.length

      // Vérifier si l'utilisateur a liké
      const hasLiked = tweet.likes.some((like) => like.userId === user.id)
      tweet.$extras.userLiked = hasLiked
    }

    // Suggestions de comptes à suivre
    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(5)

    return view.render('pages/index', { user, tweets, suggestions })
  }

  async following({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    const follows = await Follow.query().where('followerId', user.id).select('followingId')

    const followingIds = follows.map((f) => f.followingId)

    const tweets = await Tweet.query()
      .whereIn('userId', followingIds)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .preload('replies')
      .orderBy('createdAt', 'desc')
      .limit(50)

    for (const tweet of tweets) {
      tweet.$extras.likesCount = tweet.likes.length
      tweet.$extras.retweetsCount = tweet.retweets.length
      tweet.$extras.repliesCount = tweet.replies.length

      const hasLiked = tweet.likes.some((like) => like.userId === user.id)
      tweet.$extras.userLiked = hasLiked
    }

    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(5)

    return view.render('pages/index', { user, tweets, suggestions })
  }

  async explore({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    const tweets = await Tweet.query()
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .preload('replies')
      .orderBy('createdAt', 'desc')
      .limit(50)

    for (const tweet of tweets) {
      tweet.$extras.likesCount = tweet.likes.length
      tweet.$extras.retweetsCount = tweet.retweets.length
      tweet.$extras.repliesCount = tweet.replies.length
    }

    return view.render('pages/explore', { user, tweets })
  }

  async notifications({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    const notifications: any[] = []
    return view.render('pages/notifications', { user, notifications })
  }

  async communities({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    return view.render('pages/communities', { user })
  }
}
