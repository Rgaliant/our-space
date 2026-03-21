class EmbedRecordJob < ApplicationJob
  queue_as :default

  def perform(record_type, record_id)
    record = record_type.constantize.find(record_id)
    Rag::EmbedRecordService.new(record).call
  rescue ActiveRecord::RecordNotFound
    # Record was deleted before job ran — ignore
  end
end
