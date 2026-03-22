class CreateTicketComments < ActiveRecord::Migration[8.0]
  def change
    create_table :ticket_comments do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :workspace, null: false, foreign_key: true
      t.string :author_id, null: false
      t.text :body, null: false
      t.timestamps
    end

    add_foreign_key :ticket_comments, :users, column: :author_id, primary_key: :id
    add_index :ticket_comments, :author_id
    add_index :ticket_comments, [ :ticket_id, :created_at ]
  end
end
