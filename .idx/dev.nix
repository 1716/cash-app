{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22 pkgs.apt pkgs.su pkgs.javascript-typescript-langserver pkgs.openjdk
  ];
  idx.extensions = [
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
  ];
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = ["npm" "run" "dev"];
        manager = "web";
      };
      android = {
        command = ["echo" "The APK is located at: android/app/build/outputs/apk/debug/app-debug.apk"];
        manager = "terminal";
      };
    };
  };
}
