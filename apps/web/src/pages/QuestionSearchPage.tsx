import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, BookOpen, Loader2, X, Lightbulb } from 'lucide-react'

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
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [q, setQ] = useState(initialQ)
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
    if (initialQ.trim()) {
      doSearch(initialQ, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/explore" className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">题库搜索</h1>
          <p className="text-sm text-slate-500 mt-0.5">搜索面试题及参考答案</p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="输入关键词搜索面试题，如：TCP、Redis、分布式..."
              className="input-field w-full pl-11 pr-10 py-3.5 text-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(''); inputRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="btn-primary px-5"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : '搜索'}
          </button>
        </div>
      </form>

      {/* Results Summary */}
      {searched && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            共找到 <span className="text-slate-300 font-medium">{total}</span> 条结果
            {total > 0 && (
              <span>
                ，第 <span className="text-slate-300 font-medium">{page}</span> / {totalPages} 页
              </span>
            )}
          </p>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {results.map((item) => {
          const isExpanded = expandedId === item.id
          return (
            <div
              key={item.id}
              className={`card overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-emerald-500/20' : ''}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isExpanded ? 'bg-emerald-500/15' : 'bg-slate-800/60'
                }`}>
                  <BookOpen size={16} className={isExpanded ? 'text-emerald-400' : 'text-slate-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium transition-colors ${isExpanded ? 'text-emerald-100' : 'text-slate-200'}`}>
                    {item.question}
                  </p>
                  {!isExpanded && (
                    <p className="text-xs text-slate-600 mt-1 truncate">{item.answer}</p>
                  )}
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4">
                  <div className="pl-11">
                    <div className="border-l-2 border-emerald-800/40 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={12} className="text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">参考答案</span>
                        {item.source && (
                          <span className="text-[10px] text-slate-600">来源：{item.source}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {searched && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => doSearch(q, page - 1)}
            disabled={page <= 1 || loading}
            className="btn-secondary p-2 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => doSearch(q, p)}
                disabled={loading}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => doSearch(q, page + 1)}
            disabled={page >= totalPages || loading}
            className="btn-secondary p-2 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Empty State */}
      {searched && results.length === 0 && !loading && (
        <div className="text-center py-16 card border-dashed">
          <Search size={28} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500">未找到相关题目</p>
          <p className="text-sm text-slate-600 mt-1">尝试换一组关键词</p>
        </div>
      )}
    </div>
  )
}
