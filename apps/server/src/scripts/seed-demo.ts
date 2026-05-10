import { seedAll } from '../lib/demo/seed.ts'
import { frontendAccount } from '../lib/demo/frontend-data.ts'
import { aiAgentAccount } from '../lib/demo/ai-agent-data.ts'

seedAll([frontendAccount, aiAgentAccount])
