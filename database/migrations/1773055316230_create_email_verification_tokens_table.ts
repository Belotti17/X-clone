// Import de BaseSchema pour créer des migrations AdonisJS
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration pour la table email_verification_tokens
 * Cette table stocke les codes OTP envoyés aux utilisateurs
 */
export default class extends BaseSchema {
  // Nom de la table
  protected tableName = 'email_verification_tokens'

  // Méthode exécutée lors du lancement de la migration
  async up() {
    // Création de la table
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id') // clé primaire auto-incrémentée

      // ID de l'utilisateur lié au token
      table
        .integer('user_id') // colonne user_id
        .unsigned() // valeur positive
        .notNullable() // obligatoire
        .references('id') // référence la colonne id
        .inTable('users') // dans la table users
        .onDelete('CASCADE') // supprime le token si l'utilisateur est supprimé

      // Code OTP envoyé par email
      table.string('token').notNullable()

      // Date d'expiration du token
      table.timestamp('expires_at', { useTz: true }).notNullable()

      // Date de création du token
      table.timestamp('created_at', { useTz: true }).notNullable()

      // Date de mise à jour du token
      table.timestamp('updated_at', { useTz: true }).nullable()

      // Index pour accélérer la recherche OTP
      table.index(['user_id'])
    })
  }

  // Méthode exécutée lors d'un rollback
  async down() {
    // Suppression de la table
    this.schema.dropTable(this.tableName)
  }
}
