import { FollowSchema } from '#database/schema'
import User from './user.ts'

import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Modèle Follow
 * ----------------
 * Représente une relation d'abonnement entre deux utilisateurs.
 * follower_id : l'utilisateur qui suit
 * following_id : l'utilisateur suivi
 */
export default class Follow extends FollowSchema {
  /**
   * L'utilisateur qui suit quelqu'un
   */
  @belongsTo(() => User, {
    foreignKey: 'follower_id',
  })
  declare follower: BelongsTo<typeof User>

  /**
   * L'utilisateur qui est suivi
   */
  @belongsTo(() => User, {
    foreignKey: 'following_id',
  })
  declare following: BelongsTo<typeof User>
}
