# GreenKeeper

## USB Android 调试

确保 Android 设备已连接并开启 USB 调试，在前端项目目录执行：

```bash
pnpm run dev:android
```

该命令会依次启动后端开发服务、等待 `http://127.0.0.1:8080/health` 可访问、执行
`adb reverse tcp:8080 tcp:8080`，然后启动 Android 前端。退出前端进程时，脚本会自动停止后端。

后端目录默认位于前端目录的同级目录 `../GreenKeeper-backend`。如果端口不是 `8080`，可以设置
`BACKEND_PORT`，例如：

```bash
BACKEND_PORT=9090 pnpm run dev:android
```

## 社区浏览与收藏

社区已接入相邻后端的 `/posts` 与幂等收藏接口。游客可以浏览列表、详情及大图；收藏会引导登录并返回原页面。顶部功能区预留 15%，底部导航保持原样。

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm exec expo export --platform web
```

接口地址由 `EXPO_PUBLIC_API_BASE_URL` 指定，默认 `http://localhost:8080`。Web 联调时，后端 `CORS_ORIGINS` 必须包含前端 Origin（默认允许本机 8081 端口）。后端测试使用 `npm test`，不会写入开发数据库。

详细实现说明见 [社区实现说明](docs/社区/实现说明.md)，接口契约见相邻后端的 `docs/核心/API.md`。

## 拍摄图片上传

登录后可从拍摄页拍照或选择单张图片，预览页会将其缩放至长边不超过 1600px、压为 JPEG 后上传至后端本地存储。后端将文件放在 `DATA_DIRECTORY/uploads`，仅供本地开发验证，部署多实例前应迁移到共享对象存储。接口限制和响应格式见相邻后端的 `docs/核心/API.md`。
