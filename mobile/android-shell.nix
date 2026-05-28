let
  pkgs = import <nixpkgs> {
    config = {
      android_sdk.accept_license = true;
      allowUnfree = true;
    };
  };

  android = pkgs.androidenv.composeAndroidPackages {
    platformVersions = [ "35" "36" ];
    buildToolsVersions = [ "35.0.0" "36.0.0" ];
    includeNDK = true;
    ndkVersions = [ "27.0.12077973" "27.1.12297006" ];
    includeEmulator = false;
  };
in
pkgs.mkShell {
  buildInputs = [
    pkgs.zulu
    android.androidsdk
  ];

  shellHook = ''
    export JAVA_HOME=${pkgs.zulu}
    export ANDROID_HOME=${android.androidsdk}/libexec/android-sdk
    export ANDROID_SDK_ROOT=$ANDROID_HOME
    export GRADLE_USER_HOME=/tmp/connectt-gradle
    export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

    mkdir -p "$GRADLE_USER_HOME"

    echo "JAVA_HOME=$JAVA_HOME"
    echo "ANDROID_HOME=$ANDROID_HOME"
    echo "ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
    echo "GRADLE_USER_HOME=$GRADLE_USER_HOME"
  '';
}
