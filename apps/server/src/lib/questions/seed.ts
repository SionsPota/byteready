import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

interface SeedQuestion {
  position: string
  category: string
  main_text: string
  expected_points: string
}

const SEED_DATA: SeedQuestion[] = [
  // 前端 - 八股
  { position: 'frontend', category: 'bagua', main_text: '简述盒模型及其组成', expected_points: 'content/padding/border/margin;标准盒模型vs怪异盒模型' },
  { position: 'frontend', category: 'bagua', main_text: 'CSS 中 flex 布局的常用属性有哪些？', expected_points: 'flex-direction/justify-content/align-items/flex-wrap' },
  { position: 'frontend', category: 'bagua', main_text: 'React 中 useEffect 的依赖数组工作机制？', expected_points: '依赖比较是浅比较;闭包陷阱;清理函数' },
  { position: 'frontend', category: 'bagua', main_text: '事件循环（Event Loop）中微任务和宏任务的区别？', expected_points: '宏任务队列vs微任务队列;Promise.then属于微任务' },
  { position: 'frontend', category: 'bagua', main_text: '浏览器渲染流水线（Critical Rendering Path）的关键步骤？', expected_points: 'DOM/CSSOM/Render Tree/Layout/Paint/Composite' },

  // 前端 - 算法
  { position: 'frontend', category: 'algorithm', main_text: '实现一个函数，反转字符串', expected_points: '双指针或数组reverse;考虑Unicode' },
  { position: 'frontend', category: 'algorithm', main_text: '实现数组扁平化（flatten）', expected_points: '递归或迭代;处理任意深度' },
  { position: 'frontend', category: 'algorithm', main_text: '实现深拷贝（deep clone）', expected_points: '递归处理对象/数组;处理循环引用;考虑Date/RegExp等' },

  // 后端 - 八股
  { position: 'backend', category: 'bagua', main_text: 'HTTP 状态码 200、301、404、500 分别代表什么？', expected_points: '200 OK;301 Moved Permanently;404 Not Found;500 Internal Server Error' },
  { position: 'backend', category: 'bagua', main_text: 'TCP 三次握手的过程？', expected_points: 'SYN/SYN-ACK/ACK;建立连接' },
  { position: 'backend', category: 'bagua', main_text: '数据库事务的 ACID 特性是什么？', expected_points: 'Atomicity/Consistency/Isolation/Durability' },
  { position: 'backend', category: 'bagua', main_text: 'Redis 常见数据结构及其使用场景？', expected_points: 'String/List/Set/ZSet/Hash;缓存/排行榜/限流等' },
  { position: 'backend', category: 'bagua', main_text: '分布式系统中 CAP 定理的含义及权衡？', expected_points: 'Consistency/Availability/Partition Tolerance;CP vs AP' },
  { position: 'backend', category: 'bagua', main_text: '微服务架构中的服务发现与负载均衡机制？', expected_points: '注册中心/健康检查/客户端负载均衡/服务端负载均衡' },

  // 后端 - 算法
  { position: 'backend', category: 'algorithm', main_text: '实现快速排序算法', expected_points: '分治;选取pivot;平均O(nlogn)' },
  { position: 'backend', category: 'algorithm', main_text: '两数之和（LeetCode 1），要求时间复杂度 O(n)', expected_points: '哈希表;一次遍历' },
  { position: 'backend', category: 'algorithm', main_text: '判断链表是否有环（Floyd 判圈算法）', expected_points: '快慢指针;相遇则有环' },
  { position: 'backend', category: 'algorithm', main_text: '实现 LRU 缓存（LeetCode 146）', expected_points: 'HashMap + 双向链表;O(1)读写' },

  // 算法 - 八股
  { position: 'algorithm', category: 'bagua', main_text: '梯度下降法的基本原理及常见变体？', expected_points: '一阶优化;SGD/Adam/Adagrad;学习率调度' },
  { position: 'algorithm', category: 'bagua', main_text: 'Transformer 架构中 Self-Attention 的计算过程？', expected_points: 'Q/K/V矩阵;Scaled Dot-Product;Multi-Head' },

  // 算法 - 算法
  { position: 'algorithm', category: 'algorithm', main_text: '实现二分查找并分析时间复杂度', expected_points: 'O(log n);边界条件处理;循环/递归' },
  { position: 'algorithm', category: 'algorithm', main_text: '最长公共子序列（LCS）的动态规划解法', expected_points: 'dp[i][j]定义;状态转移方程;O(mn)' },
  { position: 'algorithm', category: 'algorithm', main_text: '最小生成树（MST）的 Kruskal 和 Prim 算法？', expected_points: 'Kruskal(并查集+边排序);Prim(优先队列+顶点扩展)' },

  // 数据 - 八股
  { position: 'data', category: 'bagua', main_text: 'SQL 中 JOIN 的几种类型及区别？', expected_points: 'INNER/LEFT/RIGHT/FULL JOIN;NULL处理' },
  { position: 'data', category: 'bagua', main_text: '数据仓库与数据库的区别？', expected_points: 'OLTP vs OLAP;维度建模;ETL' },

  // AI - 八股
  { position: 'ai', category: 'bagua', main_text: '大模型微调（Fine-tuning）与提示工程（Prompt Engineering）的区别？', expected_points: '参数更新vs冻结参数;适用场景;成本差异' },
  { position: 'ai', category: 'bagua', main_text: 'RAG（检索增强生成）架构的核心组件？', expected_points: 'Embedding/向量数据库/检索器/生成器' },

  // 场景设计
  { position: 'backend', category: 'scene', main_text: '设计一个短链接服务，要求支持高并发和抗雪崩', expected_points: '哈希/自增ID;缓存;限流;数据库分片' },
  { position: 'frontend', category: 'scene', main_text: '设计一个实时协作编辑器（如 Google Docs 的简化版）', expected_points: 'OT/CRDT算法;WebSocket;冲突解决;版本管理' },
  { position: 'backend', category: 'scene', main_text: '设计一个即时消息系统，支持单聊和群聊', expected_points: '消息队列;消息存储;已读回执;离线推送' },
]

export const seedQuestions = (db: DatabaseSync): number => {
  const check = db.prepare("SELECT COUNT(*) as cnt FROM questions").get() as { cnt: number }
  if (check.cnt > 0) return 0

  const insert = db.prepare(
    'INSERT INTO questions (id, position, category, main_text, expected_points, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const now = Date.now()
  for (const q of SEED_DATA) {
    insert.run(randomUUID(), q.position, q.category, q.main_text, q.expected_points, now)
  }

  return SEED_DATA.length
}
