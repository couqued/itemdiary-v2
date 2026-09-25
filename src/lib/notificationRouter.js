// 알림을 눌렀을 때 이동할 화면 정보를 앱 화면(RootNavigator)으로 전달한다.
// 앱이 백그라운드일 때 누른 알림은 index.js 의 onBackgroundEvent 로 들어오고,
// 그 시점엔 화면이 아직 활성화되지 않았을 수 있어서 잠시 보관했다가 넘겨준다.
let pending = null;
const listeners = new Set();

export const setPendingOpen = data => {
  pending = data;
  listeners.forEach(fn => fn());
};

export const takePendingOpen = () => {
  const data = pending;
  pending = null;
  return data;
};

export const onPendingOpen = fn => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
