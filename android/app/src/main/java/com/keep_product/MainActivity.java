package com.keep_product;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "keep_product";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    EdgeToEdge.enable(this);
    SplashScreen.show(this);
    // 저장된 화면 상태를 복원하지 않는다 (react-native-screens 요구사항).
    // 백그라운드에서 안드로이드가 앱 프로세스를 정리한 뒤 다시 열 때, 복원을 시도하면
    // ScreenFragment 생성 오류로 앱이 바로 꺼진다. 화면 상태는 JS(내비게이션)가 다시 만든다.
    super.onCreate(null);
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here the RootView is created and
   * you can specify the renderer you wish to use - the new renderer (Fabric) or the old renderer
   * (Paper).
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }
}
