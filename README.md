# 我們的故事

記錄兩個人每一個 moment 的網站。Django（後端 API、登入、照片處理）＋ React（前端時間軸），跑在自己的電腦上。

- 訪客不用登入就能看「公開」的回憶
- 登入後可以新增、編輯、刪除回憶和照片，也看得到「僅登入可見」的回憶
- 首頁顯示兩個人的名字和在一起的天數（登入後按「設定」填寫）

## 1. 第一次使用

建立你的登入帳號（密碼自己輸入，不會顯示在畫面上）：

```bash
cd backend && .venv/bin/python manage.py migrate && .venv/bin/python manage.py createsuperuser
```

啟動網站：

```bash
./start.sh
```

打開 <http://127.0.0.1:8010> 就能看到。這時只有這台電腦連得到。

要幫女朋友開帳號：用你的帳號登入 <http://127.0.0.1:8010/admin/> →「使用者」→「新增」。

## 2. 讓別人用網址看到（註冊網域 + Cloudflare Tunnel）

家用網路通常沒有固定 IP，也不建議在路由器上開埠。Cloudflare Tunnel 會從你的電腦主動連到 Cloudflare，
不用改路由器、自動有 HTTPS、也不會暴露家裡的 IP，而且免費。你只需要付網域的年費。

1. **註冊網域**：到 [Cloudflare](https://dash.cloudflare.com) 註冊帳號，在 Domain Registration 買一個網域
   （在別處買的也可以，把 nameserver 改成 Cloudflare 給的即可）。
2. **安裝並登入 cloudflared**（會開瀏覽器讓你選網域）：

   ```bash
   brew install cloudflared
   ```

   ```bash
   cloudflared tunnel login
   ```

3. **建立通道，並把網域指過去**（`example.com` 換成你的網域）：

   ```bash
   cloudflared tunnel create moments
   ```

   ```bash
   cloudflared tunnel route dns moments example.com
   ```

4. **建立設定檔** `~/.cloudflared/config.yml`（`<通道ID>` 是上一步印出來的那串英數字）：

   ```yaml
   tunnel: moments
   credentials-file: /Users/<你的使用者名稱>/.cloudflared/<通道ID>.json
   ingress:
     - hostname: example.com
       service: http://127.0.0.1:8010
     - service: http_status:404
   ```

5. **告訴網站它的網域**：把 `backend/.env.example` 複製成 `backend/.env`，填上 `SITE_DOMAIN=example.com`，
   然後重新執行 `./start.sh`。沒有這一步，用網域連進來會被拒絕，也無法登入。
6. **啟動通道**（要和 `./start.sh` 同時開著）：

   ```bash
   cloudflared tunnel run moments
   ```

之後任何人打開 `https://example.com` 就能看到公開的回憶。

### 放在自己電腦上要注意的事

- **電腦睡眠或關機，網站就連不上。** 想一直在線，可以用 `caffeinate -s ./start.sh` 啟動，並在系統設定關掉自動睡眠。
- **備份**：所有資料（資料庫和照片）都在 `backend/data/`，定期把整個資料夾複製到別的地方。
- **密碼要夠強**：網站公開之後任何人都能看到登入框。登入有次數限制（每分鐘 10 次），但弱密碼還是危險。
- 改密碼：`cd backend && .venv/bin/python manage.py changepassword <帳號>`

## 3. 照片怎麼處理

上傳的照片（含 iPhone 的 HEIC）會轉成 JPEG，存兩個尺寸：長邊最多 2560px 的大圖和 720px 的縮圖。
**原始檔不會保留**，請自己另外留著原圖。單張上限 40MB。

「僅登入可見」的回憶，照片網址對訪客也會回 404，不只是從頁面上隱藏。

## 4. 修改程式

開發時開兩個終端機，改前端會即時更新：

```bash
cd backend && DJANGO_DEBUG=1 .venv/bin/python manage.py runserver 8010
```

```bash
cd frontend && npm run dev
```

然後打開 <http://localhost:5173>。改完前端要正式上線時：

```bash
cd frontend && npm run build
```

再重新執行 `./start.sh`。後端測試：

```bash
cd backend && .venv/bin/python manage.py test
```

| 位置 | 內容 |
|---|---|
| `backend/memories/models.py` | 資料結構：回憶、照片、網站設定；照片縮圖處理 |
| `backend/memories/views.py` | API：登入登出、回憶、照片上傳、照片權限檢查 |
| `backend/config/settings.py` | 設定（網域、資料位置都從 `backend/.env` 讀） |
| `frontend/src/App.jsx` | 首頁和整體狀態 |
| `frontend/src/components/` | 時間軸、新增回憶表單、登入、照片放大檢視 |
| `frontend/src/styles.css` | 所有樣式（顏色在最上面的變數） |
