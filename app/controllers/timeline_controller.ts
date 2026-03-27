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

    // IMPORTANT: Exclure les réponses (isReply = false) de la timeline
    const tweets = await Tweet.query()
      .whereIn('userId', followingIds)
      .where('isReply', false) // ← AJOUTEZ CETTE LIGNE pour exclure les réponses
      .preload('user')
      .preload('originalTweet', (query) => {
        query.preload('user').preload('likes').preload('retweets')
      })
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Ajouter les compteurs et vérifier si l'utilisateur a liké
    for (const tweet of tweets) {
      // Compter les likes
      tweet.$extras.likesCount = tweet.likes.length
      // Compter les retweets
      tweet.$extras.retweetsCount = tweet.retweets.length
      // Compter les réponses (sans charger les objets complets)
      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      // Vérifier si l'utilisateur a liké ce tweet
      const hasLiked = tweet.likes.some((like) => like.userId === user.id)
      tweet.$extras.userLiked = hasLiked

      // Si c'est un retweet, ajouter aussi les compteurs du tweet original
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
      .where('isReply', false) // ← AJOUTEZ CETTE LIGNE
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

  async explore({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    const tweets = await Tweet.query()
      .where('isReply', false) // ← AJOUTEZ CETTE LIGNE
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
