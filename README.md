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
