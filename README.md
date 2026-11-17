# GreenKeeper

## Android 养护通知

「花园 → 提醒事项」或「我 → 养护提醒」提供 **发送测试通知**，点击并允许通知权限后立即发送一条系统通知；无需登录，也不创建养护计划。通知渠道为「植物养护提醒」，使用默认声音和高重要性。通知是否弹出横幅受系统通知、勿扰和省电设置影响。

正式提醒只排程下一次未来通知，完成养护后再安排下一次；不会自动推进逾期计划。登录及回到前台时从后端同步，编辑/完成/删除后更新本机排程，退出或切换账户时清理旧账户通知。其他设备需要登录同步，Web/iOS 保留应用内提醒。

新增了原生通知模块，旧 APK 不能仅靠 JS 热更新启用，需要重新构建并安装。Android 构建命令：`cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`；Debug 版需连接 Metro（`pnpm start`）。不申请精确闹钟权限，不使用 FCM 或后台推送。

系统时区按计划保存的 IANA 时区解释：夏令时重复时间取较早一次，不存在的时间顺延至第一个有效分钟。网络同步失败保留现有本机排程。强行停止应用、清除数据或卸载可能阻止/清除排程，重新启动并登录后再同步。

## 自动检查（CI）

推送到任意分支、创建或更新目标为 `main` 的 Pull Request 时，GitHub Actions 会执行：

1. 使用 Node.js 22 和 pnpm 8.15.9，按锁文件安装依赖。
2. `pnpm lint`：检查代码规范。
3. `pnpm test`：运行 Jest 单元和组件测试。
4. 生成被 Git 忽略的 `expo-env.d.ts`，然后执行 `pnpm exec tsc --noEmit`。

将 `.github/workflows/ci.yml` 提交并推送到 GitHub 后，在仓库的 **Actions** 页面查看运行结果；无需配置服务器或第三方 API 密钥。当前 CI 只检查代码，不部署服务器或构建 App。

如果需要禁止未通过检查的 PR 合并，可在 GitHub 的 `main` 分支保护或 Ruleset 中，将 `Frontend CI` 工作流的 `check` 检查设为必需项（需先成功运行一次）。
