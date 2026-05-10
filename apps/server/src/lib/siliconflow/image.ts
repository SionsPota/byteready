import { env } from '../../env.ts'
import { siliconflowFetch, type SfImageResponse } from './client.ts'

export type ImageSize = '512x512' | '768x768' | '1024x1024' | '1024x1536' | '1536x1024'

export interface GenerateImageOptions {
  prompt: string
  size?: ImageSize
  negativePrompt?: string
  seed?: number
  steps?: number
  model?: string
}

export interface GenerateImageResult {
  url: string
  size: ImageSize
  model: string
  seed?: number
}

export const generateImage = async (
  opts: GenerateImageOptions,
): Promise<GenerateImageResult> => {
  const size = opts.size ?? '1024x1024'
  const model = opts.model ?? env.SILICONFLOW_IMAGE_MODEL
  const data = await siliconflowFetch<SfImageResponse>('/images/generations', {
    model,
    prompt: opts.prompt,
    image_size: size,
    negative_prompt: opts.negativePrompt,
    seed: opts.seed,
    num_inference_steps: opts.steps ?? 8,
    batch_size: 1,
  })
  const url = data.images[0]?.url
  if (!url) throw new Error('siliconflow_no_image_returned')
  return { url, size, model, seed: data.seed }
}
