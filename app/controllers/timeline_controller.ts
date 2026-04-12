import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import User from '#models/user'
import Follow from '#models/follow'

export default class TimelineController {
  /**
   * Affiche la timeline principale (For you)
   * Mélange les tweets des personnes suivies et les tweets de l'utilisateur
   */
  async index({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    const follows = await Follow.query().where('followerId', user.id).select('followingId')

    const followingIds = follows.map((f) => f.followingId)
    followingIds.push(user.id)

    const tweets = await Tweet.query()
      .whereIn('userId', followingIds)
      .where('isReply', false)
      .preload('user')
      .preload('originalTweet', (query) => {
        query.preload('user').preload('likes').preload('retweets')
      })
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    for (const tweet of tweets) {
      tweet.$extras.likesCount = tweet.likes.length
      tweet.$extras.retweetsCount = tweet.retweets.length
      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      const hasLiked = tweet.likes.some((like) => like.userId === user.id)
      tweet.$extras.userLiked = hasLiked

      if (tweet.isRetweet && tweet.originalTweet) {
        tweet.originalTweet.$extras.likesCount = tweet.originalTweet.likes.length
        tweet.originalTweet.$extras.retweetsCount = tweet.originalTweet.retweets.length
        const originalRepliesCount = await Tweet.query()
          .where('parentTweetId', tweet.originalTweet.id)
          .where('isReply', true)
          .count('* as total')
        tweet.originalTweet.$extras.repliesCount = Number(originalRepliesCount[0].$extras.total)
        const hasLikedOriginal = tweet.originalTweet.likes.some((like) => like.userId === user.id)
        tweet.originalTweet.$extras.userLiked = hasLikedOriginal
      }
    }

    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(5)

    return view.render('pages/index', { user, tweets, suggestions })
  }

  /**
   * Affiche la page "Abonnements" (following)
   * Liste des utilisateurs que l'utilisateur connecté suit
   */
  async following({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    // Récupère les IDs des utilisateurs suivis
    const follows = await Follow.query().where('followerId', user.id).select('followingId')

    const followingIds = follows.map((f) => f.followingId)

    // Charge les utilisateurs correspondant à ces IDs
    const followingUsers = await User.query()
      .whereIn('id', followingIds)
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Suggestions pour la colonne de droite
    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(5)

    return view.render('pages/following', { user, followingUsers, suggestions })
  }

  /**
   * Page Explore (découverte) – tweets populaires récents
   */
  async explore({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    const tweets = await Tweet.query()
      .where('isReply', false)
      .preload('user')
      .preload('originalTweet', (query) => {
        query.preload('user').preload('likes').preload('retweets')
      })
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    for (const tweet of tweets) {
      tweet.$extras.likesCount = tweet.likes.length
      tweet.$extras.retweetsCount = tweet.retweets.length
      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      if (tweet.isRetweet && tweet.originalTweet) {
        tweet.originalTweet.$extras.likesCount = tweet.originalTweet.likes.length
        tweet.originalTweet.$extras.retweetsCount = tweet.originalTweet.retweets.length
        const originalRepliesCount = await Tweet.query()
          .where('parentTweetId', tweet.originalTweet.id)
          .where('isReply', true)
          .count('* as total')
        tweet.originalTweet.$extras.repliesCount = Number(originalRepliesCount[0].$extras.total)
      }
    }

    return view.render('pages/explore', { user, tweets })
  }

  /**
   * Page Notifications (à implémenter ultérieurement)
   */
  async notifications({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    const notifications: any[] = []
    return view.render('pages/notifications', { user, notifications })
  }

  /**
   * Page Communautés – suggestions d'utilisateurs à suivre
   */
  async communities({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    const follows = await Follow.query().where('followerId', user.id).select('followingId')
    const followingIds = follows.map((f) => f.followingId)

    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(20)

    return view.render('pages/communities', { user, suggestions })
  }
}
