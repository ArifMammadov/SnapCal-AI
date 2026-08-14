import { Queue, Worker } from 'bullmq'
import { getRedis } from './redis.js'
import { indexArticleVector, generateEmbedding, getUnindexedArticles } from '@snapcal/database'
import { logger } from './logger.js'
import type { EmbeddingGenerator } from '@snapcal/database'

const queueName = 'knowledge-index'

let queue: Queue | undefined
let worker: Worker | undefined

export interface KnowledgeQueueConfig {
  apiKey: string
  baseUrl: string
}

export function getKnowledgeIndexQueue(): Queue {
  if (!queue) {
    queue = new Queue(queueName, { connection: getRedis() })
  }
  return queue
}

export function startKnowledgeIndexWorker(config: KnowledgeQueueConfig): Worker {
  if (worker) return worker

  const generateFn: EmbeddingGenerator = (text: string) =>
    generateEmbedding(text, config.apiKey, config.baseUrl)

  worker = new Worker(
    queueName,
    async (job) => {
      if (job.name === 'index-article') {
        const { articleId } = job.data as { articleId: string }
        return indexArticleVector(articleId, generateFn)
      }
      if (job.name === 'index-all-unindexed') {
        const articles = await getUnindexedArticles()
        const q = getKnowledgeIndexQueue()
        for (const article of articles) {
          await q.add('index-article', { articleId: article.id })
        }
        return { queued: articles.length }
      }
      throw new Error(`Unknown job name: ${job.name}`)
    },
    { connection: getRedis(), concurrency: 2 },
  )

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, articleId: job?.data?.articleId }, 'knowledge index job failed')
  })

  return worker
}

export async function enqueueKnowledgeIndex(articleId: string) {
  const q = getKnowledgeIndexQueue()
  await q.add('index-article', { articleId })
}

export async function enqueueKnowledgeIndexAll() {
  const q = getKnowledgeIndexQueue()
  await q.add('index-all-unindexed', {})
}

export async function closeKnowledgeIndexWorker() {
  await queue?.close()
  await worker?.close()
}
