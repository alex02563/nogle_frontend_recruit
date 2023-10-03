import { useIndexStore } from '@/stores/index'

export function webSocket(url, name = 'create socket') {
  // 創建WebSocket連接
  const socket = new WebSocket(url);

  // 當連接建立時
  socket.addEventListener('open', (event) => {
    console.log(name + '連接已建立');
    useIndexStore().activeWs(name)
  });

  // 當收到來自伺服器的訊息時
  socket.addEventListener('message', (event) => {
    useIndexStore().setWsMsg(JSON.parse(event.data))
  });

  // 當WebSocket連接關閉時
  socket.addEventListener('close', (event) => {
    if (event.wasClean) {
      console.log(`${name} 連接已關閉，狀態碼：${event.code}，原因：${event.reason}`);
    } else {
      console.error(name + '連接意外關閉');
    }
  });

  // 當發生錯誤時
  socket.addEventListener('error', (event) => {
    console.error(name + '錯誤：', event);
  });

  return socket
}
