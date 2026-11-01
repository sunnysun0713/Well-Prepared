# -*- coding: utf-8 -*-
"""生成作品设计方案 Word 文档(docs/作品设计方案.docx)。

改内容后重跑:python -I tools/make_docx.py
依赖:python-docx>=1.0(本机已装 1.2.0)
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INDIGO = RGBColor(0x4F, 0x46, 0xE5)
DARK = RGBColor(0x1F, 0x29, 0x37)
GRAY = RGBColor(0x6B, 0x72, 0x80)
RED = RGBColor(0xC7, 0x00, 0x0B)
BODY = '微软雅黑'
MONO = 'Consolas'

doc = Document()

# 页面:A4,常规页边距
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(2.4)
sec.top_margin = sec.bottom_margin = Cm(2.2)

# 样式
def style_font(style, name, size, color=None, bold=False):
    style.font.name = name
    style.font.size = Pt(size)
    style.font.bold = bold
    if color is not None:
        style.font.color.rgb = color
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn('w:rFonts'))
    if rfonts is None:
        rfonts = OxmlElement('w:rFonts')
        rpr.append(rfonts)
    rfonts.set(qn('w:eastAsia'), name)

normal = doc.styles['Normal']
style_font(normal, BODY, 10.5)
normal.paragraph_format.line_spacing = 1.32
normal.paragraph_format.space_after = Pt(4)

h1 = doc.styles['Heading 1']
style_font(h1, BODY, 15, INDIGO, True)
h1.paragraph_format.space_before = Pt(16)
h1.paragraph_format.space_after = Pt(8)

h2 = doc.styles['Heading 2']
style_font(h2, BODY, 12, DARK, True)
h2.paragraph_format.space_before = Pt(10)
h2.paragraph_format.space_after = Pt(5)

def para(text='', bold=False, color=DARK, size=10.5, align=None, style=None,
         space_after=None, mono=False, rich=None):
    """rich=[(文字, 是否加粗), ...] 时按片段渲染,忽略 text/bold"""
    p = doc.add_paragraph(style=style)
    if align is not None:
        p.alignment = align
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    segments = rich if rich is not None else ([(text, bold)] if text else [])
    for seg_text, seg_bold in segments:
        r = p.add_run(seg_text)
        r.font.name = MONO if mono else BODY
        r.font.size = Pt(size)
        r.font.bold = seg_bold
        r.font.color.rgb = color
        rpr = r._r.get_or_add_rPr()
        rfonts = rpr.find(qn('w:rFonts'))
        if rfonts is None:
            rfonts = OxmlElement('w:rFonts')
            rpr.append(rfonts)
        rfonts.set(qn('w:eastAsia'), BODY)
    return p

def bullet(text, bold_head=None):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.3
    p.paragraph_format.space_after = Pt(3)
    if bold_head:
        r = p.add_run('· ' + bold_head)
        r.font.name = BODY
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = DARK
        rpr = r._r.get_or_add_rPr()
        rf = rpr.find(qn('w:rFonts'))
        if rf is None:
            rf = OxmlElement('w:rFonts')
            rpr.append(rf)
        rf.set(qn('w:eastAsia'), BODY)
    r = p.add_run(('· ' if not bold_head else '') + text)
    r.font.name = BODY
    r.font.size = Pt(10.5)
    r.font.color.rgb = DARK
    rpr = r._r.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rpr.append(rf)
    rf.set(qn('w:eastAsia'), BODY)
    return p

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), hexcolor)
    tcPr.append(shd)

def table(rows, widths=None, header_fill='4F46E5', size=9.5):
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = 'Table Grid'
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = t.cell(ri, ci)
            cell.text = ''
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.name = BODY
            r.font.size = Pt(size)
            r.font.bold = ri == 0
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if ri == 0 else DARK
            rpr = r._r.get_or_add_rPr()
            rf = rpr.find(qn('w:rFonts'))
            if rf is None:
                rf = OxmlElement('w:rFonts')
                rpr.append(rf)
            rf.set(qn('w:eastAsia'), BODY)
            if ri == 0:
                shade(cell, header_fill)
    if widths:
        for ci, w in enumerate(widths):
            for ri in range(len(rows)):
                t.cell(ri, ci).width = Cm(w)
    para('', space_after=2)
    return t

def mono_block(lines, size=8):
    t = doc.add_table(rows=1, cols=1)
    t.style = 'Table Grid'
    cell = t.cell(0, 0)
    shade(cell, 'F5F7FA')
    cell.text = ''
    for i, line in enumerate(lines):
        p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line)
        r.font.name = MONO
        r.font.size = Pt(size)
        r.font.color.rgb = DARK
    para('', space_after=2)

# ================= 封面 =================
para('', space_after=60)
para('NeZha · 拍照成任务', bold=True, color=INDIGO, size=26,
     align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
para('作品设计方案', bold=True, color=DARK, size=18, align=WD_ALIGN_PARAGRAPH.CENTER,
     space_after=24)
para('第十一届华为 ICT 大赛 · 创新赛 · 赛题一:基于华为云产品打造 AI 创新应用',
     color=GRAY, size=12, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=48)
para('参赛队伍:___________', align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
para('学校:___________        指导教师:___________', align=WD_ALIGN_PARAGRAPH.CENTER,
     space_after=4)
para('成员:___________ · ___________ · ___________', align=WD_ALIGN_PARAGRAPH.CENTER,
     space_after=4)
para('2026 年 11 月', color=GRAY, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
doc.add_page_break()

# ================= 一、作品概述 =================
doc.add_heading('一、作品概述', level=1)
para(rich=[('NeZha 任务管理', True), ('是一款「拍照成任务」的 AI 任务管理应用:用户拍摄课程表、值班表、通知单或手写清单,视觉大模型自动识别其中的任务、日期与时间,智能归一化后一键导入,并按设定自动安排闹钟与短信双通道提醒;任务数据通过匿名设备同步服务在云端持久化,换机不丢数据。', False)])
para(rich=[('作品从', False), ('开发工具', True), ('(码道 CodeArts)到 ', False), ('AI 推理', True),
           ('(ModelArts Studio/MaaS)、', False), ('存储', True), ('(RDS for MySQL)、', False),
           ('缓存', True), ('(DCS for Redis)、', False), ('部署', True),
           ('(ECS),全链路使用华为云产品,完整对应赛题一的各项硬性要求。', False)])

# ================= 二、选题背景与痛点 =================
doc.add_heading('二、选题背景与痛点', level=1)
table([
    ('#', '痛点', '现状'),
    ('1', '纸质/图片信息录入繁琐', '课表、值班表、活动通知散落在微信群与照片里,手动录入清单 App 费时且易错'),
    ('2', '提醒方式单一', '常见清单 App 只有一种提醒,开会、上课、打卡等场景容易漏看'),
    ('3', '跨设备同步有摩擦', '换机/多设备使用时,传统同步方案多要求注册登录,门槛高'),
    ('4', 'AI 能力多为噱头', '市面「AI 清单」多停留在对话生成,缺少对拍照识别、时间归一化等真实痛点的工程化打磨'),
], widths=[1.0, 3.6, 11.6])
para(rich=[('选题价值:', True), ('以真实高频场景(学生课表、职场通知)切入,把大模型视觉能力落到「识别 → 结构化 → 提醒 → 同步」的完整闭环,而非单点 Demo。', False)])

# ================= 三、产品定位 =================
doc.add_heading('三、产品定位', level=1)
bullet('拍一张照片,任务自动排好、自动提醒、自动上云。', bold_head='一句话定位:')
bullet('学生(课表/作业/活动)、办公人群(会议/值班/通知)、家庭(清单/缴费单)。', bold_head='目标用户:')
bullet('安卓移动应用(APK 可直接运行于安卓与鸿蒙 4.x 及以下系统;鸿蒙 NEXT 适配为后续规划),Expo 跨平台技术栈,可扩展 Web 演示版。', bold_head='形态:')

# ================= 四、核心功能设计 =================
doc.add_heading('四、核心功能设计', level=1)
doc.add_heading('4.1 每日任务', level=2)
bullet('秒级实时时钟;左右滑动 / 箭头切换日期;')
bullet('今日紧急任务(收藏)顶部提示条;右下角 FAB 快速新增;')
bullet('任务按起始时间自动排序。')

doc.add_heading('4.2 任务卡片与双通道提醒', level=2)
bullet('任务要素:名称、备注、起止时间、闹钟提醒、短信提醒;')
bullet('闹钟与短信相互独立的提前分钟数与铃声,适配不同场景(上课闹钟、会议短信);')
bullet('说明:「短信提醒」为本地通知形式的短信式提示(应用内命名),不依赖运营商短信通道,离线可用;')
bullet('编辑即重排提醒、删除即取消提醒,避免「幽灵通知」;')
bullet('Android 13+ 精确闹钟权限适配(SCHEDULE_EXACT_ALARM / alarmClock),保证按时送达。')

doc.add_heading('4.3 日历', level=2)
bullet('年 / 月滚轮选月,点选日期查看当日任务;')
bullet('日期面板内直接新增与编辑,月历任务点着色(收藏加深描边)。')

doc.add_heading('4.4 任务载入(核心 AI 链路)', level=2)
bullet('手机相册或现场拍摄课程表、通知单、手写清单;', bold_head='拍照 / 选图:')
bullet('图片 + 可自定义提取模板 Prompt → 结构化任务条目;', bold_head='视觉大模型提取:')
bullet('相对时间表达:「明天」「下午 3 点」「下周三」→ 绝对日期与 HH:mm;缺年份日期顺延:识别结果落在过去时自动顺延一年,与「星期 X」逻辑一致;缺时间自动跳过时间字段,不编造;', bold_head='智能归一化(工程重点):')
bullet('两种导入模式;确认模式下逐条勾选、字段可改;', bold_head='自动导入 / 手动确认:')
bullet('按预设自动为导入任务挂载闹钟 / 短信提醒。', bold_head='导入即规划提醒:')

doc.add_heading('4.5 多 AI 服务可切换', level=2)
bullet('统一 OpenAI 兼容适配层,内置:华为云 MaaS(主推)、DeepSeek、通义千问 Qwen-VL、智谱 GLM-4V,以及本地 Mock(离线可完整演示流程);')
bullet('API Key 由用户本机填写、仅存本机,服务端零密钥。')

doc.add_heading('4.6 云同步', level=2)
bullet('首次启动自动生成,无需注册登录,零摩擦;', bold_head='匿名设备 ID:')
bullet('全量状态 + 毫秒时间戳,服务端仅在「较新」时覆盖,离线设备回连不会用旧数据覆盖新数据;', bold_head='冲突策略:')
bullet('本地持久化,断网静默降级为纯本地;恢复后自动按时间戳合并;', bold_head='离线优先:')
bullet('读取先走 Redis 缓存,未命中回源 RDS。', bold_head='缓存加速:')

# ================= 五、技术架构 =================
doc.add_heading('五、技术架构', level=1)
mono_block([
    '┌─────────────────────────────┐        ┌──────────────────────────────┐',
    '│  NeZha App(Expo SDK 58)     │        │  华为云 ModelArts Studio     │',
    '│  · 每日任务 / 日历 / 任务载入 │ 图片+  │  (MaaS 视觉大模型,昇腾推理)  │',
    '│  · 本地通知(闹钟+短信)      │ Prompt│  OpenAI 兼容接口              │',
    '│  · AsyncStorage 本地持久化   │──────▶│                              │',
    '│  · AI 服务适配层(多供应商)   │◀──────│  结构化任务 JSON              │',
    '└──────────────┬──────────────┘        └──────────────────────────────┘',
    '               │ HTTP PUT/GET(匿名设备 ID + 时间戳)',
    '               ▼',
    '┌───────────────────────────────────────────────────────────────┐',
    '│  华为云 ECS · Express 同步服务(server/)                        │',
    '│  · /sync/:deviceId 全量状态上传 / 拉取                          │',
    '│  · /health 健康检查(RDS + Redis 连通状态)                      │',
    '└──────────┬───────────────────────────────┬────────────────────┘',
    '           ▼ 读写                          ▼ 缓存(TTL 1h)',
    '┌────────────────────────┐      ┌───────────────────────────────┐',
    '│  华为云 RDS for MySQL   │      │  华为云 DCS for Redis          │',
    '│  task_states:device_id │      │  sync:state:<deviceId>         │',
    '│  + state JSON + 时间戳  │      │                                │',
    '└────────────────────────┘      └───────────────────────────────┘',
])
bullet('客户端:Expo SDK 58 / React Native 0.88 / expo-router / TypeScript strict,模块化架构(每日任务、日历、任务载入三模块互不依赖);')
bullet('后端:Node.js + Express,严格类型,`docker-compose` 本地一键联调(与华为云 RDS/DCS 同构);')
bullet('开发工具:华为云码道 CodeArts 代码智能体(IDE 插件 / CLI),规范驱动开发。')

# ================= 六、华为云产品使用明细 =================
doc.add_heading('六、华为云产品使用明细', level=1)
table([
    ('华为云产品', '用途', '说明'),
    ('码道 CodeArts 代码智能体', '开发工具', '代码生成、审查、调试与 Skills 执行,全流程留证'),
    ('ModelArts Studio(MaaS)', 'AI 视觉提取', 'OpenAI 兼容接口调用视觉大模型(昇腾 NPU 推理),照片 → 结构化任务'),
    ('RDS for MySQL', '任务状态持久化', 'task_states 表存设备全量任务状态(JSON 列 + 时间戳索引)'),
    ('DCS for Redis', '同步读取缓存', '热数据缓存 1h TTL,降低 RDS 读压力,加速多端拉取'),
    ('ECS 弹性云服务器', '后端部署', 'Express 同步服务,与 RDS/DCS 同 VPC 内网直连'),
], widths=[4.6, 3.2, 8.4])

# ================= 七、创新点分析 =================
doc.add_heading('七、创新点分析(对应创新性评分)', level=1)
innovations = [
    ('「拍照成任务」端到端闭环', '市面上 AI 清单多止步于对话式生成,本作品打通「图像 → 大模型 → 结构化 → 提醒 → 云同步」全链路,并以手写、表格、通知单等多类真实图像为输入。'),
    ('中文时间表达的工程化归一化', '相对时间(明天/下周三/下午 3 点)、缺年份日期顺延、星期 X 锚定等细节规则,是真实可用性区别于 Demo 的关键工程积累。'),
    ('多 AI 供应商热切换与本地 Mock', '统一适配层让 AI 能力不锁定单一供应商,且无网络、无 Key 也能完整演示导入流程,适配答辩现场。'),
    ('无账号摩擦的匿名云同步', '设备 ID + 时间戳冲突策略 + 离线优先,以最低交互成本解决换机数据迁移,服务端拒绝旧数据覆盖。'),
    ('双通道独立提醒 + 精确闹钟适配', '闹钟与短信各自独立时间/铃声,并适配 Android 13+ 精确闹钟权限机制,提醒「到点必达」。'),
    ('全链路华为云', '开发(码道)、推理(MaaS)、存储(RDS)、缓存(DCS)、部署(ECS)五环节全部基于华为云,完整响应赛题要求。'),
]
for i, (t, d) in enumerate(innovations, 1):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(f'{i}. {t}——')
    r.font.name = BODY
    r.font.bold = True
    r.font.size = Pt(10.5)
    r.font.color.rgb = DARK
    rpr = r._r.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rpr.append(rf)
    rf.set(qn('w:eastAsia'), BODY)
    r2 = p.add_run(d)
    r2.font.name = BODY
    r2.font.size = Pt(10.5)
    r2.font.color.rgb = DARK
    rpr2 = r2._r.get_or_add_rPr()
    rf2 = rpr2.find(qn('w:rFonts'))
    if rf2 is None:
        rf2 = OxmlElement('w:rFonts')
        rpr2.append(rf2)
    rf2.set(qn('w:eastAsia'), BODY)

# ================= 八、完整性与工程规范 =================
doc.add_heading('八、完整性与工程规范', level=1)
bullet('Git,功能级提交,回退 tag 保护大改动;', bold_head='版本管理:')
bullet('每次交付必跑 `tsc --noEmit` + `expo lint` + `expo export --platform android`;', bold_head='质量门:')
bullet('E2E(Playwright)覆盖核心交互;后端接口联调实测(健康检查、往返、冲突、边界);', bold_head='测试:')
bullet('`docker-compose` 起 MySQL + Redis,与华为云 RDS/DCS 同构,一键可复现;', bold_head='本地联调:')
bullet('EAS 云端构建安卓安装包;后端 `npm run build` 产物直接部署 ECS。', bold_head='部署:')

# ================= 九、应用价值与场景 =================
doc.add_heading('九、应用价值与场景', level=1)
bullet('课表、作业、社团活动拍照即入日程,双提醒防漏;', bold_head='校园:')
bullet('会议通知、值班表、周报节点拍照导入,换机数据无缝迁移;', bold_head='职场:')
bullet('缴费单、体检单、购物清单拍照归档与提醒;', bold_head='家庭:')
bullet('任务数据落 RDS 后,可为统计复盘(完成率、时间分布)提供基础。', bold_head='数据价值:')

# ================= 十、开发过程与工具使用计划 =================
doc.add_heading('十、开发过程与工具使用计划', level=1)
bullet('主线开发采用规范驱动 + 模块化小步交付(已 60+ 提交);')
bullet('码道 CodeArts 代码智能体:承担后端接口、脚本、文档等独立任务模块的开发与审查,IDE/CLI 使用过程截图留证,写入参赛材料;')
bullet('演示环境:本地 Docker 联调 → 华为云 ECS + RDS + DCS 生产部署 → /health 验收截图。')

# ================= 十一、里程碑计划 =================
doc.add_heading('十一、里程碑计划', level=1)
table([
    ('时间', '节点', '交付'),
    ('2026-11-30 前', '报名', '队伍注册 + 代金券申领'),
    ('2026-12', '初赛', '作品说明文档、答辩 PPT、演示视频'),
    ('2027-01 ~ 02', '中国总决赛备战', '华为云生产部署、开源 Gitee/GitHub、Web 演示版'),
    ('2027-03', '中国总决赛', '现场演示答辩'),
    ('2027-05', '全球总决赛', '英文材料 + 海外部署'),
], widths=[3.4, 3.6, 9.2])

# ================= 十二、风险与对策 =================
doc.add_heading('十二、风险与对策', level=1)
table([
    ('风险', '对策'),
    ('MaaS 模型名随预置服务变化', '配置集中在 providers.ts 一处,现场可快速切换'),
    ('演示现场网络不稳', '本地 Mock + 离线优先设计,断网仍可完整演示'),
    ('华为云资源费用', '使用大赛代金券,缓存 TTL 与连接池控制资源占用'),
    ('图像识别准确率', '确认导入模式 + 字段可编辑兜底,模板 Prompt 可调优'),
], widths=[5.4, 10.8])

# ================= 十三、开源计划 =================
doc.add_heading('十三、开源计划', level=1)
bullet('入围后开源至 Gitee / GitHub(单仓库:App + 后端 + 文档);')
bullet('许可证:待定(MIT / Apache-2.0);')
bullet('开源前检查:无内置密钥(Key 均为用户本机填写)、无敏感信息。')

# ================= 附录 =================
doc.add_heading('附录:项目现状', level=1)
bullet('仓库:mobile/(App)+ server/(同步后端)+ docs/(材料);')
bullet('本地联调:MySQL 13306 / Redis 16379 / 服务 3000,接口实测通过;')
bullet('核心代码:mobile/src/ai/(AI 适配层)、mobile/src/data/(数据与同步)、server/src/(接口)。')

out = 'docs/作品设计方案.docx'
doc.save(out)
print('saved:', out)
