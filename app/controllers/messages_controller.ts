// app/controllers/messages_controller.ts

import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class MessagesController {
  /**
   * Page principale des messages
   * Affiche la liste des conversations (boite de reception)
   * Pas de redirection automatique vers une conversation
   */
  async index({ view, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user

    // Redirection vers login si non authentifie
    if (!currentUser) {
      return view.render('pages/auth/login')
    }

    // Recuperation de toutes les conversations de l'utilisateur
    const conversations = await this.getConversations(currentUser.id)

    // Rendu de la vue avec la liste des conversations uniquement
    // Pas de conversation active, pas de messages affiches
    return view.render('pages/messages', {
      currentUser: currentUser,
      conversations: conversations,
      activeConversation: null,
      messages: [],
    })
  }

  /**
   * Affiche une conversation specifique
   * Cette methode est appelee quand on clique sur une conversation
   */
  async show({ params, view, auth, response }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user
    if (!currentUser) {
      return response.unauthorized()
    }
    // Recuperation de l'ID de la conversation depuis l'URL
    const conversationId = Number(params.id)

    if (!Number.isSafeInteger(conversationId) || conversationId < 1) {
      return response.notFound()
    }

    // Recuperation de l'utilisateur avec qui on parle
    const otherUser = await User.findOrFail(conversationId)

    // Recuperation des messages entre les deux utilisateurs
    const messages = await Message.query()
      .where((query) => {
        query
          .where('senderId', currentUser.id)
          .where('receiverId', conversationId)
          .orWhere((incomingQuery) => {
            incomingQuery.where('senderId', conversationId).where('receiverId', currentUser.id)
          })
      })
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'desc')
      .limit(100)

    messages.reverse()

    // Marquage des messages non lus comme lus
    await Message.query()
      .where('senderId', conversationId)
      .where('receiverId', currentUser.id)
      .where('isRead', false)
      .update({
        isRead: true,
        readAt: DateTime.now(),
      })

    // Recuperation de toutes les conversations après actualisation des badges non lus
    const conversations = await this.getConversations(currentUser.id)

    // Rendu de la vue avec la conversation active
    return view.render('pages/messages', {
      currentUser: currentUser,
      conversations: conversations,
      activeConversation: otherUser,
      messages: messages,
    })
  }

  /**
   * Envoi d'un message (API)
   */
  async store({ request, response, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user

    // Erreur si non authentifie
    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifie' })
    }

    // Recuperation des donnees du formulaire
    const receiverId = Number(request.input('receiver_id'))
    const rawContent = request.input('content', '')

    // Validation du contenu du message
    if (!Number.isSafeInteger(receiverId) || receiverId < 1) {
      return response.status(400).json({ error: 'Destinataire invalide' })
    }

    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return response.status(400).json({ error: 'Le message ne peut pas etre vide' })
    }
    const content = rawContent.trim()

    // Verification que le destinataire existe
    const receiver = await User.find(receiverId)
    if (!receiver) {
      return response.status(404).json({ error: 'Destinataire non trouve' })
    }

    // Creation du message en base de donnees
    const message = await Message.create({
      senderId: currentUser.id,
      receiverId: receiverId,
      content: content,
      isRead: false,
    })

    // Chargement des relations sender et receiver
    await message.load('sender')
    await message.load('receiver')

    // Reponse JSON avec le message cree
    return response.status(201).json({
      success: true,
      message: message,
    })
  }

  /**
   * Modification d'un message (API)
   */
  async update({ params, request, response, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user
    // Recuperation de l'ID du message
    const messageId = params.id

    // Erreur si non authentifie
    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifie' })
    }

    // Recherche du message
    const message = await Message.findOrFail(messageId)

    // Verification que l'utilisateur est bien l'expediteur du message
    if (message.senderId !== currentUser.id) {
      return response.status(403).json({ error: 'Non autorise' })
    }

    // Recuperation du nouveau contenu
    const rawContent = request.input('content', '')

    // Validation du contenu
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return response.status(400).json({ error: 'Le message ne peut pas etre vide' })
    }
    const newContent = rawContent.trim()

    // Mise a jour du message
    message.content = newContent
    await message.save()

    return response.json({
      success: true,
      message: message,
    })
  }

  /**
   * Suppression d'un message (API)
   */
  async destroy({ params, response, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user
    // Recuperation de l'ID du message
    const messageId = params.id

    // Erreur si non authentifie
    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifie' })
    }

    // Recherche du message
    const message = await Message.findOrFail(messageId)

    // Verification que l'utilisateur est bien l'expediteur du message
    if (message.senderId !== currentUser.id) {
      return response.status(403).json({ error: 'Non autorise' })
    }

    // Suppression du message
    await message.delete()

    return response.json({
      success: true,
      message: 'Message supprime avec succes',
    })
  }

  /**
   * Marquage d'un message comme lu (API)
   */
  async markAsRead({ params, response, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user
    // Recuperation de l'ID du message
    const messageId = params.id

    // Erreur si non authentifie
    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifie' })
    }

    // Recherche du message
    const message = await Message.findOrFail(messageId)

    // Verification que l'utilisateur est bien le destinataire
    if (message.receiverId !== currentUser.id) {
      return response.status(403).json({ error: 'Non autorise' })
    }

    // Marquage du message comme lu
    message.isRead = true
    message.readAt = DateTime.now()
    await message.save()

    return response.json({ success: true })
  }

  /**
   * Recuperation des nouveaux messages (pour le polling)
   */
  async getNewMessages({ request, response, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user
    // Recuperation du dernier ID de message connu
    const lastMessageId = Number(request.input('last_message_id', 0))
    // Recuperation de l'ID de la conversation
    const conversationId = request.input('conversation_id')

    // Erreur si non authentifie
    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifie' })
    }

    if (!Number.isSafeInteger(lastMessageId) || lastMessageId < 0) {
      return response.status(400).json({ error: 'Identifiant de message invalide' })
    }

    if (
      conversationId !== undefined &&
      (!Number.isSafeInteger(Number(conversationId)) || Number(conversationId) < 1)
    ) {
      return response.status(400).json({ error: 'Identifiant de conversation invalide' })
    }

    // Construction de la requete pour les nouveaux messages
    let query = Message.query().where('receiverId', currentUser.id).where('id', '>', lastMessageId)

    // Filtrage par conversation si specifie
    if (conversationId) {
      query = query.where('senderId', Number(conversationId))
    }

    // Execution de la requete avec chargement des relations
    const newMessages = await query
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'asc')
      .limit(100)

    // Marquage automatique des nouveaux messages comme lus
    for (const message of newMessages) {
      if (!message.isRead) {
        message.isRead = true
        message.readAt = DateTime.now()
        await message.save()
      }
    }

    // Reponse JSON avec les nouveaux messages
    return response.json({
      messages: newMessages,
    })
  }

  /**
   * Recuperation de la liste des conversations avec le dernier message
   */
  private async getConversations(userId: number) {
    const messages = await Message.query()
      .where((query) => {
        query.where('senderId', userId).orWhere('receiverId', userId)
      })
      .select('id', 'senderId', 'receiverId', 'content', 'createdAt')
      .orderBy('createdAt', 'desc')

    const latestMessages = new Map<number, Message>()
    for (const message of messages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId
      if (!latestMessages.has(otherUserId)) {
        latestMessages.set(otherUserId, message)
      }
    }

    const otherUserIds = Array.from(latestMessages.keys())
    if (otherUserIds.length === 0) {
      return []
    }

    const [users, unreadCounts] = await Promise.all([
      User.query().whereIn('id', otherUserIds),
      Message.query()
        .where('receiverId', userId)
        .where('isRead', false)
        .whereIn('senderId', otherUserIds)
        .select('senderId')
        .count('* as total')
        .groupBy('senderId'),
    ])

    const usersById = new Map(users.map((user) => [user.id, user]))
    const unreadByUserId = new Map(
      unreadCounts.map((row) => [Number(row.senderId), Number(row.$extras.total)])
    )

    return otherUserIds
      .flatMap((otherUserId) => {
        const user = usersById.get(otherUserId)
        const lastMessage = latestMessages.get(otherUserId)
        if (!user || !lastMessage) {
          return []
        }

        return [
          {
            user,
            lastMessage,
            unreadCount: unreadByUserId.get(otherUserId) ?? 0,
            lastMessageAt: lastMessage.createdAt,
          },
        ]
      })
      .sort((a, b) => b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis())
  }
}
