# 网站自动发布维护

源仓库 `someonegg/ally` 的 `main` 更新公开内容时，`Publish Pages` 工作流自动通过 `npm run build` 生成 `dist/`，再同步到 `someonegg/someonegg.github.io` 的 `main`，由 GitHub Pages 发布到 <https://someonegg.github.io/>。

## 触发与同步

- `public/`、`apps/`、`docs/`、`kids/`、构建脚本、依赖清单、锁文件或工作流变更会触发发布。
- 可在源仓库 Actions → Publish Pages → Run workflow 手动运行，选择 `main`；其他分支不执行发布。
- 软链接复制为实际文件，产物包含 `.nojekyll`；新增、修改、删除都会同步。发布仓库保留 `.git/` 和 `.gitignore`。
- 没有内容变化时不会创建提交；有变化时发布提交记录完整源提交 SHA。
- 发布仓库正文以源仓库为准，直接修改发布仓库可能在下次同步时被覆盖。

## 本地开发与发布验证

建议与 CI 使用相同的 Node.js 版本，在仓库根目录执行：

```bash
npm ci
npm run dev
```

开发服务直接读取 `public/` 及其内容目录软链接；修改源文件后刷新即可。

验证实际发布产物：

```bash
npm run build
npm run preview
```

构建每次重新生成仓库内的 `dist/`，展开内容目录为实际文件并写入 `.nojekyll`。产物可独立部署。

开发和预览默认地址均为 `http://127.0.0.1:27463`，可通过 `npm run preview -- --port 27464`（开发同理）更换端口。预览不自动构建，源文件修改后需重新执行 `npm run build`。

`npm test` 运行单元及构建流程测试；`npm run test:doge:browser` 需要已安装 `playwright-cli`，会自行构建并启动预览。

## 密钥与故障排查

专用 SSH 密钥的私钥存于源仓库 Actions Secret `PAGES_DEPLOY_KEY`，公钥存于发布仓库的 Deploy Keys，名称为 `ally-pages-publisher`，开启写权限。不要把私钥写入仓库或日志。

更换密钥时，生成新的 Ed25519 密钥，在发布仓库新增可写 Deploy Key，更新源仓库 Secret，手动发布验证后删除旧 Deploy Key。

发布失败先查看源仓库的 Actions 日志；SSH 权限错误检查密钥配对及写权限；推送冲突确认是否有人同时修改发布仓库，再重新运行工作流。构建失败检查依赖安装、公共资源和内容目录是否完整。

同步成功后还需等待发布仓库的 Pages 构建。Pages 设置应保持从 `main` 分支根目录发布，HTTPS 开启。若需要恢复旧内容，在源仓库回退对应内容并提交到 `main`，再等待自动发布。
