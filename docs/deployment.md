# 部署说明

## 当前部署形态

当前单人体验是纯前端静态网页游戏：

- 构建工具：Vite
- 运行技术：TypeScript + Three.js
- 构建产物：`dist/`
- 单人体验不需要后端、不需要数据库
- 多人 v1 和独立访客统计需要额外运行一个常驻 Node 服务

因此如果只上线无统计的单人版，只需要把 `dist/` 放到服务器静态网站目录，由 Nginx、宝塔、1Panel、Cloudflare Pages、Vercel 或 GitHub Pages 托管即可。如果要启用多人可见或底部“累计访客”统计，需要同时部署 Node 服务，并把 `/ws` 和 `/api/` 代理到该服务。

后续如果接入 DeepSeek 对话，不能在前端直接放 API Key，需要新增后端接口，例如 `/api/dialogue`。

## 本地构建

项目当前 shell 里不一定有全局 `pnpm`，可以使用 Codex 内置 pnpm：

```bash
/Users/huyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm build
```

## 本地多人开发

启动前端和 WebSocket 服务：

```bash
/Users/huyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm dev:multi
```

也可以分开启动：

```bash
/Users/huyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm dev
/Users/huyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm dev:server
```

默认地址：

```txt
前端：http://127.0.0.1:5173/
WebSocket：ws://127.0.0.1:8787/ws
访客统计：http://127.0.0.1:8787/api/visitors
```

构建成功后会生成：

```txt
dist/
  index.html
  assets/
```

上线只上传 `dist/` 里的内容，不上传 `src/`、`docs/`、`node_modules/`。

## 推荐服务器部署：Nginx 静态站点

假设服务器是 Ubuntu，域名是 `mars.example.com`，站点目录是：

```txt
/var/www/mars-advance-team
```

### 1. 服务器安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. 创建站点目录

```bash
sudo mkdir -p /var/www/mars-advance-team
sudo chown -R $USER:www-data /var/www/mars-advance-team
```

### 3. 从本机上传构建产物

在本机项目目录执行：

```bash
rsync -avz --delete dist/ root@你的服务器IP:/var/www/mars-advance-team/
```

如果不用 root，把 `root` 改成服务器用户名，并确保该用户有写入站点目录的权限。

### 4. 配置 Nginx

创建配置：

```bash
sudo nano /etc/nginx/sites-available/mars-advance-team
```

写入：

```nginx
server {
    listen 80;
    server_name mars.example.com;

    root /var/www/mars-advance-team;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8787/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8787/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/mars-advance-team /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 配置 HTTPS

域名解析到服务器后，使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mars.example.com
```

## GitHub + 服务器拉取部署

如果希望之后更新更方便，建议先把项目推到 GitHub，再让服务器拉代码构建。

当前本地仓库还没有 remote，首次需要：

```bash
git add .
git commit -m "Initial mars advance team demo"
git branch -M main
git remote add origin git@github.com:HuYee2025/你的仓库名.git
git push -u origin main
```

服务器上：

```bash
git clone git@github.com:HuYee2025/你的仓库名.git
cd 你的仓库名
corepack enable
pnpm install --frozen-lockfile
pnpm build
sudo rsync -av --delete dist/ /var/www/mars-advance-team/
sudo systemctl reload nginx
```

## 访客统计部署说明

底部“累计访客”通过 `/api/visitors` 统计独立 IP。服务器端不会保存明文 IP，只保存带盐 hash；同一 IP 多次访问只增加访问次数，不重复增加累计人数。

默认统计文件位置：

```txt
data/visitor-stats.json
```

如果要自定义存储位置或 hash 盐，可以在启动 Node 服务时设置：

```bash
VISITOR_STATS_PATH=/var/lib/mars-advance-team/visitor-stats.json \
VISITOR_HASH_SALT=换成一段只有服务器知道的随机字符串 \
pnpm dev:server
```

如果只上传 `dist/`，但没有运行 Node 服务或没有配置 `/api/` 代理，网页底部四位数字会保持 `0000`，不会影响游戏本体。

## 每次更新上线

最简单流程：

```bash
/Users/huyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm build
rsync -avz --delete dist/ root@你的服务器IP:/var/www/mars-advance-team/
```

若本次更新包含 `server/` 代码，也需要同步服务器上的项目代码并重启 Node 服务。

## 上线前检查

- 本地 `pnpm build` 必须通过。
- `dist/index.html` 和 `dist/assets/` 必须存在。
- 背景音乐使用原 MP3 的 64kbps 压缩版，部署包内音频约 2.5MB，不再上传 10MB 源 MP3。
- 多人 WebSocket 服务不需要数据库，也不需要 API Key。
- 不能把 DeepSeek、OpenAI 或其他 API Key 写进前端代码。
- 如果部署在子路径，例如 `https://example.com/mars/`，需要额外配置 Vite `base`，当前默认更适合部署在独立域名或根路径。
