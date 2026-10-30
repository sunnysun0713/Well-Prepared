# mobile — 模块化任务管理 App

基于 Expo SDK 58 / React Native 的跨平台手机应用。打包出的 Android APK 可直接运行于安卓与华为鸿蒙 4.x 及以下系统;鸿蒙 NEXT(纯血鸿蒙)需后续接入 OpenHarmony 版 React Native。

## 架构

高度模块化:整个界面上方是模块选择栏,下方渲染当前激活模块的界面,选择栏末尾固定「管理模块」入口。

```
src/
  app/                  # 路由(expo-router)
    _layout.tsx         # 根布局
    index.tsx           # 主界面:ModuleBar + 激活模块内容区
    module-manager.tsx  # 管理模块界面
  modules/              # 模块注册表 + 各模块目录(每个模块自包含)
    types.ts            # AppModule 接口
    registry.ts         # 模块注册表(登记顺序 = 顶部栏顺序)
    daily-tasks/        # 每日任务:实时时钟 + 今日任务卡片列表
    calendar/           # 日历
    task-import/        # 任务载入
  data/
    tasks.ts            # 任务数据层:Task 类型 + 按日期取任务(示例数据)
  components/
    ModuleBar.tsx       # 顶部模块选择栏
    ModulePlaceholder.tsx
    TaskCard.tsx        # 任务卡片(每日任务与日历共用)
```

### 新增模块

1. 在 `src/modules/` 下建目录:写 `module.ts`(id / 标题 / 图标 / 界面组件)与界面组件
2. 在 `src/modules/registry.ts` 中登记,数组顺序即顶部栏显示顺序

## 命令

```bash
npm install
npx expo start                      # 启动开发服务器,Expo Go 扫码预览
npx tsc --noEmit                    # 类型检查
npx expo export --platform android  # 验证打包(不依赖 Android SDK)
```

构建正式 APK 使用 EAS 云端构建:https://docs.expo.dev/eas/index.md
