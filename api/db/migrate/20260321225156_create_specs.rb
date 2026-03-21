class CreateSpecs < ActiveRecord::Migration[8.0]
  def change
    create_table :specs do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.references :conversation, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users, primary_key: :id }, type: :string
      t.string :title, null: false
      t.text :content, null: false
      t.string :status, null: false, default: "draft"
      t.boolean :ai_generated, null: false, default: false
      t.timestamps
    end
  end
end
