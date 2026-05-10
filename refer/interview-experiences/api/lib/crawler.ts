/**
 * 智能面经爬虫服务
 * 支持多平台：牛客网(nowcoder.com)、知乎(zhihu.com)、小红书(xiaohongshu.com)、V2EX(v2ex.com)
 */

import { getDb } from "../queries/connection";
import { interviews, tags, interviewTags, companies, crawlTasks } from "@db/schema";
import { eq } from "drizzle-orm";

export type Platform = "nowcoder" | "zhihu" | "xiaohongshu" | "v2ex" | "unknown";

export interface CrawlResult {
  success: boolean;
  title?: string;
  content?: string;
  platform: Platform;
  extractedCompany?: string;
  extractedPosition?: string;
  matchedCompanyId?: number;
  matchedTagIds?: number[];
  error?: string;
}

// 检测平台类型
export function detectPlatform(url: string): Platform {
  const lower = url.toLowerCase();
  if (lower.includes("nowcoder.com")) return "nowcoder";
  if (lower.includes("zhihu.com")) return "zhihu";
  if (lower.includes("xiaohongshu.com") || lower.includes("xhslink.com")) return "xiaohongshu";
  if (lower.includes("v2ex.com")) return "v2ex";
  return "unknown";
}

// 获取平台显示名称
export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    nowcoder: "牛客网",
    zhihu: "知乎",
    xiaohongshu: "小红书",
    v2ex: "V2EX",
    unknown: "未知平台",
  };
  return names[platform];
}

// 模拟不同平台的内容提取器
async function fetchPage(url: string): Promise<{ title: string; content: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return parseHtmlByPlatform(html, detectPlatform(url));
  } catch (err) {
    const error = err instanceof Error ? err.message : "网络请求失败";
    throw new Error(`抓取失败: ${error}`);
  }
}

// 根据平台解析HTML
function parseHtmlByPlatform(html: string, platform: Platform): { title: string; content: string } {
  // 去除script和style标签
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // 提取标题
  const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : "未命名面经";

  // 提取正文内容
  let content = "";

  switch (platform) {
    case "nowcoder": {
      // 牛客网面经正文通常在 .post-topic-des 或 .topic-richtext 中
      const ncMatch = cleanHtml.match(/<div[^>]*class=["'][^"']*(?:post-topic-des|topic-richtext|post_body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (ncMatch) {
        content = htmlToText(ncMatch[1]);
      }
      break;
    }
    case "zhihu": {
      // 知乎文章内容通常在 .RichText 或 .Post-RichTextContainer 中
      const zhMatch = cleanHtml.match(/<div[^>]*class=["'][^"']*(?:RichText|Post-RichTextContainer|ContentItem-richText)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (zhMatch) {
        content = htmlToText(zhMatch[1]);
      }
      break;
    }
    case "xiaohongshu": {
      // 小红书笔记内容
      const xhsMatch = cleanHtml.match(/<div[^>]*class=["'][^"']*(?:desc|content|note-text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (xhsMatch) {
        content = htmlToText(xhsMatch[1]);
      }
      break;
    }
    case "v2ex": {
      // V2EX 帖子内容
      const v2Match = cleanHtml.match(/<div[^>]*class=["'][^"']*(?:topic_content|cell)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (v2Match) {
        content = htmlToText(v2Match[1]);
      }
      break;
    }
    default: {
      // 通用策略：尝试提取article或main中的内容
      const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (articleMatch) {
        content = htmlToText(articleMatch[1]);
      } else if (mainMatch) {
        content = htmlToText(mainMatch[1]);
      }
    }
  }

  // 如果内容为空，尝试通用正文提取
  if (!content || content.length < 50) {
    // 尝试提取所有段落文本
    const paragraphs = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs) {
      content = paragraphs.map((p) => htmlToText(p)).join("\n\n");
    }
  }

  // 最后的fallback
  if (!content || content.length < 50) {
    // 提取body中所有可见文本
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = htmlToText(bodyMatch[1]).slice(0, 8000);
    }
  }

  // 清理标题
  title = title.replace(/\s*-\s*.*$/, "").replace(/\s*\|.*$/, "").trim();
  if (title.length > 100) title = title.slice(0, 100);

  return { title, content };
}

// HTML转纯文本
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#[0-9]+;/g, (m) => {
      const code = parseInt(m.replace(/&#|;/g, ""), 10);
      return String.fromCharCode(code);
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 从文本中提取公司名
async function extractCompany(text: string): Promise<{ name: string; companyId?: number }> {
  const db = getDb();
  const allCompanies = await db.select().from(companies);

  // 按名称长度降序排列，优先匹配较长的名称
  const sorted = allCompanies.sort((a, b) => b.name.length - a.name.length);

  for (const company of sorted) {
    if (text.includes(company.name)) {
      return { name: company.name, companyId: company.id };
    }
  }

  // 尝试匹配常见公司别名
  const aliases: Record<string, string> = {
    "字节": "字节跳动",
    "bytedance": "字节跳动",
    "鹅厂": "腾讯",
    "tencent": "腾讯",
    "阿里": "阿里巴巴",
    "alibaba": "阿里巴巴",
    "alipay": "阿里巴巴",
    "美团": "美团",
    "meituan": "美团",
    "百度": "百度",
    "baidu": "百度",
    "华为": "华为",
    "huawei": "华为",
    "小米": "小米",
    "xiaomi": "小米",
    "京东": "京东",
    "jd.com": "京东",
  };

  for (const [alias, fullName] of Object.entries(aliases)) {
    if (text.includes(alias)) {
      const matched = allCompanies.find((c) => c.name === fullName);
      return { name: fullName, companyId: matched?.id };
    }
  }

  return { name: "" };
}

// 从文本中提取岗位
function extractPosition(text: string): string | undefined {
  // 匹配常见岗位模式
  const patterns = [
    /(前端|后端|客户端|算法|测试|运维|产品|运营|数据分析)\s*(开发|工程师|实习|校招|社招)/,
    /(Java|Go|Python|C\+\+|PHP|Rust)\s*(开发|后端|工程师|实习)/i,
    /(后端|前端|全栈|算法|架构师|测试)\s*(开发工程师|工程师|开发)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return undefined;
}

// 从文本中匹配标签
async function extractTags(text: string): Promise<{ matched: number[]; extracted: string[] }> {
  const db = getDb();
  const allTags = await db.select().from(tags);
  const matched: number[] = [];
  const extracted: string[] = [];

  for (const tag of allTags) {
    if (text.includes(tag.name)) {
      matched.push(tag.id);
      extracted.push(tag.name);
    }
  }

  return { matched, extracted };
}

// 主爬虫入口
export async function crawlInterview(url: string, taskId?: number): Promise<CrawlResult> {
  const platform = detectPlatform(url);

  // 更新任务状态为运行中
  if (taskId) {
    const db = getDb();
    await db.update(crawlTasks)
      .set({ status: "running", platform })
      .where(eq(crawlTasks.id, taskId));
  }

  try {
    // Step 1: 抓取页面
    const { title, content } = await fetchPage(url);

    if (!content || content.length < 50) {
      throw new Error("未能提取到有效内容，可能是网页需要登录或存在反爬机制");
    }

    // Step 2: 提取公司
    const companyInfo = await extractCompany(content);

    // Step 3: 提取岗位
    const position = extractPosition(content);

    // Step 4: 提取标签
    const tagInfo = await extractTags(content);

    // Step 5: 更新任务状态
    if (taskId) {
      const db = getDb();
      await db.update(crawlTasks)
        .set({
          status: "completed",
          title,
          content,
          extractedCompany: companyInfo.name || null,
          extractedPosition: position || null,
          extractedTags: tagInfo.extracted.join(",") || null,
        })
        .where(eq(crawlTasks.id, taskId));
    }

    return {
      success: true,
      title,
      content,
      platform,
      extractedCompany: companyInfo.name,
      extractedPosition: position,
      matchedCompanyId: companyInfo.companyId,
      matchedTagIds: tagInfo.matched,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "未知错误";

    if (taskId) {
      const db = getDb();
      await db.update(crawlTasks)
        .set({ status: "failed", errorMessage })
        .where(eq(crawlTasks.id, taskId));
    }

    return {
      success: false,
      platform,
      error: errorMessage,
    };
  }
}

// 创建爬虫任务
export async function createCrawlTask(url: string): Promise<number> {
  const db = getDb();
  const platform = detectPlatform(url);
  const [result] = await db.insert(crawlTasks).values({
    sourceUrl: url,
    platform,
    status: "pending",
  });
  return result.insertId;
}

// 将爬虫结果保存为面试经历
export async function saveCrawlResult(
  taskId: number,
  overrides: {
    companyId: number;
    title: string;
    content: string;
    position?: string;
    result?: "passed" | "failed" | "pending" | "ghosted";
    difficulty?: number;
    tagIds?: number[];
  }
): Promise<number> {
  const db = getDb();

  // 创建面试经历
  const [interviewResult] = await db.insert(interviews).values({
    companyId: overrides.companyId,
    title: overrides.title,
    content: overrides.content,
    position: overrides.position || null,
    result: overrides.result || "pending",
    difficulty: overrides.difficulty || 3,
  });

  const interviewId = interviewResult.insertId;

  // 关联标签
  if (overrides.tagIds && overrides.tagIds.length > 0) {
    await db.insert(interviewTags).values(
      overrides.tagIds.map((tagId) => ({ interviewId, tagId }))
    );
  }

  // 更新爬虫任务
  await db.update(crawlTasks)
    .set({ interviewId, status: "completed" })
    .where(eq(crawlTasks.id, taskId));

  return interviewId;
}
