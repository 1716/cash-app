{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22 pkgs.apt pkgs.su pkgs.javascript-typescript-langserver pkgs.openjdk pkgs.android-sdk
  ];
  idx.extensions = [
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
  ];
  idx.previews = {
    enable = true;
    previews = {
      android = {
        command = ["./build-apk.sh"];
        manager = "terminal";
      };
    };
  };
}
