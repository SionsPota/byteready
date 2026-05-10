import { env } from '../../env.ts'
import { siliconflowFetch, type SfEmbeddingResponse } from './client.ts'

export interface EmbedOptions {
  model?: string
}

export interface EmbedResult {
  vectors: number[][]
  dim: number
  model: string
  usage: { total_tokens: number; prompt_tokens?: number }
}

export const embedTexts = async (texts: string[], opts?: EmbedOptions): Promise<EmbedResult> => {
  if (texts.length === 0) throw new Error('embed_texts_empty')
  const model = opts?.model ?? env.SILICONFLOW_EMBEDDING_MODEL
  const data = await siliconflowFetch<SfEmbeddingResponse>('/embeddings', {
    model,
    input: texts,
  })
  return {
    vectors: data.data.map((d) => d.embedding),
    dim: data.data[0]?.embedding.length ?? 0,
    model: data.model,
    usage: data.usage,
  }
}
