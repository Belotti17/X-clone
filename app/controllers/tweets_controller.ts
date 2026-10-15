import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import Like from '#models/like'
import db from '@adonisjs/lucid/services/db'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export default class TweetsController {
  async store({ request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const rawContent = request.input('content', '')
    if (typeof rawContent !== 'string') {
      session.flash('error', 'Le contenu de la publication est invalide')
      return response.redirect().back()
    }
    const content = rawContent
    const media = request.file('media', {
      size: '20mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'webm'],
    })

    const hasContent = content && content.trim().length > 0
    const hasMedia = media && media.isValid

    if (!hasContent && !hasMedia) {
      session.flash('error', 'Veuillez ajouter du texte ou un média')
      return response.redirect().back()
    }

    if (hasContent && content.trim().length > 280) {
      session.flash('error', 'Une publication ne peut pas dépasser 280 caractères')
      return response.redirect().back()
    }

    let mediaPath = null
    let mediaType = null

    if (hasMedia && media.isValid) {
      const fileExt = media.extname
      const fileName = `${randomUUID()}.${fileExt}`
      await media.move(path.join(process.cwd(), 'public/uploads'), {
        name: fileName,
      })
      mediaPath = `/uploads/${fileName}`

      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '')) {
        mediaType = 'image'
      } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileExt || '')) {
        mediaType = 'video'
      }
    } else if (media && !media.isValid) {
      const errorMessage =
        media.errors && media.errors[0] ? media.errors[0].message : 'Format de fichier non supporté'
      session.flash('error', errorMessage)
      return response.redirect().back()
    }

    await Tweet.create({
      content: hasContent ? content.trim() : null,
      userId: user.id,
      image: mediaType === 'image' ? mediaPath : null,
      video: mediaType === 'video' ? mediaPath : null,
      isRetweet: false,
      isReply: false,
    })

    session.flash('success', 'Tweet publié avec succès !')
    return response.redirect().back()
  }

  async destroy({ params, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const tweet = await Tweet.findOrFail(params.id)

    if (tweet.userId !== user.id) {
      session.flash('error', 'Vous ne pouvez pas supprimer ce tweet')
      return response.redirect().back()
    }

    await tweet.delete()
    session.flash('success', tweet.isRetweet ? 'Retweet supprimé' : 'Tweet supprimé')
    return response.redirect().back()
  }

  async like({ params, response, auth }: HttpContext) {
    const user = auth.use('web').user!
    const result = await db.transaction(async (trx) => {
      const tweet = await Tweet.query({ client: trx })
        .where('id', params.id)
        .forUpdate()
        .firstOrFail()

      const existingLike = await Like.query({ client: trx })
        .where('tweetId', tweet.id)
        .where('userId', user.id)
        .first()

      if (existingLike) {
        await Like.query({ client: trx }).where('id', existingLike.id).delete()
      } else {
        await Like.create({ tweetId: tweet.id, userId: user.id }, { client: trx })
      }

      const likesCount = await Like.query({ client: trx })
        .where('tweetId', tweet.id)
        .count('* as total')

      return {
        liked: !existingLike,
        likesCount: Number(likesCount[0].$extras.total),
      }
    })

    return response.json(result)
  }

  async retweet({ params, request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const originalTweet = await Tweet.query().where('id', params.id).preload('user').firstOrFail()

    const rawContent = request.input('content', '')
    if (typeof rawContent !== 'string') {
      session.flash('error', 'Le contenu du repost est invalide')
      return response.redirect().back()
    }
    const content = rawContent.trim()

    if (content.length > 280) {
      session.flash('error', 'Un commentaire de repost ne peut pas dépasser 280 caractères')
      return response.redirect().back()
    }

    const existingRetweet = await Tweet.query()
      .where('userId', user.id)
      .where('originalTweetId', originalTweet.id)
      .where('isRetweet', true)
      .first()

    if (existingRetweet) {
      session.flash('error', 'Vous avez déjà retweeté ce tweet')
      return response.redirect().back()
    }

    await Tweet.create({
      content: content || null,
      userId: user.id,
      originalTweetId: originalTweet.id,
      isRetweet: true,
      isReply: false,
    })

    session.flash('success', 'Retweet effectué !')
    return response.redirect().back()
  }

  async reply({ params, request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const originalTweet = await Tweet.findOrFail(params.id)
    const rawContent = request.input('content', '')
    if (typeof rawContent !== 'string') {
      session.flash('error', 'Le contenu de la réponse est invalide')
      return response.redirect().back()
    }
    const content = rawContent.trim()

    if (!content) {
      session.flash('error', 'La réponse ne peut pas être vide')
      return response.redirect().back()
    }

    if (content.length > 280) {
      session.flash('error', 'Une réponse ne peut pas dépasser 280 caractères')
      return response.redirect().back()
    }

    await Tweet.create({
      content,
      userId: user.id,
      parentTweetId: originalTweet.id,
      isReply: true,
      isRetweet: false,
    })

    session.flash('success', 'Réponse publiée !')
    return response.redirect().back()
  }

  async getReplies({ params, response }: HttpContext) {
    const tweet = await Tweet.query()
      .where('id', params.id)
      .preload('replies', (query) => {
        query.preload('user').orderBy('createdAt', 'asc')
      })
      .firstOrFail()

    return response.json({ replies: tweet.replies })
  }

  async show({ params, view, auth }: HttpContext) {
    const user = auth.use('web').user!
    const tweet = await Tweet.query()
      .where('id', params.id)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .preload('replies', (query) => {
        query.preload('user').preload('likes').preload('retweets').orderBy('createdAt', 'asc')
      })
      .preload('originalTweet', (query) => {
        query
          .preload('user')
          .preload('likes')
          .preload('retweets')
          .preload('replies', (replyQuery) => {
            replyQuery.preload('user').orderBy('createdAt', 'asc')
          })
      })
      .firstOrFail()

    tweet.$extras.likesCount = tweet.likes.length
    tweet.$extras.retweetsCount = tweet.retweets.length
    tweet.$extras.userLiked = tweet.likes.some((like) => like.userId === user.id)
    const replyCount = await Tweet.query()
      .where('parentTweetId', tweet.id)
      .where('isReply', true)
      .count('* as total')
    tweet.$extras.repliesCount = Number(replyCount[0].$extras.total)

    if (tweet.originalTweet) {
      tweet.originalTweet.$extras.likesCount = tweet.originalTweet.likes.length
      tweet.originalTweet.$extras.retweetsCount = tweet.originalTweet.retweets.length
      tweet.originalTweet.$extras.userLiked = tweet.originalTweet.likes.some(
        (like) => like.userId === user.id
      )
      const originalReplyCount = await Tweet.query()
        .where('parentTweetId', tweet.originalTweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.originalTweet.$extras.repliesCount = Number(originalReplyCount[0].$extras.total)
    }

    const displayTweet = tweet.isRetweet && tweet.originalTweet ? tweet.originalTweet : tweet
    return view.render('pages/tweet', { user, tweet, displayTweet })
  }
}
