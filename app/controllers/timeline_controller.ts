import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import User from '#models/user'
import Follow from '#models/follow'
import Like from '#models/like'
import type { DateTime } from 'luxon'

interface NotificationActor {
  username: string
  name: string
  profile_picture: string | null
  initials: string
}

interface TimelineNotification {
  id: string
  type: 'follow' | 'like' | 'reply' | 'retweet'
  actor: NotificationActor
  createdAt: DateTime | null
  tweet?: { content: string | null }
}

export default class TimelineController {
  /** Affiche toutes les publications dans le flux « For you ». */
  async index({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    const tweets = await this.getTimelineTweets(user.id)
    const follows = await Follow.query().where('followerId', user.id).select('followingId')
    const followingIds = follows.map((follow) => follow.followingId)

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

    const follows = await Follow.query().where('followerId', user.id).select('followingId')
    const followingIds = follows.map((f) => f.followingId)
    const tweets = await this.getTimelineTweets(user.id, followingIds)
    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(5)

    return view.render('pages/index', { user, tweets, suggestions })
  }

  private async getTimelineTweets(userId: number, authorIds?: number[]) {
    let query = Tweet.query().where('isReply', false)

    if (authorIds) {
      query = query.whereIn('userId', authorIds)
    }

    const tweets = await query
      .preload('user')
      .preload('originalTweet', (originalQuery) => {
        originalQuery.preload('user').preload('likes').preload('retweets')
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
      tweet.$extras.userLiked = tweet.likes.some((like) => like.userId === userId)

      if (tweet.isRetweet && tweet.originalTweet) {
        tweet.originalTweet.$extras.likesCount = tweet.originalTweet.likes.length
        tweet.originalTweet.$extras.retweetsCount = tweet.originalTweet.retweets.length
        const originalRepliesCount = await Tweet.query()
          .where('parentTweetId', tweet.originalTweet.id)
          .where('isReply', true)
          .count('* as total')
        tweet.originalTweet.$extras.repliesCount = Number(originalRepliesCount[0].$extras.total)
        tweet.originalTweet.$extras.userLiked = tweet.originalTweet.likes.some(
          (like) => like.userId === userId
        )
      }
    }

    return tweets
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

  async notifications({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    const ownTweets = await Tweet.query().where('userId', user.id).select('id')
    const tweetIds = ownTweets.map((tweet) => tweet.id)

    const [follows, likes, replies, retweets] =
      tweetIds.length > 0
        ? await Promise.all([
            Follow.query()
              .where('followingId', user.id)
              .whereNot('followerId', user.id)
              .preload('follower')
              .orderBy('createdAt', 'desc')
              .limit(50),
            Like.query()
              .whereIn('tweetId', tweetIds)
              .whereNot('userId', user.id)
              .preload('user')
              .preload('tweet')
              .orderBy('createdAt', 'desc')
              .limit(50),
            Tweet.query()
              .whereIn('parentTweetId', tweetIds)
              .where('isReply', true)
              .whereNot('userId', user.id)
              .preload('user')
              .preload('parentTweet')
              .orderBy('createdAt', 'desc')
              .limit(50),
            Tweet.query()
              .whereIn('originalTweetId', tweetIds)
              .where('isRetweet', true)
              .whereNot('userId', user.id)
              .preload('user')
              .preload('originalTweet')
              .orderBy('createdAt', 'desc')
              .limit(50),
          ])
        : [
            await Follow.query()
              .where('followingId', user.id)
              .whereNot('followerId', user.id)
              .preload('follower')
              .orderBy('createdAt', 'desc')
              .limit(50),
            [],
            [],
            [],
          ]

    const notifications: TimelineNotification[] = [
      ...follows.map((follow) => ({
        id: `follow-${follow.id}`,
        type: 'follow' as const,
        actor: {
          username: follow.follower.username,
          name: follow.follower.name,
          profile_picture: follow.follower.profile_picture,
          initials: follow.follower.initials,
        },
        createdAt: follow.createdAt,
      })),
      ...likes.map((like) => ({
        id: `like-${like.id}`,
        type: 'like' as const,
        actor: {
          username: like.user.username,
          name: like.user.name,
          profile_picture: like.user.profile_picture,
          initials: like.user.initials,
        },
        createdAt: like.createdAt,
        tweet: like.tweet,
      })),
      ...replies.map((reply) => ({
        id: `reply-${reply.id}`,
        type: 'reply' as const,
        actor: {
          username: reply.user.username,
          name: reply.user.name,
          profile_picture: reply.user.profile_picture,
          initials: reply.user.initials,
        },
        createdAt: reply.createdAt,
        tweet: reply,
      })),
      ...retweets.map((retweet) => ({
        id: `retweet-${retweet.id}`,
        type: 'retweet' as const,
        actor: {
          username: retweet.user.username,
          name: retweet.user.name,
          profile_picture: retweet.user.profile_picture,
          initials: retweet.user.initials,
        },
        createdAt: retweet.createdAt,
        tweet: retweet.originalTweet,
      })),
    ]
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      .slice(0, 50)

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
