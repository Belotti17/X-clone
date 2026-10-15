import { LikeSchema } from '#database/schema'
import User from './user.ts'
import Tweet from './tweet.ts'

import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Modèle Like
 * ------------
 * Représente un like d'un utilisateur sur un tweet.
 */
export default class Like extends LikeSchema {
  /**
   * L'utilisateur qui a liké le tweet
   */
  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  /**
   * Le tweet qui a été liké
   */
  @belongsTo(() => Tweet, {
    foreignKey: 'tweetId',
  })
  declare tweet: BelongsTo<typeof Tweet>
}
