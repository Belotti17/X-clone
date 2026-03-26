// app/models/tweet.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Like from './like.js'

export default class Tweet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare content: string | null

  @column()
  declare userId: number

  @column()
  declare originalTweetId: number | null

  @column()
  declare parentTweetId: number | null

  @column()
  declare isRetweet: boolean

  @column()
  declare isReply: boolean

  @column()
  declare image: string | null

  @column()
  declare video: string | null // ← AJOUTER CETTE LIGNE

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relation avec l'utilisateur
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Relation avec le tweet original (pour les retweets)
  @belongsTo(() => Tweet, {
    foreignKey: 'originalTweetId',
  })
  declare originalTweet: BelongsTo<typeof Tweet>

  // Relation avec le tweet parent (pour les réponses)
  @belongsTo(() => Tweet, {
    foreignKey: 'parentTweetId',
  })
  declare parentTweet: BelongsTo<typeof Tweet>

  // Relation pour les réponses à ce tweet
  @hasMany(() => Tweet, {
    foreignKey: 'parentTweetId',
  })
  declare replies: HasMany<typeof Tweet>

  // Relation pour les retweets de ce tweet
  @hasMany(() => Tweet, {
    foreignKey: 'originalTweetId',
  })
  declare retweets: HasMany<typeof Tweet>

  // Relation pour les likes
  @hasMany(() => Like)
  declare likes: HasMany<typeof Like>
}
