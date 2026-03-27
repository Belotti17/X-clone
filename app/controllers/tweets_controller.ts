import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export default class TweetsController {
  async store({ request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const content = request.input('content')
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
    const tweet = await Tweet.findOrFail(params.id)

    const existingLike = await tweet.related('likes').query().where('userId', user.id).first()

    if (existingLike) {
      await existingLike.delete()
      const likesCount = await tweet.related('likes').query().count('* as total')
      return response.json({ liked: false, likesCount: Number(likesCount[0].$extras.total) })
    } else {
      await tweet.related('likes').create({ userId: user.id })
      const likesCount = await tweet.related('likes').query().count('* as total')
      return response.json({ liked: true, likesCount: Number(likesCount[0].$extras.total) })
    }
  }

  async retweet({ params, request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const originalTweet = await Tweet.query().where('id', params.id).preload('user').firstOrFail()

    const content = request.input('content')

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
      content: content && content.trim().length > 0 ? content.trim() : null,
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
    const content = request.input('content')

    if (!content || content.trim().length === 0) {
      session.flash('error', 'La réponse ne peut pas être vide')
      return response.redirect().back()
    }

    await Tweet.create({
      content: content.trim(),
      userId: user.id,
      parentTweetId: originalTweet.id,
      isReply: true,
      isRetweet: false,
    })

    session.flash('success', 'Réponse publiée !')
    return response.redirect().back()
  }

  async getReplies({ params, response }: HttpContext) {
    try {
      const tweet = await Tweet.query()
        .where('id', params.id)
        .preload('replies', (query) => {
          query.preload('user').orderBy('createdAt', 'asc')
        })
        .firstOrFail()

      return response.json({ replies: tweet.replies })
    } catch (error) {
      return response.json({ replies: [] })
    }
  }

  async show({ params, view, auth }: HttpContext) {
    const user = auth.use('web').user!
    const tweet = await Tweet.query()
      .where('id', params.id)
      .preload('user')
      .preload('replies', (query) => {
        query.preload('user').orderBy('createdAt', 'asc')
      })
      .preload('originalTweet', (query) => {
        query.preload('user')
      })
      .firstOrFail()

    return view.render('pages/tweet', { user, tweet })
  }
}
