class CreateConversationsAndMessages < ActiveRecord::Migration[8.0]
  def change
    create_table :conversations do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :project, foreign_key: true
      t.references :user, null: false, foreign_key: { primary_key: :id }, type: :string
      t.string :title, null: false
      t.timestamps
    end

    create_table :conversation_messages do |t|
      t.references :conversation, null: false, foreign_key: true
      t.string :role, null: false
      t.text :content, null: false
      t.jsonb :metadata, default: {}
      t.timestamps
    end
  end
end
