# 网站自动发布维护

源仓库 `someonegg/ally` 的 `main` 更新公开内容时，`Publish Pages` 工作流自动将 `public/` 展开后同步到 `someonegg/someonegg.github.io` 的 `main`，由 GitHub Pages 发布到 <https://someonegg.github.io/>。

## 触发与同步

- `public/`、`apps/`、`docs/`、`kids/`、发布脚本或工作流变更会触发发布。
- 可在源仓库 Actions → Publish Pages → Run workflow 手动运行，选择 `main`；其他分支不执行发布。
- 软链接复制为实际文件，产物包含 `.nojekyll`；新增、修改、删除都会同步。发布仓库保留 `.git/` 和 `.gitignore`。
- 没有内容变化时不会创建提交；有变化时发布提交记录完整源提交 SHA。
- 发布仓库正文以源仓库为准，直接修改发布仓库可能在下次同步时被覆盖。

## 本地验证打包

```bash
task_dir=$(mktemp -d)
bash scripts/package-public.sh "$task_dir/site"
```

输出目录必须位于源仓库外且尚不存在；检查首页、内容文件和软链接展开结果后，可删除该临时目录。

## 密钥与故障排查

专用 SSH 密钥的私钥存于源仓库 Actions Secret `PAGES_DEPLOY_KEY`，公钥存于发布仓库的 Deploy Keys，名称为 `ally-pages-publisher`，开启写权限。不要把私钥写入仓库或日志。

更换密钥时，生成新的 Ed25519 密钥，在发布仓库新增可写 Deploy Key，更新源仓库 Secret，手动发布验证后删除旧 Deploy Key。

发布失败先查看源仓库的 Actions 日志；SSH 权限错误检查密钥配对及写权限；推送冲突确认是否有人同时修改发布仓库，再重新运行工作流。打包失败检查内容目录和软链接是否完整。

同步成功后还需等待发布仓库的 Pages 构建。Pages 设置应保持从 `main` 分支根目录发布，HTTPS 开启。若需要恢复旧内容，在源仓库回退对应内容并提交到 `main`，再等待自动发布。
