class CreateWorkspaceMembers < ActiveRecord::Migration[8.0]
  def change
    create_table :workspace_members do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: { primary_key: :id }, type: :string
      t.string :role, null: false, default: "engineer"
      t.timestamps
    end

    add_index :workspace_members, [ :workspace_id, :user_id ], unique: true
  end
end
