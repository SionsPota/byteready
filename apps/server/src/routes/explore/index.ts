import { Hono } from 'hono'
import { requireAuth } from '../../lib/auth/middleware.ts'
import { experiencesRoute } from './experiences.ts'
import { companiesRoute } from './companies.ts'
import { tagsRoute } from './tags.ts'
import { trendsRoute } from './trends.ts'
import { projectsRoute } from './projects.ts'

export const exploreRoute = new Hono()
exploreRoute.use('*', requireAuth)

exploreRoute.route('/experiences', experiencesRoute)
exploreRoute.route('/companies', companiesRoute)
exploreRoute.route('/tags', tagsRoute)
exploreRoute.route('/trends', trendsRoute)
exploreRoute.route('/projects', projectsRoute)
