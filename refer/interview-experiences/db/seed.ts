import { getDb } from "../api/queries/connection";
import { companies, tags, interviews, interviewTags } from "./schema";

async function seed() {
  const db = getDb();

  // Seed companies
  const companyData = [
    { name: "字节跳动", industry: "互联网", color: "#00C9A7", description: "字节跳动是全球领先的移动互联网公司" },
    { name: "腾讯", industry: "互联网", color: "#0052D9", description: "腾讯是中国领先的互联网增值服务提供商" },
    { name: "阿里巴巴", industry: "电商/云计算", color: "#FF6A00", description: "阿里巴巴是全球领先的电子商务公司" },
    { name: "美团", industry: "本地生活", color: "#FFD100", description: "美团是中国领先的生活服务电商平台" },
    { name: "百度", industry: "AI/搜索", color: "#2932E1", description: "百度是全球最大的中文搜索引擎" },
    { name: "华为", industry: "通信/硬件", color: "#CF0A2C", description: "华为是全球领先的信息与通信技术解决方案供应商" },
    { name: "小米", industry: "智能硬件", color: "#FF6900", description: "小米是一家以手机、智能硬件和IoT平台为核心的互联网公司" },
    { name: "京东", industry: "电商", color: "#E4393C", description: "京东是中国领先的自营式电商企业" },
  ];

  for (const company of companyData) {
    await db.insert(companies).values(company);
  }
  console.log("Seeded companies");

  // Seed tags
  const tagData = [
    { name: "算法", color: "#EF4444", category: "tech" as const },
    { name: "数据结构", color: "#F97316", category: "tech" as const },
    { name: "系统设计", color: "#EAB308", category: "tech" as const },
    { name: "Redis", color: "#DC2626", category: "tech" as const },
    { name: "MySQL", color: "#3B82F6", category: "tech" as const },
    { name: "Kafka", color: "#6366F1", category: "tech" as const },
    { name: "微服务", color: "#8B5CF6", category: "tech" as const },
    { name: "Docker", color: "#0EA5E9", category: "tech" as const },
    { name: "Kubernetes", color: "#06B6D4", category: "tech" as const },
    { name: "Go", color: "#00ADD8", category: "tech" as const },
    { name: "Java", color: "#F89820", category: "tech" as const },
    { name: "Python", color: "#3776AB", category: "tech" as const },
    { name: "React", color: "#61DAFB", category: "tech" as const },
    { name: "Vue", color: "#4FC08D", category: "tech" as const },
    { name: "HR面", color: "#EC4899", category: "process" as const },
    { name: "技术面", color: "#F43F5E", category: "process" as const },
    { name: "一面", color: "#D946EF", category: "process" as const },
    { name: "二面", color: "#A855F7", category: "process" as const },
    { name: "三面", color: "#8B5CF6", category: "process" as const },
    { name: "后端开发", color: "#14B8A6", category: "role" as const },
    { name: "前端开发", color: "#22C55E", category: "role" as const },
    { name: "全栈开发", color: "#10B981", category: "role" as const },
    { name: "架构师", color: "#84CC16", category: "role" as const },
    { name: "实习生", color: "#A3E635", category: "role" as const },
  ];

  for (const tag of tagData) {
    await db.insert(tags).values(tag);
  }
  console.log("Seeded tags");

  // Seed sample interviews
  const interviewData = [
    {
      companyId: 1,
      title: "字节跳动后端开发一面面经",
      content: "一面主要问了算法和数据结构。\n\n1. 自我介绍\n2. 项目经历深挖，问了分布式锁的实现\n3. 算法题：LeetCode 3 无重复字符的最长子串\n4. MySQL索引原理，B+树结构\n5. Redis持久化机制 RDB和AOF\n6. 反问环节\n\n整体体验不错，面试官很友好，会引导思路。算法题要求手写代码并分析时间复杂度。",
      sourceUrl: "https://www.nowcoder.com/discuss/1234567",
      position: "后端开发工程师",
      result: "passed" as const,
      difficulty: 3,
    },
    {
      companyId: 2,
      title: "腾讯WXG前端三面面经",
      content: "WXG前端岗位，总共三轮技术面+一轮HR面。\n\n一面（1h）：\n- 自我介绍\n- Vue3 响应式原理，Proxy vs defineProperty\n- 浏览器事件循环，宏任务微任务\n- 手写Promise.all\n- CSS盒模型、BFC\n- 算法：二叉树层序遍历\n\n二面（1h）：\n- 项目架构设计\n- 微前端方案对比\n- Webpack优化手段\n- 手写防抖节流\n- 系统设计：设计一个类似微信的聊天消息列表\n\n三面（45min）：\n- 总监面，聊职业规划\n- 技术视野，对前端发展趋势的看法\n- 为什么选腾讯\n\nHR面：\n- 期望薪资\n- 到岗时间\n- 其他offer情况",
      sourceUrl: "https://www.zhihu.com/question/4567890",
      position: "前端开发工程师",
      result: "passed" as const,
      difficulty: 4,
    },
    {
      companyId: 3,
      title: "阿里巴巴Java后端实习面经",
      content: "阿里暑期实习，Java后端方向。\n\n一面（电话面 40min）：\n- 自我介绍\n- Java基础：HashMap原理、ConcurrentHashMap\n- JVM内存模型、垃圾回收算法\n- Spring IOC和AOP原理\n- 数据库：索引优化、事务隔离级别\n- 算法：两数之和、快排\n\n二面（视频面 1h）：\n- 项目介绍\n- Redis使用场景、缓存穿透/击穿/雪崩\n- 消息队列：Kafka架构、如何保证消息不丢失\n- 分布式事务解决方案\n- 算法：LRU缓存实现\n\n三面（主管面 30min）：\n- 聊聊在学校做的项目\n- 技术选型思路\n- 反问\n\n最终拿到了offer，整体流程大概两周。",
      sourceUrl: "https://www.xiaohongshu.com/explore/abc123",
      position: "Java开发工程师（实习）",
      result: "passed" as const,
      difficulty: 4,
    },
    {
      companyId: 1,
      title: "字节跳动算法岗面经分享",
      content: "投递的是字节跳动推荐算法岗位。\n\n一面：\n- 深度学习基础：CNN、RNN、Transformer原理\n- 推荐系统：协同过滤、召回排序流程\n- 算法题：最长递增子序列\n- 机器学习：过拟合处理方法、特征工程\n\n二面：\n- 项目深挖，问了很多细节\n- 推荐系统冷启动方案\n- A/B测试设计\n- 算法题：编辑距离\n\n三面：\n- 开放性问题：如何设计抖音的推荐系统\n- 职业规划\n\n难度偏高，算法题都是medium以上难度。",
      sourceUrl: "https://www.nowcoder.com/discuss/7654321",
      position: "算法工程师",
      result: "pending" as const,
      difficulty: 5,
    },
    {
      companyId: 5,
      title: "百度Go后端面经",
      content: "百度Go后端开发岗位面经。\n\n一面：\n- Go语言特性：Goroutine、Channel、GC机制\n- Go内存模型\n- 项目介绍\n- 算法：合并K个有序链表\n\n二面：\n- 微服务架构设计\n- gRPC vs RESTful\n- 分布式锁实现\n- 数据库分库分表方案\n- 算法：最小栈\n\n整体难度适中，面试官比较看重工程实践能力。",
      sourceUrl: "https://www.nowcoder.com/discuss/9876543",
      position: "Go后端开发工程师",
      result: "passed" as const,
      difficulty: 3,
    },
    {
      companyId: 4,
      title: "美团后端开发一面凉经",
      content: "美团到店事业群后端开发。\n\n一面：\n- 自我介绍\n- 项目经历（问了20多分钟）\n- MySQL：索引优化、慢查询分析\n- Redis：数据类型、使用场景\n- Kafka：消费者组、分区策略\n- 算法题：滑动窗口最大值（没写出来）\n\n反思：算法准备不足，需要加强刷题。项目介绍不够清晰，没有突出技术难点。",
      sourceUrl: "https://www.nowcoder.com/discuss/1357924",
      position: "后端开发工程师",
      result: "failed" as const,
      difficulty: 4,
    },
    {
      companyId: 6,
      title: "华为软件开发工程师面经",
      content: "华为校招软件开发岗位。\n\n一面（技术面）：\n- C/C++基础：指针、引用、虚函数\n- 操作系统：进程线程、内存管理、死锁\n- 计算机网络：TCP三次握手、HTTP状态码\n- 手撕代码：字符串反转\n\n二面（主管面）：\n- 项目介绍\n- 聊技术兴趣方向\n- 对华为的了解\n- 是否接受外派\n\n流程很快，一周内出结果。华为比较看重综合能力和学习意愿。",
      sourceUrl: "https://www.zhihu.com/question/9876543",
      position: "软件开发工程师",
      result: "passed" as const,
      difficulty: 2,
    },
    {
      companyId: 2,
      title: "腾讯IEG游戏客户端面经",
      content: "腾讯IEG游戏客户端开发岗位。\n\n一面：\n- C++基础：STL容器、智能指针\n- 图形学基础：渲染管线、坐标变换\n- 游戏开发经验\n- 算法：数组中第K大元素\n\n二面：\n- Unity/Unreal引擎使用经验\n- 游戏性能优化\n- 网络同步方案\n- 算法：接雨水\n\n三面（HR面）：\n- 为什么选择游戏开发\n- 对腾讯游戏的了解\n- 薪资期望",
      sourceUrl: "https://www.nowcoder.com/discuss/2468135",
      position: "游戏客户端开发工程师",
      result: "ghosted" as const,
      difficulty: 4,
    },
  ];

  for (const interview of interviewData) {
    const [result] = await db.insert(interviews).values({
      ...interview,
      interviewDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      views: Math.floor(Math.random() * 500) + 50,
    });
    const interviewId = result.insertId;

    // Assign random tags
    const tagIds = [1, 2, 3, 4, 5, 6, 7, 10, 11, 15, 16, 17, 18, 20, 21];
    const numTags = Math.floor(Math.random() * 4) + 2;
    const selectedTags = tagIds.sort(() => Math.random() - 0.5).slice(0, numTags);

    for (const tagId of selectedTags) {
      await db.insert(interviewTags).values({ interviewId, tagId });
    }
  }
  console.log("Seeded interviews with tags");
}

seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
