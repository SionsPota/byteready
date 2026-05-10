import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from './llm/kimi.ts'

const RESUME_CLEAN_PROMPT = `你是一位专业的简历文本清洗与格式化专家。你的任务是将从 PDF 提取的原始、混乱的简历文本，清洗成结构清晰、格式规范、易于阅读的标准 Markdown 文本。

## 原始文本存在的问题
1. **多余空格**：PDF 提取会在中文字符之间插入不必要的空格，如"北 京 ⼤ 学"应恢复为"北京大学"
2. **CJK 变体字符**：PDF 内嵌字体使用了 Unicode CJK 兼容区变体字符，如"⼤"(U+2F4F)应转为标准汉字"大"(U+5927)，"⼈"应转为"人"等
3. **换行混乱**：行尾被强制截断，导致一句话被拆成多行，需要合并为自然段落
4. **图标/符号污染**：PDF 中的图标符号（如、、、· 等装饰性符号）应移除或替换为合适的 Markdown 列表标记

## 处理要求
1. **移除所有多余空格**：中文字符之间不应有空格，英文单词之间保留正常空格，标点符号紧贴前一个字
2. **规范化变体字符**：将所有 CJK 兼容变体字符转换为标准 Unicode 汉字
3. **修复段落连贯性**：将因排版截断的句子合并为自然段落，按语义分段
4. **保留结构信息**：识别并保留以下区块，用 ## 二级标题标注：
   - 基本信息（姓名、学校、专业、学历、联系方式、邮箱、电话）
   - 教育经历
   - 技能特长
   - 个人简介 / 自我评价
   - 实习/工作经历
   - 项目经历
   - 研究经历
5. **列表处理**：技能条目、经历要点使用 Markdown 无序列表（- 或 *）
6. **日期格式统一**：日期保持原文格式，但确保完整清晰

## 输出格式
使用标准 Markdown 格式输出，结构如下：

# 姓名

## 基本信息
（学校、专业、学历、联系方式等）

## 教育经历

## 技能特长

## 个人简介

## 实习/工作经历

## 项目经历

## 研究经历

## 输出要求
- 只输出清洗后的简历 Markdown 内容，不要添加任何额外解释、评价或总结
- 不要编造或添加原文中没有的信息
- 保持原有信息的完整性和准确性，不遗漏任何经历、项目或技能
- 如果某个区块在原文中不存在，则省略该区块的标题`

export async function optimizeResumeText(rawText: string): Promise<string> {
  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: RESUME_CLEAN_PROMPT },
      { role: 'user', content: rawText },
    ],
    temperature: 0.1,
    ...KIMI_INSTANT_MODE,
  })
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Kimi 返回空内容')
  }
  return content
}
