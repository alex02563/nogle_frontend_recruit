# nogle_frontend_recruit 筆試紀錄
* 開發 Order Book BTC-PERP → BTCPFC 匯率及時換匯

* Deploy : [Live Demo](https://nogle-frontend-recruit.vercel.app/) by vercel


## 技術
* Vue 3
* Vite(Node v16.15.0)
* WebSocket

## 開發失誤缺少邏輯
    還缺少因應 websocket 進來價位去抓取前後8筆資料呈現
    導致進來價位容易與之前價位落差越來越大，以致畫面更新不明顯

## 安裝依賴

在專案根目錄中，執行以下指令：

```bash
- 安裝相依套件
yarn install

- 啟動專案
yarn dev

- 打包專案
yarn build

- 啟動打包專案
yarn preview
```
