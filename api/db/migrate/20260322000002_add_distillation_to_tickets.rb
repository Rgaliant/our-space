class AddDistillationToTickets < ActiveRecord::Migration[8.0]
  def change
    add_column :tickets, :distillation_id, :bigint, null: true
    add_foreign_key :tickets, :distillations
    add_index :tickets, :distillation_id
  end
end
