import { env } from '../../env.ts'
import { siliconflowFetch, type SfRerankResponse } from './client.ts'

export interface RerankOptions {
  topN?: number
  model?: string
}

export interface RerankItem {
  index: number
  score: number
  text: string
}

export interface RerankResult {
  results: RerankItem[]
  model: string
}

export const rerankDocs = async (
  query: string,
  docs: string[],
  opts?: RerankOptions,
): Promise<RerankResult> => {
  if (docs.length === 0) throw new Error('rerank_docs_empty')
  const model = opts?.model ?? env.SILICONFLOW_RERANK_MODEL
  const topN = opts?.topN ?? Math.min(docs.length, 5)
  const data = await siliconflowFetch<SfRerankResponse>('/rerank', {
    model,
    query,
    documents: docs,
    top_n: topN,
  })
  return {
    results: data.results.map((r) => ({
      index: r.index,
      score: r.relevance_score,
      text: docs[r.index] ?? '',
    })),
    model,
  }
}
