// app/controllers/messages_controller.ts

import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class MessagesController {
  /**
   * Page principale des messages
   * Affiche la liste des conversations
   */
  async index({ view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user

    if (!currentUser) {
      return view.render('pages/auth/login')
    }

    // Récupérer toutes les conversations de l'utilisateur
    const conversations = await this.getConversations(currentUser.id)

    return view.render('pages/messages/index', {
      currentUser,
      conversations: JSON.parse(JSON.stringify(conversations)),
      activeConversation: null,
      messages: [],
    })
  }

  /**
   * Affiche une conversation spécifique
   */
  async show({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const conversationId = parseInt(params.id)

    if (!currentUser) {
      return view.render('pages/auth/login')
    }

    // Récupérer l'utilisateur avec qui on parle
    const otherUser = await User.findOrFail(conversationId)

    // Récupérer toutes les conversations
    const conversations = await this.getConversations(currentUser.id)

    // Récupérer les messages entre les deux utilisateurs
    const messages = await Message.query()
      .where((query) => {
        query
          .where('senderId', currentUser.id)
          .where('receiverId', conversationId)
          .orWhere('senderId', conversationId)
          .where('receiverId', currentUser.id)
      })
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'asc')
      .limit(100)

    // Marquer les messages non lus comme lus
    await Message.query()
      .where('senderId', conversationId)
      .where('receiverId', currentUser.id)
      .where('isRead', false)
      .update({
        isRead: true,
        readAt: DateTime.now(), // Utilisation de DateTime.now() au lieu de new Date()
      })

    return view.render('pages/messages/index', {
      currentUser,
      conversations: JSON.parse(JSON.stringify(conversations)),
      activeConversation: otherUser,
      messages: JSON.parse(JSON.stringify(messages)),
    })
  }

  /**
   * Envoyer un message (API)
   */
  async store({ request, response, auth }: HttpContext) {
    const currentUser = await auth.use('web').user

    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const receiverId = request.input('receiver_id')
    const content = request.input('content', '').trim()

    if (!content) {
      return response.status(400).json({ error: 'Le message ne peut pas être vide' })
    }

    // Vérifier que le destinataire existe
    const receiver = await User.find(receiverId)
    if (!receiver) {
      return response.status(404).json({ error: 'Destinataire non trouvé' })
    }

    // Créer le message
    const message = await Message.create({
      senderId: currentUser.id,
      receiverId: receiverId,
      content: content,
      isRead: false,
    })

    await message.load('sender')
    await message.load('receiver')

    return response.status(201).json({
      success: true,
      message: message,
    })
  }

  /**
   * Marquer un message comme lu
   */
  async markAsRead({ params, response, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const messageId = params.id

    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const message = await Message.findOrFail(messageId)

    if (message.receiverId !== currentUser.id) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    message.isRead = true
    message.readAt = DateTime.now() // Utilisation de DateTime.now()
    await message.save()

    return response.json({ success: true })
  }

  /**
   * Récupérer les nouvelles conversations (pour polling/SSE)
   */
  async getNewMessages({ request, response, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const lastMessageId = request.input('last_message_id', 0)
    const conversationId = request.input('conversation_id')

    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    let query = Message.query().where('receiverId', currentUser.id).where('id', '>', lastMessageId)

    if (conversationId) {
      query = query.where('senderId', conversationId)
    }

    const newMessages = await query
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'asc')

    // Marquer comme lus
    for (const message of newMessages) {
      if (!message.isRead) {
        message.isRead = true
        message.readAt = DateTime.now()
        await message.save()
      }
    }

    return response.json({
      messages: newMessages,
    })
  }

  /**
   * Récupérer la liste des conversations avec le dernier message
   */
  private async getConversations(userId: number) {
    // Récupérer tous les messages de l'utilisateur
    const messages = await Message.query()
      .where('senderId', userId)
      .orWhere('receiverId', userId)
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'desc')

    // Créer un map des conversations uniques
    const conversationsMap = new Map()

    for (const message of messages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId
      const otherUser = message.senderId === userId ? message.receiver : message.sender

      if (!conversationsMap.has(otherUserId)) {
        // Compter les messages non lus
        const unreadCount = await Message.query()
          .where('senderId', otherUserId)
          .where('receiverId', userId)
          .where('isRead', false)
          .count('* as total')

        conversationsMap.set(otherUserId, {
          user: otherUser,
          lastMessage: message,
          unreadCount: Number(unreadCount[0].$extras.total),
          lastMessageAt: message.createdAt,
        })
      }
    }

    // Convertir en tableau et trier par date du dernier message
    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis()
    )

    return conversations
  }
}
