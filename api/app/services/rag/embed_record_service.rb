module Rag
  class EmbedRecordService
    def initialize(record)
      @record = record
    end

    def call
      text = build_text
      result = Rag::EmbeddingService.new(text).call
      return result unless result.success?

      vector = result.payload.first
      embedding = Embedding.find_or_initialize_by(
        workspace_id: @record.workspace_id,
        source_type: @record.class.name,
        source_id: @record.id,
        chunk_index: 0
      )
      embedding.content = text
      embedding.embedding = vector

      if embedding.save
        Result.new(success: true, payload: embedding)
      else
        Result.new(success: false, error: embedding.errors.full_messages.to_sentence)
      end
    end

    private

    def build_text
      case @record
      when Spec
        "#{@record.title}\n\n#{@record.content}"
      when Ticket
        "#{@record.title}\n\n#{@record.description}"
      else
        @record.to_s
      end
    end
  end
end
