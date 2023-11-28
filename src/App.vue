<script setup>
import { webSocket } from "@/plugins/webSocket.js";
import { useIndexStore } from "@/stores/index";

import upIcon from "@/assets/img/iconArrowUp.svg";
import downIcon from "@/assets/img/iconArrowDown.svg";

import { storeToRefs } from "pinia";
import { ref, computed, watch } from "vue";

const storeIndex = useIndexStore();
const {
  orderBookTable,
  totalMap,
  lastPrice,
  thousandths,
  shouldRowBlink,
  shouldTdBlink,
} = useWebSocket();

function useWebSocket() {
  const wsMap = {
    orderBook: webSocket("wss://ws.btse.com/ws/oss/futures", "orderBook"),
    lastPrice: webSocket("wss://ws.btse.com/ws/futures", "lastPrice"),
  };

  const { activeWsKey, wsMsg } = storeToRefs(storeIndex);

  const originSnapshot = ref({});
  const originLastPrice = ref([]);

  const shouldRowBlink = ref({
    buy: Array(8).fill(false),
    sell: Array(8).fill(false),
  });

  const shouldTdBlink = ref({
    buy: Array(8).fill(false),
    sell: Array(8).fill(false),
  });

  const previousData = ref({ sell: [], buy: [] });

  const orderBookTable = computed(() => {
    const result = {
      buy: originSnapshot.value.bids?.slice(0, 8),
      sell: originSnapshot.value.asks?.slice(0, 8),
    };

    return result;
  });

  const totalMap = computed(() => {
    const result = {
      buy: {},
      sell: {},
    };

    // buy
    let totalBuySize = 0;
    for (const buy of orderBookTable.value.buy) {
      totalBuySize += parseFloat(buy[1]);
    }

    let buyIdx = 0;
    while (buyIdx <= orderBookTable.value.buy?.length) {
      if (orderBookTable.value.buy[buyIdx]) {
        const price = orderBookTable.value.buy[buyIdx][0];
        const total = orderBookTable.value.buy[buyIdx][1];
        let lastTotal = 0;
        if (orderBookTable.value.buy[buyIdx - 1]) {
          const lastPrice = orderBookTable.value.buy[buyIdx - 1][0];
          lastTotal = result.buy[lastPrice].total;
        }
        result.buy[price] = {
          total: 0,
          progress: 0,
        };
        result.buy[price].total = parseInt(total) + lastTotal;
        result.buy[price].progress = Math.round(
          (result.buy[price].total / totalBuySize) * 100
        );
      }
      buyIdx++;
    }

    // sell
    let totalSellSize = 0;
    for (const sell of orderBookTable.value.sell) {
      totalSellSize += parseFloat(sell[1]);
    }

    let sellIdx = orderBookTable.value.sell?.length - 1;
    while (sellIdx >= 0) {
      const price = orderBookTable.value.sell[sellIdx][0];
      const total = orderBookTable.value.sell[sellIdx][1];
      let lastTotal = 0;
      if (orderBookTable.value.sell[sellIdx + 1]) {
        const lastPrice = orderBookTable.value.sell[sellIdx + 1][0];
        lastTotal = result.sell[lastPrice].total;
      }
      result.sell[price] = {
        total: 0,
        progress: 0,
      };
      result.sell[price].total = parseInt(total) + lastTotal;
      result.sell[price].progress = Math.round(
        (result.sell[price].total / totalSellSize) * 100
      );
      sellIdx--;
    }

    return result;
  });

  const lastPrice = computed(() => {
    const result = {
      data: originLastPrice.value[1] || originLastPrice.value[0],
      thanBig:
        originLastPrice.value[1]?.price > originLastPrice.value[0]?.price,
    };
    return result;
  });

  // init subscribe
  watch(
    () => activeWsKey.value,
    (key) => {
      if (key === "orderBook") {
        const config = {
          op: "subscribe",
          args: ["update:BTCPFC"],
        };
        wsMap[key].send(JSON.stringify(config));
      }

      if (key === "lastPrice") {
        const config = {
          op: "subscribe",
          args: ["tradeHistoryApi:BTCPFC"],
        };
        wsMap[key].send(JSON.stringify(config));
      }
    }
  );

  // get new data
  watch(
    () => wsMsg.value,
    (msg) => {
      if (msg.topic === "update:BTCPFC") {
        if (msg.data?.prevSeqNum + 1 !== msg.data?.seqNum) {
          resetUpdate();
        }

        if (!Object.keys(originSnapshot.value)?.length) {
          originSnapshot.value.bids = msg.data.bids;
          originSnapshot.value.asks = msg.data.asks;
        } else {
          originSnapshot.value.bids = originSnapshot.value.bids.concat(
            msg.data.bids
          );
          originSnapshot.value.asks = originSnapshot.value.asks.concat(
            msg.data.asks
          );

          const priceToBidMaxSize = {};
          const priceToAskMaxSize = {};

          for (const bid of originSnapshot.value.bids) {
            const price = bid[0];
            const size = parseInt(bid[1]);

            if (price in priceToBidMaxSize) {
              if (size > priceToBidMaxSize[price]) {
                priceToBidMaxSize[price] = size;
              }
            } else {
              priceToBidMaxSize[price] = size;
            }
          }

          for (const ask of originSnapshot.value.asks) {
            const price = ask[0];
            const size = parseInt(ask[1]);
            if (price in priceToAskMaxSize) {
              if (size > priceToAskMaxSize[price]) {
                priceToAskMaxSize[price] = size;
              }
            } else {
              priceToAskMaxSize[price] = size;
            }
          }

          const filterBids = Object.entries(
            priceToBidMaxSize
          ).map(([price, size]) => [price, size]);
          const filterAsks = Object.entries(
            priceToAskMaxSize
          ).map(([price, size]) => [price, size]);
          originSnapshot.value.bids = filterBids
            ?.sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
            .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
            .slice(0, 25);
          originSnapshot.value.asks = filterAsks
            ?.sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
            .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
            .slice(0, 25);
        }
      }

      if (msg.topic === "tradeHistoryApi") {
        originLastPrice.value.push(msg.data[0]);
        if (originLastPrice.value?.length > 2) {
          originLastPrice.value = originLastPrice.value.slice(1, 3);
        }
      }
    }
  );

  // check show highlight
  watch(
    () => orderBookTable.value,
    (newData) => {
      const currentData = newData;
      currentData.buy.forEach((buyData, buyIdx) => {
        shouldRowBlink.value.buy[buyIdx] = !isPriceEqual(
          buyData,
          previousData.value.buy[buyIdx]
        );
        shouldTdBlink.value.buy[buyIdx] = !isPriceEqual(
          buyData,
          previousData.value.buy[buyIdx]
        );
      });

      currentData.sell.forEach((sellData, sellIdx) => {
        shouldRowBlink.value.sell[sellIdx] = isSizeEqual(
          sellData,
          previousData.value.sell[sellIdx]
        );
        shouldTdBlink.value.sell[sellIdx] = isSizeEqual(
          sellData,
          previousData.value.sell[sellIdx]
        );
      });

      previousData.value = currentData;
    }
  );

  function thousandths(number) {
    if (number) {
      const numberString = number.toString();

      const parts = numberString.split(".");
      const integerPart = parts[0];
      const decimalPart = parts.length > 1 ? "." + parts[1] : "";

      const formattedIntegerPart = integerPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
      );

      const formattedNumber = formattedIntegerPart + decimalPart;

      return formattedNumber;
    }
  }

  function isPriceEqual(arrA, arrB) {
    if (arrB === undefined) {
      return false;
    }

    if (arrA[0] === arrB[0]) {
      return true;
    }

    return false;
  }

  function isSizeEqual(arrA, arrB) {
    if (arrB === undefined) {
      return false;
    }

    if (arrA[0] === arrB[0] && parseInt(arrA[1]) > parseInt(arrB[1])) {
      return true;
    }

    return false;
  }

  function resetUpdate() {
    const unsubscribeConfig = {
      op: "unsubscribe",
      args: ["update:BTCPFC"],
    };
    wsMap.orderBook.send(JSON.stringify(unsubscribeConfig));

    const subscribeConfig = {
      op: "subscribe",
      args: ["update:BTCPFC"],
    };
    wsMap.orderBook.send(JSON.stringify(subscribeConfig));
  }

  return {
    orderBookTable,
    totalMap,
    lastPrice,
    thousandths,
    shouldRowBlink,
    shouldTdBlink,
  };
}
</script>

<template>
    <div style="width: 270px; margin-bottom: 20px; background: #131b29; padding: 20px; border-radius: 8px;">
      <h4>※ 缺少邏輯</h4>
      <p>
        還缺少因應 websocket 進來價位去抓取前後8筆資料呈現
        導致進來價位容易與之前價位落差越來越大，以致畫面更新不明顯
      </p>
    </div>
    <div class="order-book-area">
      <div class="title">
        Order Book
      </div>
      <table>
        <thead>
          <th>
            Price(USD)
          </th>
          <th align="right" width="50">
            Size
          </th>
          <th align="right" width="120">
            Total
          </th>
        </thead>
        <tbody>
          <tr v-for="(sellData, sellIdx) in orderBookTable.sell" :key="`sell-${sellIdx}`" class="sell" :class="{
            'sell-blinking': shouldRowBlink.sell[sellIdx],
          }">
            <td class="sell-text">
              {{ thousandths(sellData[0]) }}
            </td>
            <td :class="{
              'buy-blinking': shouldTdBlink.sell[sellIdx],
              'sell-blinking': !shouldTdBlink.sell[sellIdx],
            }">
              {{ thousandths(sellData[1]) }}
            </td>
            <td class="total">
              <div class="container">
                <div class="sell-progress" :style="`width: ${totalMap.sell[sellData[0]].progress}%;`">
                  {{ thousandths(totalMap.sell[sellData[0]].total) }}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="3">
              <div class="last-price" :class="[lastPrice.thanBig ? 'more-than' : 'less-than']">
                {{ thousandths(lastPrice.data?.price) }}
                <component v-show="lastPrice.data?.price" :is="lastPrice.thanBig ? upIcon : downIcon" />
              </div>
            </td>
          </tr>
          <tr v-for="(buyData, buyIdx) in orderBookTable.buy" :key="`buy-${buyIdx}`" class="buy" :class="{
            'buy-blinking': shouldRowBlink.buy[buyIdx],
          }">
            <td class="buy-text">
              {{ thousandths(buyData[0]) }}
            </td>
            <td :class="{
              'buy-blinking': shouldTdBlink.buy[buyIdx],
              'sell-blinking': !shouldTdBlink.buy[buyIdx],
            }">
              {{ thousandths(buyData[1]) }}
            </td>
            <td class="total">
              <div class="container">
                <div class="buy-progress" :style="`width: ${totalMap.buy[buyData[0]].progress}%;`">
                  {{ thousandths(totalMap.buy[buyData[0]].total) }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
</template>
