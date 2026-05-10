import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { err } from '@byteready/shared'
import { env } from './env.ts'
import { healthRoute } from './routes/health.ts'
import { authRoute } from './routes/auth.ts'
import { meRoute } from './routes/me.ts'
import { resumesRoute } from './routes/resumes.ts'
import { questionsRoute } from './routes/questions.ts'
import { voiceRoute } from './routes/voice.ts'
import { trainingRoute } from './routes/training.ts'
import { projectsRoute } from './routes/projects.ts'
import { trendsRoute } from './routes/trends.ts'
import { exploreRoute } from './routes/explore/index.ts'
import { skillsRoute } from './routes/skills.ts'

export const createApp = () => {
  const app = new Hono()

  app.use('*', logger())
  app.use('*', cors())

  app.route('/api/health', healthRoute)
  app.route('/api/auth', authRoute)
  app.route('/api/me', meRoute)
  app.route('/api/resumes', resumesRoute)
  app.route('/api/questions', questionsRoute)
  app.route('/api/voice', voiceRoute)
  app.route('/api/training', trainingRoute)
  app.route('/api/projects', projectsRoute)
  app.route('/api/trends', trendsRoute)
  app.route('/api/explore', exploreRoute)
  app.route('/api/skills', skillsRoute)

  app.notFound((c) =>
    c.json(err('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404),
  )

  app.onError((error, c) => {
    console.error('[server] unhandled error:', error)
    return c.json(err('INTERNAL_ERROR', env.isDev ? error.message : 'Internal server error'), 500)
  })

  return app
}
