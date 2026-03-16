// Import de la classe BaseSchema utilisée pour créer des migrations
import { BaseSchema } from '@adonisjs/lucid/schema'

// Export de la migration
export default class extends BaseSchema {
  // Nom de la table concernée
  protected tableName = 'users'

  // Méthode exécutée lorsque la migration est lancée
  async up() {
    // Création de la table users
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable() // id auto-incrémenté

      table.string('name').notNullable() // nom complet utilisateur

      table.string('username', 30).notNullable().unique() // pseudo unique

      table.string('email', 254).notNullable().unique() // email unique

      table.string('password').notNullable() // mot de passe hashé

      table.boolean('is_verified').defaultTo(false) // email vérifié ou non

      table.string('bio', 160).nullable() // petite bio utilisateur

      table.string('profile_picture').nullable() // photo de profil

      table.boolean('is_private').defaultTo(false) // compte privé

      table.integer('followers').defaultTo(0) // compteur followers

      table.integer('following').defaultTo(0) // compteur following

      table.timestamp('created_at', { useTz: true }).notNullable() // date création

      table.timestamp('updated_at', { useTz: true }).nullable() // date modification
    })
  }

  // Méthode exécutée si on rollback la migration
  async down() {
    this.schema.dropTable(this.tableName) // suppression table
  }
}
