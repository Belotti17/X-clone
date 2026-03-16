import { PasswordResetTokenSchema } from '#database/schema'
import User from './user.ts'

import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Modèle PasswordResetToken
 * -------------------------
 * Représente un token envoyé à l'utilisateur pour réinitialiser son mot de passe.
 * Chaque token appartient à un utilisateur.
 */
export default class PasswordResetToken extends PasswordResetTokenSchema {
  /**
   * Relation vers l'utilisateur concerné par le token
   */
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
