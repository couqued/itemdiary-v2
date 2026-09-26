// 화면에 보이지 않는 웹뷰로 쇼핑몰 페이지를 실제 브라우저처럼 열어 상품 정보를 읽는다.
//
// 쿠팡처럼 앱의 단순 요청(fetch)을 403 으로 막는 곳이나, 단축 링크가 스크립트로 이동하는 곳에서 사용.
// - 앱 전용 주소(coupang:// 등)로의 이동은 막아서 웹 페이지로 넘어가게 한다 → 최종 상품 페이지 주소를 얻는다
// - 페이지가 뜬 뒤 og:image·og:title·가격을 몇 번 다시 읽어본다 (스크립트로 늦게 채워지는 경우)
import React, {useRef, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

// 페이지 안에서 실행: 상품 정보를 모아 앱으로 보낸다 (최대 6번, 0.8초 간격)
const EXTRACT_JS = `
(function () {
  var tries = 0;
  function meta(sel) { var el = document.querySelector(sel); return el ? (el.getAttribute('content') || '').trim() : ''; }
  function pick() {
    var title = meta('meta[property="og:title"]') || document.title || '';
    var image = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]');
    if (!image) {
      var img = document.querySelector('#repImage, .prod-image__detail, img.twc-w-full, .prod-image img');
      if (img) image = img.getAttribute('src') || img.getAttribute('data-src') || '';
    }
    if (image && image.indexOf('//') === 0) image = 'https:' + image;
    var price = meta('meta[property="product:price:amount"]') || meta('meta[property="og:price:amount"]');
    if (!price) {
      var p = document.querySelector('.total-price strong, .price-value, .final-price-amount, [class*="salePrice"], [class*="final-price"]');
      if (p) price = (p.textContent || '').replace(/[^0-9]/g, '');
    }
    if (!price) {
      var ld = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < ld.length && !price; i++) {
        try {
          var j = JSON.parse(ld[i].textContent);
          var arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
          for (var k = 0; k < arr.length; k++) {
            if (arr[k]['@type'] === 'Product' && arr[k].offers) {
              var o = Array.isArray(arr[k].offers) ? arr[k].offers[0] : arr[k].offers;
              price = String(o.price || o.lowPrice || '');
              if (!image && arr[k].image) image = Array.isArray(arr[k].image) ? arr[k].image[0] : arr[k].image;
            }
          }
        } catch (e) {}
      }
    }
    return {title: title, image: image || '', price: parseInt(String(price).replace(/[^0-9]/g, ''), 10) || 0, finalUrl: location.href};
  }
  function send() {
    tries++;
    var r = pick();
    if ((r.image && r.title) || tries >= 6) {
      window.ReactNativeWebView.postMessage(JSON.stringify(r));
    } else {
      setTimeout(send, 800);
    }
  }
  setTimeout(send, 600);
})();
true;
`;

export function HiddenPageReader({url, onResult, timeoutMs = 20000}) {
  const done = useRef(false);

  const finish = result => {
    if (done.current) return;
    done.current = true;
    onResult(result);
  };

  useEffect(() => {
    const timer = setTimeout(() => finish(null), timeoutMs);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!url) return null;
  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        source={{uri: url}}
        userAgent={MOBILE_UA}
        javaScriptEnabled
        domStorageEnabled
        // 앱 전용 주소(coupang:// 등)는 열지 않고 웹 페이지로 넘어가게 한다
        originWhitelist={['http://*', 'https://*']}
        onShouldStartLoadWithRequest={req => /^https?:/i.test(req.url)}
        setSupportMultipleWindows={false}
        injectedJavaScript={EXTRACT_JS}
        onMessage={e => {
          try {
            finish(JSON.parse(e.nativeEvent.data));
          } catch (err) {
            finish(null);
          }
        }}
        onError={() => finish(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 화면 안에 거의 투명하게 둔다 (화면 밖이나 크기 0 이면 안드로이드가 페이지를 아예 그리지 않는다)
  hidden: {position: 'absolute', width: 2, height: 2, left: 0, bottom: 0, opacity: 0.01},
});
