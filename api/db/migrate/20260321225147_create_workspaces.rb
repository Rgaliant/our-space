class CreateWorkspaces < ActiveRecord::Migration[8.0]
  def change
    create_table :workspaces do |t|
      t.references :owner, null: false, foreign_key: { to_table: :users, primary_key: :id }, type: :string
      t.string :name, null: false
      t.string :slug, null: false
      t.string :plan, null: false, default: "free"
      t.jsonb :context, default: {}
      t.timestamps
    end

    add_index :workspaces, :slug, unique: true
  end
end
