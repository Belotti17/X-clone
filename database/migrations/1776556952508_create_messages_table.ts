import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('sender_id').unsigned().references('users.id').onDelete('CASCADE')
      table.integer('receiver_id').unsigned().references('users.id').onDelete('CASCADE')
      table.text('content').notNullable()
      table.boolean('is_read').defaultTo(false)
      table.timestamp('read_at').nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      // Index pour optimiser les recherches
      table.index(['sender_id', 'receiver_id'])
      table.index(['receiver_id', 'is_read'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
