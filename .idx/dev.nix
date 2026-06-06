{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.apt
    pkgs.su
    pkgs.nvmet-cli
    pkgs.nodejs_22
    pkgs.javascript-typescript-langserver
    pkgs.openjdk
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
