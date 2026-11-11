# GreenKeeper

## 自动检查（CI）

推送到任意分支、创建或更新目标为 `main` 的 Pull Request 时，GitHub Actions 会执行：

1. 使用 Node.js 22 和 pnpm 8.15.9，按锁文件安装依赖。
2. `pnpm lint`：检查代码规范。
3. `pnpm test`：运行 Jest 单元和组件测试。
4. 生成被 Git 忽略的 `expo-env.d.ts`，然后执行 `pnpm exec tsc --noEmit`。

将 `.github/workflows/ci.yml` 提交并推送到 GitHub 后，在仓库的 **Actions** 页面查看运行结果；无需配置服务器或第三方 API 密钥。当前 CI 只检查代码，不部署服务器或构建 App。

如果需要禁止未通过检查的 PR 合并，可在 GitHub 的 `main` 分支保护或 Ruleset 中，将 `Frontend CI` 工作流的 `check` 检查设为必需项（需先成功运行一次）。
