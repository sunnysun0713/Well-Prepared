# -*- coding: utf-8 -*-
"""生成华为ICT大赛创新赛答辩 PPT(docs/答辩PPT.pptx)。

改内容后重跑:python tools/make_ppt.py
依赖:python-pptx>=1.0(本机已装 1.0.2)
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn

# ---------------- 设计常量 ----------------
INDIGO = RGBColor(0x4F, 0x46, 0xE5)      # App 主色
INDIGO_DARK = RGBColor(0x31, 0x2E, 0x81)
RED = RGBColor(0xC7, 0x00, 0x0B)         # 华为红
RED_LIGHT = RGBColor(0xFD, 0xEC, 0xEC)
DARK = RGBColor(0x1F, 0x29, 0x37)
GRAY = RGBColor(0x6B, 0x72, 0x80)
LIGHT = RGBColor(0xF5, 0xF7, 0xFA)
CARD = RGBColor(0xEE, 0xF2, 0xFF)        # 靛蓝浅底卡片
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x10, 0x98, 0x4D)
FONT = '微软雅黑'

SW, SH = Inches(13.333), Inches(7.5)
prs = Presentation()
prs.slide_width = SW
prs.slide_height = SH
BLANK = prs.slide_layouts[6]


# ---------------- 基础助手 ----------------
def set_font(run, size=14, bold=False, color=DARK, name=FONT):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name
    rPr = run._r.get_or_add_rPr()
    ea = rPr.makeelement(qn('a:ea'), {'typeface': name})
    rPr.append(ea)


def new_slide(bg=WHITE):
    slide = prs.slides.add_slide(BLANK)
    if bg != WHITE:
        rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
        rect.fill.solid()
        rect.fill.fore_color.rgb = bg
        rect.line.fill.background()
        rect.shadow.inherit = False
    return slide


def add_text(slide, x, y, w, h, lines, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
             line_spacing=1.15, space_after=4):
    """lines: [(text, size, color, bold)] 或嵌套列表表示多段落"""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = Pt(space_after)
        runs = line if isinstance(line, list) else [line]
        for text, size, color, bold in runs:
            r = p.add_run()
            r.text = text
            set_font(r, size, bold, color)
    return box


def add_box(slide, x, y, w, h, fill=CARD, line_color=None, radius=0.08, dash=None):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    try:
        shape.adjustments[0] = radius
    except Exception:
        pass
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line_color is not None:
        shape.line.color.rgb = line_color
        shape.line.width = Pt(1.2)
    else:
        shape.line.fill.background()
    shape.shadow.inherit = False
    if dash:
        ln = shape.line._get_or_add_ln()
        ln.append(ln.makeelement(qn('a:prstDash'), {'val': dash}))
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Inches(0.12)
    tf.margin_top = tf.margin_bottom = Inches(0.06)
    return shape


def box_text(shape, lines, align=PP_ALIGN.CENTER, line_spacing=1.1, space_after=2):
    tf = shape.text_frame
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = Pt(space_after)
        runs = line if isinstance(line, list) else [line]
        for text, size, color, bold in runs:
            r = p.add_run()
            r.text = text
            set_font(r, size, bold, color)


def add_arrow(slide, x1, y1, x2, y2, color=GRAY, width=1.8):
    conn = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    conn.line.color.rgb = color
    conn.line.width = Pt(width)
    ln = conn.line._get_or_add_ln()
    ln.append(ln.makeelement(qn('a:tailEnd'), {'type': 'triangle', 'w': 'med', 'len': 'med'}))
    conn.shadow.inherit = False
    return conn


def footer(slide, page):
    add_text(slide, 0.9, 7.08, 11.5, 0.3,
             [[('NeZha · 拍照成任务    |    华为ICT大赛 · 创新赛 · 赛题一', 9, GRAY, False)]],
             align=PP_ALIGN.CENTER)
    add_text(slide, 12.5, 7.08, 0.5, 0.3, [[(str(page), 9, GRAY, False)]], align=PP_ALIGN.RIGHT)


def title_bar(slide, title, page, subtitle=None):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.9), Inches(0.55), Inches(0.09), Inches(0.62))
    bar.fill.solid()
    bar.fill.fore_color.rgb = INDIGO
    bar.line.fill.background()
    bar.shadow.inherit = False
    add_text(slide, 1.15, 0.48, 11.2, 0.75, [[(title, 26, DARK, True)]])
    if subtitle:
        add_text(slide, 1.15, 1.08, 11.2, 0.4, [[(subtitle, 13, GRAY, False)]])
    footer(slide, page)


def chip(slide, x, y, w, h, text, fg=WHITE, bg=INDIGO, size=12, bold=False):
    shape = add_box(slide, x, y, w, h, fill=bg, radius=0.5)
    box_text(shape, [[(text, size, fg, bold)]])
    return shape


def add_table(slide, x, y, w, rows_data, col_widths, header_fill=INDIGO, font_size=12.5,
              header_size=13, row_h=0.46):
    rows, cols = len(rows_data), len(rows_data[0])
    gfx = slide.shapes.add_table(rows, cols, Inches(x), Inches(y), Inches(w),
                                 Inches(row_h * rows))
    table = gfx.table
    table.first_row = False
    table.horz_banding = False
    for i, cw in enumerate(col_widths):
        table.columns[i].width = Inches(cw)
    for r in range(rows):
        table.rows[r].height = Inches(row_h)
        for c in range(cols):
            cell = table.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = INDIGO if r == 0 else (WHITE if r % 2 == 0 else LIGHT)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.margin_left = Inches(0.08)
            cell.margin_right = Inches(0.08)
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.LEFT if c > 0 else PP_ALIGN.CENTER
            run = p.add_run()
            run.text = str(rows_data[r][c])
            set_font(run, header_size if r == 0 else font_size,
                     r == 0, WHITE if r == 0 else DARK)
    return table


def numbered_row(slide, y, num, title, desc, num_bg=INDIGO, num_fg=WHITE):
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.95), Inches(y), Inches(0.42), Inches(0.42))
    circle.fill.solid()
    circle.fill.fore_color.rgb = num_bg
    circle.line.fill.background()
    circle.shadow.inherit = False
    tf = circle.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = str(num)
    set_font(r, 14, True, num_fg)
    add_text(slide, 1.55, y - 0.06, 11.0, 0.85,
             [[(title, 14.5, DARK, True)], [(desc, 11.5, GRAY, False)]], line_spacing=1.05,
             space_after=0)


# ================= 1 封面 =================
s = new_slide(bg=INDIGO_DARK)
add_box(s, 0, 0, 13.333, 7.5, fill=INDIGO_DARK)
add_text(s, 1.2, 1.35, 10.9, 1.7,
         [[('NeZha · 拍照成任务', 46, WHITE, True)]])
line = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.25), Inches(2.62), Inches(2.6), Inches(0.055))
line.fill.solid()
line.fill.fore_color.rgb = RED
line.line.fill.background()
line.shadow.inherit = False
add_text(s, 1.2, 2.85, 10.9, 0.7,
         [[('AI 视觉任务管理 —— 拍一张照片,任务自动排好、自动提醒、自动上云', 21, WHITE, False)]])
add_text(s, 1.2, 3.75, 10.9, 0.5,
         [[('基于华为云产品打造 AI 创新应用:码道 CodeArts · ModelArts MaaS · RDS · DCS · ECS', 15,
            RGBColor(0xC7, 0xD2, 0xFE), False)]])
chip(s, 1.25, 4.6, 4.9, 0.5, '第十一届华为ICT大赛 · 创新赛 · 赛题一', bg=RED, size=14, bold=True)
add_text(s, 1.2, 6.35, 10.9, 0.9,
         [[('参赛队伍:___________   学校:___________   指导教师:___________', 15,
            RGBColor(0xC7, 0xD2, 0xFE), False)],
          [('成员:___________ · ___________ · ___________(2026-12 初赛版)', 13,
            RGBColor(0x93, 0xA3, 0xDB), False)]])

# ================= 2 目录 =================
s = new_slide()
title_bar(s, '目录', 2)
toc = [('01', '选题背景与痛点'), ('02', '产品定位与核心功能'), ('03', '技术架构'),
       ('04', '华为云产品使用'), ('05', '创新点分析'), ('06', '完整性与工程规范'),
       ('07', '应用价值与场景'), ('08', '开发过程 · 里程碑 · 展望')]
for i, (num, text) in enumerate(toc):
    col, row = i % 2, i // 2
    x = 1.2 + col * 6.1
    y = 1.7 + row * 1.25
    shape = add_box(s, x, y, 5.6, 1.0, fill=CARD)
    box_text(shape, [[(num + '   ', 20, INDIGO, True), (text, 17, DARK, False)]])

# ================= 3 选题背景与痛点 =================
s = new_slide()
title_bar(s, '选题背景与痛点', 3, '学生与办公人群每天都在面对:图片里的任务信息,与永远不够用的提醒')
pains = [
    ('① 信息录入繁琐', '课表、值班表、通知散落在照片与微信里,手动录入清单 App 费时且易错'),
    ('② 提醒方式单一', '常规清单 App 只有一种提醒,上课、会议、缴费等场景容易漏看'),
    ('③ 跨设备同步有摩擦', '换机 / 多设备迁移数据需要注册登录,使用门槛高'),
    ('④ AI 能力多为噱头', '市面「AI 清单」多停留在对话生成,缺少拍照识别与时间归一化的工程打磨'),
]
for i, (t, d) in enumerate(pains):
    col, row = i % 2, i // 2
    x = 1.0 + col * 4.15
    y = 1.65 + row * 2.15
    shape = add_box(s, x, y, 3.9, 1.9, fill=CARD)
    box_text(shape, [[(t, 15.5, INDIGO_DARK, True)], [(d, 12, GRAY, False)]],
             align=PP_ALIGN.LEFT, line_spacing=1.15, space_after=6)
shape = add_box(s, 9.45, 1.65, 3.0, 4.05, fill=INDIGO)
box_text(shape, [[('选题价值', 16, WHITE, True)],
                 [('以真实高频场景切入,把大模型视觉能力落地为「识别 → 结构化 → 提醒 → 同步」的完整闭环,而非单点 Demo。', 13.5, WHITE, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.3, space_after=8)
footer(s, 3)

# ================= 4 产品定位 =================
s = new_slide()
title_bar(s, '产品定位', 4)
shape = add_box(s, 1.0, 1.55, 11.33, 1.3, fill=INDIGO)
box_text(shape, [[('拍一张照片,任务自动排好、自动提醒、自动上云。', 24, WHITE, True)]])
highlights = [
    ('拍照即任务', '课程表 / 值班表 / 手写清单,视觉大模型一次识别,自动成任务'),
    ('双通道提醒', '闹钟 + 短信两条独立提醒,各自时间与铃声,到点必达'),
    ('匿名云同步', '无需注册登录,设备 ID 自动同步,换机数据不丢'),
]
for i, (t, d) in enumerate(highlights):
    x = 1.0 + i * 3.95
    shape = add_box(s, x, 3.2, 3.7, 1.9, fill=CARD)
    box_text(shape, [[(t, 16, INDIGO, True)], [(d, 12, GRAY, False)]], line_spacing=1.2, space_after=6)
add_text(s, 1.0, 5.45, 3.0, 0.4, [[('目标用户:', 13, DARK, True)]])
chip(s, 2.1, 5.4, 1.5, 0.42, '学生', bg=INDIGO)
chip(s, 3.75, 5.4, 1.8, 0.42, '办公人群', bg=INDIGO)
chip(s, 5.7, 5.4, 1.5, 0.42, '家庭用户', bg=INDIGO)
footer(s, 4)

# ================= 5 核心功能总览 =================
s = new_slide()
title_bar(s, '核心功能总览', 5, '模块化架构:三个模块互不依赖,可独立演进')
mods = [
    ('每日任务', ['秒级实时时钟,滑动 / 箭头切日', '今日紧急任务顶部提示条', '右下角 FAB 快速新增', '任务按起始时间自动排序']),
    ('日历', ['年 / 月滚轮选月,点选日期', '当日任务面板:新增 + 列表', '月历任务点着色,收藏加深描边']),
    ('任务载入(核心)', ['拍照 / 选图,AI 提取任务', '自动导入 / 手动勾选确认', '导入即自动规划双通道提醒']),
]
for i, (t, items) in enumerate(mods):
    x = 1.0 + i * 3.95
    shape = add_box(s, x, 1.65, 3.7, 3.5, fill=CARD)
    lines = [[(t, 16, INDIGO, True)]]
    lines += [[('· ' + it, 12.5, DARK, False)] for it in items]
    box_text(shape, lines, align=PP_ALIGN.LEFT, line_spacing=1.2, space_after=6)
shape = add_box(s, 1.0, 5.45, 11.33, 1.15, fill=LIGHT)
box_text(shape, [[('任务卡片:名称 · 备注 · 起止时间 · 闹钟提醒 · 短信提醒(各自独立时间与铃声)', 13, DARK, False)],
                 [('编辑即重排提醒,删除即取消提醒 —— 不留「幽灵通知」', 13, DARK, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.2, space_after=2)
footer(s, 5)

# ================= 6 核心链路:拍照成任务 =================
s = new_slide()
title_bar(s, '核心链路:拍照成任务', 6, '图像进,任务出 —— 全链路一步到位')
steps = [('① 拍照 / 选图', '课程表 · 通知单\n手写清单'), ('② 视觉大模型提取', '华为云 MaaS\nOpenAI 兼容接口'),
         ('③ 智能归一化', '相对时间 · 缺年份\n顺延 · 星期X'), ('④ 确认导入', '自动 / 手动勾选\n字段可编辑'),
         ('⑤ 双通道提醒', '闹钟 + 短信\n独立时间铃声')]
for i, (t, d) in enumerate(steps):
    x = 0.62 + i * 2.58
    shape = add_box(s, x, 1.7, 2.25, 1.55, fill=CARD)
    box_text(shape, [[(t, 13.5, INDIGO_DARK, True)], [(d, 10.5, GRAY, False)]], line_spacing=1.1,
             space_after=2)
    if i < 4:
        add_arrow(s, x + 2.25, 2.47, x + 2.58, 2.47, color=INDIGO)
add_text(s, 0.62, 3.5, 12.1, 0.4,
         [[('归一化细节:『明天』『下午 3 点』『下周三』→ 绝对日期 + HH:mm;识别结果落在过去时自动顺延一年,与「星期X」逻辑一致;缺时间不编造。',
            12, GRAY, False)]])
shape = add_box(s, 0.62, 4.15, 12.1, 1.9, fill=LIGHT)
box_text(shape, [[('为什么这不是一个「套壳」Demo:', 14.5, INDIGO_DARK, True)],
                 [('· 提取模板可自定义(内置 4 套,支持改名与提示词编辑),适配不同图像类型', 12.5, DARK, False)],
                 [('· 多 AI 服务热切换 + 本地 Mock:无网络、无 Key 也能完整演示导入全流程', 12.5, DARK, False)],
                 [('· API Key 由用户本机填写、仅存本机,服务端零密钥', 12.5, DARK, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.25, space_after=4)
footer(s, 6)

# ================= 7 AI 多服务与模板 =================
s = new_slide()
title_bar(s, 'AI 能力:多服务适配层', 7, '统一 OpenAI 兼容抽象,供应商可热切换,不锁定')
provs = [('华为云 MaaS', '主推 · 昇腾推理 · Qwen2.5-VL-72B', RED, RED_LIGHT),
         ('DeepSeek', 'deepseek-flash', INDIGO, CARD),
         ('通义千问 Qwen-VL', 'qwen-vl-plus', INDIGO, CARD),
         ('智谱 GLM-4V', 'glm-4v-flash', INDIGO, CARD),
         ('本地 Mock', '离线演示 / 自测专用', GREEN, LIGHT)]
for i, (t, d, fg, bg) in enumerate(provs):
    y = 1.7 + i * 0.78
    shape = add_box(s, 0.95, y, 6.3, 0.62, fill=bg)
    box_text(shape, [[(t + '   ', 13.5, fg, True), (d, 11.5, GRAY, False)]], align=PP_ALIGN.LEFT)
shape = add_box(s, 7.75, 1.7, 4.65, 4.0, fill=CARD)
box_text(shape, [[('提取模板(可自定义)', 15, INDIGO, True)],
                 [('· 内置 4 套预设模板,可改名、改提示词', 12.5, DARK, False)],
                 [('· 同一图片换模板即换提取口径', 12.5, DARK, False)],
                 [('· 导入模式:自动直达 / 确认勾选', 12.5, DARK, False)],
                 [('· 导入即规划:预设自动挂载闹钟 / 短信提醒', 12.5, DARK, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.25, space_after=6)
footer(s, 7)

# ================= 8 云同步设计 =================
s = new_slide()
title_bar(s, '云同步:零摩擦、防冲突、离线优先', 8)
for i, name in enumerate(['设备 A', '设备 B']):
    y = 1.8 + i * 1.9
    shape = add_box(s, 0.95, y, 2.4, 1.15, fill=CARD)
    box_text(shape, [[(name, 14, INDIGO_DARK, True)], [('匿名设备 ID\n本地持久化', 10.5, GRAY, False)]],
             line_spacing=1.05)
    add_arrow(s, 3.35, y + 0.57, 5.6, 2.7, color=GRAY)
shape = add_box(s, 5.6, 2.15, 3.0, 1.5, fill=INDIGO)
box_text(shape, [[('华为云同步服务', 14, WHITE, True)],
                 [('ECS + RDS + DCS', 11, RGBColor(0xC7, 0xD2, 0xFE), False)]], line_spacing=1.1)
shape = add_box(s, 9.0, 1.75, 3.4, 2.3, fill=CARD)
box_text(shape, [[('冲突规则(核心)', 14.5, RED, True)],
                 [('全量状态 + 毫秒时间戳\n服务端仅在「较新」时覆盖', 12.5, DARK, False)],
                 [('离线设备回连,旧数据\n永远不会覆盖新数据', 12.5, DARK, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.2, space_after=4)
feats = [('匿名设备 ID', '首启自动生成,无需注册登录'), ('离线优先', '断网静默降级纯本地,恢复后自动合并'),
         ('缓存加速', '读取先走 Redis 缓存,未命中回源 RDS')]
for i, (t, d) in enumerate(feats):
    x = 0.95 + i * 3.95
    shape = add_box(s, x, 5.2, 3.7, 1.25, fill=LIGHT)
    box_text(shape, [[(t, 13.5, INDIGO_DARK, True)], [(d, 11, GRAY, False)]], line_spacing=1.1,
             space_after=2)
footer(s, 8)

# ================= 9 技术架构图 =================
s = new_slide()
title_bar(s, '技术架构', 9, '客户端 Expo/RN · 后端 Express · 全链路华为云')
# App
shape = add_box(s, 0.95, 1.65, 3.3, 2.0, fill=CARD)
box_text(shape, [[('NeZha App', 15, INDIGO_DARK, True)],
                 [('Expo SDK 58 / RN 0.88', 10.5, GRAY, False)],
                 [('每日任务 · 日历 · 任务载入', 10.5, GRAY, False)],
                 [('本地通知 · AsyncStorage', 10.5, GRAY, False)]], line_spacing=1.1, space_after=1)
# MaaS
shape = add_box(s, 9.1, 1.65, 3.3, 2.0, fill=RED_LIGHT)
box_text(shape, [[('华为云 ModelArts MaaS', 15, RED, True)],
                 [('视觉大模型(昇腾推理)', 10.5, GRAY, False)],
                 [('OpenAI 兼容接口', 10.5, GRAY, False)],
                 [('多供应商适配层可切换', 10.5, GRAY, False)]], line_spacing=1.1, space_after=1)
# 双向 AI 箭头
add_arrow(s, 4.25, 2.15, 9.1, 2.15, color=RED, width=1.6)
add_arrow(s, 9.1, 2.95, 4.25, 2.95, color=RED, width=1.6)
add_text(s, 4.6, 1.8, 4.2, 0.3, [[('图片 + 模板 Prompt', 10, RED, False)]], align=PP_ALIGN.CENTER)
add_text(s, 4.6, 3.05, 4.2, 0.3, [[('结构化任务 JSON', 10, RED, False)]], align=PP_ALIGN.CENTER)
# ECS
shape = add_box(s, 4.55, 4.6, 4.2, 1.7, fill=INDIGO)
box_text(shape, [[('华为云 ECS · Express 同步服务', 14, WHITE, True)],
                 [('PUT/GET /sync/:deviceId · /health', 11, RGBColor(0xC7, 0xD2, 0xFE), False)]],
         line_spacing=1.1)
# RDS / DCS
shape = add_box(s, 0.95, 4.6, 2.6, 1.7, fill=LIGHT)
box_text(shape, [[('RDS for MySQL', 13.5, DARK, True)],
                 [('task_states 表', 11, GRAY, False)],
                 [('设备状态 JSON + 时间戳', 10.5, GRAY, False)]], line_spacing=1.1, space_after=1)
shape = add_box(s, 9.8, 4.6, 2.6, 1.7, fill=LIGHT)
box_text(shape, [[('DCS for Redis', 13.5, DARK, True)],
                 [('sync:state:<设备ID>', 11, GRAY, False)],
                 [('缓存 TTL 1 小时', 10.5, GRAY, False)]], line_spacing=1.1, space_after=1)
add_arrow(s, 4.55, 5.15, 3.55, 5.15, color=GRAY)
add_arrow(s, 8.75, 5.15, 9.8, 5.15, color=GRAY)
add_text(s, 4.6, 5.3, 3.0, 0.3, [[('读写', 10, GRAY, False)]], align=PP_ALIGN.CENTER)
add_text(s, 6.6, 5.3, 2.6, 0.3, [[('缓存 / 回源', 10, GRAY, False)]], align=PP_ALIGN.CENTER)
add_arrow(s, 2.6, 3.65, 5.5, 4.6, color=GRAY)
add_text(s, 2.75, 3.75, 2.8, 0.3, [[('PUT / GET 全量状态', 10, GRAY, False)]])
# CodeArts
shape = add_box(s, 9.8, 6.45, 2.6, 0.55, fill=WHITE, line_color=RED, dash='dash')
box_text(shape, [[('码道 CodeArts 开发', 10.5, RED, False)]])
footer(s, 9)

# ================= 10 华为云产品使用明细 =================
s = new_slide()
title_bar(s, '华为云产品使用明细', 10, '赛题硬性要求逐项对应')
rows = [
    ('华为云产品', '用途', '说明'),
    ('码道 CodeArts 代码智能体', '开发工具', '代码生成 / 审查 / 调试,全流程留证'),
    ('ModelArts Studio(MaaS)', 'AI 视觉提取', 'OpenAI 兼容接口,昇腾 NPU 推理'),
    ('RDS for MySQL', '任务状态持久化', 'task_states 表,JSON 列 + 时间戳索引'),
    ('DCS for Redis', '同步读取缓存', '热数据缓存 1h TTL,降低 RDS 读压力'),
    ('ECS 弹性云服务器', '后端部署', 'Express 同步服务,与 RDS/DCS 同 VPC 内网直连'),
]
add_table(s, 0.95, 1.75, 7.7, rows, [2.5, 1.9, 3.3], row_h=0.62, font_size=12)
shape = add_box(s, 9.0, 1.75, 3.4, 3.7, fill=RED_LIGHT)
box_text(shape, [[('赛题要求逐项对应', 14.5, RED, True)],
                 [('✓ 码道 CodeArts 开发', 12.5, DARK, False)],
                 [('✓ 关联 RDS / Redis', 12.5, DARK, False)],
                 [('✓ 部署在华为云', 12.5, DARK, False)],
                 [('✓ 开源 Gitee / GitHub(入围后)', 12.5, DARK, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.3, space_after=6)
footer(s, 10)

# ================= 11 创新点 =================
s = new_slide()
title_bar(s, '创新点分析', 11, '初赛创新性评分权重 60% —— 每条都可现场演示')
innovations = [
    ('拍照成任务端到端闭环', '图像 → 大模型 → 结构化 → 提醒 → 云同步,覆盖手写、表格、通知单等多类真实图像'),
    ('中文时间表达工程化归一化', '相对时间(明天 / 下周三 / 下午 3 点)、缺年份顺延、星期X锚定,是可用性而非噱头的关键'),
    ('多 AI 供应商热切换 + 本地 Mock', '统一适配层不锁定单一供应商;断网、无 Key 也能完整演示导入全流程'),
    ('无账号摩擦的匿名云同步', '设备 ID + 毫秒时间戳冲突策略 + 离线优先;服务端拒绝旧数据覆盖新数据'),
    ('双通道独立提醒 + 精确闹钟适配', '闹钟与短信各自独立时间 / 铃声;适配 Android 13+ SCHEDULE_EXACT_ALARM'),
    ('全链路华为云', '开发(码道)· 推理(MaaS)· 存储(RDS)· 缓存(DCS)· 部署(ECS)五环节全覆盖'),
]
for i, (t, d) in enumerate(innovations):
    numbered_row(s, 1.62 + i * 0.82, i + 1, t, d)
footer(s, 11)

# ================= 12 完整性与工程规范 =================
s = new_slide()
title_bar(s, '完整性与工程规范', 12, '不是一次性 Demo:可持续演进的作品级工程')
cards = [
    ('质量门', '每次交付必跑:tsc 类型检查 + expo lint + expo export 安卓打包,全绿才提交'),
    ('E2E 测试', 'Playwright 覆盖核心交互;同步接口实测:健康检查、状态往返、冲突、边界全部通过'),
    ('本地联调', 'docker-compose 一键起 MySQL + Redis,与华为云 RDS/DCS 同构,可复现'),
    ('版本管理', '功能级提交 + 回退 tag 保护大改动;模块化架构,三模块互不依赖'),
]
for i, (t, d) in enumerate(cards):
    col, row = i % 2, i // 2
    x = 1.0 + col * 5.9
    y = 1.7 + row * 1.85
    shape = add_box(s, x, y, 5.6, 1.6, fill=CARD)
    box_text(shape, [[(t, 15, INDIGO_DARK, True)], [(d, 12, GRAY, False)]],
             align=PP_ALIGN.LEFT, line_spacing=1.15, space_after=4)
shape = add_box(s, 1.0, 5.55, 11.33, 1.05, fill=INDIGO)
box_text(shape, [[('实测数据:同步服务 /health → db:up · redis:up;PUT/GET 状态完整往返;旧时间戳写入被拒绝;边界 400 与空设备返回全部正确', 12.5, WHITE, False)]])
footer(s, 12)

# ================= 13 应用价值与场景 =================
s = new_slide()
title_bar(s, '应用价值与场景', 13)
scenes = [
    ('校园', '课表拍照即入日程\n作业 / 活动双提醒防漏', '学生高频刚需'),
    ('职场', '会议通知 / 值班表 / 周报节点\n拍照导入,换机数据无缝迁移', '效率工具价值'),
    ('家庭', '缴费单 / 体检单 / 购物清单\n拍照归档 + 到点提醒', '生活场景覆盖'),
]
for i, (t, d, tag) in enumerate(scenes):
    x = 1.0 + i * 3.95
    shape = add_box(s, x, 1.7, 3.7, 2.6, fill=CARD)
    box_text(shape, [[(t, 17, INDIGO, True)], [(d, 12.5, DARK, False)]], line_spacing=1.25,
             space_after=6)
    chip(s, x + 0.25, 3.5, 2.3, 0.42, tag, bg=INDIGO, size=11)
shape = add_box(s, 1.0, 5.0, 11.33, 1.4, fill=LIGHT)
box_text(shape, [[('长期价值:', 13.5, INDIGO_DARK, True),
                  ('任务数据落 RDS 后,可为完成率统计、时间分布复盘提供数据基础,向智能日程助手演进', 13.5, DARK, False)]],
         align=PP_ALIGN.LEFT)
footer(s, 13)

# ================= 14 开发过程:码道 CodeArts =================
s = new_slide()
title_bar(s, '开发过程与工具使用', 14, '赛题要求:必须使用华为云码道 CodeArts 代码智能体开发')
shape = add_box(s, 0.95, 1.7, 5.9, 4.3, fill=CARD)
box_text(shape, [[('开发分工', 15, INDIGO_DARK, True)],
                 [('· 主线:规范驱动 + 模块化小步交付,功能级提交', 12.5, DARK, False)],
                 [('· CodeArts 码道承担:后端接口模块开发、脚本与文档生成、代码审查', 12.5, DARK, False)],
                 [('· 演示环境:本地 Docker 联调 → 华为云 ECS + RDS + DCS 部署 → /health 验收', 12.5, DARK, False)],
                 [('· 全过程截图 / 会话记录留证,写入参赛材料', 12.5, DARK, False)]],
         align=PP_ALIGN.LEFT, line_spacing=1.3, space_after=8)
shape = add_box(s, 7.2, 1.7, 5.2, 4.3, fill=WHITE, line_color=GRAY, dash='dash')
box_text(shape, [[('[证据截图占位]', 13, GRAY, False)],
                 [('码道 CodeArts IDE / CLI 使用截图', 12, GRAY, False)],
                 [('代码生成 · 审查 · Skills 执行记录', 12, GRAY, False)],
                 [('华为云控制台:RDS / DCS / ECS / MaaS', 12, GRAY, False)]],
         line_spacing=1.4, space_after=8)
footer(s, 14)

# ================= 15 里程碑与团队 =================
s = new_slide()
title_bar(s, '里程碑计划', 15)
miles = [('2026-11', '报名 · 领代金券', '华为云生产部署'), ('2026-12', '初赛', '设计方案 · 答辩 PPT · 演示视频'),
         ('2027-03', '中国总决赛', '开源 Gitee/GitHub · 现场答辩'), ('2027-05', '全球总决赛', '英文材料 · 全球路演')]
for i, (date, node, note) in enumerate(miles):
    x = 0.95 + i * 3.02
    chip(s, x + 0.55, 1.8, 1.9, 0.46, date, bg=INDIGO_DARK, bold=True, size=12.5)
    shape = add_box(s, x, 2.45, 2.72, 1.35, fill=CARD)
    box_text(shape, [[(node, 13.5, INDIGO_DARK, True)], [(note, 11, GRAY, False)]],
             line_spacing=1.1, space_after=2)
    if i < 3:
        add_arrow(s, x + 2.72, 3.1, x + 3.02, 3.1, color=GRAY)
add_text(s, 0.95, 4.35, 6.0, 0.4, [[('团队分工(占位,按实际填写)', 13.5, DARK, True)]])
rows = [
    ('成员', '分工'),
    ('成员 1', 'App 前端 / 交互'),
    ('成员 2', '后端 / 华为云部署'),
    ('成员 3', 'AI 链路 / 测试 / 参赛材料'),
]
add_table(s, 0.95, 4.8, 6.6, rows, [1.8, 4.8], header_fill=INDIGO_DARK, row_h=0.44, font_size=12)
footer(s, 15)

# ================= 16 结尾 =================
s = new_slide(bg=INDIGO_DARK)
add_text(s, 1.2, 2.0, 10.9, 1.2, [[('谢谢聆听', 40, WHITE, True)]], align=PP_ALIGN.CENTER)
add_text(s, 1.2, 3.1, 10.9, 0.6,
         [[('NeZha · 拍照成任务 —— 拍一张照片,任务自动排好、自动提醒、自动上云', 17,
            RGBColor(0xC7, 0xD2, 0xFE), False)]], align=PP_ALIGN.CENTER)
shape = add_box(s, 3.67, 4.3, 6.0, 0.9, fill=WHITE, line_color=GRAY, dash='dash')
box_text(shape, [[('[演示视频二维码占位]', 12, GRAY, False)]])
add_text(s, 1.2, 5.6, 10.9, 0.5,
         [[('代码仓库(入围后开源):Gitee / GitHub   |   现场演示:拍照 → AI 提取 → 提醒 → 云同步', 12,
            RGBColor(0x93, 0xA3, 0xDB), False)]], align=PP_ALIGN.CENTER)

out = 'docs/答辩PPT.pptx'
prs.save(out)
print('saved:', out, 'slides:', len(prs.slides._sldIdLst))
