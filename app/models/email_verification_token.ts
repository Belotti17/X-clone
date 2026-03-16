// Import du schema généré automatiquement depuis la base de données
import { EmailVerificationTokenSchema } from '#database/schema'

// Import du modèle User pour créer la relation
import User from './user.js'

// Import du décorateur belongsTo pour définir une relation Lucid
import { belongsTo } from '@adonisjs/lucid/orm'

// Import du type relation BelongsTo
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Modèle EmailVerificationToken
 * ------------------------------
 * Ce modèle représente les codes OTP envoyés par email
 * pour vérifier le compte utilisateur.
 */
export default class EmailVerificationToken extends EmailVerificationTokenSchema {
  /**
   * Relation avec le modèle User
   * Un token appartient à un seul utilisateur
   */
  @belongsTo(() => User, {
    // nom de la clé étrangère dans la table
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User> // type de la relation
}
