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
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user

    // Redirection vers login si non authentifie
    if (!currentUser) {
      return view.render('pages/auth/login')
    }

    // Recuperation de toutes les conversations de l'utilisateur
    const conversations = await this.getConversations(currentUser.id)

    // Rendu de la vue avec les conversations
    return view.render('pages/messages', {
      currentUser: currentUser,
      conversations: conversations,
      activeConversation: null,
      messages: [],
    })
  }

  /**
   * Affiche une conversation specifique
   */
  async show({ params, view, auth }: HttpContext) {
    // Recuperation de l'utilisateur connecte
    const currentUser = await auth.use('web').user
    // Recuperation de l'ID de la conversation depuis l'URL
    const conversationId = parseInt(params.id)

    // Redirection vers login si non authentifie
    if (!currentUser) {
      return view.render('pages/auth/login')
    }

    // Recuperation de l'utilisateur avec qui on parle
    const otherUser = await User.findOrFail(conversationId)

    // Recuperation de toutes les conversations
    const conversations = await this.getConversations(currentUser.id)

    // Recuperation des messages entre les deux utilisateurs
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

    // Marquage des messages non lus comme lus
    await Message.query()
      .where('senderId', conversationId)
      .where('receiverId', currentUser.id)
      .where('isRead', false)
      .update({
        isRead: true,
        readAt: DateTime.now(),
      })

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
    const receiverId = request.input('receiver_id')
    const content = request.input('content', '').trim()

    // Validation du contenu du message
    if (!content) {
      return response.status(400).json({ error: 'Le message ne peut pas etre vide' })
    }

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
    const lastMessageId = request.input('last_message_id', 0)
    // Recuperation de l'ID de la conversation
    const conversationId = request.input('conversation_id')

    // Erreur si non authentifie
    if (!currentUser) {
      return response.status(401).json({ error: 'Non authentifie' })
    }

    // Construction de la requete pour les nouveaux messages
    let query = Message.query().where('receiverId', currentUser.id).where('id', '>', lastMessageId)

    // Filtrage par conversation si specifie
    if (conversationId) {
      query = query.where('senderId', conversationId)
    }

    // Execution de la requete avec chargement des relations
    const newMessages = await query
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'asc')

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
    // Recuperation de tous les messages de l'utilisateur
    const messages = await Message.query()
      .where('senderId', userId)
      .orWhere('receiverId', userId)
      .preload('sender')
      .preload('receiver')
      .orderBy('createdAt', 'desc')

    // Map pour stocker les conversations uniques
    const conversationsMap = new Map()

    // Parcours des messages pour construire les conversations
    for (const message of messages) {
      // Determination de l'autre utilisateur
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId
      const otherUser = message.senderId === userId ? message.receiver : message.sender

      // Ajout de la conversation si elle n'existe pas encore
      if (!conversationsMap.has(otherUserId)) {
        // Comptage des messages non lus pour cette conversation
        const unreadCount = await Message.query()
          .where('senderId', otherUserId)
          .where('receiverId', userId)
          .where('isRead', false)
          .count('* as total')

        // Stockage des informations de la conversation
        conversationsMap.set(otherUserId, {
          user: otherUser,
          lastMessage: message,
          unreadCount: Number(unreadCount[0].$extras.total),
          lastMessageAt: message.createdAt,
        })
      }
    }

    // Conversion du Map en tableau et tri par date du dernier message
    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis()
    )

    return conversations
  }
}
