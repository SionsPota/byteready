import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, BookOpen, Loader2 } from 'lucide-react'

interface QaItem {
  id: number
  question: string
  answer: string
  source: string | null
}

interface SearchResponse {
  success: boolean
  data: QaItem[]
  meta?: { total: number; page: number; limit: number }
}

export function QuestionSearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<QaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const limit = 20

  const doSearch = useCallback(
    async (query: string, targetPage: number) => {
      if (!query.trim()) return
      setLoading(true)
      try {
        const res = await fetch(
          `/api/questions/search?q=${encodeURIComponent(query)}&page=${targetPage}&limit=${limit}`,
          { credentials: 'include' },
        )
        const json = (await res.json()) as SearchResponse
        if (json.success) {
          setResults(json.data)
          setTotal(json.meta?.total ?? 0)
          setPage(targetPage)
          setSearched(true)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(q, 1)
  }

  const totalPages = Math.ceil(total / limit)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/explore" className="text-slate-500 hover:text-slate-300">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">题库搜索</h1>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="输入关键词搜索面试题，如：TCP、Redis、分布式..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : '搜索'}
          </button>
        </div>
      </form>

      {searched && (
        <div className="mb-4 text-sm text-slate-500">
          共找到 <span className="text-slate-300">{total}</span> 条结果
          {total > 0 && (
            <span>
              ，第 <span className="text-slate-300">{page}</span> / {totalPages} 页
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {results.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/50 transition-colors"
            >
              <BookOpen size={16} className="text-emerald-400 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200">{item.question}</p>
                {expandedId !== item.id && (
                  <p className="text-xs text-slate-600 mt-1 truncate">{item.answer}</p>
                )}
              </div>
            </button>
            {expandedId === item.id && (
              <div className="px-4 pb-4 pt-0">
                <div className="pl-7 border-l-2 border-slate-700 ml-3">
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {item.answer}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {searched && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => doSearch(q, page - 1)}
            disabled={page <= 1 || loading}
            className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-500 px-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => doSearch(q, page + 1)}
            disabled={page >= totalPages || loading}
            className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-slate-500">未找到相关题目</p>
          <p className="text-sm text-slate-600 mt-1">尝试换一组关键词</p>
        </div>
      )}
    </div>
  )
}
